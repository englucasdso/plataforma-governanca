import { Artifact } from "../types";

export function getOperationalInsights(inventory: Artifact[]) {
  if (!inventory || inventory.length === 0) {
    return { recentActivities: [], chartData: [] };
  }

  // Ordenar inventário pela data
  const sorted = [...inventory].sort((a, b) => {
    return new Date(b.ultima_atualizacao).getTime() - new Date(a.ultima_atualizacao).getTime();
  });

  const recentActivities = sorted.slice(0, 5).map(item => {
    const d = new Date(item.ultima_atualizacao);
    const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return {
      artifact: item,
      date: `${dateStr}, ${timeStr}`,
      desc: `${item.titulo}`,
      link: item.link,
      icon: null, // Will optionally be used in UI, or we don't render it in helper
      color: "bg-purple-50"
    };
  });

  // Qual a data mais recente no inventario?
  const maxTime = new Date(sorted[0].ultima_atualizacao).getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;
  
  // Pegamos a data ignorando a hora para agrupar corretamente
  const normalizeDate = (d: Date) => {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  
  const anchorDate = normalizeDate(new Date(maxTime));

  const itemsByDate: Record<number, Artifact[]> = {};
  for (const item of sorted) {
    const itemDate = normalizeDate(new Date(item.ultima_atualizacao));
    if (!itemsByDate[itemDate]) {
      itemsByDate[itemDate] = [];
    }
    itemsByDate[itemDate].push(item);
  }

  const chartData = [];
  let localMaxVal = 0;
  for (let i = 6; i >= 0; i--) {
    const dayTime = anchorDate - (i * DAY_MS);
    const items = itemsByDate[dayTime] || [];
    localMaxVal = Math.max(localMaxVal, items.length);
    
    chartData.push({
      label: "",
      dateVal: dayTime,
      value: items.length,
      items: items
    });
  }

  // Renomeando os labels relativos ao Anchor Date (que é o Mais Recente)
  // Ou podemos usar a data atual se quisermos ser fieis à realidade "Hoje" vs "Último insert",
  // Mas como a base pode estar velha (ex: 2025), ancorar ao "Hoje real" geraria graficos zerados.
  // Vamos ancorar ao "Real Hoje" se hoje > maxTime, senão maxTime?
  // A requisição era "D-6, D-5... Ontem, Hoje".
  // Se a pessoa quer ver "O inventário de hoje" e a base parou ano passado, o grafico tem q ser vazio,
  // MAS para a UI nao ficar morta, vamos usar os últimos 7 dias que contem as atualizações. Ou usar labels D-6..Hoje e setar na base 
  // das datas.
  
  // Vamos usar a abordagem: O ultimo dia com dados eh listado como a "data mais recente real do array", pondo a formatacao real "DD/MM"
  chartData.forEach((cd, i) => {
     if (i === 6) cd.label = "Recente";
     else {
       const dt = new Date(cd.dateVal);
       cd.label = `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth()+1).toString().padStart(2, '0')}`;
     }
  });

  chartData[6].label = "Dia +Recente";

  const chartDataWithHeight = chartData.map(cd => ({
    ...cd,
    height: localMaxVal > 0 ? `${(cd.value / localMaxVal) * 100}%` : "0%"
  }));

  return {
    recentActivities,
    chartData: chartDataWithHeight
  };
}
