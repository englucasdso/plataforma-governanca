/**
 * Confluence Data Collector Client
 * 
 * Este módulo extrai dados do Confluence simulando a execução direta
 * no console do navegador do usuário, resolvendo problemas de proxy/429.
 * Utiliza Playwright com sessão persistente para reaproveitar cookies.
 */
import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const CONFLUENCE_BASE_URL = 'https://confluence.bradesco.com.br:8443';

async function exportToJSON(data) {
  console.log(`[exportToJSON] Iniciando exportação para JSON. Quantidade: ${data.length}`);
  const dataDir = path.resolve('backend/data');
  await fs.mkdir(dataDir, { recursive: true });
  const filePath = path.resolve(dataDir, 'inventario.json');
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`[exportToJSON] Inventário atualizado no backend com ${data.length} artefatos.`);
}

async function buildInventory(rootPageId, maxReqRows = null) {
  console.log(`[buildInventory] Iniciando mapeamento da estrutura (rootId: ${rootPageId})`);
  
  // Define o diretório para armazenar a sessão do usuário/cookies no projeto
  const userDataDir = path.resolve('backend/data/playwright_session');
  
  console.log(`[buildInventory] Iniciando Playwright com sessão persistente em: ${userDataDir}`);
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    ignoreHTTPSErrors: true,
    viewport: null,
    args: [
      '--start-maximized',
      '--ignore-certificate-errors'
    ]
  });

  // O launchPersistentContext já cria uma aba padrão
  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
  await page.bringToFront();
  
  try {
    const ROOT_URL = `${CONFLUENCE_BASE_URL}/pages/viewpage.action?pageId=${rootPageId}`;
    console.log(`[buildInventory] Navegando via Playwright para a página base: ${ROOT_URL}`);
    
    await page.goto(ROOT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    let currentUrl = page.url();
    console.log(`[buildInventory] URL atual após o carregamento: ${currentUrl}`);

    if (currentUrl.includes('login.action') || currentUrl.includes('dologin.action') || currentUrl.includes('login')) {
      console.log('--- AUTENTICAÇÃO NECESSÁRIA ---');
      console.log('Faça login na janela do Chrome que abriu. Aguardando até sair da tela de login...');
      
      try {
        await page.waitForFunction(() => {
          return !window.location.href.includes('login.action') &&
                 !window.location.href.includes('dologin.action') &&
                 !window.location.href.includes('login');
        }, null, { timeout: 300000 });
      } catch (err) {
        throw new Error('Usuário não concluiu a autenticação no tempo limite de 5 minutos.');
      }
      
      console.log(`[buildInventory] Navegando novamente para a página base: ${ROOT_URL}`);
      await page.goto(ROOT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      currentUrl = page.url();
      console.log(`[buildInventory] URL atual após o re-carregamento: ${currentUrl}`);

      if (currentUrl.includes('login.action') || currentUrl.includes('dologin.action') || currentUrl.includes('login')) {
        throw new Error('Usuário não autenticado no Confluence. Você precisa estar logado localmente para que o script execute via sessão.');
      }
    }

    console.log(`[buildInventory] Autenticação confirmada na URL. Injetando script de extração no browser...`);

    // Injeta o script antigo que roda com `fetch` e `DOMParser` *direto na página do usuário*
    const extractedData = await page.evaluate(async ({ rootId, maxRows }) => {
      const base = window.location.protocol + '//' + window.location.host;
      const pageSize = 100;
      const allRows = [];
      const MAX_CARACTERES_PRODUTO = 20;
      const MAX_CARACTERES_SUBPRODUTO = 15;

      function limpar(txt) {
        return String(txt || '').replace(/\s+/g, ' ').trim();
      }

      function normalizarChave(txt) {
        return limpar(txt)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[|/()\-]+/g, ' ')
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, '_');
      }

      function extrairValorDeCelula(cell) {
        if (!cell) return '';

        const link = cell.querySelector('a[href]');
        if (link && link.getAttribute('href')) return link.getAttribute('href').trim();

        const panelContent = cell.querySelector('.panelContent');
        if (panelContent) return limpar(panelContent.textContent);

        return limpar(cell.textContent);
      }

      function ehMapaValidoPorTitulo(title) {
        return title && title.startsWith('MT -');
      }

      function validarProduto(txt) {
        const valor = limpar(txt);
        if (!valor) return '';
        if (valor.length > MAX_CARACTERES_PRODUTO) return '';
        return valor;
      }

      function validarSubproduto(txt) {
        const valor = limpar(txt);
        if (!valor) return '';
        if (valor.length > MAX_CARACTERES_SUBPRODUTO) return '';
        return valor;
      }

      function extrairProdutoSubprodutoDaTrilha(trilhaAtual, nivelAtual) {
        const ancestrais = trilhaAtual.filter(x => Number(x.nivel) < Number(nivelAtual));

        const ancestralProduto = ancestrais.find(x => Number(x.nivel) === 1);
        const ancestralSubproduto = ancestrais.find(x => Number(x.nivel) === 2);

        return {
          produto: validarProduto(ancestralProduto ? ancestralProduto.titulo : ''),
          subproduto: validarSubproduto(ancestralSubproduto ? ancestralSubproduto.titulo : '')
        };
      }

      async function buscarFilhasDiretas(pageId) {
        let start = 0;
        let pages = [];
        let keepGoing = true;

        while (keepGoing) {
          const url = base + '/rest/api/content/' + pageId + '/child/page?limit=' + pageSize + '&start=' + start + '&expand=version,history.lastUpdated';

          const res = await fetch(url, { credentials: 'include' });
          if (!res.ok) {
            if (res.status === 429) {
              await new Promise(r => setTimeout(r, 2000));
              continue; 
            }
            throw new Error('Falha ao buscar filhas: HTTP ' + res.status);
          }
          const data = await res.json();
          const batch = data.results || [];

          pages = pages.concat(batch);

          if (batch.length < pageSize) {
            keepGoing = false;
          } else {
            start += pageSize;
          }
        }

        return pages;
      }

      function extrairCamposCabecalhoDoDoc(doc) {
        const tabela0 = doc.querySelectorAll('table')[0];
        if (!tabela0) return {};

        const linhas = Array.from(tabela0.querySelectorAll('tr'));
        const campos = {};

        for (const linha of linhas) {
          const cells = Array.from(linha.querySelectorAll('th, td'));
          if (cells.length < 2) continue;

          const label = limpar(cells[0].textContent);
          const valor = extrairValorDeCelula(cells[1]);

          if (!label) continue;

          campos[normalizarChave(label)] = valor;
        }

        return campos;
      }

      function classificarTipoMapaDoDoc(doc) {
        const tabelas = Array.from(doc.querySelectorAll('table')).slice(0, 40);
        const regexDataLayer = /datalayer\s*\.\s*push\s*\(\s*\{/i;

        let ehMapa = false;
        let temGA3 = false;

        for (const tabela of tabelas) {
          const texto = String(tabela.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();

          if (regexDataLayer.test(texto)) {
            ehMapa = true;
          }

          if (texto.includes('event_category') && texto.includes('event_action') && texto.includes('event_label')) {
            temGA3 = true;
          }
        }

        if (!ehMapa) return '';
        if (temGA3) return 'GA3';
        return 'GA4';
      }

      async function extrairDadosPagina(pageId) {
        try {
          const url = base + '/pages/viewpage.action?pageId=' + pageId;
          const res = await fetch(url, { credentials: 'include' });
          const html = await res.text();
          const doc = new DOMParser().parseFromString(html, 'text/html');

          const cabecalho = extrairCamposCabecalhoDoDoc(doc);
          const tipo_mapa = classificarTipoMapaDoDoc(doc);

          return { cabecalho, tipo_mapa };
        } catch (e) {
          return { cabecalho: {}, tipo_mapa: '' };
        }
      }

      async function percorrerArvore(pageId, nivel, parentTitulo, trilha) {
        if (maxRows !== null && allRows.length >= maxRows) return;

        const children = await buscarFilhasDiretas(pageId);

        for (const page of children) {
          if (maxRows !== null && allRows.length >= maxRows) break;

          const netas = await buscarFilhasDiretas(page.id);
          const ehFolha = netas.length === 0;

          const trilhaAtual = [
            ...trilha,
            {
              id: page.id,
              titulo: limpar(page.title),
              nivel: nivel
            }
          ];

          let cabecalho = {};
          let tipo_mapa = '';

          if (ehFolha) {
            const dadosPagina = await extrairDadosPagina(page.id);
            tipo_mapa = dadosPagina.tipo_mapa;

            if (ehMapaValidoPorTitulo(page.title)) {
              cabecalho = dadosPagina.cabecalho;
            }
          }

          const estrutura = extrairProdutoSubprodutoDaTrilha(trilhaAtual, nivel);

          const row = {
            id: page.id || '',
            titulo: page.title || '',
            link: base + '/pages/viewpage.action?pageId=' + page.id,
            ultima_atualizacao:
              (page.history && page.history.lastUpdated && page.history.lastUpdated.when) || '',
            responsavel:
              (page.version && page.version.by && page.version.by.displayName) || '',
            versao:
              (page.version && page.version.number) || '',
            nivel: nivel,
            pai: parentTitulo || '',

            produto: estrutura.produto,
            subproduto: estrutura.subproduto,

            produto_servico: cabecalho.produto_servico || cabecalho.produto_servico_ || '',
            numero_da_task: cabecalho.n_da_task || cabecalho.numero_da_task || '',
            figma_xd: cabecalho.figma_xd || cabecalho.figma || '',
            propriedade_ga4_stream_id: cabecalho.propriedade_ga4_stream_id || cabecalho.ga4_id || '',
            firebase: cabecalho.firebase || '',
            gtm_id: cabecalho.gtm_id || '',
            dominio_exclusivo_web:
              cabecalho.dominio_exclusivo_web || cabecalho.dominio_exclusivo_web_ || '',

            tipo_mapa: tipo_mapa
          };

          allRows.push(row);

          if (allRows.length % 50 === 0) {
             console.log(`Processados: ${allRows.length}`);
          }

          if (netas.length > 0) {
            await percorrerArvore(page.id, nivel + 1, page.title, trilhaAtual);
          }
        }
      }

      console.log("Iniciando coleta a partir do Root ID:", rootId);
      await percorrerArvore(rootId, 1, 'Mapas de Métricas - Salla', []);
      console.log("Coleta concluída, total:", allRows.length);

      return allRows;
    }, { rootId: rootPageId, maxRows: maxReqRows });

    console.log(`[buildInventory] Execução no console finalizada. Quantidade coletada: ${extractedData.length}`);
    return extractedData;
  } finally {
    await context.close();
  }
}

let isCollecting = false;

async function runCollection(rootPageId, maxRows) {
  console.log(`[runCollection] INÍCIO da execução - Root ID: ${rootPageId}, Max Rows: ${maxRows}`);
  if (isCollecting) {
    console.error(`[runCollection] Erro: tentou iniciar, mas já havia uma sincronização em andamento.`);
    throw new Error('A sincronização já está em andamento. Aguarde...');
  }
  isCollecting = true;

  try {
    console.time('Coleta Confluence V2 Browser Context');
    console.log(`[runCollection] Chamando buildInventory...`);
    const inventory = await buildInventory(rootPageId, maxRows);
    console.log(`[runCollection] buildInventory concluído. Chamando exportToJSON...`);
    await exportToJSON(inventory);
    console.timeEnd('Coleta Confluence V2 Browser Context');
    console.log(`[runCollection] FIM da execução com sucesso.`);
    return inventory;
  } catch (error) {
    console.error(`[runCollection] Erro capturado na coleta: ${error.message}`);
    throw error;
  } finally {
    isCollecting = false;
  }
}

export {
  runCollection
};
