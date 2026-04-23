import fs from 'fs/promises';
import path from 'path';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_URL || 'https://confluence.bradesco.com.br:8443';
const DEFAULT_PARENT_ID = '1542391004';

const getHeaders = () => {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  if (process.env.CONFLUENCE_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.CONFLUENCE_TOKEN}`;
  }
  return headers;
};

// --- Sync Utils baseadas na logica validada pelo usuario ---
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
  if (link && link.href) return link.href.trim();
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

async function buscarFilhasDiretas(pageId, pageSize = 100) {
  let start = 0;
  let pages = [];
  let keepGoing = true;

  while (keepGoing) {
    const url = `${CONFLUENCE_BASE_URL}/rest/api/content/${pageId}/child/page?limit=${pageSize}&start=${start}&expand=version,history.lastUpdated`;
    const res = await fetch(url, { headers: getHeaders() });
    if(!res.ok) throw new Error("Erro buscarFilhasDiretas");
    const data = await res.json();
    const batch = data.results || [];

    pages = pages.concat(batch);
    if (batch.length < pageSize) keepGoing = false;
    else start += pageSize;
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
    if (regexDataLayer.test(texto)) ehMapa = true;
    const temEventCategory = texto.includes('event_category');
    const temEventAction = texto.includes('event_action');
    const temEventLabel = texto.includes('event_label');
    if (temEventCategory && temEventAction && temEventLabel) temGA3 = true;
  }
  if (!ehMapa) return '';
  if (temGA3) return 'GA3';
  return 'GA4';
}

async function extrairDadosPagina(pageId) {
  try {
    const url = `${CONFLUENCE_BASE_URL}/pages/viewpage.action?pageId=${pageId}`;
    const res = await fetch(url, { headers: getHeaders() });
    if(!res.ok) throw new Error("Erro viewpage");
    const html = await res.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const cabecalho = extrairCamposCabecalhoDoDoc(doc);
    const tipo_mapa = classificarTipoMapaDoDoc(doc);
    return { cabecalho, tipo_mapa };
  } catch (e) {
    return { cabecalho: {}, tipo_mapa: '' };
  }
}

export async function runPremiumSync(onProgress, options = {}) {
  const parentId = options.parentId || DEFAULT_PARENT_ID;
  const maxRows = options.maxRows || null; 
  const pageSize = options.pageSize || 100;
  
  const allRows = [];
  
  onProgress('CONECTANDO', 'Autenticando e estabelecendo conexão segura com Confluence...');
  await new Promise(r => setTimeout(r, 1000));

  onProgress('MAPEANDO', 'Buscando árvore de artefatos...');

  async function percorrerArvore(pageId, nivel, parentTitulo, trilha) {
    if (maxRows !== null && allRows.length >= maxRows) return;

    const children = await buscarFilhasDiretas(pageId, pageSize);

    for (const page of children) {
      if (maxRows !== null && allRows.length >= maxRows) break;
      const netas = await buscarFilhasDiretas(page.id, pageSize);
      const ehFolha = netas.length === 0;
      
      const trilhaAtual = [...trilha, { id: page.id, titulo: limpar(page.title), nivel }];
      
      let cabecalho = {};
      let tipo_mapa = '';

      if (ehFolha) {
        onProgress('ORGANIZANDO', `Analisando metadados: ${page.title}`);
        const dadosPagina = await extrairDadosPagina(page.id);
        tipo_mapa = dadosPagina.tipo_mapa;
        if (ehMapaValidoPorTitulo(page.title)) cabecalho = dadosPagina.cabecalho;
      }

      const estrutura = extrairProdutoSubprodutoDaTrilha(trilhaAtual, nivel);
      const row = {
        id: page.id || '',
        titulo: page.title || '',
        link: `${CONFLUENCE_BASE_URL}/pages/viewpage.action?pageId=${page.id}`,
        ultima_atualizacao: (page.history?.lastUpdated?.when) || '',
        responsavel: (page.version?.by?.displayName) || '',
        versao: (page.version?.number) || '',
        nivel: nivel,
        pai: parentTitulo || '',
        produto: estrutura.produto,
        subproduto: estrutura.subproduto,
        produto_servico: cabecalho.produto_servico || '',
        numero_da_task: cabecalho.n_da_task || '',
        figma_xd: cabecalho.figma_xd || '',
        propriedade_ga4_stream_id: cabecalho.propriedade_ga4_stream_id || '',
        firebase: cabecalho.firebase || '',
        gtm_id: cabecalho.gtm_id || '',
        dominio_exclusivo_web: cabecalho.dominio_exclusivo_web || cabecalho.dominio_exclusivo_web_ || '',
        tipo_mapa: tipo_mapa
      };

      allRows.push(row);

      if (netas.length > 0) {
        await percorrerArvore(page.id, nivel + 1, page.title, trilhaAtual);
      }
    }
  }

  try {
    await percorrerArvore(parentId, 1, 'Mapas de Métricas - Salla', []);
    
    onProgress('ATUALIZANDO', `Sobrescrevendo base local com ${allRows.length} artefatos...`);
    const filePath = path.resolve(__dirname, 'data/inventario.json');
    
    // Simulate updating delay
    await new Promise(r => setTimeout(r, 800));
    
    await fs.writeFile(filePath, JSON.stringify(allRows, null, 2), 'utf8');
    
    onProgress('CONCLUIDA', 'Base sincronizada com sucesso.');
    return { success: true, count: allRows.length, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error("Erro na Sincronização:", error);
    onProgress('ERRO', 'Falha ao sincronizar com servidor Confluence.');
    throw error;
  }
}

// Manter exportacoes antigas para não quebrar outras rotas que possam usa-lo.
export { getHeaders };
export async function runCollection(rootId) {
  // Legacy adapter using premium sync
  return await runPremiumSync(() => {}, { parentId: rootId });
}
