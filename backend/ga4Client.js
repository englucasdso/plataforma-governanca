import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

let globalContext = null;
let isCollecting = false;

async function runGA4Collection() {
  if (isCollecting) {
    throw new Error('A sincronização já está em andamento. Aguarde...');
  }
  isCollecting = true;

  try {
    const userDataDir = path.resolve('data/playwright_ga4_session');
    
    console.log('[GA4-PLAYWRIGHT] iniciando navegador com sessão persistente');
    let context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // Usando headful para lidar com login se necessário e ajudar na visualização
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

    let baseUrl = `https://analytics.google.com/analytics/web/`;
    console.log('[GA4-PLAYWRIGHT] acessando Google Analytics');
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    let currentUrl = page.url();
    let needsLogin = false;
    
    if (currentUrl.includes('accounts.google.com') || currentUrl.includes('ServiceLogin')) {
       needsLogin = true;
       console.log('[GA4-PLAYWRIGHT] aguardando login manual pelo usuário (Timeout: 5 minutos)');
       try {
           await page.waitForURL(/analytics\.google\.com\/analytics\/web/, { timeout: 300000 });
       } catch(e) {
           throw new Error("Tempo limite para login esgotado ou URL do GA4 não alcançada.");
       }
    }

    console.log('[GA4-PLAYWRIGHT] login detectado');
    await page.waitForTimeout(5000); // Espera o SPA carregar
    
    currentUrl = page.url();
    let currentMatch = currentUrl.match(/a(\d+)p(\d+)/);
    
    console.log('[GA4-PLAYWRIGHT] listando accounts');
    
    // Tenta extrair contas e propriedades da tela (se possível)
    // Uma abordagem universal fallback: vamos capturar a conta/prop atual se o picker falhar,
    // mas tentamos varrer o DOM.
    let hierarchy = await page.evaluate(async () => {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        
        let result = [];
        
        // fallback: url atual
        const match = window.location.hash.match(/a(\d+)p(\d+)/);
        if (match) {
            let accId = match[1];
            let propId = match[2];
            // Tenta pegar o nome da interface se possivel
            let nameLabels = Array.from(document.querySelectorAll('span, div')).filter(el => {
                let text = (el.innerText || "").trim();
                return text.length > 2 && text.length < 50;
            });
            
            result.push({
                accountId: accId,
                accountName: `Account ${accId}`,
                properties: [{
                    propertyId: propId,
                    propertyName: `Property ${propId}`,
                    events: []
                }]
            });
        }
        
        // Tenta abrir o picker para encontrar mais
        let pickerBtn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(el => 
            (el.getAttribute('aria-label') || "").toLowerCase().includes("conta") || 
            (el.getAttribute('aria-label') || "").toLowerCase().includes("account") ||
            (el.innerText || "").includes("Propriedades") ||
            (el.innerText || "").includes("Properties")
        );
        
        if (pickerBtn) {
            pickerBtn.click();
            await sleep(2000);
            
            let links = Array.from(document.querySelectorAll('a[href*="/#/a"]'));
            for (let link of links) {
                let href = link.getAttribute('href');
                let m = href.match(/a(\d+)p(\d+)/);
                if (m) {
                    let aId = m[1];
                    let pId = m[2];
                    let text = link.innerText.trim();
                    
                    let acc = result.find(a => a.accountId === aId);
                    if (!acc) {
                        acc = { accountId: aId, accountName: `Account ${aId}`, properties: [] };
                        result.push(acc);
                    }
                    if (!acc.properties.find(p => p.propertyId === pId)) {
                        acc.properties.push({
                            propertyId: pId,
                            propertyName: text || `Property ${pId}`,
                            events: []
                        });
                    }
                }
            }
        }
        
        return result;
    });

    if (hierarchy.length === 0) {
        throw new Error("Nenhuma conta do GA4 encontrada. Verifique se o usuário possui acesso.");
    }

    console.log(`[GA4-PLAYWRIGHT] accounts encontradas: ${hierarchy.length}`);

    // Helper para extrair da tabela atual
    const extractFromCurrentTable = async (typeStr) => {
      return await page.evaluate(({ typeStr }) => {
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
                           platform: "GA4",
                           eventName: name,
                           eventType: typeStr,
                           status: "Ativo"
                       });
                   }
               }
          }
          return events;
      }, { typeStr });
    };

    for (const acc of hierarchy) {
        console.log(`[GA4-PLAYWRIGHT] listando properties da account: ${acc.accountName}`);
        console.log(`[GA4-PLAYWRIGHT] properties encontradas: ${acc.properties.length}`);
        
        for (const prop of acc.properties) {
            console.log(`[GA4-PLAYWRIGHT] acessando eventos da property: ${prop.propertyName}`);
            const targetUrl = `https://analytics.google.com/analytics/web/#/a${acc.accountId}p${prop.propertyId}/admin/events/hub`;
            
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(5000); // Wait for Skeleton loaders
            
            // Coletar
            const keyEventsTable = await extractFromCurrentTable("Key event");
            const allEventsTable = await extractFromCurrentTable("Recent event");
            
            const eventMap = new Map();
            keyEventsTable.forEach(e => eventMap.set(e.eventName, e));
            allEventsTable.forEach(e => {
                if (!eventMap.has(e.eventName)) {
                    eventMap.set(e.eventName, e);
                }
            });
            
            const finalPropEvents = Array.from(eventMap.values());
            if (finalPropEvents.length === 0) {
               console.log(`[GA4-PLAYWRIGHT] nenhum evento encontrado, tentando usar eventos padrão se tela for vazia...`);
            } else {
               prop.events = finalPropEvents;
            }
            
            console.log(`[GA4-PLAYWRIGHT] eventos encontrados: ${finalPropEvents.length}`);
        }
    }

    const dataDir = path.resolve('data');
    await fs.mkdir(dataDir, { recursive: true });
    
    const finalData = {
        accounts: hierarchy,
        lastSync: new Date().toISOString()
    };
    
    const filePath = path.resolve(dataDir, 'ga4-events.json');
    console.log(`[GA4-SYNC] salvando backend/data/ga4-events.json`);
    await fs.writeFile(filePath, JSON.stringify(finalData, null, 2), 'utf8');
    console.log(`[GA4-SYNC] sincronização finalizada`);

    await context.close();
    globalContext = null;
    return finalData;

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
