import fs from "fs";
import path from "path";

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

export function normalize(txt: string): string {
  return String(txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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

export function getInventoryData(): Artifact[] {
  const dataPath = path.join(process.cwd(), "backend", "data", "inventario.json");
  const data = fs.readFileSync(dataPath, "utf8");
  return JSON.parse(data);
}

export function calculateInsights(results: Artifact[]) {
  const total = results.length;
  if (total === 0) return null;

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

  // Problemas Detectados
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

  // Aderência ao Padrão
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

  // Resumo Inteligente
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

export function searchArtifacts(queryRaw: string): any {
  const query = normalize(queryRaw);
  if (!query) return { total: 0, resultados: [], insights: {} };

  const inventory = getInventoryData();
  const isNegation = query.includes("nao seguem") || query.includes("nao e") || query.includes("sem") || query.includes("fora de");
  const targetTerm = query.includes("ga4") ? "ga4" : query.includes("ga3") ? "ga3" : "";

  const results = inventory.filter((item: Artifact) => {
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
    
    const queryWords = query.split(/\s+/).filter(Boolean);
    
    if (isNegation && targetTerm) {
      const itemType = normalize(item.tipo_mapa);
      if (itemType === targetTerm) return false;
    }

    return queryWords.every(qWord => {
      const negationWords = ["nao", "seguem", "que", "e", "sem", "fora", "de"];
      if (negationWords.includes(qWord)) return true;

      if (searchableText.includes(qWord)) return true;
      
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
