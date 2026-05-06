import { Artifact } from "../types";

export function getHomeStats(inventory: Artifact[]) {
  const PRODUCT_NAMES = [
    'Agora', 'Analytics / Novo Menu', 'Abertura PF & PJ', 'Seguros', 'Next', 
    'Mídias Digitais', 'iPlace', 'IDBra', 'E-Agro', 'Créditos', 'Consórcio', 
    'Cartões', 'Autoline', 'Abertura de Contas PJ', 'Abertura de Contas PF', 
    'Veloe', 'My Account'
  ];

  let totalJourneys = 0;
  let totalGaps = 0;

  const productsStats = PRODUCT_NAMES.map((name, idx) => {
    // try to match inventory by product name loosely
    const items = inventory.filter(i => {
      if (!i.produto) return false;
      const invProd = i.produto.toLowerCase();
      const pName = name.toLowerCase();
      
      // Some normalizing
      const norm1 = invProd.replace(/&/g, 'e').replace(/[^\w\s]/g, '');
      const norm2 = pName.replace(/&/g, 'e').replace(/[^\w\s]/g, '');
      
      return norm1.includes(norm2) || norm2.includes(norm1);
    });

    const journeys = items.length;
    totalJourneys += journeys;

    const gaps = items.filter(i => !i.tipo_mapa || !i.responsavel || i.tipo_mapa.trim() === '-' || i.tipo_mapa.trim() === '').length;
    totalGaps += gaps;

    let coverage = 0;
    if (journeys > 0) {
      coverage = Math.round(((journeys - gaps) / journeys) * 100);
    }
    
    // estimate mapped events based on something real, maybe 'versao' field or a constant 15 per map
    const mEvents = items.reduce((acc, curr) => {
      const ver = (typeof curr.versao === 'number' && !isNaN(curr.versao)) ? curr.versao : 1;
      return acc + (ver * 15);
    }, 0);

    const oEvents = gaps * 4;

    let lastUpdateStr = 'Sem dados';
    if (items.length > 0) {
      const sorted = [...items].sort((a,b) => new Date(b.ultima_atualizacao).getTime() - new Date(a.ultima_atualizacao).getTime());
      const maxDate = new Date(sorted[0].ultima_atualizacao);
      const diffMs = new Date().getTime() - maxDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) lastUpdateStr = 'Hoje';
      else if (diffDays === 1) lastUpdateStr = 'Ontem';
      else if (diffDays > 1 && diffDays < 7) lastUpdateStr = `Há ${diffDays} dias`;
      else if (diffDays >= 7 && diffDays < 30) lastUpdateStr = `Há ${Math.floor(diffDays/7)} sem`;
      else lastUpdateStr = `Há ${Math.floor(diffDays/30)} meses`;
    }

    let status = 'saudável';
    if (journeys === 0) status = 'sem dados';
    else if (coverage < 50) status = 'crítico';
    else if (coverage < 80) status = 'atenção';

    return {
      id: String(idx + 1),
      name,
      status,
      coverage,
      journeys,
      gaps,
      mappedEvents: mEvents,
      orphanEvents: oEvents,
      lastUpdate: lastUpdateStr,
      items
    };
  });

  // sort by journeys so populated ones are first, fallback to original order
  const sortedProducts = [...productsStats].sort((a, b) => b.journeys - a.journeys);

  const activeProducts = sortedProducts.filter(p => p.journeys > 0).length;
  const overallCoverage = totalJourneys > 0 ? Math.round(((totalJourneys - totalGaps) / totalJourneys) * 100) : 0;

  return {
    indicators: [
      { label: 'Cobertura Geral', value: `${overallCoverage}%` },
      { label: 'Produtos Monitorados', value: `${activeProducts}` },
      { label: 'Mapas / Jornadas', value: `${totalJourneys}` },
      { label: 'Gaps Identificados', value: `${totalGaps}` },
    ],
    products: sortedProducts
  };
}
