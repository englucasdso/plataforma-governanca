/**
 * Arquivo: backend/services/inventory.service.ts
 * Propósito: Contém toda a regra de negócio central ("o cérebro") relacionada ao inventário de artefatos.
 * É aqui que carregamos o banco de dados local (.json), calculamos estatísticas (insights) e realizamos
 * as buscas complexas que o usuário faz na tela inicial.
 */
import fs from "fs";
import path from "path";

// Define a estrutura (formato) de como cada Artefato se parece dentro do código
export interface Artifact {
  id: string;
  titulo: string;
  link: string;
  ultima_atualizacao: string;
  tipo_mapa: string;
  produto: string;
  subproduto: string;
  responsavel: string;
  versao: string;
  nivel: string;
  pai: string;
  produto_servico: string;
  numero_da_task: string;
  figma_xd: string;
  propriedade_ga4_stream_id: string;
  firebase: string;
  gtm_id: string;
  dominio_exclusivo_web: string;
}

/**
 * Pega um texto qualquer, remove os acentos (ã vira a, é vira e), 
 * joga pra minúsculo e tira os espaços inúteis do começo e fim.
 * Isso garante que buscas por "Mamão" ou "mamao" funcionem iguais.
 */
export function normalize(txt: string): string {
  return String(txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Algoritmo da Distância de Levenshtein
 * Descobre o quão "diferente" uma palavra é de outra, medindo quantos caracteres 
 * precisamos trocar/adicionar/remover para a Palavra A virar a Palavra B.
 * Útil para busca "fuzzy": tolerar pequenos erros de digitação (ex: "brasilleiro" x "brasileiro").
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + custo
      );
    }
  }
  return dp[m][n];
}

/**
 * Lê o arquivo físico inventario.json onde ficam os dados salvos.
 * Retorna os dados prontos para o uso em formato de lista (Array de Artifact)
 */
export function getInventoryData(): Artifact[] {
  const dataPath = path.join(process.cwd(), "backend", "data", "inventario.json");
  const data = fs.readFileSync(dataPath, "utf8");
  return JSON.parse(data);
}

/**
 * Pega os resultados de uma busca (ou de todos os dados) e extrai estatísticas valiosas(Insights).
 * Aqui é onde avaliamos padrões e alertamos sobre riscos na configuração 
 * (ex: Falta de responsável pelo artefato, versões antigas, dependência forte em algo superado).
 */
export function calculateInsights(results: Artifact[]) {
  const total = results.length;
  if (total === 0) return null;

  // Calculamos a saúde técnica da base identificando os tipos num relance
  const counts = {
    ga4: results.filter(item => normalize(item.tipo_mapa) === "ga4").length,
    ga3: results.filter(item => normalize(item.tipo_mapa) === "ga3").length,
    mapas: results.filter(item => {
      const type = normalize(item.tipo_mapa);
      return type === "ga4" || type === "ga3";
    }).length,
    documentos: results.filter(item => {
      const type = normalize(item.tipo_mapa);
      return type !== "ga4" && type !== "ga3";
    }).length,
  };

  const prodMap: Record<string, number> = {};
  const subMap: Record<string, number> = {};
  
  // Cria mapas (Dicionários) contabilizando quantos itens existem para qual Produto
  results.forEach(item => {
    const p = item.produto || "Sem Produto";
    const s = item.subproduto || "Sem Subproduto";
    prodMap[p] = (prodMap[p] || 0) + 1;
    subMap[s] = (subMap[s] || 0) + 1;
  });

  const distribProduto = Object.entries(prodMap)
    .map(([name, count]) => ({ name, count, percent: ((count / total) * 100).toFixed(1) }))
    .sort((a, b) => b.count - a.count);

  const distribSubproduto = Object.entries(subMap)
    .map(([name, count]) => ({ name, count, percent: ((count / total) * 100).toFixed(1) }))
    .sort((a, b) => b.count - a.count);

  // Deteção de Problemas (Orfãos, defasados e mal-estruturados)
  const semResponsavel = results.filter(i => !i.responsavel || i.responsavel === "-").length;
  const semSubproduto = results.filter(i => !i.subproduto || i.subproduto === "-").length;
  const foraPadraoGA4 = results.filter(i => normalize(i.tipo_mapa) === "ga3").length;
  
  const desatualizados = results.filter(item => {
    const data = new Date(item.ultima_atualizacao);
    return !isNaN(data.getTime()) && data.getFullYear() < 2024;
  }).length;

  const totalProblemas = semResponsavel + semSubproduto + foraPadraoGA4 + desatualizados;
  let nivelRisco: 'baixo' | 'medio' | 'alto' = 'baixo';
  if (totalProblemas / total > 0.4) nivelRisco = 'alto';
  else if (totalProblemas / total > 0.1) nivelRisco = 'medio';

  // Aderência ao Padrão Tecnológico
  const scoreAderencia = counts.mapas > 0 ? (counts.ga4 / counts.mapas) * 100 : 100;
  let statusAderencia: 'excelente' | 'bom' | 'critico' = 'excelente';
  let interpretacaoAderencia = "A base está 100% aderente ao padrão GA4";

  if (scoreAderencia < 100 && scoreAderencia >= 80) {
    statusAderencia = 'bom';
    interpretacaoAderencia = `A base possui boa aderência (${scoreAderencia.toFixed(0)}%) ao padrão GA4, mas ainda há legados.`;
  } else if (scoreAderencia < 80) {
    statusAderencia = 'critico';
    interpretacaoAderencia = "A base apresenta baixa aderência — risco de inconsistência.";
  }

  // Resumo Inteligente (Frases sugeridas para ações de gestão)
  const principalProduto = distribProduto[0]?.name || "N/A";
  const principalSubproduto = distribSubproduto[0]?.name || "N/A";
  
  const recomendacoes: string[] = [];
  if (foraPadraoGA4 > 0) recomendacoes.push("Migrar mapas GA3 para o padrão GA4.");
  if (semResponsavel > 0) recomendacoes.push("Atribuir responsáveis aos artefatos órfãos.");
  if (desatualizados > 0) recomendacoes.push("Revisar artefatos desatualizados.");
  if (recomendacoes.length === 0) recomendacoes.push("Manter o monitoramento contínuo.");

  const textoCenario = `O ecossistema é liderado por ${principalProduto} (${principalSubproduto}). ${counts.ga4 > counts.ga3 ? "Migração GA4 avançada" : "Dependência GA3 detectada"}.`;

  return {
    total,
    ga4: counts.ga4,
    ga3: counts.ga3,
    mapas: counts.mapas,
    documentos: counts.documentos,
    distribProduto,
    distribSubproduto,
    porcentagens: {
      ga4: ((counts.ga4 / total) * 100).toFixed(1),
      ga3: ((counts.ga3 / total) * 100).toFixed(1),
    },
    problemas: {
      semResponsavel,
      semSubproduto,
      foraPadraoGA4,
      desatualizados,
      nivelRisco
    },
    aderencia: {
      score: scoreAderencia,
      interpretacao: interpretacaoAderencia,
      status: statusAderencia
    },
    resumoInteligente: {
      principalProduto,
      principalSubproduto,
      textoCenario,
      recomendacoes
    }
  };
}

