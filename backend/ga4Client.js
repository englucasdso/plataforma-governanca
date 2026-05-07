import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

let globalContext = null;
let isCollecting = false;

async function runGA4Collection(properties) {
  if (isCollecting) {
    throw new Error('A sincronização já está em andamento. Aguarde...');
  }
  isCollecting = true;

  try {
    const userDataDir = path.resolve('data/playwright_ga4_session');
    
    // Tentativa Headful primeiro para não dar erro se precisar logar, mas podemos colocar headless se tiver sessão
    let context = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      channel: 'chrome',
      ignoreHTTPSErrors: true,
      viewport: null,
      args: [
        '--start-maximized',
        '--ignore-certificate-errors',
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-web-security'
      ]
    });

    globalContext = context;
    let page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    let firstProp = properties[0];
    if (firstProp) {
        let testUrl = `https://analytics.google.com/analytics/web/#/a${firstProp.accountId}p${firstProp.propertyId}/admin/events/hub`;
        await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        let currentUrl = page.url();
        let needsLogin = false;
        
        if (currentUrl.includes('accounts.google.com') || currentUrl.includes('ServiceLogin')) {
           needsLogin = true;
           console.log('[GA4-PLAYWRIGHT] Sessão não autenticada. Reiniciando em modo assistido (Headful) para login...');
           await context.close();
           
           context = await chromium.launchPersistentContext(userDataDir, {
              headless: false,
              channel: 'chrome',
              ignoreHTTPSErrors: true,
              viewport: null,
              args: [
                '--start-maximized',
                '--ignore-certificate-errors',
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-web-security'
              ]
           });
           globalContext = context;
           page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
           
           console.log(`[GA4-PLAYWRIGHT] (Headful) Navegando para auth...`);
           await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
           
           console.log('[GA4-PLAYWRIGHT] aguardando login manual pelo usuário (Timeout: 5 minutos)');
           try {
               await page.waitForURL(/analytics\.google\.com\/analytics\/web/, { timeout: 300000 });
           } catch(e) {
               throw new Error("Tempo limite para login esgotado ou URL do GA4 não alcançada.");
           }
           
           console.log('[GA4-PLAYWRIGHT] login detectado no modo assistido!');
           // Dá um tempinho extra para SPA do GA4 carregar
           await page.waitForTimeout(5000);
           
           currentUrl = page.url();
           if (!currentUrl.includes(`p${firstProp.propertyId}`)) {
             console.log(`[GA4-PLAYWRIGHT] redirecionando novamente para a property destino após login...`);
             await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
           }
        }
    }

    const finalEvents = [];

    // Helper para extrair da tabela atual
    const extractFromCurrentTable = async (typeStr, prop) => {
      return await page.evaluate(({ typeStr, accountId, accountName, propertyId, propertyName }) => {
          const events = [];
          const rows = Array.from(document.querySelectorAll('tr, .particle-table-row, mat-row'));
          
          for (const row of rows) {
               const text = row.innerText || "";
               if (text.includes("Nome do evento") || text.includes("Event name")) continue;
               
               const cols = Array.from(row.querySelectorAll('td, .particle-table-cell, mat-cell')).map(c => c.innerText.trim());
               if (cols.length >= 1) {
                   const name = cols[0];
                   if (name && name.length > 2 && !name.includes("carregando") && !name.includes("loading")) {
                       events.push({
                           accountId,
                           accountName,
                           propertyId,
                           propertyName,
                           platform: "GA4",
                           eventName: name,
                           eventType: typeStr,
                           status: "ativo"
                       });
                   }
               }
          }
          return events;
      }, { typeStr, accountId: prop.accountId, accountName: prop.accountName, propertyId: prop.propertyId, propertyName: prop.displayName });
    };

    for (const prop of properties) {
        console.log(`[GA4-PLAYWRIGHT] acessando property: ${prop.displayName}/${prop.propertyId}`);
        const targetUrl = `https://analytics.google.com/analytics/web/#/a${prop.accountId}p${prop.propertyId}/admin/events/hub`;
        console.log(`[GA4-PLAYWRIGHT] url: ${targetUrl}`);
        
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(5000); // Wait for potential skeleton loaders per property
        
        console.log('[GA4-PLAYWRIGHT] coletando Key events');
        const keyEventsTable = await extractFromCurrentTable("Key event", prop);
        if (keyEventsTable && keyEventsTable.length > 0) {
            finalEvents.push(...keyEventsTable);
        }
        
        console.log('[GA4-PLAYWRIGHT] coletando Recent events');
        const allEventsTable = await extractFromCurrentTable("Recent event", prop);
        allEventsTable.forEach(evt => {
           if (!finalEvents.find(e => e.eventName === evt.eventName && e.propertyId === evt.propertyId)) {
               finalEvents.push(evt);
           }
        });
    }

    console.log(`[GA4-PLAYWRIGHT] eventos encontrados: ${finalEvents.length}`);

    const dataDir = path.resolve('data');
    await fs.mkdir(dataDir, { recursive: true });
    const filePath = path.resolve(dataDir, 'ga4-events.json');
    console.log(`[GA4-SYNC] salvando backend/data/ga4-events.json`);
    await fs.writeFile(filePath, JSON.stringify(finalEvents, null, 2), 'utf8');
    console.log(`[GA4-SYNC] finalizado`);

    await context.close();
    globalContext = null;
    return finalEvents;

  } catch (error) {
    console.error(`[GA4-PLAYWRIGHT] Erro: ${error.message}`);
    throw error;
  } finally {
    isCollecting = false;
  }
}

async function abortGA4Collection() {
  if (isCollecting && globalContext) {
    console.log('[GA4-PLAYWRIGHT] cancelando execução...');
    try {
      await globalContext.close();
    } catch(e) {}
    globalContext = null;
    isCollecting = false;
  }
}

export { runGA4Collection, abortGA4Collection };
