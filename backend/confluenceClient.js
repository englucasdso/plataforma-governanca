/**
 * Confluence Data Collector Client
 * 
 * Este módulo é responsável por extrair dados do Confluence via API REST
 * implementando parse refinado usando cheerio e respeitando o Node 18.17.
 */
import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';

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
  const response = await fetch(url, { headers: getHeaders(), credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`Erro na API Confluence: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchConfluenceText(endpoint) {
  const url = endpoint.startsWith('http') ? endpoint : `${CONFLUENCE_BASE_URL}${endpoint}`;
  const response = await fetch(url, { headers: getHeaders(), credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`Erro na API Confluence (Text): ${response.status} ${response.statusText}`);
  }
  return response.text();
}

// --- Funções Auxiliares (Baseadas na referência técnica do cliente) ---
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

function extrairValorDeCelula($cell) {
  if (!$cell) return '';

  const link = $cell.find('a[href]').first();
  if (link.length > 0 && link.attr('href')) return link.attr('href').trim();

  const panelContent = $cell.find('.panelContent');
  if (panelContent.length > 0) return limpar(panelContent.text());

  return limpar($cell.text());
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

function extrairCamposCabecalhoDoDoc($doc) {
  const tabela0 = $doc('table').first();
  if (tabela0.length === 0) return {};

  const linhas = tabela0.find('tr').toArray();
  const campos = {};

  for (const linha of linhas) {
    const $linha = cheerio.load(linha); // Load html of the row
    const cells = $linha('th, td').toArray();
    if (cells.length < 2) continue;
    
    // We can also just use the doc instance instead of reloading:
    const $cell0 = $doc(cells[0]);
    const $cell1 = $doc(cells[1]);

    const label = limpar($cell0.text());
    const valor = extrairValorDeCelula($cell1);

    if (!label) continue;
    campos[normalizarChave(label)] = valor;
  }
  return campos;
}

function classificarTipoMapaDoDoc($doc) {
  const tabelas = $doc('table').toArray().slice(0, 40);
  const regexDataLayer = /datalayer\s*\.\s*push\s*\(\s*\{/i;

  let ehMapa = false;
  let temGA3 = false;

  for (const tabela of tabelas) {
    const defaultText = $doc(tabela).text() || '';
    const texto = String(defaultText).replace(/\s+/g, ' ').trim().toLowerCase();

    if (regexDataLayer.test(texto)) {
      ehMapa = true;
    }

    const temEventCategory = texto.includes('event_category');
    const temEventAction = texto.includes('event_action');
    const temEventLabel = texto.includes('event_label');

    if (temEventCategory && temEventAction && temEventLabel) {
      temGA3 = true;
    }
  }

  if (!ehMapa) return '';
  if (temGA3) return 'GA3';
  return 'GA4';
}

async function extrairDadosPagina(pageId) {
  try {
    const endpoint = `/pages/viewpage.action?pageId=${pageId}`;
    const html = await fetchConfluenceText(endpoint);
    const $doc = cheerio.load(html);

    const cabecalho = extrairCamposCabecalhoDoDoc($doc);
    const tipo_mapa = classificarTipoMapaDoDoc($doc);
    return { cabecalho, tipo_mapa };
  } catch (e) {
    return { cabecalho: {}, tipo_mapa: '' };
  }
}

async function buildInventory(rootPageId, maxReqRows = null) {
  const allRows = [];

  async function percorrerArvore(pageId, nivel, parentTitulo, trilha) {
    if (maxReqRows !== null && allRows.length >= maxReqRows) return;

    const children = await buscarFilhasDiretas(pageId);

    for (const page of children) {
      if (maxReqRows !== null && allRows.length >= maxReqRows) break;

      const netas = await buscarFilhasDiretas(page.id, 100);
      const ehFolha = netas.length === 0;

      const trilhaAtual = [
        ...trilha,
        { id: page.id, titulo: limpar(page.title), nivel: nivel }
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

  await percorrerArvore(rootPageId, 1, 'Mapas de Métricas - Salla', []);
  return allRows;
}

async function exportToJSON(data) {
  const filePath = path.resolve('backend/data/inventario.json');
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Inventário atualizado no backend com ${data.length} artefatos.`);
}

async function runCollection(rootPageId, maxRows) {
  console.time('Coleta Confluence V2');
  const inventory = await buildInventory(rootPageId, maxRows);
  await exportToJSON(inventory);
  console.timeEnd('Coleta Confluence V2');
  return inventory;
}

export {
  runCollection
};
