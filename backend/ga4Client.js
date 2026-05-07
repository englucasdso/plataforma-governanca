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
    const userDataDir = path.resolve(process.cwd(), 'backend/data/playwright_ga4_session');
    
    console.log(`[GA4-PLAYWRIGHT] Usando sessão persistente em: ${userDataDir}`);
    console.log('[GA4-PLAYWRIGHT] Iniciando modo headless');
    let context = await chromium.launchPersistentContext(userDataDir, {
      headless: true, // Modo headless conforme requisitado
      channel: 'chrome',
      ignoreHTTPSErrors: true,
      viewport: null,
      args: [
        '--start-maximized',
        '--ignore-certificate-errors',
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-web-security',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ]
    });

    globalContext = context;
    let page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    let baseUrl = `https://analytics.google.com/analytics/web/`;
    console.log(`[GA4-PLAYWRIGHT] Acessando Google Analytics: ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    let currentUrl = page.url();
    console.log(`[GA4-PLAYWRIGHT] URL atual após acesso: ${currentUrl}`);
    
    // Tira um screenshot (opcional, ajuda a depurar em background) para ver onde parou
    await page.screenshot({ path: path.resolve(process.cwd(), 'backend/data/debug_ga4_login.png') }).catch(() => {});
    
    if (currentUrl.includes('accounts.google.com') || currentUrl.includes('ServiceLogin')) {
       console.error(`[GA4-PLAYWRIGHT] Erro: Redirecionado para tela de login do Google (${currentUrl}). Acesso silencioso abortado.`);
       throw new Error(`A sessão persistente do Playwright (pasta: backend/data/playwright_ga4_session) não possui cookies válidos do Google. O acesso silencioso em background requer uma sessão previamente autenticada no mesmo diretório. Você precisa popular essa pasta com uma sessão válida.`);
    }

    console.log('[GA4-PLAYWRIGHT] GA4 acessado com sucesso (login reconhecido pela sessão persistente)');
    await page.waitForTimeout(5000); // Espera carregamento principal
    
    // Para listar as accounts/properties de forma confiável, vamos para a página principal ou Admin
    console.log('[GA4-PLAYWRIGHT] Listando accounts e propriedades...');
    
    // URL da área de Administração, que costuma ter links para as contas e propriedades
    await page.goto("https://analytics.google.com/analytics/web/#/admin", { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000); // Aguarda renderizar o SPA de Admin
    
    // Tenta abrir o seletor de contas global (aquele no topo à esquerda)
    try {
        const pickerSelectors = [
            'button[aria-label*="conta" i]',
            'button[aria-label*="account" i]',
            '[data-test-id="asset-selector-button"]',
            '.suites-asset-selector',
            '[aria-label*="Abrir a seleção" i]',
            'button[title*="Analytics" i]'
        ];
        
        let pickerClicked = false;
        for (const sel of pickerSelectors) {
            const btn = await page.$(sel);
            if (btn) {
                // Checa se o texto tem 'Analytics' para não clicar no perfil do Google ali na direita
                const text = await btn.innerText();
                const currentUrl = page.url();
                await btn.click();
                await page.waitForTimeout(4000); // Espera o menu/painel de propriedades abrir
                console.log(`[GA4-PLAYWRIGHT] Asset selector clicado usando seletor: ${sel}`);
                pickerClicked = true;
                break;
            }
        }
    } catch(e) {
        console.log('[GA4-PLAYWRIGHT] Aviso: Não foi possível interagir com o seletor de contas', e.message);
    }
    
    // Agora avalia o DOM para extrair a lista de hrefs que apontam para propriedades
    let hierarchy = await page.evaluate(async () => {
        let result = [];
        
        // Procuramos todos os links no DOM (especialmente os do overlay do account switcher)
        let propLinks = Array.from(document.querySelectorAll('a[href*="/p"]'));
        
        for (let link of propLinks) {
            let href = link.getAttribute('href');
            // Formatos comuns do GA4: /a1234p5678 ou apenas /p5678
            let m = href.match(/a(\d+)p(\d+)/) || href.match(/\/p(\d+)/);
            if (m) {
                let aId = m[2] ? m[1] : `Account-${Math.floor(Math.random()*1000)}`; 
                let pId = m[2] ? m[2] : m[1];
                let text = link.innerText.trim().split('\n')[0];
                
                // Ignora links soltos de navegação como "Admin"
                if (!text || text.toLowerCase().includes("admin") || text.toLowerCase().includes("home")) {
                    continue;
                }
                
                let accName = aId.includes('Account-') ? "My Account" : `Account ${aId}`;
                
                // Tenta achar o nome da conta perto do link (geralmente vem acima num container de lista)
                let parent = link.closest('.account-row, [role="listitem"], [role="treeitem"], .vds-list');
                if (parent && parent.innerText) {
                    let parentLines = parent.innerText.split('\n').filter(l => l.trim().length > 0);
                    if (parentLines.length > 0 && parentLines[0] !== text) {
                         accName = parentLines[0]; 
                    }
                }
                
                let acc = result.find(a => a.accountId === aId);
                // Se aId foi gerado aleatório (ex: /p1234) tenta agrupar na "My Account"
                if (!acc && aId.includes('Account-')) {
                   acc = result.find(a => a.accountName === "My Account");
                }
                
                if (!acc) {
                    acc = { accountId: aId, accountName: accName, properties: [] };
                    result.push(acc);
                }
                
                if (!acc.properties.find(p => p.propertyId === pId)) {
                    acc.properties.push({
                        propertyId: pId,
                        propertyName: text,
                        events: []
                    });
                }
            }
        }
        
        // Fallback robusto se o account switcher falhar
        if (result.length === 0) {
            const match = window.location.href.match(/a(\d+)p(\d+)/) || window.location.href.match(/\/p(\d+)/);
            if (match) {
                let accId = match[2] ? match[1] : `Account_Current`;
                let propId = match[2] ? match[2] : match[1];
                
                let nameLabels = Array.from(document.querySelectorAll('span, h1, h2, div')).filter(el => {
                    let text = (el.innerText || "").trim();
                    return text.length > 2 && text.length < 50 && !text.includes('\n');
                });
                
                let propName = nameLabels.find(el => el.innerText.includes('Analytics'))?.innerText || `Property ${propId}`;
                
                result.push({
                    accountId: accId,
                    accountName: accId.includes('Current') ? "Minha Conta Atual" : `Conta ${accId}`,
                    properties: [{
                        propertyId: propId,
                        propertyName: propName.replace('Google Analytics', '').trim() || `Propriedade ${propId}`,
                        events: []
                    }]
                });
            }
        }
        
        return result;
    });

    if (hierarchy.length === 0) {
        throw new Error("Nenhuma conta ou propriedade do GA4 encontrada. A interface pode estar carregando ou você não possui propriedades. URL Atual: " + page.url());
    }

    console.log(`[GA4-PLAYWRIGHT] accounts encontradas: ${hierarchy.length}`);

    // Helper modernizado para extrair da tabela de eventos
    const extractFromCurrentTable = async (typeStr) => {
      // Damos scroll para baixo caso a tabela seja paginada ou infinita (opcional, pode ajudar no lazy loading)
      await page.evaluate(() => window.scrollBy(0, 1000)).catch(()=>{});
      await page.waitForTimeout(1500); 

      return await page.evaluate(({ typeStr }) => {
          const eventsMap = new Map();
          
          // No GA4 moderno, as tabelas usam mat-row, ga-event-table-row, ou tem role "row"
          const rows = Array.from(document.querySelectorAll('tr, mat-row, ga-event-table-row, [role="row"]'));
          console.log(`[GA4 Extract] Encontradas ${rows.length} linhas de tabela para ${typeStr}.`);
          
          for (const row of rows) {
               const text = row.innerText || "";
               const lowerText = text.toLowerCase();
               
               // Ignora o row de cabeçalho
               if (lowerText.includes("nome do evento") || lowerText.includes("event name")) continue;
               if (!text.trim()) continue;
               
               // Busca as colunas/células dentro da linha
               const cols = Array.from(row.querySelectorAll('td, mat-cell, [role="gridcell"], .particle-table-cell, [class*="cell"]'))
                                 .map(c => c.innerText.trim());
               
               if (cols.length >= 1) {
                   const name = cols[0];
                   // Nomes de eventos válidos normalmente são ex: "page_view", "click", "first_visit"
                   if (name && name.length > 1 && name.length < 100 && !name.includes("carregando") && !name.includes('\n') && !name.includes("Nenhum")) {
                       eventsMap.set(name, {
                           platform: "GA4",
                           eventName: name,
                           eventType: typeStr,
                           status: "Ativo"
                       });
                   }
               } else if (text.trim().length > 1 && text.trim().length < 100 && !text.includes('\n')) {
                   // Fallback extremo: se não achou colunas mas a row tem um texto curto (pode ser o próprio nome do evento puro)
                   eventsMap.set(text.trim(), {
                       platform: "GA4",
                       eventName: text.trim(),
                       eventType: typeStr,
                       status: "Ativo"
                   });
               }
          }
          return Array.from(eventsMap.values());
      }, { typeStr });
    };

    for (const acc of hierarchy) {
        console.log(`[GA4-PLAYWRIGHT] account encontrada: ${acc.accountName}`);
        console.log(`[GA4-PLAYWRIGHT] properties encontradas: ${acc.properties.length}`);
        
        for (const prop of acc.properties) {
            console.log(`[GA4-PLAYWRIGHT] acessando Events Hub para a property ${prop.propertyName}`);
            // GA4 usa diferentes URLs para eventos dependendo da versão da interface (antiga ou nova)
            const targetUrls = [
                `https://analytics.google.com/analytics/web/#/a${acc.accountId}p${prop.propertyId}/admin/events/hub`, // legada
                `https://analytics.google.com/analytics/web/#/a${acc.accountId}p${prop.propertyId}/admin/events` // moderna
            ];
            
            let finalPropEvents = [];
            for (let targetUrl of targetUrls) {
                console.log(`[GA4-PLAYWRIGHT] Tentando URL: ${targetUrl}`);
                await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                
                // Espera explícita para os dados da tabela popularem, já que GWT/Angular fazem lazy load
                // Aguardamos até que um ga-event-table-row, mat-row ou a string "Event name" apareçam
                try {
                    await page.waitForFunction(() => {
                        return document.querySelectorAll('mat-row, ga-event-table-row').length > 0 ||
                               document.body.innerText.includes('Nome do evento') ||
                               document.body.innerText.includes('Event name');
                    }, { timeout: 15000 });
                } catch (e) {
                    console.log(`[GA4-PLAYWRIGHT] Timeout aguardando tabela carregar em ${targetUrl}`);
                }
                
                await page.waitForTimeout(4000); // Mais uma folga 
                
                const keyEventsTable = await extractFromCurrentTable("Key event");
                const allEventsTable = await extractFromCurrentTable("Recent event");
                
                const eventMap = new Map();
                keyEventsTable.forEach(e => eventMap.set(e.eventName, e));
                allEventsTable.forEach(e => {
                    if (!eventMap.has(e.eventName)) {
                        eventMap.set(e.eventName, e);
                    }
                });
                
                finalPropEvents = Array.from(eventMap.values());
                if (finalPropEvents.length > 0) {
                     break; // Achou os eventos, não precisa tentar a próxima URL
                }
            }
            
            prop.events = finalPropEvents;
            
            console.log(`[GA4-PLAYWRIGHT] eventos encontrados na prop ${prop.propertyId}: ${finalPropEvents.length}`);
        }
    }

    const dataDir = path.resolve('backend/data');
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
    if (globalContext) {
        await globalContext.close().catch(() => {});
        globalContext = null;
    }
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
