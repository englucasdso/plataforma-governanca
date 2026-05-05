import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Landmark, Target, ArrowRight, Percent, AlertCircle, CheckCircle2, AlertTriangle, Layers, Maximize2, Shield, Activity, X } from 'lucide-react';

interface HomeScreenProps {
  userName: string;
  onNavigate: (feature: 'hub' | 'events_capture' | 'catalog') => void;
}

const INDICATORS = [
  { label: 'Cobertura Geral', value: '74%', icon: <Percent className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Produtos Monitorados', value: '17', icon: <Layers className="w-5 h-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Jornadas Mapeadas', value: '82', icon: <Activity className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Gaps Identificados', value: '63', icon: <AlertCircle className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50' },
];

const PRODUCTS = [
  { id: '1', name: 'Agora', status: 'saudável', coverage: 85, journeys: 12, gaps: 2 },
  { id: '2', name: 'Analytics / Novo Menu', status: 'atenção', coverage: 60, journeys: 8, gaps: 7 },
  { id: '3', name: 'Abertura PF & PJ', status: 'crítico', coverage: 40, journeys: 5, gaps: 15 },
  { id: '4', name: 'Seguros', status: 'saudável', coverage: 90, journeys: 15, gaps: 1 },
  { id: '5', name: 'Next', status: 'saudável', coverage: 95, journeys: 20, gaps: 0 },
  { id: '6', name: 'Mídias Digitais', status: 'atenção', coverage: 70, journeys: 6, gaps: 4 },
  { id: '7', name: 'iPlace', status: 'saudável', coverage: 88, journeys: 4, gaps: 1 },
  { id: '8', name: 'IDBra', status: 'crítico', coverage: 35, journeys: 2, gaps: 10 },
  { id: '9', name: 'E-Agro', status: 'saudável', coverage: 82, journeys: 5, gaps: 2 },
  { id: '10', name: 'Créditos', status: 'atenção', coverage: 65, journeys: 14, gaps: 8 },
  { id: '11', name: 'Consórcio', status: 'saudável', coverage: 80, journeys: 7, gaps: 3 },
  { id: '12', name: 'Cartões', status: 'atenção', coverage: 75, journeys: 18, gaps: 6 },
  { id: '13', name: 'Autoline', status: 'saudável', coverage: 92, journeys: 3, gaps: 0 },
  { id: '14', name: 'Abertura de Contas PJ', status: 'atenção', coverage: 68, journeys: 6, gaps: 5 },
  { id: '15', name: 'Abertura de Contas PF', status: 'crítico', coverage: 45, journeys: 8, gaps: 12 },
  { id: '16', name: 'Veloe', status: 'saudável', coverage: 86, journeys: 4, gaps: 1 },
  { id: '17', name: 'My Account', status: 'saudável', coverage: 89, journeys: 5, gaps: 0 },
];

export function HomeScreen({ userName, onNavigate }: HomeScreenProps) {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);

  return (
    <section className="flex flex-col flex-1 w-full max-w-[1400px] mx-auto pt-8 pb-32">
      {/* Header */}
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-gray-900 mb-2 tracking-tight"
        >
          Olá, {userName}! Bem-vindo à
        </motion.p>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-black text-gray-900 tracking-tight leading-tight mb-3 flex items-center justify-center gap-4"
        >
          Visão Estratégica
        </motion.h2>
        <p className="text-gray-500 text-lg font-medium">Explore produtos, jornadas e indicadores de governança</p>
      </div>

      {/* Top Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {INDICATORS.map((ind, idx) => (
          <motion.div 
            key={ind.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${ind.bg} ${ind.color}`}>
              {ind.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 mb-1 uppercase tracking-wider">{ind.label}</p>
              <p className="text-3xl font-black text-gray-900">{ind.value}</p>
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
                className={`cursor-pointer bg-white p-6 rounded-[28px] border transition-all duration-300 relative overflow-hidden group ${
                  isSelected 
                    ? 'border-[#cc092f] shadow-lg shadow-red-500/10 ring-1 ring-[#cc092f]/20' 
                    : 'border-gray-100 shadow-sm hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className={`text-lg font-bold tracking-tight pr-2 line-clamp-1 ${isSelected ? 'text-[#cc092f]' : 'text-gray-900'}`}>
                    {prod.name}
                  </h4>
                  <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">
                    {prod.status === 'saudável' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {prod.status === 'atenção' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                    {prod.status === 'crítico' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-gray-500 uppercase tracking-widest">Cobertura</span>
                      <span className={isSelected ? 'text-[#cc092f]' : 'text-gray-900'}>{prod.coverage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
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
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">Jornadas</p>
                      <p className="text-sm font-black text-gray-800">{prod.journeys}</p>
                    </div>
                    <div className="w-px h-6 bg-gray-100"></div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">Gaps</p>
                      <p className="text-sm font-black text-gray-800">{prod.gaps}</p>
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
            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-xl shadow-gray-200/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-50 to-transparent rounded-bl-full opacity-50 z-0"></div>
              
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

                <div className="space-y-3">
                  <button 
                    onClick={() => onNavigate('hub')}
                    className="w-full bg-[#cc092f] hover:bg-[#a10725] text-white rounded-2xl p-4 flex items-center justify-between transition-colors shadow-md shadow-red-500/20 group"
                  >
                    <div className="flex items-center gap-3">
                      <Landmark className="w-5 h-5" />
                      <span className="font-bold text-sm tracking-wide">Ver Artefatos</span>
                    </div>
                    <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>

                  <button 
                    onClick={() => onNavigate('events_capture')}
                    className="w-full bg-white border border-gray-200 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 text-gray-700 rounded-2xl p-4 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5" />
                      <span className="font-bold text-sm tracking-wide">Ver Eventos</span>
                    </div>
                    <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

    </section>
  );
}
