import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Sparkles, ChevronDown, ChevronUp, ExternalLink, ArrowRight } from "lucide-react";

interface Artifact {
  id: string;
  titulo: string;
  link: string;
  ultima_atualizacao: string;
  tipo_mapa: string;
  produto: string;
  subproduto: string;
  responsavel: string;
  versao: number;
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

interface Insights {
  total: number;
  ga4: number;
  ga3: number;
  mapas: number;
  documentos: number;
  distribProduto: { name: string; count: number; percent: string }[];
  distribSubproduto: { name: string; count: number; percent: string }[];
  porcentagens?: {
    ga4: string;
    ga3: string;
  };
  searchTerm?: string;
}

interface SearchResponse {
  total: number;
  resultados: Artifact[];
  insights: Insights;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Artifact[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [appState, setAppState] = useState<"initial" | "results" | "decision" | "insights" | "empty" | "inventory_table">("initial");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [tableFilter, setTableFilter] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  };

  useEffect(() => {
    autoResize();
  }, [query]);

  const toggleDetails = (id: string) => {
    const next = new Set(expandedCards);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCards(next);
  };

  const formatDataBR = (valor: string) => {
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

  const getFilteredInsights = (subset: Artifact[]): Insights | null => {
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

    return {
      total,
      ga4: counts.ga4,
      ga3: counts.ga3,
      mapas: counts.mapas,
      documentos: counts.documentos,
      distribProduto: Object.entries(prodMap).map(([name, count]) => ({ name, count, percent: ((count / total) * 100).toFixed(1) })).sort((a,b) => b.count-a.count),
      distribSubproduto: Object.entries(subMap).map(([name, count]) => ({ name, count, percent: ((count / total) * 100).toFixed(1) })).sort((a,b) => b.count-a.count),
      porcentagens: {
        ga4: ((counts.ga4 / total) * 100).toFixed(1),
        ga3: ((counts.ga3 / total) * 100).toFixed(1),
      },
      searchTerm: query
    };
  };

  const normalizar = (txt: string) => {
    return String(txt || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  };

  const executeSearch = async (overrideQuery?: string) => {
    const q = overrideQuery ?? query;
    if (!q.trim()) return;

    setLoading(true);
    setAppState("results");
    setResults([]);
    setExpandedCards(new Set());

    // Fake delay as requested in original JS
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const isInventory = normalizar(q).includes("inventario");
      const endpoint = isInventory ? "/api/inventario" : `/api/search?q=${encodeURIComponent(q)}`;
      const res = await fetch(endpoint);
      const data: SearchResponse = await res.json();

      setResults(data.resultados);
      setInsights(data.insights);

      if (isInventory) {
        setAppState("inventory_table");
      } else if (data.total === 0) {
        setAppState("empty");
      } else if (data.total === 1) {
        setAppState("results");
      } else {
        setAppState("decision");
      }
    } catch (error) {
      console.error("Search failed", error);
      setAppState("empty");
    } finally {
      setLoading(false);
    }
  };

  const useSuggestion = (text: string) => {
    setQuery(text);
    executeSearch(text);
  };

  const resetSearch = () => {
    setAppState("initial");
    setQuery("");
    setResults([]);
    setInsights(null);
  };

  return (
    <main className="app">
      <div className="flex-1 flex flex-col p-8 overflow-x-hidden">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-8 flex-1">
            <h1 className="brand-text text-2xl cursor-pointer shrink-0" onClick={resetSearch}>Search de Artefatos</h1>
            
            {appState !== "initial" && (
              <div className="relative flex-1 max-w-xl group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                <input 
                  type="text" 
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-full text-sm focus:outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all font-medium"
                  placeholder="Pesquisar novamente..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && executeSearch()}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-gray-500 shrink-0">
            <span className="px-3 py-1 bg-white rounded-full border border-gray-100 shadow-sm">Martech Team</span>
            <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center font-bold text-gray-400">
              JS
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className={`hero flex-col items-center justify-start pt-8 ${appState !== "initial" ? "hidden" : ""}`}>
          <div className="text-center mb-10">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-medium text-gray-900 tracking-tight leading-tight mb-4"
            >
              Olá, Rafael.<br />O que você precisa encontrar hoje?
            </motion.h2>
            <p className="text-gray-500 text-lg">Varredura em tempo real na base de conhecimento Confluence</p>
          </div>

          <div className="w-full max-w-4xl search-shell-glow mb-12">
            <div className={`glass-card relative z-10 rounded-[30px] p-6 flex items-center gap-4 ${isSearchActive ? "ring-2 ring-purple-500/20" : ""}`}>
              <Search className="w-8 h-8 text-purple-600" />
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsSearchActive(true)}
                onBlur={() => setIsSearchActive(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    executeSearch();
                  }
                }}
                className="flex-1 bg-transparent border-none outline-none text-xl placeholder-gray-400 resize-none min-h-[1.5em] overflow-hidden"
                placeholder="Ex: 'Mapas de coleta GA4 Cartões' ou 'Responsável por Tracking Pixel'"
                rows={1}
              />
              <button
                onClick={() => executeSearch()}
                className="bg-gradient-to-r from-[#A138B2] to-[#DB0026] text-white p-3 rounded-2xl shadow-lg hover:opacity-90 transition-opacity"
                title="Buscar"
              >
                <Sparkles className="w-6 h-6" />
              </button>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className={`content ${appState === "initial" ? "hidden" : ""}`}>
          
          {/* Decision / Loading Area */}
          <section className={`decision ${appState === "decision" || loading || appState === "empty" ? "" : "hidden"}`}>
            <div className="ai-badge">
              <Sparkles />
            </div>
            
            {loading ? (
              <>
                <p className="decision-title underline-offset-4">
                  Buscando resultados para <strong className="text-purple-600">{query}</strong>...
                </p>
                <div className="loading-bars max-w-lg mt-6">
                  <div className="shimmer-bg"></div>
                  <div className="shimmer-bg"></div>
                  <div className="shimmer-bg"></div>
                </div>
              </>
            ) : appState === "empty" ? (
              <div className="no-results">
                <div className="glass-card rounded-3xl p-10 text-center">
                  <h3 className="text-2xl font-bold mb-3">Não foi possível encontrar resultados</h3>
                  <p className="text-gray-500 mb-8">Nenhum artefato foi encontrado para <strong>{query}</strong>.</p>
                  <button className="gradient-btn px-8 py-3 rounded-full font-bold" onClick={resetSearch}>
                    Continuar buscando
                  </button>
                </div>
              </div>
            ) : appState === "decision" ? (
              <>
                <p className="decision-title">
                  Foram encontrados <strong className="text-purple-600">{results.length}</strong> itens para <strong>{query}</strong>.<br /><br />
                  O que você quer fazer?
                </p>
                <div className="flex gap-4 flex-wrap mt-8">
                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-full font-bold transition-colors" onClick={() => setAppState("results")}>Ver resultados</button>
                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-full font-bold transition-colors" onClick={() => setAppState("insights")}>Ver insights</button>
                  <button className="text-purple-600 hover:underline font-bold px-6 py-3" onClick={resetSearch}>Continuar buscando</button>
                </div>
              </>
            ) : null}
          </section>

          {/* Summary / Insights Area */}
          {insights && appState === "insights" && (
            <section className="summary">
              {/* Bento Grid Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="summary-card p-5 rounded-3xl bg-gradient-to-br from-[#DB0026] to-[#A6001D] text-white">
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-1">Total Geral</p>
                  <p className="text-3xl font-extrabold">{insights.total}</p>
                </div>
                <div className="summary-card p-5 rounded-3xl bg-gradient-to-br from-[#A138B2] to-[#7D046D] text-white">
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-1">Padrão GA4</p>
                  <p className="text-3xl font-extrabold">{insights.ga4}</p>
                </div>
                <div className="summary-card p-5 rounded-3xl bg-gradient-to-br from-[#0A6CFF] to-[#0047B3] text-white">
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-1">Padrão GA3</p>
                  <p className="text-3xl font-extrabold">{insights.ga3}</p>
                </div>
                <div className="summary-card p-5 rounded-3xl bg-gradient-to-br from-[#00A86B] to-[#007A4E] text-white">
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-1">Total Mapas</p>
                  <p className="text-3xl font-extrabold">{insights.mapas}</p>
                </div>
                <div className="summary-card p-5 rounded-3xl bg-gradient-to-br from-[#636363] to-[#3E3E3E] text-white">
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-80 mb-1">Documentos</p>
                  <p className="text-3xl font-extrabold">{insights.documentos}</p>
                </div>
              </div>

              {/* Bento Layout Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-3 grid-rows-auto gap-6 mb-12">
                
                {/* 1. Distribuição por Produto */}
                <div className="glass-card p-6 rounded-[40px] border border-gray-100 flex flex-col h-full">
                  <h4 className="text-sm font-bold text-gray-400 uppercase mb-6 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-500" /> Distribuição por Produto
                  </h4>
                  <div className="space-y-5 overflow-auto max-h-[300px] pr-2 custom-scrollbar">
                    {insights.distribProduto.slice(0, 5).map((p, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-xs font-bold mb-1.5 uppercase">
                          <span className="truncate pr-4">{p.name}</span>
                          <span className="text-gray-400">{p.percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-1000" 
                            style={{ width: `${p.percent}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Produto e Subproduto */}
                <div className="glass-card p-6 rounded-[40px] border border-gray-100 flex flex-col h-full">
                  <h4 className="text-sm font-bold text-gray-400 uppercase mb-6 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-blue-500" /> Top Subprodutos
                  </h4>
                  <div className="space-y-4">
                    {insights.distribSubproduto.slice(0, 4).map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/80 border border-gray-100/50">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-800 uppercase leading-none mb-1">{s.name}</span>
                          <span className="text-[10px] text-gray-400 font-medium">{s.count} artefatos</span>
                        </div>
                        <span className="text-xs font-black text-blue-600">{s.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Padronização (GA4 vs GA3) */}
                <div className="glass-card p-6 rounded-[40px] border border-gray-100 flex flex-col h-full">
                  <h4 className="text-sm font-bold text-gray-400 uppercase mb-6 flex items-center gap-2">
                    <ChevronDown className="w-4 h-4 text-purple-500" /> Padronização Técnica
                  </h4>
                  <div className="flex-1 flex flex-col justify-center gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0">
                        <span className="text-purple-600 font-black text-xs">GA4</span>
                      </div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden w-full relative">
                           <div className="h-full bg-purple-600" style={{ width: `${insights.porcentagens?.ga4}%` }}></div>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">Aderência: {insights.porcentagens?.ga4}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-blue-600 font-black text-xs">GA3</span>
                      </div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden w-full relative">
                           <div className="h-full bg-blue-600" style={{ width: `${insights.porcentagens?.ga3}%` }}></div>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">Aderência: {insights.porcentagens?.ga3}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Resumo Executivo */}
                <div className="glass-card p-10 rounded-[40px] border border-gray-100 lg:col-span-3 bg-white/50 backdrop-blur-xl">
                  <h4 className="text-sm font-bold text-gray-400 uppercase mb-6">Relatório Executivo Geral</h4>
                  <p className="text-gray-600 text-lg leading-relaxed max-w-4xl">
                    A análise para a busca <strong>"{insights.searchTerm || query}"</strong> com <strong>{insights.total} ativos</strong> identificados demonstra que <strong>{insights.porcentagens?.ga4}%</strong> seguem o padrão GA4. 
                    O principal destaque é a vertical de <strong>{insights.distribProduto[0]?.name || "-"}</strong>, que representa <strong>{insights.distribProduto[0]?.percent}%</strong> da volumetria total mapeada.
                    No nível tático, o subproduto <strong>{insights.distribSubproduto[0]?.name || "-"}</strong> lidera a volumetria com <strong>{insights.distribSubproduto[0]?.count} artefatos</strong> registrados.
                    A base atual reflete uma infraestrutura sólida composta por <strong>{insights.mapas} mapas técnicos</strong> de mensuração e <strong>{insights.documentos} documentos</strong> de governança e suporte.
                  </p>
                </div>

              </div>

              <div className="flex justify-end gap-12 mb-18 border-t border-gray-100 pt-8">
                 <button className="ghost-btn-v2" onClick={() => setAppState("results")}>Ver resultados</button>
                 <button className="ghost-btn-v2" onClick={resetSearch}>Continuar buscando</button>
              </div>
            </section>
          )}

          {/* Results Area */}
          <section className={`results space-y-6 ${appState === "results" && !loading ? "" : "hidden"}`}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-gray-800">Resultados Encontrados ({results.length})</h3>
              <div className="flex gap-4">
                {results.length > 1 && (
                  <button className="text-gray-500 hover:text-purple-600 font-bold" onClick={() => setAppState("insights")}>Ver insights</button>
                )}
                <button className="text-gray-500 hover:text-purple-600 font-bold" onClick={resetSearch}>Nova busca</button>
              </div>
            </div>

            <AnimatePresence>
              {results.map((item, index) => (
                <motion.article 
                  key={item.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card rounded-[40px] p-10 group transition-all relative overflow-hidden"
                >
                  <div className="mb-6">
                    <div className="mb-1">
                      {item.tipo_mapa && (normalizar(item.tipo_mapa) === "ga4" || normalizar(item.tipo_mapa) === "ga3") ? (
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mapa de Métricas</span>
                      ) : null}
                    </div>
                    <a
                      className="text-3xl brand-title group-hover:opacity-80 transition-opacity inline-flex items-center gap-2 mb-4"
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.titulo}
                    </a>
                    
                    <div className="flex flex-wrap gap-3">
                      <span className="red-badge">
                        {item.tipo_mapa && (normalizar(item.tipo_mapa) === "ga4" || normalizar(item.tipo_mapa) === "ga3") 
                          ? item.tipo_mapa.toUpperCase() 
                          : "Documento"}
                      </span>
                      {item.produto && <span className="red-badge">{item.produto}</span>}
                      {item.subproduto && <span className="red-badge">{item.subproduto}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex gap-1.5 text-[15px]">
                      <span className="font-bold">ID:</span>
                      <span className="text-gray-700">{item.id}</span>
                    </div>
                    <div className="flex gap-1.5 text-[15px]">
                      <span className="font-bold">Responsavel:</span>
                      <span className="text-gray-700">{item.responsavel}</span>
                    </div>
                    <div className="flex gap-1.5 text-[15px]">
                      <span className="font-bold">Versao:</span>
                      <span className="text-gray-700">{item.versao}</span>
                    </div>
                    <div className="flex gap-1.5 text-[15px]">
                      <span className="font-bold">Nivel:</span>
                      <span className="text-gray-700">{item.nivel}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <button 
                      className="font-bold text-[15px] text-gray-900 h-auto p-0 hover:underline" 
                      onClick={() => toggleDetails(item.id)}
                    >
                      {expandedCards.has(item.id) ? "Ocultar detalhes" : "Ver detalhes"}
                    </button>
                    <p className="text-[13px] text-gray-500">
                      Atualizado em: {formatDataBR(item.ultima_atualizacao)}
                    </p>
                  </div>

                  {expandedCards.has(item.id) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="mt-6 pt-6 border-t border-gray-100"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Produto/Serviço</p>
                          <p className="text-sm text-gray-800">{item.produto_servico || "-"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Nº Task</p>
                          <p className="text-sm text-gray-800">{item.numero_da_task || "-"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">GTM ID</p>
                          <p className="text-sm text-gray-800">{item.gtm_id || "-"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">GA4 Stream ID</p>
                          <p className="text-sm text-gray-800">{item.propriedade_ga4_stream_id || "-"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Firebase</p>
                          <p className="text-sm text-gray-800">{item.firebase || "-"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Domínio</p>
                          <p className="text-sm text-gray-800">{item.dominio_exclusivo_web || "-"}</p>
                        </div>
                        <div className="md:col-span-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Figma/XD</p>
                          <p className="text-sm text-gray-800 truncate">{item.figma_xd || "-"}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.article>
              ))}
            </AnimatePresence>
          </section>

          {/* Inventory Table View (Excel Style) */}
          {appState === "inventory_table" && (
            <section className="inventory-table-container">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Inventário Geral de Artefatos</h3>
                <div className="flex gap-4">
                  <button 
                    className="text-gray-500 hover:text-purple-600 font-bold text-sm" 
                    onClick={() => {
                      const filtered = results.filter(item => {
                        const lowFilter = normalizar(tableFilter);
                        const content = Object.values(item).join(" ").toLowerCase();
                        return normalizar(content).includes(lowFilter);
                      });
                      setInsights(getFilteredInsights(filtered));
                      setAppState("insights");
                    }}
                  >
                    Ver insights do filtro
                  </button>
                  <button className="text-gray-500 hover:text-purple-600 font-bold text-sm" onClick={resetSearch}>Nova busca</button>
                </div>
              </div>

              {/* Real-time Filter Bar for Table */}
              <div className="glass-card rounded-2xl p-4 mb-6 flex items-center gap-3 border border-gray-100 shadow-sm">
                <Search className="w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Filtrar inventário (ID, Título, Responsável...)" 
                  className="bg-transparent border-none outline-none flex-1 text-sm font-medium text-gray-800"
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                />
              </div>

              <div className="excel-table-wrapper glass-card overflow-auto rounded-3xl">
                <table className="excel-table w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>TÍTULO</th>
                      <th>LINK</th>
                      <th>ÚLTIMA ATUALIZAÇÃO</th>
                      <th>TIPO DE MAPA</th>
                      <th>PRODUTO</th>
                      <th>SUBPRODUTO</th>
                      <th>RESPONSÁVEL</th>
                      <th>VERSÃO</th>
                      <th>NÍVEL</th>
                      <th>PAI</th>
                      <th>PRODUTO/SERVIÇO</th>
                      <th>Nº DA TASK</th>
                      <th>FIGMA/XD</th>
                      <th>GA4 STREAM ID</th>
                      <th>FIREBASE</th>
                      <th>GTM ID</th>
                      <th>DOMÍNIO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results
                      .filter(item => {
                        const lowFilter = normalizar(tableFilter);
                        if (!lowFilter) return true;
                        const searchable = normalizar(`${item.id} ${item.titulo} ${item.responsavel} ${item.produto} ${item.subproduto} ${item.numero_da_task} ${item.gtm_id}`);
                        return searchable.includes(lowFilter);
                      })
                      .map((item) => (
                        <tr key={item.id}>
                          <td className="font-mono font-bold text-purple-600">{item.id}</td>
                          <td className="font-bold min-w-[250px]">{item.titulo}</td>
                          <td>
                            <a href={item.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                              Link <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td>{formatDataBR(item.ultima_atualizacao)}</td>
                          <td>
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold uppercase">{item.tipo_mapa || "-"}</span>
                          </td>
                          <td>{item.produto || "-"}</td>
                          <td>{item.subproduto || "-"}</td>
                          <td>{item.responsavel || "-"}</td>
                          <td>{item.versao || "-"}</td>
                          <td>{item.nivel || "-"}</td>
                          <td>{item.pai || "-"}</td>
                          <td>{item.produto_servico || "-"}</td>
                          <td>{item.numero_da_task || "-"}</td>
                          <td className="max-w-[150px] truncate">{item.figma_xd || "-"}</td>
                          <td>{item.propriedade_ga4_stream_id || "-"}</td>
                          <td>{item.firebase || "-"}</td>
                          <td className="font-mono">{item.gtm_id || "-"}</td>
                          <td>{item.dominio_exclusivo_web || "-"}</td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-auto border-t border-gray-200 pt-6 pb-2 flex justify-between items-center text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          <span>Último Scrape: Hoje, 08:45 AM</span>
          <span>Martech Governance Suite v2.0.4</span>
        </footer>
      </div>
    </main>
  );
}
