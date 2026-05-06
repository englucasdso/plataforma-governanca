import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Landmark, Target, ArrowRight, Percent, AlertCircle, CheckCircle2, AlertTriangle, Layers, Maximize2, Shield, Activity, X, LayoutList, Sparkles } from 'lucide-react';
import { TypewriterText } from '../../components/TypewriterText';

interface HomeScreenProps {
  userName: string;
  onNavigate: (feature: 'hub' | 'events_capture' | 'catalog') => void;
  onGenerateSummary?: () => void;
}

const INDICATORS = [
  { label: 'Cobertura Geral', value: '74%', icon: <Percent className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Produtos Monitorados', value: '17', icon: <Layers className="w-5 h-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Jornadas Mapeadas', value: '82', icon: <Activity className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Gaps Identificados', value: '63', icon: <AlertCircle className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50' },
];

const PRODUCTS = [
  { id: '1', name: 'Agora', status: 'saudável', coverage: 85, journeys: 12, gaps: 2, mappedEvents: 145, orphanEvents: 3, lastUpdate: 'Hoje' },
  { id: '2', name: 'Analytics / Novo Menu', status: 'atenção', coverage: 60, journeys: 8, gaps: 7, mappedEvents: 89, orphanEvents: 12, lastUpdate: 'Há 2 dias' },
  { id: '3', name: 'Abertura PF & PJ', status: 'crítico', coverage: 40, journeys: 5, gaps: 15, mappedEvents: 42, orphanEvents: 25, lastUpdate: 'Há 1 semana' },
  { id: '4', name: 'Seguros', status: 'saudável', coverage: 90, journeys: 15, gaps: 1, mappedEvents: 210, orphanEvents: 2, lastUpdate: 'Ontem' },
  { id: '5', name: 'Next', status: 'saudável', coverage: 95, journeys: 20, gaps: 0, mappedEvents: 320, orphanEvents: 0, lastUpdate: 'Há 3 horas' },
  { id: '6', name: 'Mídias Digitais', status: 'atenção', coverage: 70, journeys: 6, gaps: 4, mappedEvents: 110, orphanEvents: 8, lastUpdate: 'Há 4 dias' },
  { id: '7', name: 'iPlace', status: 'saudável', coverage: 88, journeys: 4, gaps: 1, mappedEvents: 65, orphanEvents: 5, lastUpdate: 'Hoje' },
  { id: '8', name: 'IDBra', status: 'crítico', coverage: 35, journeys: 2, gaps: 10, mappedEvents: 18, orphanEvents: 14, lastUpdate: 'Há 2 semanas' },
  { id: '9', name: 'E-Agro', status: 'saudável', coverage: 82, journeys: 5, gaps: 2, mappedEvents: 84, orphanEvents: 4, lastUpdate: 'Ontem' },
  { id: '10', name: 'Créditos', status: 'atenção', coverage: 65, journeys: 14, gaps: 8, mappedEvents: 130, orphanEvents: 20, lastUpdate: 'Há 5 dias' },
  { id: '11', name: 'Consórcio', status: 'saudável', coverage: 80, journeys: 7, gaps: 3, mappedEvents: 95, orphanEvents: 6, lastUpdate: 'Há 2 dias' },
  { id: '12', name: 'Cartões', status: 'atenção', coverage: 75, journeys: 18, gaps: 6, mappedEvents: 240, orphanEvents: 15, lastUpdate: 'Hoje' },
  { id: '13', name: 'Autoline', status: 'saudável', coverage: 92, journeys: 3, gaps: 0, mappedEvents: 45, orphanEvents: 1, lastUpdate: 'Há 1 semana' },
  { id: '14', name: 'Abertura de Contas PJ', status: 'atenção', coverage: 68, journeys: 6, gaps: 5, mappedEvents: 72, orphanEvents: 10, lastUpdate: 'Há 3 dias' },
  { id: '15', name: 'Abertura de Contas PF', status: 'crítico', coverage: 45, journeys: 8, gaps: 12, mappedEvents: 58, orphanEvents: 22, lastUpdate: 'Há 1 mês' },
  { id: '16', name: 'Veloe', status: 'saudável', coverage: 86, journeys: 4, gaps: 1, mappedEvents: 55, orphanEvents: 3, lastUpdate: 'Ontem' },
  { id: '17', name: 'My Account', status: 'saudável', coverage: 89, journeys: 5, gaps: 0, mappedEvents: 78, orphanEvents: 2, lastUpdate: 'Hoje' },
];

