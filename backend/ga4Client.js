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
                let aId = m[2] ? m[1] : `DefaultAccount`; 
                let pId = m[2] ? m[2] : m[1];
                let text = link.innerText.trim().split('\n')[0];
                
                // Ignora links soltos de navegação como "Admin"
                if (!text || text.toLowerCase().includes("admin") || text.toLowerCase().includes("home")) {
                    continue;
                }
                
                let accName = aId === 'DefaultAccount' ? "Conta Default" : `Conta ${aId}`;
                
                // Tenta achar o nome da conta perto do link (geralmente vem acima num container de lista)
                let parent = link.closest('.account-row, [role="listitem"], [role="treeitem"], .vds-list');
                if (parent && parent.innerText) {
                    let parentLines = parent.innerText.split('\n').filter(l => l.trim().length > 0);
                    if (parentLines.length > 0 && parentLines[0] !== text) {
                         accName = parentLines[0]; 
                    }
                }
                
                let acc = result.find(a => a.accountId === aId);
                // Agrupa caso ainda não tenha (ou seja default)
                if (!acc && aId === 'DefaultAccount') {
                   acc = result.find(a => a.accountName === "Conta Default");
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
        
        // Fallback robusto se o account switcher falhar (garantir pelo menos a conta atual)
        if (result.length === 0) {
            const match = window.location.href.match(/a(\d+)p(\d+)/) || window.location.href.match(/\/p(\d+)/);
            if (match) {
                let accId = match[2] ? match[1] : `CurrentAccount`;
                let propId = match[2] ? match[2] : match[1];
                
                let accName = `Conta ${accId}`;
                let propName = `Propriedade ${propId}`;

                // Tenta obter o texto correto do seletor global do GA4 na barra superior
                let selectorBtn = document.querySelector('[data-test-id="asset-selector-button"], .suites-asset-selector, button[aria-label*="conta"], button[title*="Analytics" i]');
                if (selectorBtn && selectorBtn.innerText) {
                    let parts = selectorBtn.innerText.split('\n').map(s=>s.trim()).filter(s=>s.length > 0 && !s.includes('Analytics'));
                    if (parts.length >= 2) {
                        accName = parts[0];
                        propName = parts[1];
                    } else if (parts.length === 1) {
                        propName = parts[0];
                    }
                }
                
                result.push({
                    accountId: accId,
                    accountName: accName,
                    properties: [{
                        propertyId: propId,
                        propertyName: propName,
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
          
          // Especialmente para a aba/conteiner de Key Events que o usuário mencionou:
          // "key_events_tab class=ng-star-inserted" "event-name ou event-name ng-star-inserted"
          
          let eventElements = Array.from(document.querySelectorAll('.event-name'));
          
          // Se encontrou usando a classe específica do GA4
          if (eventElements.length > 0) {
              for (const el of eventElements) {
                  let name = el.innerText.trim().split('\n')[0];
                  if (name && name.length > 1 && name.length < 100 && !name.includes("carregando")) {
                     eventsMap.set(name, {
                           platform: "GA4",
                           eventName: name,
                           eventType: typeStr, // Key Event ou Recent Event
                           status: "Ativo"
                     });
                  }
              }
              return Array.from(eventsMap.values());
          }
          
          // Caso a versão da UI seja ligeiramente diferente, fallback para a busca customizada nas linhas
          const rows = Array.from(document.querySelectorAll('tr, mat-row, ga-event-table-row, [role="row"], .particle-table-row'));
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
                   let name = cols[0];
                   name = name.split('\n')[0].trim(); // Se a coluna também compôs múltiplos spans aglomerados
                   
                   // Nomes de eventos válidos normalmente são ex: "page_view", "click", "first_visit"
                   // Ignorar "COUNTRY" que costuma vir de outras tabelas ou selects na tela
                   if (name && name.length > 1 && name.length < 100 && !name.includes("carregando") && !name.includes("Nenhum") && name.toUpperCase() !== "COUNTRY") {
                       eventsMap.set(name, {
                           platform: "GA4",
                           eventName: name,
                           eventType: typeStr,
                           status: "Ativo"
                       });
                   }
               } else if (text.trim().length > 1) {
                   // Fallback extremo
                   let parsedName = text.trim().split('\n')[0].trim();
                   if (parsedName.length > 1 && parsedName.length < 100 && !parsedName.includes("carregando") && !parsedName.includes("Nenhum") && parsedName.toUpperCase() !== "COUNTRY") {
                       eventsMap.set(parsedName, {
                           platform: "GA4",
                           eventName: parsedName,
                           eventType: typeStr,
                           status: "Ativo"
                       });
                   }
               }
          }
          return Array.from(eventsMap.values());
      }, { typeStr });
    };

    for (const acc of hierarchy) {
        console.log(`[GA4-PLAYWRIGHT] account encontrada: ${acc.accountName}`);
        console.log(`[GA4-PLAYWRIGHT] properties encontradas: ${acc.properties.length}`);
        
        for (const prop of acc.properties) {
            console.log(`[GA4-PLAYWRIGHT] acessando Key Events e Recent Events para a property ${prop.propertyName}...`);
            
            let isRealAccount = /^\d+$/.test(acc.accountId);
            let accountPrefix = isRealAccount ? `a${acc.accountId}` : '';
            
            // Visitamos sempre primeiro o painel Admin daquela propriedade para garantir que a sessão "mude" para ela
            const fallbackAdminUrl = `https://analytics.google.com/analytics/web/#/${accountPrefix}p${prop.propertyId}/admin`;
            
            console.log(`[GA4-PLAYWRIGHT] acessando Key Events para a property ${prop.propertyId} / ${prop.propertyName}...`);
            
            // Passo 1: Ir para o Admin da propriedade
            console.log(`[GA4-PLAYWRIGHT] Inicializando UI Admin: ${fallbackAdminUrl}`);
            await page.goto(fallbackAdminUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForTimeout(3000); // Aguarda navegação
            
            // Passo 2: Ir para o Hub de eventos / Key events
            const targetUrlsKeyEvents = [
                `https://analytics.google.com/analytics/web/#/${accountPrefix}p${prop.propertyId}/admin/events/hub`, // user confirmed
                `https://analytics.google.com/analytics/web/#/${accountPrefix}p${prop.propertyId}/admin/property/key-events`, // se a primeira falhar
                `https://analytics.google.com/analytics/web/#/${accountPrefix}p${prop.propertyId}/admin/conversions` 
            ];
            
            const targetUrlsRecentEvents = [
                `https://analytics.google.com/analytics/web/#/${accountPrefix}p${prop.propertyId}/admin/events`, // moderna
            ];
            
            let eventMap = new Map();
            
            // 1. Visitar Key Events
            for (let targetUrl of targetUrlsKeyEvents) {
                console.log(`[GA4-PLAYWRIGHT] Tentando URL Key Events: ${targetUrl}`);
                try {
                    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
                    await page.waitForFunction(() => {
                        return document.querySelectorAll('mat-row, ga-event-table-row').length > 0 ||
                               document.body.innerText.includes('Nome do evento') ||
                               document.body.innerText.includes('Event name') ||
                               document.body.innerText.includes('Nenhum evento');
                    }, { timeout: 15000 });
                } catch (e) {
                    console.log(`[GA4-PLAYWRIGHT] Timeout ou vazia aguardando Key Events em ${targetUrl}`);
                }
                
                await page.waitForTimeout(3000); 
                const keyEventsTable = await extractFromCurrentTable("Key event");
                console.log(`[GA4-PLAYWRIGHT] Achados ${keyEventsTable.length} Key Events.`);
                keyEventsTable.forEach(e => eventMap.set(e.eventName, e));
                
                if (keyEventsTable.length > 0) break; // achou os key events aqui, não precisa tentar o próximo link de key events
            }

            // 2. Visitar Recent Events
            for (let targetUrl of targetUrlsRecentEvents) {
                console.log(`[GA4-PLAYWRIGHT] Tentando URL Recent Events: ${targetUrl}`);
                try {
                    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
                    await page.waitForFunction(() => {
                        return document.querySelectorAll('mat-row, ga-event-table-row').length > 0 ||
                               document.body.innerText.includes('Nome do evento') ||
                               document.body.innerText.includes('Event name') ||
                               document.body.innerText.includes('Nenhum evento');
                    }, { timeout: 15000 });
                } catch (e) {
                    console.log(`[GA4-PLAYWRIGHT] Timeout ou vazia aguardando Recent Events em ${targetUrl}`);
                }
                
                await page.waitForTimeout(3000); 
                const allEventsTable = await extractFromCurrentTable("Recent event");
                console.log(`[GA4-PLAYWRIGHT] Achados ${allEventsTable.length} Recent Events.`);
                allEventsTable.forEach(e => {
                    // Se não existe, adiciona. Se já existe como Key Event, mantém como Key Event!
                    if (!eventMap.has(e.eventName)) {
                        eventMap.set(e.eventName, e);
                    }
                });
                
                if (allEventsTable.length > 0) break; // achou os recent events, já pode parar de tentar
            }
            
            const finalPropEvents = Array.from(eventMap.values());
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
