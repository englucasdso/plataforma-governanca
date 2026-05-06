import React, { useState, useEffect } from 'react';
import { Target, ArrowRight, Activity, Search, Filter, CheckCircle2, AlertTriangle, AlertCircle, ChevronLeft } from 'lucide-react';
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
  
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  
  const [ga4Events, setGa4Events] = useState<any[]>([]);
  
  const [loadingState, setLoadingState] = useState<"status" | "accounts" | "properties" | "events" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoadingState("status");
    fetch("/api/events/ga4/status")
      .then(res => res.json())
      .then(data => {
          setGa4Status(data);
          setLoadingState(null);
      })
      .catch(err => {
          console.error("Error fetching GA4 status", err);
          setErrorMsg("Erro ao verificar status GA4.");
          setLoadingState(null);
      });
  }, []);

  // Fetch accounts when GA4 is selected and it's connected
  useEffect(() => {
    if (selectedPlatform === "GA4" && ga4Status?.connected && accounts.length === 0) {
      setLoadingState("accounts");
      setErrorMsg(null);
      fetch("/api/events/ga4/accounts")
        .then(async res => {
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                setAccounts(data);
            } else {
                console.error("Failed to load accounts:", data);
                setErrorMsg(data.error || "Erro ao listar contas GA4.");
            }
            setLoadingState(null);
        })
        .catch(err => {
            console.error("Error fetching GA4 accounts", err);
            setErrorMsg("Falha ao comunicar com o servidor (accounts).");
            setLoadingState(null);
        });
    }
  }, [selectedPlatform, ga4Status, accounts.length]);

  // Fetch properties when an account is selected
  useEffect(() => {
    if (selectedPlatform === "GA4" && selectedAccountId) {
      setLoadingState("properties");
      setErrorMsg(null);
      setProperties([]);
      setSelectedPropertyId('');
      setGa4Events([]);
      
      fetch(`/api/events/ga4/properties?account=${encodeURIComponent(selectedAccountId)}`)
        .then(async res => {
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                setProperties(data);
            } else {
                console.error("Failed to load properties:", data);
                setErrorMsg(data.error || "Erro ao listar propriedades GA4.");
            }
            setLoadingState(null);
        })
        .catch(err => {
            console.error("Error fetching GA4 properties", err);
            setErrorMsg("Falha ao comunicar com o servidor (properties).");
            setLoadingState(null);
        });
    }
  }, [selectedAccountId, selectedPlatform]);

  // Fetch events when a property is selected
  useEffect(() => {
      if (selectedPlatform === "GA4" && selectedPropertyId) {
          setLoadingState("events");
          setErrorMsg(null);
          setGa4Events([]);
          
          fetch(`/api/events/ga4/events?propertyId=${selectedPropertyId}`)
            .then(async res => {
                const data = await res.json();
                if (res.ok && Array.isArray(data)) {
                    setGa4Events(data);
                } else {
                    console.error("Failed to load events:", data);
                    setErrorMsg(data.error || "Erro ao buscar eventos GA4.");
                }
                setLoadingState(null);
            })
            .catch(err => {
                console.error("Error fetching GA4 events", err);
                setErrorMsg("Falha ao comunicar com o servidor (events).");
                setLoadingState(null);
            });
      } else {
          setGa4Events([]);
      }
  }, [selectedPropertyId, selectedPlatform]);

  const filteredEvents = selectedPlatform === "GA4" 
    ? ga4Events.map((evt, idx) => ({
        id: `ga4-${idx}`,
        name: evt.eventName,
        platform: 'GA4',
        status: 'ativo',
        lastOccurrence: `${evt.eventCount} ocorrências`,
        propertyName: evt.propertyName
      }))
    : selectedPlatform 
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
        
        {selectedPlatform === "GA4" && ga4Status?.connected && (
            <div className="flex flex-col gap-4 mt-6">
                <div className="flex gap-4 items-center flex-wrap">
                    <select 
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-all min-w-[200px]"
                        disabled={loadingState === "accounts"}
                    >
                        <option value="">1. Selecione uma Conta</option>
                        {accounts.map(a => (
                            <option key={a.name} value={a.name}>{a.displayName || a.name}</option>
                        ))}
                    </select>

                    <select 
                        value={selectedPropertyId}
                        onChange={(e) => setSelectedPropertyId(e.target.value)}
                        className="pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-all min-w-[200px]"
                        disabled={!selectedAccountId || loadingState === "properties"}
                    >
                        <option value="">2. Selecione uma Propriedade</option>
                        {properties.map(p => (
                            <option key={p.propertyId} value={p.propertyId}>{p.displayName || p.name}</option>
                        ))}
                    </select>
                </div>
                
                {loadingState && loadingState !== "status" && (
                    <div className="flex items-center gap-2 text-sm font-medium text-purple-600">
                        {loadingState === "accounts" && "Carregando contas..."}
                        {loadingState === "properties" && "Carregando propriedades..."}
                        {loadingState === "events" && "Buscando eventos da propriedade..."}
                    </div>
                )}
                
                {errorMsg && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-start gap-3 mt-2 text-sm font-medium max-w-2xl">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>{errorMsg}</p>
                    </div>
                )}
            </div>
        )}

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
              title={ga4Status?.connected ? "Conectado via Google Cloud SDK / ADC" : "Não configurado"}
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
                            <span className="text-[10px] text-gray-400 capitalize whitespace-nowrap">Conectado (ADC)</span>
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
                         Execute <code className="bg-red-50 px-1 py-0.5 rounded">gcloud auth application-default login</code> no terminal e reinicie o servidor.
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
            <div className="flex items-center justify-between px-8 py-4">
              <button 
                onClick={() => onSelectPlatform(null)}
                className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Nome do Evento</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Plataforma</th>
                  {selectedPlatform === "GA4" && <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Property</th>}
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Volume / Ocorrência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredEvents.map((evt: any) => (
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
                            <span className="text-xs font-medium text-gray-600">{evt.propertyName || "-"}</span>
                        </td>
                    )}
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
                {filteredEvents.length === 0 && loadingState !== "events" && (
                  <tr>
                    <td colSpan={selectedPlatform === "GA4" ? 5 : 4} className="px-8 py-10 text-center text-gray-500">
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