export function HomeScreen({ userName, onNavigate, onGenerateSummary }: HomeScreenProps) {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);

  return (
    <section className="flex flex-col flex-1 w-full max-w-[1400px] mx-auto pt-4 pb-8">
      <div className="flex flex-col items-center text-center justify-center mb-10 w-full max-w-4xl mx-auto gap-4 relative min-h-[80px]">
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-normal text-gray-900 tracking-tight leading-tight"
        >
          <TypewriterText text="O que você deseja analisar hoje?" />
        </motion.h2>
      </div>

      {/* Top Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {INDICATORS.map((ind, idx) => (
          <motion.div 
            key={ind.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${ind.bg} ${ind.color}`}>
              {ind.icon}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">{ind.label}</p>
              <p className="text-2xl font-normal text-gray-900">{ind.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Products Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {PRODUCTS.map((prod, idx) => {
            const isSelected = selectedProduct.id === prod.id;
            return (
              <motion.div
                key={prod.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + idx * 0.02 }}
                onClick={() => setSelectedProduct(prod)}
                className={`cursor-pointer bg-white p-4 rounded-xl border transition-all duration-300 relative overflow-hidden group ${
                  isSelected 
                    ? 'border-red-500 shadow-md ring-1 ring-red-500/20' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className={`text-sm font-bold tracking-tight pr-2 line-clamp-1 ${isSelected ? 'text-red-600' : 'text-gray-800'}`}>
                    {prod.name}
                  </h4>
                  <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-transparent group-hover:bg-gray-100 transition-colors">
                    {prod.status === 'saudável' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                    {prod.status === 'atenção' && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                    {prod.status === 'crítico' && <AlertCircle className="w-3 h-3 text-red-500" />}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold mb-1">
                      <span className="text-gray-500 uppercase tracking-widest">Cobertura</span>
                      <span className={isSelected ? 'text-red-500' : 'text-gray-700'}>{prod.coverage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          prod.coverage >= 80 ? 'bg-green-500' : prod.coverage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} 
                        style={{ width: `${prod.coverage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Map</p>
                      <p className="text-xs font-black text-gray-800">{prod.mappedEvents}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Órfão</p>
                      <p className="text-xs font-black text-orange-500">{prod.orphanEvents}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Gap</p>
                      <p className="text-xs font-black text-red-500">{prod.gaps}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Selected Product Compact Panel */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={selectedProduct.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full lg:w-[400px] shrink-0 sticky top-8"
          >
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-50/50 to-transparent rounded-bl-full opacity-50 z-0"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                    <Target className={`w-6 h-6 ${
                      selectedProduct.status === 'saudável' ? 'text-green-500' : 
                      selectedProduct.status === 'atenção' ? 'text-yellow-500' : 'text-red-500'
                    }`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-tight">Resumo do Produto</p>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedProduct.name}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-sm font-black text-gray-900 capitalize">{selectedProduct.status}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cobertura</p>
                    <p className="text-sm font-black text-gray-900">{selectedProduct.coverage}%</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest pl-1">Principais Alertas</h4>
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 text-red-900">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">Inconsistência de tagueamento</p>
                      <p className="text-xs mt-1 opacity-80 font-medium">Detectados ganchos não mapeados em 3 telas principais.</p>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 flex gap-3 text-yellow-900">
                    <AlertCircle className="w-5 h-5 shrink-0 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">Documentação desatualizada</p>
                      <p className="text-xs mt-1 opacity-80 font-medium">Os fluxos de onboarding requerem revisão no Confluence.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-50">
                  {onGenerateSummary && (
                    <button 
                      onClick={onGenerateSummary}
                      className="w-full bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-900 rounded-xl py-3 px-4 flex items-center justify-center transition-all group"
                    >
                      <div className="flex items-center gap-2">
                         <div className="relative flex items-center justify-center">
                           <Sparkles className="w-4 h-4" />
                         </div>
                        <span className="font-bold text-xs tracking-wide">Gerar resumo executivo</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

    </section>
  );
}
