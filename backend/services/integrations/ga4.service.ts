import { GoogleAuth } from "google-auth-library";
import { AnalyticsAdminServiceClient } from "@google-analytics/admin";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];

let cachedAuth: GoogleAuth | null = null;
let cachedProjectId: string | null = null;

async function getAuth() {
  if (cachedAuth) return cachedAuth;
  
  const auth = new GoogleAuth({
    scopes: SCOPES,
  });
  
  cachedAuth = auth;
  return auth;
}

export async function checkStatus() {
  try {
    const auth = await getAuth();
    // Verify if we can get credentials (implicitly checks ADC availability)
    const client = await auth.getClient();
    
    return {
      connected: true,
      authType: "adc",
      message: "Conectado via Google Cloud SDK"
    };
  } catch (error: any) {
    console.error("Erro ao verificar ADC do GA4:", error.message);
    return {
      connected: false,
      authType: null,
      message: "Não configurado. Execute gcloud auth application-default login no terminal e reinicie o servidor."
    };
  }
}

export async function getAccounts() {
  try {
    const auth = await getAuth();
    const adminClient = new AnalyticsAdminServiceClient({ auth });
    const [accounts] = await adminClient.listAccounts();
    return accounts.map(a => ({
      name: a.name,
      displayName: a.displayName
    }));
  } catch (error: any) {
    if (error.message.includes("Could not load the default credentials")) {
        throw new Error("ADC não configurado. Execute gcloud auth application-default login.");
    }
    throw error;
  }
}

export async function getProperties(parentAccount?: string) {
  try {
    const auth = await getAuth();
    const adminClient = new AnalyticsAdminServiceClient({ auth });
    
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
            allProperties.push({
                name: prop.name,
                displayName: prop.displayName,
                propertyId: prop.name?.split('/')[1]
            });
        }
    }
    
    return allProperties;
  } catch (error: any) {
    throw error;
  }
}

export async function getEventsFromProperty(propertyId: string, propertyNameStr?: string) {
  try {
    const auth = await getAuth();
    const dataClient = new BetaAnalyticsDataClient({ auth });
    
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

    const events = (response.rows || []).map(row => {
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
    console.error(`Erro ao buscar eventos para a propriedade ${propertyId}:`, error.message);
    throw error;
  }
}

export async function getAllEvents() {
    try {
        const properties = await getProperties();
        let allEvents: any[] = [];
        
        for (const prop of properties) {
            if (!prop.propertyId) continue;
            try {
                const events = await getEventsFromProperty(prop.propertyId, prop.displayName || undefined);
                allEvents = allEvents.concat(events);
            } catch (e) {
                // If one property fails, we skip and continue with the others
                console.warn(`Pulando property ${prop.propertyId} devido a erro.`);
            }
        }
        return allEvents;
    } catch (error: any) {
        throw error;
    }
}
