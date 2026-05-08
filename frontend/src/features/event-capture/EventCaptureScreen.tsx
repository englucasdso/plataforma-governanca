import React, { useState, useEffect } from 'react';
import { Target, ArrowRight, Activity, Search, Filter, CheckCircle2, AlertTriangle, AlertCircle, ChevronLeft, Loader2, Cloud, KeyRound, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TypewriterText } from '../../components/TypewriterText';

const MOCK_EVENTS = [
  { id: 3, name: 'Purchase', platform: 'Meta', status: 'ativo', lastOccurrence: 'Há 12 minutos' },
  { id: 4, name: 'ViewContent', platform: 'Meta', status: 'atenção', lastOccurrence: 'Há 4 horas' },
  { id: 5, name: 'install', platform: 'AppsFlyer', status: 'ativo', lastOccurrence: 'Há 1 hora' },
  { id: 6, name: 'CompleteRegistration', platform: 'TikTok', status: 'inativo', lastOccurrence: 'Há 3 dias' },
  { id: 8, name: 'StartCheckout', platform: 'TikTok', status: 'atenção', lastOccurrence: 'Há 8 horas' },
];

const PLATFORMS = [
  { name: 'GTM', logoUrl: 'https://cdn.simpleicons.org/googletagmanager/246FDB', events: 0, status: 'ativo', color: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  { name: 'AppsFlyer', logoUrl: 'https://cdn.simpleicons.org/appsflyer/00B298', events: 1, status: 'ativo', color: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
  { name: 'Meta', logoUrl: 'https://cdn.simpleicons.org/meta/0668E1', events: 2, status: 'atenção', color: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  { name: 'TikTok', logoUrl: 'https://cdn.simpleicons.org/tiktok/000000', events: 2, status: 'atenção', color: 'bg-black/5', text: 'text-black', border: 'border-black/10' },
];

interface EventCaptureScreenProps {
  onNavigate?: (view: 'initial') => void;
  selectedPlatform: string | null;
  onSelectPlatform: (platform: string | null) => void;
}

export function EventCaptureScreen({ onNavigate, selectedPlatform, onSelectPlatform }: EventCaptureScreenProps) {
  const [ga4Status, setGa4Status] = useState<any>(null);
  
  const [ga4Events, setGa4Events] = useState<any[]>([]);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncJob, setSyncJob] = useState({ active: false, step: 0, status: 'idle', errorMsg: '' });
  const [hasScrapedData, setHasScrapedData] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  useEffect(() => {
    fetch("/api/ga4/status")
      .then(async res => {
          const text = await res.text();
          try {
              return JSON.parse(text);
          } catch (e) {
              console.error("Invalid JSON from /api/ga4/status:", text.substring(0, 200));
              throw e;
          }
      })
      .then(data => setGa4Status(data))
      .catch(err => console.error("Error fetching GA4 status", err));
  }, []);

  const loadSavedEvents = () => {
    setLoadingInitial(true);
    fetch("/api/ga4/saved")
        .then(async res => {
            const text = await res.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error("Invalid JSON from /api/ga4/saved:", text.substring(0, 200));
                throw e;
            }
        })
        .then(data => {
            if (data && data.accounts && Array.isArray(data.accounts)) {
                setGa4Events(data.accounts); // we'll store the hierarchy here
                setHasScrapedData(true);
            } else if (Array.isArray(data) && data.length > 0) {
                setGa4Events(data); // Legacy support if needed
                setHasScrapedData(true);
            } else {
                setGa4Events([]);
                setHasScrapedData(false);
            }
            setLoadingInitial(false);
        })
        .catch(err => {
            console.error(err);
            setLoadingInitial(false);
        });
  };

  useEffect(() => {
    if (selectedPlatform === "GA4") {
        loadSavedEvents();
    }
  }, [selectedPlatform]);

  useEffect(() => {
      let interval: any;
      if (syncJob.active && syncJob.status === "running") {
          interval = setInterval(() => {
              fetch("/api/ga4/sync/status")
                  .then(async res => {
                      const text = await res.text();
                      try {
                          return JSON.parse(text);
                      } catch (e) {
                          console.error("Invalid JSON from sync/status:", text.substring(0, 200));
                          throw e;
                      }
                  })
                  .then(data => {
                      setSyncJob(data);
                      if (data.status !== "running") {
                          clearInterval(interval);
                          if (data.status === "success") {
                              loadSavedEvents();
                              setTimeout(() => setSyncJob(s => ({ ...s, active: false })), 3000);
                          }
                      }
                  })
                  .catch(err => console.error(err));
          }, 2000);
      }
      return () => clearInterval(interval);
  }, [syncJob.active, syncJob.status]);

  const [selectedAccountFilter, setSelectedAccountFilter] = useState('');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('');

  // Process hierarchy into flat lists for dropdowns
  const isNestedFormat = ga4Events.length > 0 && ga4Events[0].properties !== undefined;

  const availableAccounts = isNestedFormat 
      ? ga4Events.map(acc => ({ accountId: acc.accountId, accountName: acc.accountName }))
      : Array.from(new Set(ga4Events.map(e => e.accountId))).map(id => ga4Events.find(e => e.accountId === id)).filter(Boolean);
  
  const availableProperties = isNestedFormat
      ? ga4Events.filter(acc => !selectedAccountFilter || acc.accountId === selectedAccountFilter).flatMap(acc => acc.properties.map((p:any) => ({ propertyId: p.propertyId, propertyName: p.propertyName })))
      : Array.from(new Set(ga4Events.filter(e => !selectedAccountFilter || e.accountId === selectedAccountFilter).map(e => e.propertyId))).map(id => ga4Events.find(e => e.propertyId === id)).filter(Boolean);

  const flatEvents = [];
  if (isNestedFormat) {
      ga4Events.forEach(acc => {
          if (selectedAccountFilter && acc.accountId !== selectedAccountFilter) return;
          acc.properties.forEach((prop:any) => {
              if (selectedPropertyFilter && prop.propertyId !== selectedPropertyFilter) return;
              if (prop.events) {
                  prop.events.forEach((evt:any) => {
                      flatEvents.push({
                          ...evt,
                          accountId: acc.accountId,
                          propertyId: prop.propertyId
                      });
                  });
              }
          });
      });
  } else {
      ga4Events.forEach(evt => flatEvents.push(evt));
  }

  const handleStartSync = async () => {
      setShowAuthModal(false);
      try {
          const res = await fetch("/api/ga4/sync", { 
              method: "POST"
          });
          if (res.ok) {
              setSyncJob({ active: true, step: 1, status: 'running', errorMsg: '' });
          } else {
              setSyncJob({ active: true, step: 0, status: 'error', errorMsg: 'Falha ao iniciar sincronização' });
          }
      } catch (err) {
          console.error(err);
      }
  };

  const filteredEvents = selectedPlatform === "GA4" 
    ? flatEvents.filter((evt:any) => {
        if (selectedAccountFilter && evt.accountId !== selectedAccountFilter) return false;
        if (selectedPropertyFilter && evt.propertyId !== selectedPropertyFilter) return false;
        return true;
      }).map((evt:any, idx:number) => ({
        ...evt,
        id: evt.id || `ga4-${idx}`,
        name: evt.name || evt.eventName || "Desconhecido",
        platform: 'GA4',
        status: evt.status || 'Adicionado',
        eventType: evt.eventType || "Event",
      }))
    : selectedPlatform 
      ? MOCK_EVENTS.filter(e => e.platform === selectedPlatform)
      : MOCK_EVENTS;

  return (
    <section className="flex flex-col flex-1 w-full max-w-5xl mx-auto pt-8 pb-12 px-6">
      
      <AnimatePresence>
        {showAuthModal && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-md"
            >
                <div className="bg-white rounded-[40px] p-12 max-w-md w-full shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-bradesco-gradient" />
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mb-6 text-bradesco-red shadow-sm">
                            <KeyRound className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
                            Atualização GA4
                        </h2>
                        <p className="text-gray-500 font-medium mb-8 text-sm">
                            Sincronize os dados das suas contas e propriedades de forma automática.
                        </p>
                        <div className="w-full bg-gray-50 rounded-2xl p-4 mb-8 text-left border border-gray-100 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-bradesco-red shrink-0 mt-0.5" />
                            <p className="text-sm font-medium text-gray-600 leading-tight">
                                O sistema coletará eventos passando por todas as contas e propriedades no GA4 em background.
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-3 w-full">
                            <button 
                                onClick={handleStartSync}
                                className="w-full py-4 bg-bradesco-red text-white rounded-[20px] font-bold text-sm tracking-wide hover:bg-black transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5"
                            >
                                Iniciar Sincronização
                            </button>
                            <button 
                                onClick={() => setShowAuthModal(false)}
                                className="w-full py-4 text-gray-500 font-bold hover:text-gray-900 transition-colors text-sm"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {syncJob.active && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-6 right-6 z-[100] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-80 flex flex-col gap-3 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
                <div 
                  className={`h-full transition-all duration-500 ease-out ${syncJob.status === 'error' ? 'bg-red-500' : syncJob.status === 'success' ? 'bg-green-500' : 'bg-bradesco-red'}`} 
                  style={{ width: `${Math.min(100, Math.round((syncJob.step / 4) * 100))}%` }}
                />
              </div>
              
              <div className="flex items-start justify-between mt-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                     {syncJob.status === "running" && <Loader2 className="w-5 h-5 text-bradesco-red animate-spin" />}
                     {syncJob.status === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                     {syncJob.status === "error" && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="font-bold text-gray-900 text-sm">
                      {syncJob.status === "running" ? "Sincronizando..." : syncJob.status === "success" ? "Concluído" : "Falha na Sincronização"}
                    </span>
                    <span className="text-xs font-medium text-gray-500 mt-0.5">
                      {syncJob.status === "error" 
                        ? "Erro no processo"
                        : ["Preparando...", "Autenticando via Service Account...", "Buscando accounts e properties via API...", "Salvando eventos localmente...", "Sincronização concluída!"][syncJob.step]}
                    </span>
                  </div>
                </div>
                {syncJob.status !== 'running' && (
                  <button onClick={() => {
                        setSyncJob(s => ({ ...s, active: false }));
                  }} className="text-gray-400 hover:text-gray-600 ml-2 bg-gray-100/50 hover:bg-gray-100 p-1.5 rounded-full transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {syncJob.errorMsg && (
                 <div className="mt-2 text-xs font-medium bg-red-50 text-red-600 p-2.5 rounded-xl border border-red-100 leading-tight">
                    {syncJob.errorMsg}
                 </div>
              )}
            </motion.div>
        )}
      </AnimatePresence>

      <div className={`flex flex-col mb-12 ${selectedPlatform ? '' : 'items-center text-center'}`}>
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
            <h2 className={`text-4xl font-normal text-gray-900 tracking-tight flex items-center gap-3 ${selectedPlatform ? 'mt-2' : ''}`}>
                {selectedPlatform ? `Eventos em: ${selectedPlatform}` : <TypewriterText text="Qual fonte de eventos você deseja explorar?" />}
            </h2>
            </div>
            
            {selectedPlatform === "GA4" && (
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowAuthModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-bradesco-red text-white rounded-full font-bold text-sm tracking-wide hover:bg-black transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 whitespace-nowrap"
                    >
                        Sincronizar GA4
                    </button>
                </div>
            )}
        </div>
        
        {selectedPlatform && selectedPlatform !== "GA4" && (
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
          <button
              onClick={() => {
                 if (ga4Status?.connected) {
                     onSelectPlatform("GA4");
                 }
              }}
              className={`p-5 rounded-[24px] border ${ga4Status?.connected ? 'border-gray-100 cursor-pointer hover:border-gray-300 hover:shadow-md' : 'border-red-100 cursor-not-allowed opacity-70'} bg-white transition-all text-left flex flex-col items-start gap-3 relative overflow-hidden group min-w-[200px] max-w-[300px]`}
              title={ga4Status?.connected ? "Conectado via Service Account" : "Não configurado"}
          >
              <div className="flex flex-col gap-3 w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 overflow-hidden p-2">
                        <img src="https://cdn.simpleicons.org/googleanalytics/E37400" alt="GA4" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <span className="font-bold text-gray-900 transition-colors">
                        GA4
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                        {ga4Status?.connected ? (
                            <>
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            <span className="text-[10px] text-gray-400 capitalize whitespace-nowrap">Conectado (Service Account)</span>
                            </>
                        ) : (
                            <>
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            <span className="text-[10px] text-red-400 font-bold capitalize">Não configurado</span>
                            </>
                        )}
                        </div>
                    </div>
                  </div>
                  {!ga4Status?.connected && (
                      <p className="text-[10px] font-medium text-red-600 mt-2 leading-tight">
                         Configure a Service Account no .env ou via variável de ambiente.
                      </p>
                  )}
              </div>
          </button>
          {PLATFORMS.map((platform) => (
            <button
              key={platform.name}
              onClick={() => onSelectPlatform(platform.name === 'GTM' ? null : platform.name)}
              className={`p-5 rounded-[24px] border border-gray-100 bg-white hover:border-gray-300 hover:shadow-md transition-all text-left flex flex-col items-start gap-3 relative overflow-hidden group min-w-[200px]`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 overflow-hidden p-2`}>
                  {platform.logoUrl ? (
                    <img src={platform.logoUrl} alt={platform.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="font-bold text-gray-400">{platform.name.charAt(0)}</span>
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
          <div className="overflow-x-auto border-b border-gray-50">
            <div className="flex flex-col gap-4 px-8 py-4 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => onSelectPlatform(null)}
                  className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
                >
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>
              </div>
              
              {selectedPlatform === "GA4" && (
                  <div className="flex items-center gap-4">
                      <select 
                          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-200 transition-all min-w-[200px]"
                          value={selectedAccountFilter}
                          onChange={(e) => {
                              setSelectedAccountFilter(e.target.value);
                              setSelectedPropertyFilter(''); // Reset property when account changes
                          }}
                      >
                          <option value="">Todas as Contas</option>
                          {availableAccounts.map(acc => (
                              <option key={acc.accountId} value={acc.accountId}>{acc.accountName || acc.accountId}</option>
                          ))}
                      </select>
                      
                      <select 
                          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-200 transition-all min-w-[200px]"
                          value={selectedPropertyFilter}
                          onChange={(e) => setSelectedPropertyFilter(e.target.value)}
                          disabled={!selectedAccountFilter && availableProperties.length > 50} // Optional disabled check
                      >
                          <option value="">Todas as Properties</option>
                          {availableProperties.map(prop => (
                              <option key={prop.propertyId} value={prop.propertyId}>{prop.propertyName || prop.propertyId}</option>
                          ))}
                      </select>

                      <button 
                          onClick={loadSavedEvents}
                          className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-lg font-bold text-sm tracking-wide hover:bg-gray-800 transition-all shadow-sm whitespace-nowrap ml-4"
                      >
                          <Search className="w-4 h-4" /> Buscar eventos
                      </button>
                  </div>
              )}
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Nome do Evento</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Plataforma</th>
                  {selectedPlatform === "GA4" && (
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Tipo</th>
                  )}
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadingInitial ? (
                  <tr>
                    <td colSpan={selectedPlatform === "GA4" ? 4 : 3} className="px-8 py-10 text-center text-gray-500 flex flex-col items-center">
                        <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
                        <p className="font-semibold text-gray-900">Carregando dados salvos...</p>
                    </td>
                  </tr>
                ) : filteredEvents.map((evt: any) => (
                  <tr key={evt.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{evt.name}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 font-black text-[10px] uppercase tracking-wider rounded-lg">
                        {evt.platform}
                      </span>
                    </td>
                    {selectedPlatform === "GA4" && (
                        <td className="px-8 py-5">
                            <span className="px-3 py-1 bg-gray-50 text-gray-500 font-bold text-[10px] uppercase tracking-widest rounded-lg">{evt.eventType || "-"}</span>
                        </td>
                    )}
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        {(evt.status === 'ativo' || evt.status === 'Ativo' || evt.status === 'Adicionado') && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {evt.status === 'atenção' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                        {(evt.status === 'inativo' || evt.status === 'indisponivel' || evt.status === 'Indisponível') && <AlertCircle className="w-4 h-4 text-red-500" />}
                        <span className={`text-xs font-bold capitalize ${
                          (evt.status === 'ativo' || evt.status === 'Ativo' || evt.status === 'Adicionado') ? 'text-green-700' :
                          evt.status === 'atenção' ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                          {evt.status === 'indisponivel' ? 'Indisponível' : evt.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loadingInitial && filteredEvents.length === 0 && (
                  <tr>
                    <td colSpan={selectedPlatform === "GA4" ? 4 : 4} className="px-8 py-10 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                          <AlertCircle className="w-8 h-8 text-gray-300 mb-3" />
                          <p className="font-semibold text-gray-900">Nenhum evento encontrado.</p>
                          {selectedPlatform === "GA4" && (
                              <p className="text-sm mt-1">Clique em <strong className="text-purple-600">Sincronizar GA4</strong> no topo para iniciar a atualização.</p>
                          )}
                      </div>
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
