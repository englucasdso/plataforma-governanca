/**
 * Confluence Data Collector Client
 * 
 * Este módulo é responsável por extrair dados do Confluence via API REST
 * implementando parse com Playwright e respeitando o Node 18.17.0.
 */
import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';

const CONFLUENCE_BASE_URL = 'https://confluence.bradesco.com.br:8443';
const API_PATH = '/rest/api/content';

const getHeaders = () => {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  if (typeof process !== 'undefined' && process.env.CONFLUENCE_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.CONFLUENCE_TOKEN}`;
  }
  return headers;
};

// --- Funções Auxiliares de Fetch ---
async function fetchConfluence(endpoint) {
  const url = endpoint.startsWith('http') ? endpoint : `${CONFLUENCE_BASE_URL}${endpoint}`;
  console.log(`[fetchConfluence] GET JSON: ${url}`);
  try {
    const response = await fetch(url, { headers: getHeaders(), credentials: 'omit', signal: AbortSignal.timeout(60000) });
    console.log(`[fetchConfluence] Status: ${response.status}`);
    if (!response.ok) {
      throw new Error(`Erro na API Confluence: ${response.status} ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error(`Timeout de 60s excedido na API (JSON): ${url}`);
    }
    throw error;
  }
}

async function fetchConfluenceText(endpoint) {
  const url = endpoint.startsWith('http') ? endpoint : `${CONFLUENCE_BASE_URL}${endpoint}`;
  console.log(`[fetchConfluence] GET TEXT: ${url}`);
  try {
    const response = await fetch(url, { headers: getHeaders(), credentials: 'omit', signal: AbortSignal.timeout(60000) });
    console.log(`[fetchConfluence] Status: ${response.status}`);
    if (!response.ok) {
      throw new Error(`Erro na API Confluence (Text): ${response.status} ${response.statusText}`);
    }
    return response.text();
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error(`Timeout de 60s excedido na API (TEXT): ${url}`);
    }
    throw error;
  }
}

// --- Funções Auxiliares (Baseadas na referência técnica) ---
const MAX_CARACTERES_PRODUTO = 20;
const MAX_CARACTERES_SUBPRODUTO = 15;

