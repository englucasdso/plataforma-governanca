import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

let globalContext = null;
let isCollecting = false;

async function runGA4Collection({ accountId, accountName, propertyId, propertyName }) {
  if (isCollecting) {
    throw new Error('A sincronização já está em andamento. Aguarde...');
  }
  isCollecting = true;

  try {
    const userDataDir = path.resolve('data/playwright_ga4_session');
    console.log(`[GA4-PLAYWRIGHT] iniciando navegador em: ${userDataDir}`);
    
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

    const targetUrl = `https://analytics.google.com/analytics/web/#/a${accountId}p${propertyId}/admin/events/hub`;
    console.log(`[GA4-PLAYWRIGHT] abrindo ${targetUrl}`);
    
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
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
       await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
       
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
       if (!currentUrl.includes(`p${propertyId}`)) {
         console.log(`[GA4-PLAYWRIGHT] redirecionando novamente para a property destino após login...`);
         await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
       }
    }

    console.log('[GA4-PLAYWRIGHT] Sessão validada. Coletando accounts/properties/eventos');
    
    // Espera a página carregar (Pode haver skeleton loading no GA4)
    await page.waitForTimeout(10000);

    const finalEvents = [];

    // Helper para extrair da tabela atual
    const extractFromCurrentTable = async (typeStr) => {
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
      }, { typeStr, accountId, accountName, propertyId, propertyName });
    };

    console.log('[GA4-PLAYWRIGHT] coletando aba Key events');
    const keyEventsTable = await extractFromCurrentTable("Key event");
    if (keyEventsTable && keyEventsTable.length > 0) {
        finalEvents.push(...keyEventsTable);
    }
    
    console.log('[GA4-PLAYWRIGHT] coletando aba Recent events');
    // Em uma implementação real, clicaríamos na aba. Por agora, extraímos a tabela atual, que geralmente contém os eventos.
    // Como simplificação via dom manipulation, para evitar erros de selectores quebrados do GA4 (que muda os ids),
    // apenas listamos todos os eventos da primeira tabela que ele exibir (geralmente Existing events) se não tivermos sucesso testando abas específicas, 
    // ou tentamos clicar na aba "Existing events" / "All events".
    // Isso é um placeholder que extrai o que estiver visível na view.
    const allEventsTable = await extractFromCurrentTable("Event");
    allEventsTable.forEach(evt => {
       if (!finalEvents.find(e => e.eventName === evt.eventName)) {
           evt.eventType = "Recent event";
           finalEvents.push(evt);
       }
    });

    console.log(`[GA4-PLAYWRIGHT] eventos encontrados: ${finalEvents.length}`);

    const dataDir = path.resolve('data');
    await fs.mkdir(dataDir, { recursive: true });
    const filePath = path.resolve(dataDir, 'ga4-events.json');
    console.log(`[GA4-PLAYWRIGHT] salvando backend/data/ga4-events.json`);
    await fs.writeFile(filePath, JSON.stringify(finalEvents, null, 2), 'utf8');

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
