import { GoogleAuth } from "google-auth-library";
import { AnalyticsAdminServiceClient } from "@google-analytics/admin";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];

let cachedAuth: GoogleAuth | null = null;

function setupProxy() {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy || process.env.CORPORATE_PROXY;
  if (proxy) {
    console.log("[GA4] proxy detectado");
    console.log(`[GA4] proxy usado: ${proxy}`);
    process.env.HTTPS_PROXY = proxy;
    process.env.HTTP_PROXY = proxy;
    process.env.https_proxy = proxy;
    process.env.http_proxy = proxy;
    process.env.GRPC_PROXY = proxy;
    process.env.grpc_proxy = proxy;
  }
  
  const caCert = process.env.NODE_EXTRA_CA_CERTS || process.env.CORPORATE_CA_CERT;
  if (caCert) {
    console.log(`[GA4] certificado corporativo carregado: ${caCert}`);
    process.env.NODE_EXTRA_CA_CERTS = caCert;
  }
}

// Inicializa a leitura do proxy assim que a service é carregada
setupProxy();

async function getAuth() {
  if (cachedAuth) return cachedAuth;
  
  const auth = new GoogleAuth({
    scopes: SCOPES,
  });
  
  cachedAuth = auth;
  console.log("[GA4] ADC OK");
  return auth;
}

function handleProxyError(error: any) {
  const errorMsg = error.message || "";
  if (errorMsg.includes("UNAVAILABLE") || errorMsg.includes("No connection established") || errorMsg.includes("ETIMEDOUT") || errorMsg.includes("timeout")) {
    return new Error(`Autenticação OK, mas a rede corporativa bloqueou a conexão com Google Analytics.`);
  }
  return error;
}

export async function checkStatus() {
  try {
    console.log("[GA4] verificando ADC");
    const auth = await getAuth();
    // Verify if we can get credentials (implicitly checks ADC availability)
    const client = await auth.getClient();
    
    return {
      connected: true,
      authType: "adc",
      message: "Conectado via Google Cloud SDK"
    };
  } catch (error: any) {
    console.error("[GA4][ERRO] ao verificar ADC:", error.message);
    return {
      connected: false,
      authType: null,
      message: "Não configurado. Execute gcloud auth application-default login no terminal e reinicie o servidor."
    };
  }
}

export async function getAccounts() {
  try {
    console.log("[GA4] listando accounts");
    const auth = await getAuth();
    console.log("[GA4] usando REST fallback, não gRPC");
    console.log("[GA4] listando accounts via REST");
    const adminClient = new AnalyticsAdminServiceClient({ auth, fallback: true });
    const [accounts] = await adminClient.listAccounts();
    console.log(`[GA4] accounts encontradas: ${accounts.length}`);
    return accounts.map(a => {
      console.log(`[GA4] account encontrada: ${a.name} / ${a.displayName}`);
      return {
        name: a.name,
        displayName: a.displayName
      }
    });
  } catch (error: any) {
    console.error("[GA4][ERRO] listando accounts:", error.message);
    if (error.message.includes("Could not load the default credentials")) {
        throw new Error("ADC não configurado. Execute gcloud auth application-default login.");
    }
    throw handleProxyError(error);
  }
}

export async function getProperties(parentAccount?: string) {
  try {
    if (parentAccount) {
        console.log(`[GA4] listando properties da account ${parentAccount}`);
    } else {
        console.log(`[GA4] listando properties de todas as accounts`);
    }
    
    const auth = await getAuth();
    console.log("[GA4] usando REST fallback, não gRPC");
    console.log("[GA4] listando properties via REST");
    const adminClient = new AnalyticsAdminServiceClient({ auth, fallback: true });
    
    // If parentAccount isn't provided, fetch all accounts first
    const accountsToList = parentAccount 
      ? [parentAccount] 
      : (await getAccounts()).map(a => a.name);

    const allProperties = [];
    
    for (const accountName of accountsToList) {
        if (!accountName) continue;
        const [properties] = await adminClient.listProperties({
            filter: `parent:${accountName}`
        });
        
        for (const prop of properties) {
            console.log(`[GA4] property encontrada: ${prop.name} / ${prop.displayName}`);
            allProperties.push({
                name: prop.name,
                displayName: prop.displayName,
                propertyId: prop.name?.split('/')[1]
            });
        }
    }
    
    return allProperties;
  } catch (error: any) {
    console.error("[GA4][ERRO] listando properties:", error.message);
    throw handleProxyError(error);
  }
}

export async function getEventsFromProperty(propertyId: string, propertyNameStr?: string) {
  try {
    console.log(`[GA4] buscando eventos da property ${propertyId}`);
    const auth = await getAuth();
    console.log("[GA4] usando REST fallback, não gRPC");
    console.log("[GA4] listando eventos via REST");
    const dataClient = new BetaAnalyticsDataClient({ auth, fallback: true });
    
    // Default last 30 days
    const [response] = await dataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: "30daysAgo",
          endDate: "today",
        },
      ],
      dimensions: [
        {
          name: "eventName",
        },
      ],
      metrics: [
        {
          name: "eventCount",
        },
      ],
    });

    const rows = response.rows || [];
    console.log(`[GA4] eventos retornados: ${rows.length}`);

    const events = rows.map(row => {
      const eventName = row.dimensionValues?.[0]?.value || "unknown";
      const eventCount = parseInt(row.metricValues?.[0]?.value || "0", 10);
      return {
        platform: "GA4",
        propertyId: propertyId,
        propertyName: propertyNameStr || "Propriedade GA4",
        eventName: eventName,
        eventCount: eventCount,
        lastSeen: null,
        status: "active"
      };
    });
    
    return events;
  } catch (error: any) {
    console.error(`[GA4][ERRO] buscando eventos para a propriedade ${propertyId}:`, error.message);
    throw handleProxyError(error);
  }
}

export async function getAllEvents() {
    try {
        console.log(`[GA4] buscando eventos de TODAS as properties`);
        const properties = await getProperties();
        let allEvents: any[] = [];
        
        for (const prop of properties) {
            if (!prop.propertyId) continue;
            try {
                const events = await getEventsFromProperty(prop.propertyId, prop.displayName || undefined);
                allEvents = allEvents.concat(events);
            } catch (e) {
                // If one property fails, we skip and continue with the others
                console.warn(`[GA4] Pulando property ${prop.propertyId} devido a erro.`);
            }
        }
        return allEvents;
    } catch (error: any) {
        console.error(`[GA4][ERRO] buscando eventos all:`, error.message);
        throw handleProxyError(error);
    }
}
