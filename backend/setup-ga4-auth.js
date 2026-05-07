import path from 'path';
import { chromium } from 'playwright';

async function main() {
    // Diretório exato usado pelo backend
    const userDataDir = path.resolve(process.cwd(), 'backend/data/playwright_ga4_session');
    
    console.log(`\n======================================================`);
    console.log(`[SETUP-GA4] CONFIGURANDO SESSÃO PERSISTENTE DO GA4`);
    console.log(`[SETUP-GA4] Diretório: ${userDataDir}`);
    console.log(`======================================================\n`);
    
    console.log('[SETUP-GA4] Abrindo navegador visível para autenticação no Google...');
    
    let context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // <-- Força abrir a interface para você logar
      channel: 'chrome',
      viewport: null,
      args: ['--start-maximized']
    });

    let page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    
    console.log('[SETUP-GA4] Acessando Google Analytics...');
    await page.goto('https://analytics.google.com/analytics/web/');
    
    console.log(`\n>>> AÇÃO NECESSÁRIA <<<`);
    console.log(`1. Faça o login na sua conta do Google na janela que abriu.`);
    console.log(`2. Certifique-se de que o painel do Google Analytics abriu corretamente.`);
    console.log(`3. Quando terminar, FECHE A JANELA DO NAVEGADOR para salvar a sessão.\n`);
    
    // Fica rodando até o navegador ser fechado pelo usuário
    context.on('close', () => {
        console.log('[SETUP-GA4] Navegador fechado. Sessão salva com sucesso!');
        console.log('[SETUP-GA4] Agora você pode usar o botão "Sincronizar GA4" na interface normalmente.\n');
        process.exit(0);
    });
}

main().catch(err => {
    console.error('[SETUP-GA4] Erro script de setup:', err);
    process.exit(1);
});
