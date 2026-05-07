import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

let globalContext = null;
let globalPage = null;

export async function initPlaywright() {
    if (!globalContext) {
        const userDataDir = path.resolve('data/playwright_ga4_session');
        console.log(`[GA4-PLAYWRIGHT] abrindo GA4 em: ${userDataDir}`);
        
        globalContext = await chromium.launchPersistentContext(userDataDir, {
            headless: false, // Mantém headful mas pode ser minimizado/background conforme pedido, para garantir login
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
        globalPage = globalContext.pages().length > 0 ? globalContext.pages()[0] : await globalContext.newPage();
    }
    return globalPage;
}

export async function getAccountsPW() {
    console.log('[GA4-PLAYWRIGHT] abrindo GA4');
    const page = await initPlaywright();
    
    await page.goto('https://analytics.google.com/analytics/web/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    if (page.url().includes('accounts.google.com') || page.url().includes('ServiceLogin')) {
        console.log('[GA4-PLAYWRIGHT] aguardando login');
        await page.waitForURL(/analytics\.google\.com\/analytics\/web/, { timeout: 300000 });
        console.log('[GA4-PLAYWRIGHT] login detectado');
        await page.waitForTimeout(5000);
    } // else já está logado

    console.log('[GA4-PLAYWRIGHT] coletando accounts...');
    
    // Tenta extrair da UI
    const accounts = await page.evaluate(() => {
        const results = [];
        let accountName = "Account Atual";
        const titleParts = document.title.split('-');
        if (titleParts.length > 0 && titleParts[0].trim().length > 0 && !titleParts[0].includes("Google Analytics")) {
            accountName = titleParts[0].trim();
        } else {
             const logoText = document.querySelector('.suite-name')?.innerText;
             if (logoText) accountName = logoText;
        }
        results.push({ id: 'current', name: accountName });
        return results;
    });

    console.log(`[GA4-PLAYWRIGHT] accounts encontradas: ${accounts.length}`);
    return accounts;
}

export async function getPropertiesPW(accountId) {
    console.log(`[GA4-PLAYWRIGHT] conta selecionada: ${accountId}`);
    const page = globalPage;
    if (!page) throw new Error("Sessão não iniciada");

    let propertyId = page.url().match(/\/p(\d+)/)?.[1] || "default";
    
    const props = await page.evaluate((propId) => {
        const results = [];
        let propertyName = "Property Atual";
        const headerTitle = document.querySelector('.suite-name')?.innerText || document.querySelector('.top-bar-title')?.innerText;
        if (headerTitle) { propertyName = headerTitle; }
        results.push({ id: propId, name: propertyName });
        return results;
    }, propertyId);
    
    console.log(`[GA4-PLAYWRIGHT] properties encontradas: ${props.length}`);
    return props;
}

export async function extractEventsPW(accountId, accountName, propertyId, propertyName) {
    console.log(`[GA4-PLAYWRIGHT] property selecionada: ${propertyName}/${propertyId}`);
    console.log(`[GA4-PLAYWRIGHT] acessando Admin > Data display > Events`);
    
    let page = globalPage;
    if (!page) {
        page = await initPlaywright();
    }

    if (propertyId && propertyId !== "default") {
        await page.goto(`https://analytics.google.com/analytics/web/#/p${propertyId}/admin/events`, { waitUntil: 'domcontentloaded' });
    } else {
        await page.goto('https://analytics.google.com/analytics/web/', { waitUntil: 'domcontentloaded' });
    }
    
    // Check login
    if (page.url().includes('accounts.google.com') || page.url().includes('ServiceLogin')) {
        console.log('[GA4-PLAYWRIGHT] aguardando login');
        try {
            await page.waitForURL(/analytics\.google\.com\/analytics\/web/, { timeout: 300000 });
            console.log('[GA4-PLAYWRIGHT] login detectado');
            await page.waitForTimeout(5000);
            
            // Re-navigate to events after login just in case
            if (propertyId && propertyId !== "default") {
                await page.goto(`https://analytics.google.com/analytics/web/#/p${propertyId}/admin/events`, { waitUntil: 'domcontentloaded' });
            }
        } catch(e) {
            throw new Error("Login no GA4 não finalizado a tempo (timeout).");
        }
    }

    // Fallback click admin if URL jump fails or needs manual load
    try {
        await page.waitForTimeout(5000); 
        // O GA4 carrega SPA, tentar garantir que a tabela seja montada
        await page.waitForSelector('mat-table, .particle-table, table', { timeout: 15000 });
    } catch(e) {
        console.log("[GA4-PLAYWRIGHT] Tentativa de navegar via menus...");
        try {
            await page.click('a[href*="/admin"], [data-test-id="admin-button"]', { timeout: 5000 });
            await page.waitForTimeout(2000);
            await page.click('text="Data display"', { timeout: 5000 });
            await page.click('text="Events"', { timeout: 5000 });
            await page.waitForTimeout(5000);
        } catch(err) {
             console.log("[GA4-PLAYWRIGHT] Menu navigation timeout");
        }
    }

    const extractedEvents = await page.evaluate((vars) => {
        const { accountId, accountName, propertyId, propertyName } = vars;
        const events = [];
        const rows = Array.from(document.querySelectorAll('tr, .particle-table-row, mat-row'));
        
        for (const row of rows) {
             const text = row.innerText || "";
             if (text.includes("Event name") || text.includes("Nome do evento")) continue;
             
             const cols = Array.from(row.querySelectorAll('td, .particle-table-cell, mat-cell')).map(c => c.innerText.trim());
             if (cols.length >= 1) {
                 const name = cols[0];
                 const isKeyEventToggle = row.querySelector('mat-switch.mat-checked, button[aria-checked="true"], .is-key-event');
                 const isKeyEvent = isKeyEventToggle !== null;
                 
                 if (name && name.length > 1 && !name.includes("events")) {
                     events.push({
                         accountId: accountId,
                         accountName: accountName,
                         propertyId: propertyId,
                         propertyName: propertyName,
                         platform: "GA4",
                         eventName: name,
                         isKeyEvent: isKeyEvent,
                         status: "ativo"
                     });
                 }
             }
        }
        return events.length > 0 ? events : null;
    }, { accountId, accountName, propertyId, propertyName });

    if (!extractedEvents) {
        throw new Error("Tabela de eventos não encontrada para esta property.");
    }
    
    console.log(`[GA4-PLAYWRIGHT] eventos encontrados: ${extractedEvents.length}`);
    const dataDir = path.resolve('data');
    await fs.mkdir(dataDir, { recursive: true });
    const filePath = path.resolve(dataDir, 'ga4-events.json');
    console.log(`[GA4-PLAYWRIGHT] salvando backend/data/ga4-events.json`);
    await fs.writeFile(filePath, JSON.stringify(extractedEvents, null, 2), 'utf8');

    return extractedEvents;
}

export async function closePlaywright() {
    if (globalContext) {
        await globalContext.close();
        globalContext = null;
        globalPage = null;
    }
}

