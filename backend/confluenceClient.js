/**
 * Confluence Data Collector Client
 * 
 * Este módulo é responsável por extrair dados do Confluence via API REST.
 * Funciona tanto no Browser (Console) quanto no Node.js (Servidor).
 */

let fs;
let pathModule;

if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    fs = await import('fs/promises');
    pathModule = await import('path');
  } catch (e) {
    console.warn('Falha ao carregar módulos Node, exportação para JSON desabilitada.');
  }
}

const CONFLUENCE_BASE_URL = 'https://confluence.bradesco.com.br:8443';
const API_PATH = '/rest/api/content';

/**
 * MODO 1: Execução via Browser Console (Sessão autenticada)
 * MODO 2: Execução via Node (Preparado para API Token)
 */
const getHeaders = () => {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  // Se estiver no Node e houver um token (ex: CONFLUENCE_TOKEN)
  if (typeof process !== 'undefined' && process.env.CONFLUENCE_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.CONFLUENCE_TOKEN}`;
  }

  return headers;
};

// --- Funções Auxiliares de Fetch ---

async function fetchConfluence(endpoint) {
  const url = endpoint.startsWith('http') ? endpoint : `${CONFLUENCE_BASE_URL}${endpoint}`;
  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) {
    throw new Error(`Erro na API Confluence: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// --- Funções Principais de Extração ---

/**
 * Busca filhos diretos de uma página
 * @param {string} pageId ID da página pai
 */
async function getPageChildren(pageId) {
  const endpoint = `${API_PATH}/${pageId}/child/page?expand=version,history`;
  const data = await fetchConfluence(endpoint);
  return data.results;
}

/**
 * Busca o conteúdo (HTML) de uma página
 * @param {string} pageId ID da página
 */
async function getPageContent(pageId) {
  const endpoint = `${API_PATH}/${pageId}?expand=body.storage,version,history,metadata.labels`;
  return await fetchConfluence(endpoint);
}

/**
 * Extrai metadados de uma string de HTML (Formato de Armazenamento Confluence)
 * @param {string} html HTML da página
 * @returns {Object} Metadados extraídos
 */
function extractMetadata(html) {
  const metadata = {};
  
  // Regex simples para extrair valores de tabelas ou campos comuns
  // Isso deve ser ajustado conforme o padrão real das páginas do confluence
  const patterns = {
    responsavel: /Respons[áa]vel[:\s]+<td>(.*?)<\/td>/i,
    produto: /Produto[:\s]+<td>(.*?)<\/td>/i,
    subproduto: /Subproduto[:\s]+<td>(.*?)<\/td>/i,
    gtm_id: /GTM-ID[:\s]+<td>(.*?)<\/td>/i,
    ga4_id: /GA4-ID[:\s]+<td>(.*?)<\/td>/i,
    numero_task: /Task[:\s]+<td>(.*?)<\/td>/i,
    figma: /Figma[:\s]+<td>(.*?)<\/td>/i
  };

  for (const [key, regex] of Object.entries(patterns)) {
    const match = html.match(regex);
    metadata[key] = match ? match[1].replace(/<[^>]*>?/gm, '').trim() : '-';
  }

  return metadata;
}

/**
 * Classifica o artefato com base no conteúdo e tags
 * @param {Object} page Objeto da página vindo da API
 * @returns {string} GA4, GA3 ou Documento
 */
function classifyArtifact(page) {
  const title = page.title.toLowerCase();
  const body = page.body?.storage?.value?.toLowerCase() || '';
  
  if (title.includes('ga4') || body.includes('ga4')) return 'GA4';
  if (title.includes('ga3') || title.includes('ua-') || body.includes('universal analytics')) return 'GA3';
  return 'DOC';
}

/**
 * Constrói o inventário recursivamente
 * @param {string} rootPageId ID da página raiz (ex: 'Mapas de Métricas')
 */
async function buildInventory(rootPageId) {
  const inventory = [];

  async function walk(pageId, nivel = 1, nomePai = 'Raiz') {
    console.log(`Explorando página ${pageId} (Nível ${nivel})...`);
    
    try {
      const pageData = await getPageContent(pageId);
      const meta = extractMetadata(pageData.body.storage.value);
      
      inventory.push({
        id: pageData.id,
        titulo: pageData.title,
        link: `${CONFLUENCE_BASE_URL}/pages/viewpage.action?pageId=${pageData.id}`,
        ultima_atualizacao: pageData.version.when,
        responsavel: meta.responsavel,
        versao: pageData.version.number,
        nivel: nivel,
        pai: nomePai,
        produto: meta.produto,
        subproduto: meta.subproduto,
        tipo_mapa: classifyArtifact(pageData),
        produto_servico: '-', // Campo opcional
        numero_da_task: meta.numero_task,
        figma_xd: meta.figma,
        propriedade_ga4_stream_id: meta.ga4_id,
        gtm_id: meta.gtm_id,
        dominio_exclusivo_web: '-'
      });

      const children = await getPageChildren(pageId);
      for (const child of children) {
        await walk(child.id, nivel + 1, pageData.title);
      }
    } catch (err) {
      console.error(`Erro ao processar página ${pageId}:`, err.message);
    }
  }

  await walk(rootPageId);
  return inventory;
}

/**
 * Exporta para arquivo JSON (Apenas no Node.js)
 * @param {Array} data Dados do inventário
 */
async function exportToJSON(data) {
  if (!fs || !pathModule) {
    console.log('Exportação para arquivo disponível apenas no ambiente Node.js.');
    console.log('Dados:', JSON.stringify(data, null, 2));
    return;
  }

  const filePath = pathModule.resolve('backend/data/inventario.json');
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Inventário exportado com sucesso para ${filePath}`);
}

/**
 * Função Executora
 */
async function runCollection(rootPageId) {
  console.time('Coleta Confluence');
  const inventory = await buildInventory(rootPageId);
  await exportToJSON(inventory);
  console.timeEnd('Coleta Confluence');
  return inventory;
}

// Export para uso em outros módulos ou console
export {
  getPageChildren,
  getPageContent,
  extractMetadata,
  classifyArtifact,
  buildInventory,
  exportToJSON,
  runCollection
};
