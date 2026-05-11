import { Artifact, Insights } from "../types";

export const normalizar = (txt: string): string => {
  return String(txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

export const formatDataBR = (valor: string): string => {
  if (!valor) return "-";
  const data = new Date(valor);
  if (isNaN(data.getTime())) return valor;
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getFilteredInsights = (subset: Artifact[], queryText: string): Insights | null => {
  const total = subset.length;
  if (total === 0) return null;

  const counts = {
    ga4Atual: subset.filter(item => normalizar(item.tipo_mapa) === "ga4 atual").length,
    ga4Legado: subset.filter(item => normalizar(item.tipo_mapa) === "ga4 legado").length,
    universalAnalytics: subset.filter(item => normalizar(item.tipo_mapa) === "universal analytics").length,
    mapas: subset.filter(item => {
      const type = normalizar(item.tipo_mapa);
      return type === "ga4 atual" || type === "ga4 legado" || type === "universal analytics";
    }).length,
    documentos: subset.filter(item => {
      const type = normalizar(item.tipo_mapa);
      return type === "doc" || (type !== "ga4 atual" && type !== "ga4 legado" && type !== "universal analytics");
    }).length,
  };

  const prodMap: Record<string, number> = {};
  const subMap: Record<string, number> = {};
  subset.forEach(item => {
    const p = item.produto || "Sem Produto";
    const s = item.subproduto || "Sem Subproduto";
    prodMap[p] = (prodMap[p] || 0) + 1;
    subMap[s] = (subMap[s] || 0) + 1;
  });

  const distribProduto = Object.entries(prodMap)
    .map(([name, count]) => ({ name, count, percent: ((count / total) * 100).toFixed(1) }))
    .sort((a,b) => b.count - a.count);

  const distribSubproduto = Object.entries(subMap)
    .map(([name, count]) => ({ name, count, percent: ((count / total) * 100).toFixed(1) }))
    .sort((a,b) => b.count - a.count);

  // Problemas Detectados
  const semResponsavel = subset.filter(i => !i.responsavel || i.responsavel === "-").length;
  const semSubproduto = subset.filter(i => !i.subproduto || i.subproduto === "-").length;
  const foraPadraoGA4 = subset.filter(i => normalizar(i.tipo_mapa) === "ga4 legado" || normalizar(i.tipo_mapa) === "universal analytics").length;
  
  // Consideramos desatualizado o que não foi atualizado em 2024 (exemplo hipotético)
  const desatualizados = subset.filter(item => {
    const data = new Date(item.ultima_atualizacao);
    return !isNaN(data.getTime()) && data.getFullYear() < 2024;
  }).length;

  const totalProblemas = semResponsavel + semSubproduto + foraPadraoGA4 + desatualizados;
  let nivelRisco: 'baixo' | 'medio' | 'alto' = 'baixo';
  if (totalProblemas / total > 0.4) nivelRisco = 'alto';
  else if (totalProblemas / total > 0.1) nivelRisco = 'medio';

  // Aderência ao Padrão
  const scoreAderencia = counts.mapas > 0 ? (counts.ga4Atual / counts.mapas) * 100 : 100;
  let statusAderencia: 'excelente' | 'bom' | 'critico' = 'excelente';
  let interpretacaoAderencia = "A base está 100% aderente ao padrão GA4 Atual";

  if (scoreAderencia < 100 && scoreAderencia >= 80) {
    statusAderencia = 'bom';
    interpretacaoAderencia = `A base possui boa aderência (${scoreAderencia.toFixed(0)}%) ao padrão GA4 Atual, mas ainda há legados.`;
  } else if (scoreAderencia < 80) {
    statusAderencia = 'critico';
    interpretacaoAderencia = "A base apresenta baixa aderência — risco de inconsistência e perda de dados legacy.";
  }

  // Resumo Inteligente
  const principalProduto = distribProduto[0]?.name || "N/A";
  const principalSubproduto = distribSubproduto[0]?.name || "N/A";
  
  const recomendacoes: string[] = [];
  if (foraPadraoGA4 > 0) recomendacoes.push(`Revisar imediatamente ganchos da tela de checkout em ${principalProduto}.`);
  if (semResponsavel > 0) recomendacoes.push(`Atribuir responsáveis aos artefatos órfãos em ${principalSubproduto} para garantir a governança.`);
  if (desatualizados > 0) recomendacoes.push(`Revisar artefatos de ${principalSubproduto} com inconsistências críticas.`);
  if (scoreAderencia < 90) recomendacoes.push(`Estabelecer força-tarefa de padronização imediata para o produto ${principalProduto}.`);
  if (recomendacoes.length === 0) recomendacoes.push("Manter o monitoramento contínuo e a atualização semanal dos documentos.");

  const textoCenario = `Visão Consolidada: Foram analisados ${total} artefatos. 
Riscos Prioritários: ${foraPadraoGA4} inconsistências críticas e ${semResponsavel} integrações sem owner. 
Impacto em Mensuração: Alto risco de perda de volume de conversão no produto ${principalProduto}.`;

  return {
    total,
    ga4Atual: counts.ga4Atual,
    ga4Legado: counts.ga4Legado,
    universalAnalytics: counts.universalAnalytics,
    mapas: counts.mapas,
    documentos: counts.documentos,
    distribProduto,
    distribSubproduto,
    porcentagens: {
      ga4Atual: ((counts.ga4Atual / total) * 100).toFixed(1),
      ga4Legado: ((counts.ga4Legado / total) * 100).toFixed(1),
      universalAnalytics: ((counts.universalAnalytics / total) * 100).toFixed(1),
    },
    searchTerm: queryText,
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
};
