import React, { useState } from 'react';
import { Target, ArrowRight, Activity, Search, Filter, CheckCircle2, AlertTriangle, AlertCircle, ChevronLeft } from 'lucide-react';
import { TypewriterText } from '../../components/TypewriterText';

import gtmLogo from '../../assets/images/regenerated_image_1778072674713.svg';
import appsFlyerLogo from '../../assets/images/regenerated_image_1778072675075.svg';
import metaLogo from '../../assets/images/regenerated_image_1778072675484.svg';

const MOCK_EVENTS = [
  { id: 1, name: 'purchase', platform: 'GA4', status: 'ativo', lastOccurrence: 'Há 2 minutos' },
  { id: 2, name: 'add_to_cart', platform: 'GA4', status: 'ativo', lastOccurrence: 'Há 5 minutos' },
  { id: 3, name: 'Purchase', platform: 'Meta', status: 'ativo', lastOccurrence: 'Há 12 minutos' },
  { id: 4, name: 'ViewContent', platform: 'Meta', status: 'atenção', lastOccurrence: 'Há 4 horas' },
  { id: 5, name: 'install', platform: 'AppsFlyer', status: 'ativo', lastOccurrence: 'Há 1 hora' },
  { id: 6, name: 'CompleteRegistration', platform: 'TikTok', status: 'inativo', lastOccurrence: 'Há 3 dias' },
  { id: 7, name: 'login', platform: 'GA4', status: 'ativo', lastOccurrence: 'Há 15 minutos' },
  { id: 8, name: 'StartCheckout', platform: 'TikTok', status: 'atenção', lastOccurrence: 'Há 8 horas' },
];

const PLATFORMS = [
  { name: 'GA4', events: 3, status: 'ativo', color: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
  { name: 'GTM', events: 12, status: 'ativo', color: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  { name: 'AppsFlyer', events: 1, status: 'ativo', color: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
  { name: 'Meta', events: 2, status: 'atenção', color: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  { name: 'TikTok', events: 2, status: 'atenção', color: 'bg-black/5', text: 'text-black', border: 'border-black/10' },
];

interface EventCaptureScreenProps {
  onNavigate?: (view: 'initial') => void;
  selectedPlatform: string | null;
  onSelectPlatform: (platform: string | null) => void;
}

export function EventCaptureScreen({ onNavigate, selectedPlatform, onSelectPlatform }: EventCaptureScreenProps) {
  const filteredEvents = selectedPlatform 
    ? MOCK_EVENTS.filter(e => e.platform === selectedPlatform)
    : MOCK_EVENTS;

  return (
    <section className="flex flex-col flex-1 w-full max-w-5xl mx-auto pt-8 pb-12 px-6">
      <div className={`flex flex-col mb-12 ${selectedPlatform ? '' : 'items-center text-center'}`}>
        <div className="flex items-center gap-3">
          <h2 className={`text-4xl font-normal text-gray-900 tracking-tight flex items-center gap-3 ${selectedPlatform ? 'mt-2' : ''}`}>
            {selectedPlatform ? `Eventos em: ${selectedPlatform}` : <TypewriterText text="Qual fonte de eventos você deseja explorar?" />}
          </h2>
        </div>
        
        {selectedPlatform && (
          <div className="flex gap-4 mt-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar evento..." 
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium w-64 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {!selectedPlatform ? (
        <div className="flex flex-wrap gap-4">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.name}
              onClick={() => onSelectPlatform(platform.name === 'GTM' ? null : platform.name)}
              className={`p-5 rounded-[24px] border border-gray-100 bg-white hover:border-gray-300 hover:shadow-md transition-all text-left flex flex-col items-start gap-3 relative overflow-hidden group min-w-[200px]`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 overflow-hidden p-2`}>
                  {platform.name === 'GA4' ? (
                    <svg viewBox="0 0 2195.9 2430.9" className="w-full h-full object-contain" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#F9AB00" d="M2195.9,2126.7c0.9,166.9-133.7,302.8-300.5,303.7c-12.4,0.1-24.9-0.6-37.2-2.1 c-154.8-22.9-268.2-157.6-264.4-314V316.1c-3.7-156.6,110-291.3,264.9-314c165.7-19.4,315.8,99.2,335.2,264.9 c1.4,12.2,2.1,24.4,2,36.7L2195.9,2126.7z"/>
                      <path fill="#E37400" d="M301.1,1828.7c166.3,0,301.1,134.8,301.1,301.1c0,166.3-134.8,301.1-301.1,301.1 C134.8,2430.9,0,2296.1,0,2129.8C0,1963.5,134.8,1828.7,301.1,1828.7z M1093.3,916.2c-167.1,9.2-296.7,149.3-292.8,316.6v808.7 c0,219.5,96.6,352.7,238.1,381.1c163.3,33.1,322.4-72.4,355.5-235.7c4.1-20,6.1-40.3,6-60.7v-907.4 c0.3-166.9-134.7-302.4-301.6-302.7C1096.8,916.1,1095,916.1,1093.3,916.2z"/>
                    </svg>
                  ) : platform.name === 'GTM' ? (
                    <img src={gtmLogo} alt="GTM" className="w-full h-full object-contain" />
                  ) : platform.name === 'AppsFlyer' ? (
                    <img src={appsFlyerLogo} alt="AppsFlyer" className="w-full h-full object-contain" />
                  ) : platform.name === 'Meta' ? (
                    <img src={metaLogo} alt="Meta" className="w-full h-full object-contain" />
                  ) : platform.name === 'TikTok' ? (
                    <svg viewBox="0 0 24 24" className="w-full h-full object-contain" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.12-3.41-3.25-3.67-5.54-.15-1.25.04-2.52.54-3.66.7-1.59 2.05-2.84 3.65-3.4 1.48-.52 3.12-.52 4.59-.03v4.19c-1.15-.31-2.44-.13-3.45.54-1.04.66-1.68 1.83-1.59 3.06.07 1.19.78 2.26 1.86 2.76 1.25.56 2.78.36 3.82-.48.91-.71 1.48-1.78 1.5-2.94.03-5.53.01-11.05.01-16.58h4.27z"/>
                    </svg>
                  ) : (
                    platform.name.charAt(0)
                  )}
                </div>
                <div>
                  <span className={`font-bold text-gray-900 group-hover:text-purple-600 transition-colors`}>
                    {platform.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {platform.status === 'ativo' ? (
                      <CheckCircle2 className={`w-3 h-3 text-green-500`} />
                    ) : (
                      <AlertTriangle className={`w-3 h-3 text-yellow-500`} />
                    )}
                    <span className="text-[10px] text-gray-400 capitalize">{platform.status}</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 w-full flex justify-between items-end">
                <div>
                  <p className="text-2xl font-black text-gray-900 leading-none mb-1">{platform.events}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Eventos</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-[32px] border border-gray-100 overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Nome do Evento</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Plataforma</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Última Ocorrência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredEvents.map(evt => (
                  <tr key={evt.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{evt.name}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 font-black text-[10px] uppercase tracking-wider rounded-lg">
                        {evt.platform}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        {evt.status === 'ativo' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {evt.status === 'atenção' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                        {evt.status === 'inativo' && <AlertCircle className="w-4 h-4 text-red-500" />}
                        <span className={`text-xs font-bold capitalize ${
                          evt.status === 'ativo' ? 'text-green-700' :
                          evt.status === 'atenção' ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                          {evt.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-medium text-gray-500">{evt.lastOccurrence}</span>
                    </td>
                  </tr>
                ))}
                {filteredEvents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-10 text-center text-gray-500">
                      Nenhum evento encontrado para esta plataforma.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
