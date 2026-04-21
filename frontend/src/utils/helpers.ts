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
    ga4: subset.filter(item => normalizar(item.tipo_mapa) === "ga4").length,
    ga3: subset.filter(item => normalizar(item.tipo_mapa) === "ga3").length,
    mapas: subset.filter(item => {
      const type = normalizar(item.tipo_mapa);
      return type === "ga4" || type === "ga3";
    }).length,
    documentos: subset.filter(item => {
      const type = normalizar(item.tipo_mapa);
      return type !== "ga4" && type !== "ga3";
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
  const foraPadraoGA4 = subset.filter(i => normalizar(i.tipo_mapa) === "ga3").length;
  
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
  const scoreAderencia = counts.mapas > 0 ? (counts.ga4 / counts.mapas) * 100 : 100;
  let statusAderencia: 'excelente' | 'bom' | 'critico' = 'excelente';
  let interpretacaoAderencia = "A base está 100% aderente ao padrão GA4";

  if (scoreAderencia < 100 && scoreAderencia >= 80) {
    statusAderencia = 'bom';
    interpretacaoAderencia = `A base possui boa aderência (${scoreAderencia.toFixed(0)}%) ao padrão GA4, mas ainda há legados.`;
  } else if (scoreAderencia < 80) {
    statusAderencia = 'critico';
    interpretacaoAderencia = "A base apresenta baixa aderência — risco de inconsistência e perda de dados legacy.";
  }

  // Resumo Inteligente
  const principalProduto = distribProduto[0]?.name || "N/A";
  const principalSubproduto = distribSubproduto[0]?.name || "N/A";
  
  const recomendacoes: string[] = [];
  if (foraPadraoGA4 > 0) recomendacoes.push("Migrar mapas GA3 para o padrão GA4 para evitar perda de histórico.");
  if (semResponsavel > 0) recomendacoes.push("Atribuir responsáveis aos artefatos órfãos para garantir a governança.");
  if (desatualizados > 0) recomendacoes.push("Revisar artefatos com mais de 1 ano sem atualização.");
  if (scoreAderencia < 90) recomendacoes.push("Estabelecer um força-tarefa de padronização para o produto " + principalProduto);
  if (recomendacoes.length === 0) recomendacoes.push("Manter o monitoramento contínuo e a atualização semanal dos documentos.");

  const textoCenario = `Atualmente, o ecossistema de artefatos é dominado pelo produto ${principalProduto}, com forte presença no subproduto ${principalSubproduto}. 
  ${counts.ga4 > counts.ga3 ? "A transição para o GA4 está em estágio avançado" : "A base ainda depende fortemente do GA3 (Universal)"}, 
  representando ${counts.ga4} de um total de ${counts.mapas} mapas mapeados.`;

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
