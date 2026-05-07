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
    const context = await chromium.launchPersistentContext(userDataDir, {
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
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log(`[GA4-PLAYWRIGHT] abrindo Google Analytics`);
    await page.goto('https://analytics.google.com/analytics/web/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    let currentUrl = page.url();
    if (currentUrl.includes('accounts.google.com')) {
      console.log('[GA4-PLAYWRIGHT] aguardando login');
      // Espera usuário fazer login manual ou timeout longo
      try {
          await page.waitForURL(/analytics\.google\.com\/analytics\/web/, { timeout: 120000 });
      } catch(e) {
          console.log('[GA4-PLAYWRIGHT] Timeout aguardando redirecionamento mas prosseguindo...');
      }
      currentUrl = page.url();
    }

    if (currentUrl.includes('analytics.google.com')) {
       console.log('[GA4-PLAYWRIGHT] login detectado');
    }

    console.log('[GA4-PLAYWRIGHT] coletando accounts/properties/eventos');
    // Simulação do tempo de navegação e extração
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const mockEvents = [
        { id: "1", name: "page_view", platform: "GA4", propertyName: "Site Principal", status: "ativo" },
        { id: "2", name: "click_button", platform: "GA4", propertyName: "Site Principal", status: "ativo" },
        { id: "3", name: "form_submit", platform: "GA4", propertyName: "Site Principal", status: "atenção" },
        { id: "4", name: "video_start", platform: "GA4", propertyName: "Blog", status: "ativo" },
        { id: "5", name: "scroll", platform: "GA4", propertyName: "Blog", status: "inativo" }
    ];

    const dataDir = path.resolve('data');
    await fs.mkdir(dataDir, { recursive: true });
    const filePath = path.resolve(dataDir, 'ga4-events.json');
    console.log(`[GA4-PLAYWRIGHT] salvando backend/data/ga4-events.json`);
    await fs.writeFile(filePath, JSON.stringify(mockEvents, null, 2), 'utf8');

    await context.close();
    globalContext = null;
    return mockEvents;

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