function limpar(txt) {
  return String(txt || '').replace(/\s+/g, ' ').trim();
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

async function buscarFilhasDiretas(pageId, pageSize = 100) {
  let start = 0;
  let pages = [];
  let keepGoing = true;

  while (keepGoing) {
    const url = `${API_PATH}/${pageId}/child/page?limit=${pageSize}&start=${start}&expand=version,history.lastUpdated`;
    const data = await fetchConfluence(url);
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

async function extrairDadosPlaywright(html, page) {
  await page.setContent(html);
  
  return await page.evaluate(() => {
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
       // Only get attribute if it exists, to avoid null accessing issues
       if (link && link.getAttribute('href')) return link.getAttribute('href').trim();

       const panelContent = cell.querySelector('.panelContent');
       if (panelContent) return limpar(panelContent.textContent);

       return limpar(cell.textContent);
    }

    let cabecalho = {};
    const tabela0 = document.querySelectorAll('table')[0];
    if (tabela0) {
       const linhas = Array.from(tabela0.querySelectorAll('tr'));
       for (const linha of linhas) {
          const cells = Array.from(linha.querySelectorAll('th, td'));
          if (cells.length < 2) continue;

          const label = limpar(cells[0].textContent);
          const valor = extrairValorDeCelula(cells[1]);

          if (label) {
             cabecalho[normalizarChave(label)] = valor;
          }
       }
    }

    const tabelas = Array.from(document.querySelectorAll('table')).slice(0, 40);
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

    let tipo_mapa = '';
    if (ehMapa) {
       tipo_mapa = temGA3 ? 'GA3' : 'GA4';
    }

    return { cabecalho, tipo_mapa };
  });
}

async function extrairDadosPagina(pageId, pwPage) {
  try {
    const endpoint = `/pages/viewpage.action?pageId=${pageId}`;
    const html = await fetchConfluenceText(endpoint);
    return await extrairDadosPlaywright(html, pwPage);
  } catch (e) {
    return { cabecalho: {}, tipo_mapa: '' };
  }
}

async function buildInventory(rootPageId, maxReqRows = null) {
  console.log(`[buildInventory] Iniciando mapeamento da estrutura de produtos (rootId: ${rootPageId})`);
  const allRows = [];
  
  // Launch playwright browser
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const pwPage = await browser.newPage();

  const processStartTime = Date.now();

  async function percorrerArvore(pageId, nivel, parentTitulo, trilha) {
    if (Date.now() - processStartTime > 300000) {
       throw new Error('Tempo limite de 5 minutos excedido durante o mapeamento (Timeout Global).');
    }

    if (maxReqRows !== null && allRows.length >= maxReqRows) return;

    console.log(`[buildInventory] Buscando filhas da página ${pageId} (Nível ${nivel})...`);
    const children = await buscarFilhasDiretas(pageId);
    console.log(`[buildInventory] Encontradas ${children.length} filhas para a página ${pageId}.`);

    for (const page of children) {
      if (Date.now() - processStartTime > 300000) {
         throw new Error('Tempo limite de 5 minutos excedido durante a organização de artefatos (Timeout Global).');
      }

      if (maxReqRows !== null && allRows.length >= maxReqRows) break;

      console.log(`[buildInventory] Processando página ID: ${page.id} - Título: ${page.title}`);
      const netas = await buscarFilhasDiretas(page.id, 100);
      const ehFolha = netas.length === 0;

      const trilhaAtual = [
        ...trilha,
        { id: page.id, titulo: limpar(page.title), nivel: nivel }
      ];

      let cabecalho = {};
      let tipo_mapa = '';

      if (ehFolha) {
        console.log(`[buildInventory] Página ${page.id} é folha. Extraindo dados com Playwright...`);
        const dadosPagina = await extrairDadosPagina(page.id, pwPage);
        tipo_mapa = dadosPagina.tipo_mapa;

        if (ehMapaValidoPorTitulo(page.title)) {
          cabecalho = dadosPagina.cabecalho;
        }
      }

      const estrutura = extrairProdutoSubprodutoDaTrilha(trilhaAtual, nivel);

      const row = {
        id: page.id || '',
        titulo: page.title || '',
        link: `${CONFLUENCE_BASE_URL}/pages/viewpage.action?pageId=${page.id}`,
        ultima_atualizacao: (page.history && page.history.lastUpdated && page.history.lastUpdated.when) || '',
        responsavel: (page.version && page.version.by && page.version.by.displayName) || '',
        versao: (page.version && page.version.number) || '',
        nivel: nivel,
        pai: parentTitulo || '',
        produto: estrutura.produto,
        subproduto: estrutura.subproduto,
        produto_servico: cabecalho.produto_servico || '',
        numero_da_task: cabecalho.n_da_task || cabecalho.numero_da_task || '',
        figma_xd: cabecalho.figma_xd || cabecalho.figma || '',
        propriedade_ga4_stream_id: cabecalho.propriedade_ga4_stream_id || cabecalho.ga4_id || '',
        firebase: cabecalho.firebase || '',
        gtm_id: cabecalho.gtm_id || '',
        dominio_exclusivo_web: cabecalho.dominio_exclusivo_web || cabecalho.dominio_exclusivo_web_ || '',
        tipo_mapa: tipo_mapa
      };

      allRows.push(row);

      if (allRows.length % 20 === 0) {
        console.log('Processados:', allRows.length);
      }

      if (netas.length > 0) {
        await percorrerArvore(page.id, nivel + 1, page.title, trilhaAtual);
      }
    }
  }

  try {
    await percorrerArvore(rootPageId, 1, 'Mapas de Métricas - Salla', []);
  } finally {
    await browser.close();
  }
  
  return allRows;
}

async function exportToJSON(data) {
  console.log(`[exportToJSON] Iniciando exportação para JSON. Quantidade: ${data.length}`);
  const filePath = path.resolve('backend/data/inventario.json');
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`[exportToJSON] Inventário atualizado no backend com ${data.length} artefatos.`);
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
    console.time('Coleta Confluence V2 Playwright');
    console.log(`[runCollection] Chamando buildInventory...`);
    const inventory = await buildInventory(rootPageId, maxRows);
    console.log(`[runCollection] buildInventory concluído. Chamando exportToJSON...`);
    await exportToJSON(inventory);
    console.timeEnd('Coleta Confluence V2 Playwright');
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