/**
 * Funcionalidade primordial do sistema: Motor de Busca.
 * Permite buscar por vários termos ("cartao", "app") permitindo alguns erros de
 * digitação e até palavras de Negação ("nao é ga3") para exclusões simples.
 */
export function searchArtifacts(queryRaw: string): any {
  const query = normalize(queryRaw);
  if (!query) return { total: 0, resultados: [], insights: {} };

  const inventory = getInventoryData();
  
  // Identifica se a intenção do usuário envolve filtrar "fora" alguma coisa
  const isNegation = query.includes("nao seguem") || query.includes("nao e") || query.includes("sem") || query.includes("fora de");
  const targetTerm = query.includes("ga4") ? "ga4" : query.includes("ga3") ? "ga3" : "";

  // Percorre todo o banco testando cada item se ele é aprovado pelos filtros textuais
  const results = inventory.filter((item: Artifact) => {
    // Monta um mega-texto somando tudo do item pra facilitar o filtro
    const searchableText = [
      item.id,
      item.titulo,
      item.responsavel,
      item.produto,
      item.subproduto,
      item.tipo_mapa,
      item.figma_xd,
      item.numero_da_task,
      item.gtm_id,
      item.propriedade_ga4_stream_id
    ].filter(Boolean).map(normalize).join(" ");
    
    // Separa o que o usuário quer em palavras avulsas
    const queryWords = query.split(/\s+/).filter(Boolean);
    
    // Tratativa de Exclusão (Regra de Negócio customizada do cliente)
    if (isNegation && targetTerm) {
      const itemType = normalize(item.tipo_mapa);
      if (itemType === targetTerm) return false;
    }

    // Cada item precisa ter TODAS as palavras buscadas pelo usuário (Regra de E/AND)
    return queryWords.every(qWord => {
      // Ignora palavras de suporte, elas são só pra compor idioma natural
      const negationWords = ["nao", "seguem", "que", "e", "sem", "fora", "de"];
      if (negationWords.includes(qWord)) return true;

      // 1ª chance: Se tem a palavra exata, tá aprovado
      if (searchableText.includes(qWord)) return true;
      
      // 2ª chance: Se errou de leve a digitação (levenshtein de 1 passo), deixa passar (tolerância fuzzy)
      if (qWord.length > 3) {
        const itemWords = searchableText.split(/\s+/).filter(Boolean);
        return itemWords.some(iWord => levenshtein(qWord, iWord) <= 1);
      }
      
      return false;
    });
  });

  return {
    total: results.length,
    resultados: results,
    insights: {
      ...calculateInsights(results),
      searchTerm: queryRaw
    }
  };
}
