import React from 'react';
import { Target, ArrowRight } from 'lucide-react';

export function EventCaptureScreen() {
  return (
    <section className="flex flex-col flex-1 w-full max-w-7xl mx-auto pt-8 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        <div className="glass-card p-8 rounded-[40px] border border-gray-100 flex flex-col gap-6 col-span-1 shadow-sm">
          <h3 className="font-bold text-gray-900 uppercase tracking-widest text-xs mb-2">Simulação de Fluxos</h3>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            Selecione o evento de conversão ou tag que deseja auditar no ambiente de Data Layer / Pixels.
          </p>
          
          <div className="flex flex-col gap-3 mt-4">
            {['GA4 - page_view', 'Meta - ViewContent', 'TikTok - StartCheckout', 'AppsFlyer - install'].map(evt => (
              <button key={evt} className="px-6 py-4 rounded-2xl border border-gray-100 hover:border-purple-200 text-left font-bold text-gray-700 hover:text-purple-700 hover:shadow-lg transition-all bg-white flex items-center justify-between group">
                <span className="truncate">{evt}</span>
                <ArrowRight className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-8 rounded-[40px] border border-gray-100 flex flex-col items-center justify-center col-span-1 lg:col-span-2 shadow-sm bg-gray-50/50 min-h-[400px]">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Target className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-xl font-bold text-gray-400">Ambiente em desenvolvimento</p>
          <p className="text-sm text-gray-400 mt-3 max-w-md text-center leading-relaxed">
            Aqui será injetado o navegador autenticado e exibido o log de requests de rede em tempo real para auditoria dos pacotes (GA4, Meta, etc).
          </p>
        </div>
      </div>
    </section>
  );
}
