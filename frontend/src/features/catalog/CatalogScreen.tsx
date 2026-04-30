import React from 'react';
import { motion } from 'motion/react';
import { Landmark, Target, ArrowRight } from 'lucide-react';

interface CatalogScreenProps {
  userName: string;
  onNavigate: (feature: 'hub' | 'events_capture') => void;
}

export function CatalogScreen({ userName, onNavigate }: CatalogScreenProps) {
  return (
    <section className="flex-col items-center justify-start pt-8 pb-12 space-y-12 flex">
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          Olá, {userName}!
        </motion.p>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-medium text-gray-900 tracking-tight leading-tight mb-4"
        >
          Plataforma de Governança
        </motion.h2>
        <p className="text-gray-500 text-lg">Selecione uma das soluções abaixo para começar sua análise ou gestão</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mx-auto">
        {/* Feature 1: Hub de Artefatos */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => onNavigate('hub')}
          className="glass-card p-10 rounded-[40px] border border-gray-100 hover:border-red-200 cursor-pointer group transition-all hover:shadow-2xl hover:shadow-red-500/10 flex flex-col justify-between"
        >
          <div>
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
               <Landmark className="w-7 h-7 text-[#cc092f]" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#cc092f] transition-colors">Hub de Artefatos</h3>
            <p className="text-gray-500 leading-relaxed font-medium">
              Busque, analise e gerencie todo o ecossistema de mensuração, tags, mapas e documentação técnica em um só lugar. Integrado com Confluence.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm font-bold text-[#cc092f] uppercase tracking-wider">
            Acessar Hub <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
          </div>
        </motion.div>

        {/* Feature 2: Captura de Eventos */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => onNavigate('events_capture')}
          className="glass-card p-10 rounded-[40px] border border-gray-100 hover:border-purple-200 cursor-pointer group transition-all hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col justify-between"
        >
          <div>
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
               <Target className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">Validação de Tracking</h3>
            <p className="text-gray-500 leading-relaxed font-medium">
              Valide a captura e roteamento de eventos de conversão no GA4, Meta, TikTok e AppsFlyer através de navegadores autenticados e sessões.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm font-bold text-purple-600 uppercase tracking-wider">
            Abrir Validação <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
