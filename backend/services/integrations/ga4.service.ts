import { AnalyticsAdminServiceClient } from '@google-analytics/admin';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];

export async function checkStatus() {
  try {
    const auth = getAuth();
    const client = await auth.getClient();
    return {
      connected: true,
      authType: "service_account",
      message: "Conectado via Service Account"
    };
  } catch (error: any) {
    return {
      connected: false,
      authType: null,
      message: "Service Account não configurada. Defina a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS apontando para o JSON."
    };
  }
}

function getAuth() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: SCOPES,
    });
  }

  throw new Error("Nenhuma Service Account configurada. Use GOOGLE_APPLICATION_CREDENTIALS.");
}

export async function runGA4Sync() {
  const auth = getAuth();
  
  // Test connection
  try {
    await auth.getClient();
  } catch (e: any) {
    throw new Error('Falha na autenticação da Service Account. Detalhes: ' + e.message);
  }

  // Clients
  const adminClient = new AnalyticsAdminServiceClient({ auth, fallback: true });
  const dataClient = new BetaAnalyticsDataClient({ auth, fallback: true });

  console.log('[GA4-SYNC] Fetching accounts list...');
  const [accounts] = await adminClient.listAccounts();

  if (accounts.length === 0) {
    throw new Error("Nenhuma conta GA4 encontrada para esta Service Account. Adicione o e-mail da Service Account no Access Management do GA4.");
  }

  const hierarchy = [];

  for (const account of accounts) {
    let accountName = account.displayName || `Account ${account.name}`;
    let accountId = account.name ? account.name.split('/')[1] : null;

    if (!accountId) continue;

    console.log(`[GA4-SYNC] Loading properties for Account: ${accountName} (${accountId})`);
    
    // List Properties
    const [properties] = await adminClient.listProperties({ filter: `parent:accounts/${accountId}` });
    
    const accountData: any = {
      accountId: accountId,
      accountName: accountName,
      properties: []
    };

    for (const property of properties) {
      let propertyName = property.displayName || `Property ${property.name}`;
      let propertyId = property.name ? property.name.split('/')[1] : null;
      if (!propertyId) continue;

      console.log(`[GA4-SYNC] Fetching events for Property: ${propertyName} (${propertyId})`);

      const [response] = await dataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          {
            startDate: '90daysAgo',
            endDate: 'today',
          },
        ],
        dimensions: [
          {
            name: 'eventName',
          },
        ],
        metrics: [
          {
            name: 'eventCount',
          },
        ],
      });

      const eventsResult = [];
      if (response.rows) {
        for (const row of response.rows) {
          if (row.dimensionValues && row.dimensionValues[0] && row.dimensionValues[0].value) {
            eventsResult.push({
              eventName: row.dimensionValues[0].value,
              eventCount: row.metricValues ? parseInt(row.metricValues[0].value || "0", 10) : 0,
              status: "ativo",
              source: "GA4"
            });
          }
        }
      }

      accountData.properties.push({
        propertyId: propertyId,
        propertyName: propertyName,
        events: eventsResult
      });
    }

    hierarchy.push(accountData);
  }

  console.log('[GA4-SYNC] Sync complete. Total accounts saved: ', hierarchy.length);

  const dirPath = path.join(process.cwd(), "backend", "data");
  if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
  }
  const filepath = path.join(dirPath, "ga4-events.json");
  
  const savedData = { accounts: hierarchy };
  fs.writeFileSync(filepath, JSON.stringify(savedData, null, 2), "utf8");

  return savedData;
}
