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
    console.log(`[GA4-PLAYWRIGHT] iniciando navegador em: ${userDataDir}`);
    
    // Tentativa Headless
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

    console.log(`[GA4-PLAYWRIGHT] abrindo Google Analytics (Headless)`);
    await page.goto('https://analytics.google.com/analytics/web/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
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
       await page.goto('https://analytics.google.com/analytics/web/', { waitUntil: 'domcontentloaded', timeout: 60000 });
       
       console.log('[GA4-PLAYWRIGHT] aguardando login manual pelo usuário (Timeout: 5 minutos)');
       try {
           await page.waitForURL(/analytics\.google\.com\/analytics\/web/, { timeout: 300000 });
       } catch(e) {
           throw new Error("Tempo limite para login esgotado ou URL do GA4 não alcançada.");
       }
       
       console.log('[GA4-PLAYWRIGHT] login detectado no modo assistido!');
       // Dá um tempinho extra para SPA do GA4 carregar a home e os cookies fixarem
       await page.waitForTimeout(5000);
    }

    console.log('[GA4-PLAYWRIGHT] Sessão validada. Coletando accounts/properties/eventos');
    
    // Tenta ir para a tela de eventos da URL atual se já contiver a property
    let urlMatch = page.url().match(/\/p(\d+)/);
    if (urlMatch) {
       console.log(`[GA4-PLAYWRIGHT] Propriedade atual detectada: ${urlMatch[1]}`);
    } else {
       // Espera algum redirect do dashboard inicial
       await page.waitForTimeout(10000);
    }
    
    // Tenta extrair a tabela da UI atual ou pede para o usuário navegar, mas tentaremos automatizado
    console.log('[GA4-PLAYWRIGHT] Procurando eventos na página atual ou API responses interceptadas...');
    
    // Injeção de código para tentar extrair da tabela visível (mat-table, etc)
    const extractedEvents = await page.evaluate(async () => {
        // Tenta achar tabelas de eventos
        const events = [];
        let accountName = document.title.split('-')[0]?.trim() || "GA4 Account";
        let propertyName = "Propriedade Atual";
        let propertyId = window.location.href.match(/\/p(\d+)/)?.[1] || "Desconhecido";
        
        // Pega os itens do header que tem os nomes
        const headerTitle = document.querySelector('.suite-name')?.innerText || document.querySelector('.top-bar-title')?.innerText || "";
        if (headerTitle) { propertyName = headerTitle; }

        const rows = Array.from(document.querySelectorAll('tr, .particle-table-row, mat-row'));
        if (rows.length === 0) return null; // Retorna null para o backend saber que não achou

        for (const row of rows) {
             const text = row.innerText || "";
             if (text.includes("Nome do evento") || text.includes("Event name")) continue;
             
             // Extração genérica bem heurística com base nas colunas do GA4
             const cols = Array.from(row.querySelectorAll('td, .particle-table-cell, mat-cell')).map(c => c.innerText.trim());
             if (cols.length >= 2) {
                 const name = cols[0];
                 const countStr = cols[1].replace(/[^0-9]/g, '');
                 const count = countStr ? parseInt(countStr, 10) : null;
                 if (name && name.length > 2) {
                     events.push({
                         id: Math.random().toString(36).substring(7),
                         name: name,
                         platform: "GA4",
                         accountName: accountName,
                         propertyName: propertyName,
                         propertyId: propertyId,
                         eventCount: count,
                         status: "ativo",
                         lastOccurrence: new Date().toISOString()
                     });
                 }
             }
        }
        return events.length > 0 ? events : null;
    });

    let finalEvents = extractedEvents;

    if (!finalEvents) {
        // Fallback: se não conseguiu extrair da DOM atual, e estamos headful, esperamos o usuário navegar:
        if (needsLogin || !context.pages().length) {
            throw new Error("Não foi possível localizar eventos na página inicial. Navegue manualmente até Admin > Exibição de Dados > Eventos.");
        } else {
             console.log('[GA4-PLAYWRIGHT] Falha na extração headless, avisando erro UI...');
             throw new Error("Tabela de eventos não encontrada no GA4. Tente novamente ou abra o GA4 e certifique-se de acessar uma propriedade válida.");
        }
    }

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
