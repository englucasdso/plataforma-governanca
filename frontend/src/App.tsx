/**
 * Arquivo: frontend/src/App.tsx
 * Propósito: Componente principal ("A casca" e o "coração" da tela).
 * É aqui que a mágica visual acontece:
 * 1. Controla qual "visão" entregar ao usuário (Buscador, Cards, Inventário, Insights ou Mapa de Conexões).
 * 2. Gerencia os "Estados" - Toda vez que o estado muda (ex: setAppState("insights")),
 *    o React redesenha a tela instantaneamente usando essas novas informações.
 * 3. Componentiza Modal de Exportar Tabela, Sidebar de Usuário e Admin de Usuários.
 * 
 * Importante: Lógicas pesadas de conta e busca (exclusões e levenshtein) 
 * devem morar no Backend. O frontend repassa ordens (api.ts) e obedece
 * os dados JSON que voltam da porta 3000.
 */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, AlertTriangle, Target, Network, Filter, CheckCircle2, AlertCircle, Clock, User, Info, Shield, LogOut, Trash2, Plus, Settings, Landmark, LayoutList, RefreshCw, Check, Loader2, KeyRound, Activity, ArrowRight, Search, ChevronDown, ChevronUp, ChevronLeft, ExternalLink, Download, Sparkles } from "lucide-react";
import Xarrow, { Xwrapper } from 'react-xarrows';
import { getOperationalInsights } from "./utils/inventoryHelpers";
import { fetchInventory, searchContent, fetchUsers, createUser, updateUser, deleteUser } from "./services/api";
import { Artifact, Insights, SearchResponse, User as UserType, UserRole, UserStatus } from "./types";
import { normalizar, formatDataBR, getFilteredInsights } from "./utils/helpers";
import { CatalogScreen } from "./features/catalog/CatalogScreen";
import { MultiSelect } from "./components/MultiSelect";
import { EventCaptureScreen } from "./features/event-capture/EventCaptureScreen";
import { HomeScreen } from "./features/home/HomeScreen";
import { CopilotScreen } from "./features/copilot/CopilotScreen";
import { TypewriterText } from "./components/TypewriterText";

const INITIAL_USERS: UserType[] = [
  {
    id: '1',
    name: 'Lucas Admin',
    email: 'lucas.doliveira@bradesco.com.br',
    role: 'admin',
    status: 'ativo',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Usuário Teste',
    email: 'teste@bradesco.com.br',
    role: 'gestor360',
    status: 'ativo',
    createdAt: new Date().toISOString()
  }
];

const GraphView = ({ data, isEmbedded = false, onClose }: { data: Artifact[], isEmbedded?: boolean, onClose?: () => void }) => {
  const [collapsedProducts, setCollapsedProducts] = useState<Set<string>>(new Set());
  const [collapsedSubproducts, setCollapsedSubproducts] = useState<Set<string>>(new Set());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const products = Array.from(new Set(data.map(i => i.produto || "Sem Produto")));

  const toggleProduct = (p: string) => {
    const next = new Set(collapsedProducts);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setCollapsedProducts(next);
  };

  const toggleSubproduct = (s: string) => {
    const next = new Set(collapsedSubproducts);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setCollapsedSubproducts(next);
  };

  const selectedItem = data.find(i => i.id === selectedItemId);

  const content = (
    <>
      <Xwrapper>
      <div className="flex-1 p-12 bg-gray-50/30 rounded-[50px] border border-gray-100 relative overflow-auto custom-scrollbar select-none" id="graph-canvas">
        <div className="flex flex-col gap-24 min-w-max">
          {products.map((product, pIdx) => {
            const productSubpros = Array.from(new Set(data.filter(i => i.produto === product).map(i => i.subproduto || "Sem Subproduto")));
            const isCollapsed = collapsedProducts.has(product);
            const parentId = `prod-${pIdx}`;
            
            return (
              <div 
                key={pIdx} 
                className="flex items-start gap-32 relative group/prod"
              >
                {/* Produto Node */}
                <div id={parentId} className="relative z-10 w-80">
                  <motion.div 
                    drag
                    dragMomentum={false}
                    onDrag={() => { window.dispatchEvent(new Event('resize')); }}
                    className="p-8 glass-card rounded-[40px] border-2 border-purple-500/20 bg-purple-50/30 shadow-xl cursor-grab active:cursor-grabbing"
                  >
                    <button 
                      onClick={() => toggleProduct(product)}
                      className="absolute -top-4 -right-4 bg-white border-2 border-purple-200 text-purple-600 text-xs font-black min-w-[40px] h-[40px] flex items-center justify-center rounded-2xl shadow-lg hover:scale-110 transition-transform active:scale-95 cursor-pointer z-20"
                      title={isCollapsed ? "Expandir" : "Recolher"}
                    >
                      {data.filter(i => i.produto === product).length}
                    </button>
                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-[0.2em] block mb-2">Produto</span>
                    <h4 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">{product}</h4>
                  </motion.div>
                </div>
                
                <AnimatePresence mode="popLayout">
                  {!isCollapsed && (
                    <motion.div 
                      key="subprods"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col gap-16"
                    >
                      {productSubpros.map((sub, sIdx) => {
                        const subMapas = data.filter(i => i.produto === product && i.subproduto === sub);
                        const isSubCollapsed = collapsedSubproducts.has(sub);
                        const subId = `prod-${pIdx}-sub-${sIdx}`;

                        return (
                          <div 
                            key={sIdx} 
                            className="flex items-start gap-32 relative group/sub"
                          >
                            {/* Connection Line Product -> Subproduto */}
                            <Xarrow start={parentId} end={subId} path="smooth" color="#c084fc" strokeWidth={2} showHead={false} curveness={0.8} />
                            
                            {/* Subproduto Node */}
                            <div id={subId} className="relative z-10 w-80">
                              <motion.div 
                                drag
                                dragMomentum={false}
                                onDrag={() => { window.dispatchEvent(new Event('resize')); }}
                                className="p-7 glass-card rounded-[35px] border-2 border-blue-500/20 bg-blue-50/30 shadow-lg cursor-grab active:cursor-grabbing"
                              >
                                <button 
                                  onClick={() => toggleSubproduct(sub)}
                                  className="absolute -top-4 -right-4 bg-white border-2 border-blue-200 text-blue-600 text-xs font-black min-w-[40px] h-[40px] flex items-center justify-center rounded-2xl shadow-lg hover:scale-110 transition-transform active:scale-95 cursor-pointer z-20"
                                  title={isSubCollapsed ? "Expandir" : "Recolher"}
                                >
                                  {subMapas.length}
                                </button>
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] block mb-2">Subproduto</span>
                                <h4 className="text-lg font-bold text-gray-900 tracking-tight">{sub}</h4>
                              </motion.div>
                            </div>
                            
                            <AnimatePresence mode="popLayout">
                              {!isSubCollapsed && (
                                <motion.div 
                                  key="mapas"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="flex flex-col gap-6"
                                >
                                  {subMapas.map((m, mIdx) => {
                                    const mapaId = `prod-${pIdx}-sub-${sIdx}-mapa-${mIdx}`;
                                    return (
                                      <div key={mIdx} className="relative group">
                                        {/* Connection Line Subproduto -> Mapa */}
                                        <Xarrow start={subId} end={mapaId} path="smooth" color="#93c5fd" strokeWidth={2} showHead={false} curveness={0.8} />
                                        
                                        <div id={mapaId} className="flex items-center gap-2 relative z-10">
                                          <motion.div 
                                            drag
                                            dragMomentum={false}
                                            onDrag={() => { window.dispatchEvent(new Event('resize')); }}
                                            className={`w-[350px] p-6 glass-card rounded-[32px] border transition-all flex items-center justify-between cursor-grab active:cursor-grabbing
                                              ${selectedItemId === m.id ? 'border-bradesco-red shadow-xl ring-2 ring-red-500/10' : 'border-gray-100 hover:border-red-200 shadow-md'}
                                            `}
                                          >
                                            <div className="flex-1 min-w-0 pr-4">
                                              <h5 
                                                onClick={(e) => { e.stopPropagation(); m.link && window.open(m.link, '_blank'); }}
                                                className="text-[15px] font-bold text-gray-800 line-clamp-1 hover:text-bradesco-red transition-colors cursor-pointer mb-2"
                                              >
                                                {m.titulo}
                                              </h5>
                                              <div className="flex items-center gap-2">
                                                 <div className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider
                                                    ${normalizar(m.tipo_mapa) === 'ga4 atual' 
                                                      ? 'bg-green-100 text-green-700 border border-green-200' 
                                                      : normalizar(m.tipo_mapa) === 'universal analytics' ? 'bg-red-50 text-bradesco-red border border-red-100'
                                                      : normalizar(m.tipo_mapa) === 'ga4 legado' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                                      : 'bg-gray-100 text-gray-500 border border-gray-200'}
                                                 `}>
                                                    {m.tipo_mapa || 'Doc'}
                                                 </div>
                                                 <span className="text-[10px] font-bold text-gray-400 font-mono">#{m.id}</span>
                                              </div>
                                            </div>
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); setSelectedItemId(selectedItemId === m.id ? null : m.id); }}
                                              className={`p-3 rounded-2xl transition-all shadow-sm
                                                ${selectedItemId === m.id 
                                                  ? 'bg-bradesco-gradient text-white shadow-red-200' 
                                                  : 'bg-white border border-gray-100 text-gray-400 hover:text-bradesco-red hover:border-red-200'}
                                              `}
                                              title="Ver detalhes"
                                            >
                                              <Info className="w-5 h-5" />
                                            </button>
                                          </motion.div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </Xwrapper>

      {/* Details side panel remains same or slightly adjusted */}
      <AnimatePresence>
        {selectedItemId && selectedItem && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={`fixed top-0 right-0 h-full w-[500px] bg-white border-l border-gray-100 shadow-2xl p-10 flex flex-col custom-scrollbar overflow-auto transition-all ${isEmbedded ? 'z-[90]' : 'z-[70]'}`}
          >
            <div className="flex justify-between items-center mb-10">
              <div className="px-5 py-2 bg-red-50 text-bradesco-red rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100">
                Detalhamento do Mapa
              </div>
              <button onClick={() => setSelectedItemId(null)} className="p-3 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <h3 className="text-3xl font-black text-gray-900 leading-tight mb-8 tracking-tight">
              {selectedItem.titulo}
            </h3>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-gray-50 rounded-[32px] border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ID do Mapa</p>
                  <p className="text-sm font-bold text-gray-800">{selectedItem.id}</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-[32px] border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nível Crítico</p>
                  <p className="text-sm font-bold text-gray-800">{selectedItem.nivel || "Standard"}</p>
                </div>
              </div>

              <div className="p-8 glass-card rounded-[40px] border border-gray-100">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                       <Landmark className="w-6 h-6" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto / Subproduto</p>
                       <p className="text-base font-bold text-gray-800">{selectedItem.produto} → {selectedItem.subproduto}</p>
                    </div>
                 </div>

                 <div className="pt-8 border-t border-gray-100 grid grid-cols-2 gap-8">
                    <div>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">GTM ID</p>
                       <p className="text-[13px] font-mono font-bold text-[#cc092f] bg-red-50 px-3 py-1.5 rounded-xl inline-block border border-red-100">{selectedItem.gtm_id || "-"}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Responsável Técnica</p>
                       <p className="text-[13px] font-bold text-gray-800">{selectedItem.responsavel || "N/A"}</p>
                    </div>
                    
                    <div className="col-span-2 pt-6 border-t border-gray-50 grid grid-cols-2 gap-8">
                      <div>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">GA4 Stream ID</p>
                         <p className="text-[13px] font-mono font-bold text-gray-800">{selectedItem.propriedade_ga4_stream_id || "-"}</p>
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Firebase</p>
                         <p className="text-[13px] font-mono font-bold text-gray-800">{selectedItem.firebase || "-"}</p>
                      </div>
                    </div>
                    
                    <div className="col-span-2 pt-6 border-t border-gray-50 flex flex-col gap-4">
                      <div>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nº Task</p>
                         <p className="text-[13px] font-bold text-gray-800">{selectedItem.numero_da_task || "-"}</p>
                      </div>
                      {selectedItem.figma_xd && selectedItem.figma_xd !== "-" && (
                        <div>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Figma / UI</p>
                           <a href={selectedItem.figma_xd} target="_blank" rel="noreferrer" className="text-[13px] font-black text-purple-600 hover:text-purple-800 hover:underline">
                             Abrir Protótipo Visual
                           </a>
                        </div>
                      )}
                    </div>
                 </div>
              </div>

              {selectedItem.link && (
                <button 
                  onClick={() => window.open(selectedItem.link, '_blank')}
                  className="w-full py-6 bg-bradesco-gradient text-white rounded-[32px] font-black text-xs uppercase tracking-widest shadow-xl shadow-red-200 hover:opacity-95 transition-all flex items-center justify-center gap-2"
                >
                  Abrir Documentação GA <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="mt-auto pt-10 text-center">
              <p className="text-[10px] font-black text-gray-200 uppercase tracking-[0.3em]">Hub de Artefatos</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (isEmbedded) {
    return <div className="flex flex-col min-h-[800px]">{content}</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-white backdrop-blur-3xl p-12 flex flex-col"
    >
      <div className="flex justify-between items-center mb-12 px-4 max-w-7xl mx-auto w-full">
         <div className="flex items-center gap-4">
            <h1 className="brand-text text-2xl font-black tracking-tight text-gray-900 transition-colors">
              Hub de Artefatos
            </h1>
         </div>
         <button onClick={() => { if (onClose) onClose(); }} className="p-4 hover:bg-gray-100 rounded-full transition-all hover:rotate-90">
            <X className="w-6 h-6 text-gray-400" />
         </button>
      </div>
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {content}
      </div>
    </motion.div>
  );
};

const AdminUsers = ({ users, onAddUser, onUpdateUser, onDeleteUser, onClose }: { 
  users: UserType[], 
  onAddUser: (u: Omit<UserType, 'id' | 'createdAt'>) => void,
  onUpdateUser: (u: UserType) => void,
  onDeleteUser: (id: string) => void,
  onClose: () => void 
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({ name: '', nickname: '', email: '', role: 'gestor360' as UserRole, status: 'ativo' as UserStatus });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate corporate email if needed, but not strictly asked, just "if applicable". Simple check could be `@bradesco.com.br` but we can leave without it or add a quick logic
    if (editingUser) {
      onUpdateUser({ ...editingUser, ...formData });
      setEditingUser(null);
    } else {
      onAddUser(formData);
      setShowAddForm(false);
    }
    setFormData({ name: '', nickname: '', email: '', role: 'gestor360', status: 'ativo' });
  };

  const startEdit = (user: UserType) => {
    setEditingUser(user);
    setFormData({ name: user.name, nickname: user.nickname || '', email: user.email, role: user.role, status: user.status || 'ativo' });
    setShowAddForm(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-white backdrop-blur-xl p-8 flex flex-col"
    >
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-medium tracking-tight text-gray-900">Gestão de Usuários</h2>
            <p className="text-gray-500">Controle de acesso e permissões da plataforma</p>
          </div>
          <div className="flex items-center gap-4">
             {!showAddForm && (
                <button 
                  onClick={() => { setShowAddForm(true); setEditingUser(null); setFormData({ name: '', nickname: '', email: '', role: 'gestor360', status: 'ativo' }); }}
                  className="flex items-center gap-2 px-6 py-3 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-red-200"
                   style={{ background: 'linear-gradient(90deg, #7D046D 0%, #cc092f 100%)' }}
                >
                  <Plus className="w-4 h-4" /> Novo Usuário
                </button>
             )}
            <button onClick={onClose} className="p-4 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {showAddForm ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-10 rounded-[40px] max-w-lg mx-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-6">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nome Completo</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-bradesco-red transition-all font-medium text-gray-800"
                  placeholder="Nome do colaborador"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Apelido (Opcional)</label>
                <input 
                  type="text" 
                  value={formData.nickname}
                  onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-bradesco-red transition-all font-medium text-gray-800"
                  placeholder="Apelido/Nome de exibição"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">E-mail Corporativo</label>
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-bradesco-red transition-all font-medium text-gray-800"
                  placeholder="email@bradesco.com.br"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Perfil de Acesso</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-bradesco-red transition-all font-medium text-gray-800 appearance-none"
                >
                  <option value="gestor360">GESTOR 360 (Acesso Completo)</option>
                  <option value="estrategico">ESTRATÉGICO (Visão Estratégica)</option>
                  <option value="artefatos">ARTEFATOS (Hub de Artefatos)</option>
                  <option value="eventos">EVENTOS (Hub de Eventos)</option>
                  <option value="admin">ADMIN (Gestão Total)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Status</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as UserStatus })}
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-bradesco-red transition-all font-medium text-gray-800 appearance-none"
                >
                  <option value="ativo">ATIVO</option>
                  <option value="inativo">INATIVO</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-8 py-4 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-red-200"
                  style={{ background: 'linear-gradient(90deg, #7D046D 0%, #cc092f 100%)' }}
                >
                  {editingUser ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <div className="glass-card overflow-hidden rounded-[40px] border border-gray-100 bg-white">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-6 text-[10px] font-black text-gray-400 tracking-widest">NOME / APELIDO</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 tracking-widest">E-MAIL</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 tracking-widest">PERFIL</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 tracking-widest">STATUS</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 tracking-widest text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-6">
                      <p className="text-sm font-bold text-gray-900">{u.name}</p>
                      {u.nickname && <p className="text-xs text-gray-400 font-medium">({u.nickname})</p>}
                    </td>
                    <td className="p-6 text-sm text-gray-500">{u.email}</td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.status === 'ativo' || u.status === 'active' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {u.status === 'ativo' || u.status === 'active' ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </td>
                    <td className="p-6 text-right space-x-2">
                       <button onClick={() => startEdit(u)} className="p-2 text-gray-400 hover:text-bradesco-red transition-colors">Editar</button>
                       {users.length > 1 && (
                         <button onClick={() => onDeleteUser(u.id)} className="p-2 text-gray-400 hover:text-bradesco-red transition-colors"><Trash2 className="w-4 h-4" /></button>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const Login = ({ onLogin, users }: { onLogin: (u: UserType) => void, users: UserType[] }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const lastSync = localStorage.getItem('last_sync');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const allUsers = users.length > 0 ? users : [{
      id: '1',
      name: 'Lucas Admin',
      email: 'lucas.doliveira@bradesco.com.br',
      role: 'admin' as any,
      status: 'ativo' as any,
      createdAt: new Date().toISOString()
    }];
    const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      if (user.status !== 'ativo' && user.status !== 'active') {
        setError("Seu acesso está inativo. Procure um administrador.");
      } else {
        onLogin(user);
      }
    } else {
      setError("Acesso não autorizado. E-mail não encontrado na base de usuários.");
    }
  };

  return (
    <div className="min-h-screen hero bg-gray-50 relative flex items-center justify-center overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-100/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-100/30 rounded-full blur-[100px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-12 rounded-[50px] max-w-md w-full shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <div 
            className="w-16 h-16 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white shadow-xl shadow-red-200"
            style={{ background: 'linear-gradient(90deg, #7D046D 0%, #cc092f 100%)' }}
          >
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-[26px] font-black text-gray-900 mb-1 tracking-tight">Omni 360</h1>
          <div className="flex flex-col items-center gap-3">
            <p className="text-gray-400 text-sm font-medium">Ecossistema central de governança e mensuração</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">E-mail Corporativo</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="seu.email@bradesco.com.br"
              className="w-full px-8 py-5 bg-gray-50 border border-transparent rounded-[24px] focus:bg-white focus:border-[#cc092f] focus:ring-4 focus:ring-[#cc092f]/10 transition-all font-bold text-gray-800"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 p-4 bg-red-50 text-[#cc092f] rounded-2xl border border-red-100"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-bold">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            className="w-full py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-red-200"
            style={{ background: 'linear-gradient(90deg, #7D046D 0%, #cc092f 100%)' }}
          >
            Entrar no Sistema
          </button>
        </form>

        <div className="mt-10 pt-10 border-t border-gray-100 flex flex-col justify-center text-center gap-1">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">bradesco - beta v2.0.0</p>
          {lastSync && (
            <p className="text-[9px] font-medium text-gray-400">Última sincronização: {lastSync}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const AuthScreen = ({ onLogin, onCancel }: { onLogin: (u: string, p: string) => void, onCancel: () => void }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg("Por favor, preencha usuário e senha.");
      return;
    }
    onLogin(username, password);
  };

  return (
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
            Autenticação Confluence
          </h2>
          <p className="text-gray-500 font-medium mb-8 text-sm">
            Faça login para permitir a sincronização
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4 mb-2 text-left">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Usuário</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bradesco-red focus:border-bradesco-red outline-none transition-all placeholder:text-gray-400"
                placeholder="Ex: i462211"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Senha</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bradesco-red focus:border-bradesco-red outline-none transition-all placeholder:text-gray-400"
                placeholder="Sua senha corporativa"
              />
            </div>
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium border border-red-100 text-center">
                {errorMsg}
              </div>
            )}
            <div className="pt-4 flex flex-col gap-3">
              <button 
                type="submit"
                className="px-8 py-3 rounded-full font-bold transition-colors text-sm uppercase tracking-wider bg-bradesco-red text-white hover:bg-black w-full"
              >
                Continuar
              </button>
              <button 
                type="button"
                onClick={onCancel}
                className="px-8 py-3 rounded-full font-bold transition-colors text-sm uppercase tracking-wider bg-gray-50 text-gray-600 hover:bg-gray-100 w-full"
              >
                Voltar para busca
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

const SyncWidget = ({ job, onCancel }: { job: any, onCancel: () => void }) => {
  if (!job.active) return null;
  
  const stepsText = [
    "Conectando ao ambiente de documentação...",
    "Mapeando estrutura de produtos...",
    "Organizando artefatos e métricas...",
    "Atualizando base de conhecimento local...",
    "Concluído"
  ];
  
  const percentage = Math.min(100, Math.round(((job.step + 1) / 5) * 100));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.9 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }} 
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className="fixed bottom-6 right-6 z-[100] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-80 flex flex-col gap-3 overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
        <div 
          className={`h-full transition-all duration-500 ease-out ${job.status === 'error' ? 'bg-red-500' : job.status === 'success' ? 'bg-green-500' : 'bg-bradesco-red'}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex items-start justify-between mt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
             {job.status === "running" && <Loader2 className="w-5 h-5 text-bradesco-red animate-spin" />}
             {job.status === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
             {job.status === "error" && <AlertTriangle className="w-5 h-5 text-red-500" />}
          </div>
          <div className="flex flex-col flex-1">
            <span className="font-bold text-gray-900 text-sm">
              {job.status === "running" ? "Sincronizando..." : job.status === "success" ? "Concluído" : "Falha na Sincronização"}
            </span>
            <span className="text-[10px] text-gray-500 font-medium leading-tight mt-0.5">
              {job.status === "error" ? "Não foi possível concluir" : stepsText[job.step] || `${percentage}% concluído`}
            </span>
          </div>
        </div>
      </div>
      
      {job.status === "error" && (
        <div className="text-[10px] text-red-600 font-medium bg-red-50 p-2 rounded-lg mt-1">
          {job.errorMsg}
        </div>
      )}
      
      {job.status === "running" && (
        <button 
          onClick={onCancel}
          className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors w-full text-left flex items-center gap-1.5 px-1 py-1 mt-1 uppercase tracking-wider"
        >
          <X className="w-3 h-3" /> Cancelar processo
        </button>
      )}
    </motion.div>
  );
};

const AIReveal = ({ isLoading, children }: { isLoading: boolean, children: React.ReactNode }) => {
  return (
    <div className="relative w-full">
      {children}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-40 pointer-events-none bg-white/40 backdrop-blur-[1px]"
          >
             <div className="absolute top-0 left-0 w-full h-[2px] overflow-hidden">
               <div className="w-full h-full bg-gradient-to-r from-transparent via-purple-500/50 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [query, setQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [usersDb, setUsersDb] = useState<UserType[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<Artifact[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [appState, setAppState] = useState<"copilot" | "home" | "catalog" | "initial" | "results" | "decision" | "insights" | "empty" | "inventory_table" | "graph" | "auth" | "syncing" | "events_capture" | "operational_insights">("copilot");
  const [showSummary, setShowSummary] = useState(false);
  const [capturePlatform, setCapturePlatform] = useState<string | null>(null);
  const [syncCredentials, setSyncCredentials] = useState({ username: "", password: "" });
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [tableFilter, setTableFilter] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('last_sync'));
  const [showExportModal, setShowExportModal] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  const [fullInventory, setFullInventory] = useState<Artifact[]>([]);

  useEffect(() => {
    if ((appState === "operational_insights" || appState === "home") && fullInventory.length === 0) {
      setLoading(true);
      fetchInventory()
        .then((res) => {
          setFullInventory(res.resultados);
        })
        .catch((e) => console.error(e))
        .finally(() => setLoading(false));
    }
  }, [appState, fullInventory.length]);

  const { recentActivities, chartData } = useMemo(() => getOperationalInsights(fullInventory), [fullInventory]);

  const handleBarClick = (items: Artifact[]) => {
    if(items.length === 0) return;
    setResults(items);
    setAppState("results");
  };

  const handleActivityClick = (item: Artifact) => {
    setResults([item]);
    setAppState("results");
  };
  
  const [geminiAnalysis, setGeminiAnalysis] = useState<any>(null);
  const [loadingGemini, setLoadingGemini] = useState(false);
  const [geminiError, setGeminiError] = useState("");

  const [expandedInventoryRows, setExpandedInventoryRows] = useState<Set<string>>(new Set());
  const [insightFilters, setInsightFilters] = useState({ ga: 'all', produto: 'all', subproduto: 'all' });
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);
  const [inventoryViewMode, setInventoryViewMode] = useState<'table' | 'panel'>('table');
  
  const [syncJob, setSyncJob] = useState<{
    active: boolean;
    step: number; 
    status: "running" | "success" | "error";
    errorMsg: string;
  }>({ active: false, step: 0, status: "running", errorMsg: "" });

  const startBackgroundSync = async (u: string, p: string) => {
    setSyncJob({ active: true, step: 0, status: "running", errorMsg: "" });

    const timer1 = setTimeout(() => setSyncJob(s => s.status === 'running' ? {...s, step: 1} : s), 1500); 
    const timer2 = setTimeout(() => setSyncJob(s => s.status === 'running' ? {...s, step: 2} : s), 12000); 
    const timer3 = setTimeout(() => setSyncJob(s => s.status === 'running' ? {...s, step: 3} : s), 35000); 

    try {
      const res = await fetch("/api/update-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rootId: "1542391004", maxRows: null, username: u, password: p })
      });
      
      const data = await res.json();
      
      clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3);
      
      if (!res.ok) {
         throw new Error(data.error || "Falha na sincronização");
      }
      
      setSyncJob(s => ({ ...s, step: 4, status: "success" }));
      const now = new Date().toLocaleString('pt-BR');
      localStorage.setItem('last_sync', now);
      setLastSync(now);
      
      setTimeout(() => {
        setSyncJob(s => ({ ...s, active: false }));
      }, 10000);
    } catch (err: any) {
      clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3);
      setSyncJob(s => ({ ...s, status: "error", errorMsg: err.message || "Erro desconhecido" }));
      setTimeout(() => {
        setSyncJob(s => ({ ...s, active: false }));
      }, 10000);
    }
  };

  const cancelSyncJob = async () => {
    try {
      await fetch("/api/cancel-inventory", { method: "POST" });
    } catch(e) {}
    setSyncJob({ active: false, step: 0, status: "running", errorMsg: "" });
  };

  
  // Advanced Inventory State
  const [inventoryFilters, setInventoryFilters] = useState<Record<string, string[]>>({
    tipo_mapa: [],
    produto: [],
    subproduto: [],
    responsavel: [],
    status: [],
    ano: []
  });
  const [inventorySort, setInventorySort] = useState<{
    field: keyof Artifact | 'null';
    direction: 'asc' | 'desc';
  }>({ field: 'null', direction: 'desc' });

  // Quick Chips logic
  const [activeChip, setActiveChip] = useState('Todos');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleBack = () => {
    switch (appState) {
      case 'events_capture':
        if (capturePlatform) {
          setCapturePlatform(null);
        } else {
          setAppState('copilot');
        }
        break;
      case 'initial':
      case 'inventory_table':
      case 'home':
      case 'catalog':
      case 'results':
      case 'graph':
      case 'insights':
      case 'decision':
      case 'empty':
        setAppState('copilot');
        break;
      default:
        setAppState('copilot');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Session check
    const savedUser = localStorage.getItem('cortex_current_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    // Connect to Users API
    fetchUsers().then(users => {
      setUsersDb(users);
    }).catch(err => {
      console.error("Failed to load users:", err);
    });
  }, []);

  const handleLogin = async (user: UserType) => {
    setCurrentUser(user);
    localStorage.setItem('cortex_current_user', JSON.stringify(user));
    
    // Update lastAccess
    try {
      await updateUser(user.id, { lastAccess: new Date().toISOString() });
      const updatedUsers = await fetchUsers();
      setUsersDb(updatedUsers);
    } catch (err) {
      console.error("Failed to update last access", err);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowAdmin(false);
    localStorage.removeItem('cortex_current_user');
    resetSearch();
  };

  const handleAddUser = async (userData: Omit<UserType, 'id' | 'createdAt'>) => {
    try {
      const newUser = await createUser(userData);
      const updatedUsers = await fetchUsers();
      setUsersDb(updatedUsers);
    } catch (err: any) {
      alert(err.message || "Erro ao adicionar usuário.");
    }
  };

  const handleUpdateUser = async (updated: UserType) => {
    try {
      await updateUser(updated.id, updated);
      const updatedUsers = await fetchUsers();
      setUsersDb(updatedUsers);

      // If I updated myself, refresh session
      if (currentUser?.id === updated.id) {
        const myNewData = updatedUsers.find((u: UserType) => u.id === updated.id);
        if (myNewData) {
          setCurrentUser(myNewData);
          localStorage.setItem('cortex_current_user', JSON.stringify(myNewData));
        }
      }
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar usuário.");
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteUser(id);
      const updatedUsers = await fetchUsers();
      setUsersDb(updatedUsers);
    } catch (err: any) {
      alert(err.message || "Erro ao deletar usuário.");
    }
  };

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

  /**
   * Realiza a busca quando o usuário clica em Enter ou no ícone da Lupa.
   * Ele usa as rotas da API que definimos no backend.
   * Se o usuário digitar "Tudo" (ou a variação base), ele busca os insights completos.
   * Caso contrário, ele busca com base em palavras exatas.
   * @param overrideQuery - Se passado, sobrepõe o texto digitado (usado ao clicar nos atalhos)
   */
  const isSearchingRef = useRef(false);

  const executeSearch = async (overrideQuery?: string) => {
    if (isSearchingRef.current || loading) return;

    const q = overrideQuery ?? query;
    if (!q.trim()) return;

    const normalizedQ = normalizar(q);
    const syncIntents = [
      "atualizar inventario", "atualizar inventário", "atualizar confluence", "atualizar confluencia", "atualizar confluência",
      "sincronizar confluence", "sincronizar confluencia", "sincronizar confluência", "sincronizar inventario", "sincronizar inventário",
      "sync confluence", "atualizar base"
    ];

    if (syncIntents.some(intent => normalizedQ.includes(normalizar(intent)))) {
      setAppState("auth");
      return;
    }

    isSearchingRef.current = true;
    setLoading(true);
    setAppState("results");
    setResults([]);
    setExpandedCards(new Set());
    setInsightFilters({ ga: 'all', produto: 'all', subproduto: 'all' });

    // Artificial delay to show animations
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const normalizedQ = normalizar(q);
      const isInventory = normalizedQ.includes("inventario") || 
                        normalizedQ.includes("base completa") || 
                        normalizedQ.includes("lista") || 
                        normalizedQ.includes("todos os dados") ||
                        normalizedQ.includes("relatorio geral");

      const data: SearchResponse = isInventory 
        ? await fetchInventory() 
        : await searchContent(q);

      setResults(data.resultados);
      setInsights(data.insights);

      if (isInventory) {
        setAppState("inventory_table");
      } else if (data.total === 0) {
        setAppState("empty");
      } else if (data.total === 1) {
        setAppState("inventory_table");
        setExpandedInventoryRows(new Set([data.resultados[0].id]));
      } else {
        setAppState("results");
      }
    } catch (error) {
      console.error("Search failed", error);
      setAppState("empty");
    } finally {
      setLoading(false);
      isSearchingRef.current = false;
    }
  };

  const applyInsightFilters = () => {
    let filtered = [...results];
    if (insightFilters.ga !== 'all') {
      filtered = filtered.filter(item => normalizar(item.tipo_mapa) === insightFilters.ga);
    }
    if (insightFilters.produto !== 'all') {
      filtered = filtered.filter(item => item.produto === insightFilters.produto);
    }
    if (insightFilters.subproduto !== 'all') {
      filtered = filtered.filter(item => item.subproduto === insightFilters.subproduto);
    }
    setInsights(getFilteredInsights(filtered, query));
  };

  const fetchGeminiInsights = async () => {
    setLoadingGemini(true);
    setGeminiError("");
    setGeminiAnalysis(null);
    try {
      const filtered = results; // Uses the current filtered results or all results
      const res = await fetch("/api/insights/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtered)
      });
      if (!res.ok) throw new Error("Erro na API.");
      const data = await res.json();
      setGeminiAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setGeminiError("Não foi possível gerar a análise com a IA no momento.");
    } finally {
      setLoadingGemini(false);
    }
  };

  useEffect(() => {
    if (appState === "insights") {
      applyInsightFilters();
      if (!geminiAnalysis && !loadingGemini && !geminiError) {
         fetchGeminiInsights();
      }
    }
  }, [insightFilters, appState]);

  // Inventory Logic - Computed Filtered & Sorted Results
  const filteredInventory = useMemo(() => {
    let base = [...results];

    // Global Search
    if (tableFilter) {
      const lowFilter = normalizar(tableFilter);
      const searchWords = lowFilter.split(/\s+/).filter(Boolean);
      base = base.filter(item => {
        const rowContent = normalizar(Object.values(item).join(" "));
        return searchWords.every(word => rowContent.includes(word));
      });
    }

    // Quick Chips (shortcuts)
    if (activeChip === 'GA4 Atual') base = base.filter(i => normalizar(i.tipo_mapa) === 'ga4 atual');
    if (activeChip === 'Universal Analytics') base = base.filter(i => normalizar(i.tipo_mapa) === 'universal analytics');
    if (activeChip === 'GA4 Legado') base = base.filter(i => normalizar(i.tipo_mapa) === 'ga4 legado');
    if (activeChip === 'Doc') base = base.filter(i => {
      const t = normalizar(i.tipo_mapa);
      return t === 'doc' || (t !== 'ga4 atual' && t !== 'ga4 legado' && t !== 'universal analytics');
    });
    if (activeChip === 'Sem responsável') base = base.filter(i => !i.responsavel || i.responsavel === '-');
    if (activeChip === 'Sem subproduto') base = base.filter(i => !i.subproduto || i.subproduto === '-');

    // Independent Filters
    if (inventoryFilters.tipo_mapa.length > 0) {
      base = base.filter(i => inventoryFilters.tipo_mapa.includes(normalizar(i.tipo_mapa)));
    }
    if (inventoryFilters.produto.length > 0) {
      base = base.filter(i => inventoryFilters.produto.includes(i.produto || ""));
    }
    if (inventoryFilters.subproduto.length > 0) {
      base = base.filter(i => inventoryFilters.subproduto.includes(i.subproduto || ""));
    }
    if (inventoryFilters.responsavel.length > 0) {
      base = base.filter(i => inventoryFilters.responsavel.includes(i.responsavel || ""));
    }
    if (inventoryFilters.status.length > 0) {
      base = base.filter(i => {
        let isMatch = false;
        const t = normalizar(i.tipo_mapa);
        if (inventoryFilters.status.includes('ga4 atual') && t === 'ga4 atual') isMatch = true;
        if (inventoryFilters.status.includes('ga4 legado') && t === 'ga4 legado') isMatch = true;
        if (inventoryFilters.status.includes('universal analytics') && t === 'universal analytics') isMatch = true;
        if (inventoryFilters.status.includes('doc') && (t === 'doc' || (t !== 'ga4 atual' && t !== 'ga4 legado' && t !== 'universal analytics'))) isMatch = true;
        return isMatch;
      });
    }
    if (inventoryFilters.ano.length > 0) {
      base = base.filter(i => {
        const date = new Date(i.ultima_atualizacao);
        return inventoryFilters.ano.includes(date.getFullYear().toString());
      });
    }

    // Sorting
    if (inventorySort.field !== 'null') {
      base.sort((a, b) => {
        const valA = String(a[inventorySort.field as keyof Artifact] || "");
        const valB = String(b[inventorySort.field as keyof Artifact] || "");
        
        if (inventorySort.direction === 'asc') {
          return valA.localeCompare(valB, 'pt-BR', { numeric: true });
        } else {
          return valB.localeCompare(valA, 'pt-BR', { numeric: true });
        }
      });
    }

    return base;
  }, [results, tableFilter, inventoryFilters, inventorySort, activeChip]);

  const currentInventoryInsights = useMemo(() => {
    return getFilteredInsights(filteredInventory, tableFilter || query);
  }, [filteredInventory, tableFilter, query]);

  const inventorySummary = useMemo(() => {
    return {
      total: filteredInventory.length,
      ga4Atual: filteredInventory.filter(i => normalizar(i.tipo_mapa) === 'ga4 atual').length,
      ga4Legado: filteredInventory.filter(i => normalizar(i.tipo_mapa) === 'ga4 legado').length,
      universalAnalytics: filteredInventory.filter(i => normalizar(i.tipo_mapa) === 'universal analytics').length,
      docs: filteredInventory.filter(i => {
        const t = normalizar(i.tipo_mapa);
        return t === 'doc' || (t !== 'ga4 atual' && t !== 'ga4 legado' && t !== 'universal analytics');
      }).length
    };
  }, [filteredInventory]);

  const toggleInventoryRow = (id: string) => {
    const next = new Set(expandedInventoryRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedInventoryRows(next);
  };

  const startResize = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Find the current width or use the default min width from CSS / content
    const thElement = (e.target as HTMLElement).closest('th');
    const startWidth = thElement ? thElement.getBoundingClientRect().width : 120;
    
    resizingRef.current = {
      key,
      startX: e.clientX,
      startWidth
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    
    const { key, startX, startWidth } = resizingRef.current;
    const diff = e.clientX - startX;
    const newWidth = Math.max(120, startWidth + diff); // 120px min width
    
    setColumnWidths(prev => ({
      ...prev,
      [key]: newWidth
    }));
  };

  const handleMouseUp = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleViewArtifactDetails = (id: string) => {
    setShowGraph(false);
    setAppState("inventory_table");
    setTableFilter(id);
    setInventoryFilters({
      tipo_mapa: [],
      produto: [],
      subproduto: [],
      responsavel: [],
      status: [],
      ano: []
    });
    
    setTimeout(() => {
      if (!expandedInventoryRows.has(id)) {
        toggleInventoryRow(id);
      }
      const el = document.getElementById(`row-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const resetInventoryFilters = () => {
    setTableFilter("");
    setInventoryFilters({
      tipo_mapa: [],
      produto: [],
      subproduto: [],
      responsavel: [],
      status: [],
      ano: []
    });
    setActiveChip('Todos');
    setInventorySort({ field: 'null', direction: 'desc' });
  };

  const handleSort = (field: keyof Artifact) => {
    setInventorySort(prev => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'asc' };
    });
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight})`, "gi");
    const parts = String(text).split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-100 text-gray-900 border-b-2 border-yellow-400 p-0 font-bold">{part}</mark> : part
    );
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
    setExpandedCards(new Set());
    setExpandedInventoryRows(new Set());
    setShowGraph(false);
    setTableFilter("");
  };

  const downloadFile = (data: string, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      const items = filteredInventory;

      if (format === "json") {
        downloadFile(JSON.stringify(items, null, 2), "inventario_hub_filtrado.json", "application/json");
      } else {
        const headers = Object.keys(items[0]).join(",");
        const rows = items.map((item: any) => 
          Object.values(item).map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")
        );
        const csv = [headers, ...rows].join("\n");
        downloadFile(csv, "inventario_hub_filtrado.csv", "text/csv");
      }
      setShowExportModal(false);
    } catch (error) {
      console.error("Export failed", error);
    }
  };

  const GradientSparkles = ({ className, animate = false }: { className?: string; animate?: boolean }) => (
    <motion.div
      animate={animate ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
      transition={{ repeat: Infinity, duration: 2 }}
      className={className}
    >
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "url(#sparkle-grad)" }}>
        <defs>
          <linearGradient id="sparkle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7d046d" />
            <stop offset="100%" stopColor="#cc092f" />
          </linearGradient>
        </defs>
        <path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z"/>
        <path d="M5 3v4"/><path d="M3 5h4"/><path d="M21 17v4"/><path d="M19 19h4"/>
      </svg>
    </motion.div>
  );

  const NavigationModes = () => {
    if (!["results", "insights", "graph", "inventory_table", "decision"].includes(appState) || loading) return null;
    if (appState === "decision") return null;

    const modes = [
      { id: "results", label: "Cards", icon: LayoutList },
      { id: "inventory_table", label: "Inventário", icon: Landmark },
      { id: "insights", label: "Insights", icon: Sparkles },
      { id: "graph", label: "Conexões", icon: Network }
    ];

    return (
      <div className="flex flex-col items-center mb-12">
        <div className="bg-gray-100/50 p-1.5 rounded-[24px] border border-gray-100 shadow-sm flex flex-wrap justify-center gap-2">
          {modes.map(mode => {
            const isActive = appState === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setAppState(mode.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all duration-300
                  ${isActive 
                    ? "bg-white shadow-md text-bradesco-red scale-105" 
                    : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
                  }`}
              >
                <mode.icon className={`w-3.5 h-3.5 ${isActive ? 'text-bradesco-red' : 'text-gray-400'}`} />
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} users={usersDb} />;
  }

  const hasPermission = (() => {
    const role = currentUser.role;
    const state = appState;
    if (state === 'auth' || state === 'syncing' || state === 'copilot') return true;
    if (role === 'admin' || role === 'gestor360') return true;
    if (role === 'estrategico') return ['home'].includes(state);
    if (role === 'artefatos') return ['initial', 'results', 'decision', 'insights', 'empty', 'inventory_table', 'graph', 'catalog', 'operational_insights'].includes(state);
    if (role === 'eventos') return ['events_capture'].includes(state);
    return false;
  })();

  return (
    <main className="app flex flex-col min-h-screen bg-gray-50/30 w-full h-full relative"
      onClick={(e) => {
        if (!(e.target as Element).closest('.user-menu-container') && !(e.target as Element).closest('.user-menu-btn')) {
          setShowUserMenu(false);
        }
      }}
    >
      <AIReveal isLoading={loading}>
        <AnimatePresence>
        {appState === 'auth' && (
          <AuthScreen 
            onCancel={() => { setAppState('initial'); setQuery(''); }} 
            onLogin={(u, p) => {
              setAppState('initial');
              setQuery('');
              startBackgroundSync(u, p);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        <SyncWidget job={syncJob} onCancel={cancelSyncJob} />
      </AnimatePresence>

      <AnimatePresence>
        {showAdmin && currentUser.role === 'admin' && (
          <AdminUsers 
            users={usersDb}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onClose={() => setShowAdmin(false)}
          />
        )}
      </AnimatePresence>

      <div className={`flex flex-col flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-32 transition-all relative ${appState === 'auth' ? 'opacity-0 pointer-events-none absolute' : 'opacity-100 relative'}`}>
        {/* Header */}
        <header className="flex justify-between items-center mb-12 relative z-40">
          <div className="flex items-center gap-8 flex-1">
            <div className="flex flex-col cursor-pointer group" onClick={() => { setAppState('copilot'); setQuery(''); }}>
              <div className="flex items-center gap-3">
                <h1 className="brand-text text-2xl font-black tracking-tight text-gray-900 group-hover:text-red-600 transition-colors">
                  Omni 360
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm font-medium text-gray-500 shrink-0">
            <div className="flex items-center gap-2 mr-2">
              {appState !== 'copilot' && (
                <button 
                  onClick={() => setAppState('copilot')}
                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 shadow-sm hover:border-gray-300 hover:text-gray-900 transition-all font-bold text-[10px] uppercase tracking-wider h-10"
                >
                  Menu
                </button>
              )}
              {appState !== 'copilot' && appState !== 'home' && appState !== 'initial' && (
                <button 
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 shadow-sm hover:border-gray-300 hover:text-gray-900 transition-all font-bold text-[10px] uppercase tracking-wider h-10"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Voltar
                </button>
              )}
            </div>

            {!loading && appState === "inventory_table" && (
              <button 
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 shadow-sm hover:border-bradesco-red hover:text-bradesco-red transition-all font-bold text-xs uppercase tracking-wider h-10"
              >
                <Download className="w-3.5 h-3.5" />
                Extrair Dados
              </button>
            )}
            
            <div className="relative user-menu-container" ref={userMenuRef}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu(!showUserMenu);
                }}
                className="user-menu-btn w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center font-bold text-gray-600 hover:border-red-600 hover:text-red-600 transition-all overflow-hidden"
              >
                {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[100]"
                  >
                    <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                      <p className="text-sm font-bold text-gray-900 truncate">{currentUser.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${currentUser.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                          {currentUser.role === 'admin' ? 'Administrador' : 'Usuário'}
                        </span>
                        <p className="text-[10px] text-gray-400 truncate">{currentUser.email}</p>
                      </div>
                    </div>

                    <div className="p-2">
                      {currentUser.role === 'admin' && (
                        <button 
                          onClick={() => { setShowAdmin(true); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-all"
                        >
                          <Shield className="w-4 h-4" />
                          Gestão de Usuários
                        </button>
                      )}
                      
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-900 rounded-2xl transition-all border-t border-gray-50 mt-2 pt-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair do Sistema
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {!hasPermission ? (
          <div className="flex flex-col items-center justify-center flex-1 py-32 text-center mt-32">
            <Shield className="w-16 h-16 text-gray-300 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Você não possui permissão para acessar esta área.</h2>
            <button
               onClick={() => setAppState('copilot')}
               className="mt-8 px-6 py-3 bg-white border border-gray-200 shadow-sm hover:border-gray-900 hover:text-gray-900 rounded-full font-bold transition-all text-xs uppercase tracking-widest text-gray-500"
            >
               Voltar ao Início
            </button>
          </div>
        ) : (
          <>
            {appState === "copilot" && (
              <CopilotScreen
                userName={currentUser.name.split(' ')[0]}
                role={currentUser.role}
                onNavigate={(feature) => {
                  if (feature === 'initial') {
                    setAppState("initial");
                    setQuery("");
                  } else {
                    setAppState(feature as any);
                  }
                }}
                onGenerateSummary={() => setShowSummary(true)}
              />
            )}

        <AnimatePresence>
          {showSummary && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
              <div className="bg-white border border-gray-100 rounded-[40px] shadow-2xl p-10 max-w-2xl w-full">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-3">
                      Resumo Executivo
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">Status Geral da Mensuração</h2>
                  </div>
                  <button onClick={() => setShowSummary(false)} className="p-3 hover:bg-gray-50 rounded-full transition-colors text-gray-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-6 text-gray-600 leading-relaxed">
                  <p>
                    <strong className="text-gray-900">42 mapas</strong> foram atualizados nos últimos 30 dias.
                    O volume de atualizações indica uma alta movimentação na esteira de Governança e manutenção ativa.
                  </p>
                  
                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-sm">
                    <strong className="text-orange-900 block mb-1 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Principais Gaps de Mensuração:</strong>
                    Existem <span className="font-bold">14 eventos operando em produção</span> sem mapeamento nos artefatos correspondentes (Hub de Eventos vs Artefatos), apresentando risco de perda de rastreabilidade, e <span className="font-bold">8 eventos mapeados</span> que não disparam com frequência no último mês.
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Risco Alto</p>
                      <p className="text-sm font-bold text-gray-900">Checkout Cartões</p>
                      <p className="text-xs text-gray-500 mt-1">Gaps Críticos</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Saudável</p>
                      <p className="text-sm font-bold text-gray-900">Onboarding Pix</p>
                      <p className="text-xs text-green-700 mt-1">100% Sincronizado</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button onClick={() => setShowSummary(false)} className="px-6 py-3 bg-gray-900 text-white rounded-full font-bold text-sm hover:shadow-lg transition-all">
                    Entendi
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {appState === "home" && (
          <HomeScreen
            userName={currentUser.name.split(' ')[0]}
            fullInventory={fullInventory}
            onNavigate={(feature) => {
              if (feature === 'hub') {
                setAppState("initial");
                setQuery("");
              } else {
                setAppState(feature as any);
              }
            }} 
            onGenerateSummary={() => setShowSummary(true)}
          />
        )}

        {appState === "catalog" && (
          <CatalogScreen 
            userName={currentUser.name.split(' ')[0]} 
            onNavigate={(feature) => {
              if (feature === 'hub') {
                setAppState("initial");
                setQuery("");
              } else {
                setAppState(feature as any);
              }
            }} 
          />
        )}

        {appState === "events_capture" && (
          <EventCaptureScreen 
            onNavigate={setAppState} 
            selectedPlatform={capturePlatform}
            onSelectPlatform={setCapturePlatform}
          />
        )}

        {/* Hero Section */}
        <section className={`hero flex flex-col flex-1 w-full items-center justify-start pt-8 ${appState !== "initial" ? "hidden" : ""}`}>
          <div className="flex flex-col items-center text-center justify-center mb-10 w-full max-w-4xl mx-auto gap-4 relative min-h-[120px]">
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-normal text-gray-900 tracking-tight leading-tight"
            >
              <TypewriterText text="Qual artefato você quer encontrar?" />
            </motion.h2>
          </div>

          <div className="w-full max-w-4xl mb-12">
            <div className="animated-border">
              <div className={`inner-container glass-card py-4 px-6 flex items-center gap-4 transition-all duration-300 ${isSearchActive ? "bg-white shadow-[0_0_30px_rgba(204,9,47,0.1)]" : ""}`}>
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
                  className="flex-1 bg-transparent border-none outline-none text-xl placeholder-gray-400 resize-none min-h-[1.5em] overflow-hidden pl-4"
                  placeholder="Busque por ID, nome do mapa ou qualquer termo relacionado"
                  rows={1}
                />
                <button
                  onClick={() => executeSearch()}
                  className="p-3 hover:scale-110 transition-transform active:scale-95"
                  title="Buscar"
                >
                  <GradientSparkles className="w-8 h-8" animate={loading} />
                </button>
              </div>
            </div>

            {/* Clickable Search Tooltips */}
            <div className="flex flex-col items-start gap-3 mt-8 ml-4">
              <motion.button 
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                onClick={() => useSuggestion("Abertura de Contas")}
                className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 hover:text-red-600 transition-colors flex items-center gap-3 group"
              >
                <div className="relative flex items-center justify-center">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <span>Abertura de contas PF e PJ</span>
              </motion.button>
              <motion.button 
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                onClick={() => useSuggestion("Cartões")}
                className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 hover:text-red-600 transition-colors flex items-center gap-3 group"
              >
                <div className="relative flex items-center justify-center">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <span>Cartões de crédito ou BIA</span>
              </motion.button>
              <motion.button 
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                onClick={() => useSuggestion("inventario")}
                className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 hover:text-red-600 transition-colors flex items-center gap-3 group"
              >
                <div className="relative flex items-center justify-center">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <span>Digite "inventário" para ver toda a base</span>
              </motion.button>
              
              <motion.button 
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                onClick={() => setAppState("operational_insights")}
                className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 hover:text-purple-600 transition-colors flex items-center gap-3 group mt-4 px-4 py-2 bg-gray-50 rounded-full hover:bg-purple-50"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Ver insights</span>
              </motion.button>
            </div>
          </div>
        </section>

        {/* Level 2: Insights Dashboard (Operational) */}
        {appState === "operational_insights" && (
          <section className="w-full max-w-5xl mx-auto pt-8 pb-12">
            <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                  <Activity className="w-8 h-8 text-purple-600" />
                  Insights Operacionais
                </h2>
                <p className="text-gray-500 font-medium mt-2">Atividades recentes e evolução de atualizações</p>
              </div>
            </div>
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Timeline */}
              <div className="glass-card p-8 rounded-[40px] border border-gray-100 flex flex-col h-[400px]">
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <h3 className="font-bold text-gray-900">Atividades Recentes</h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar">
                  {recentActivities.length > 0 ? recentActivities.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="group flex gap-4 cursor-pointer hover:bg-gray-50/80 p-3 -ml-3 rounded-2xl transition-all duration-300"
                      onClick={() => window.open(item.link, '_blank')}
                      title="Abrir mapa em nova guia"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:bg-purple-50 group-hover:border-purple-100 transition-colors">
                        <RefreshCw className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 font-bold leading-snug truncate group-hover:text-purple-600 transition-colors">
                          {item.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px] font-medium text-gray-500">
                          <span className="whitespace-nowrap">{item.date}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
                          <span className="truncate max-w-[120px]">{item.responsavel}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
                          <span className="text-purple-600 font-bold whitespace-nowrap">{item.status}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-gray-400 font-medium p-4 text-center">Nenhuma atividade!</div>
                  )}
                </div>
              </div>

              {/* Gráfico de Atualizações */}
              <div className="glass-card p-8 rounded-[40px] border border-gray-100 flex flex-col lg:col-span-2 h-[400px]">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-gray-400" />
                    <h3 className="font-bold text-gray-900">Evolução de Atualizações</h3>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-4 py-1.5 bg-gray-900 text-white rounded-full text-[11px] font-bold uppercase tracking-wider">Histórico Real</span>
                  </div>
                </div>
                
                {/* Updated Elegant Graph Area avoiding overflow */}
                <div className="flex-1 w-full pt-8 relative flex flex-col justify-end">
                  <div className="flex items-end justify-between h-full gap-2 sm:gap-4 px-2 sm:px-6 w-full relative">
                  {chartData.length > 0 ? chartData.map((bar, idx) => (
                    <div 
                      key={idx} 
                      className="flex flex-col items-center flex-1 group cursor-pointer h-full relative"
                      onClick={() => handleBarClick(bar.items)}
                    >
                      {/* Tooltip on Hover */}
                      <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 scale-95 opacity-0 group-[&:hover]:opacity-100 group-[&:hover]:scale-100 transition-all duration-300 z-[100] pointer-events-none bg-gray-900 text-white px-4 py-3 rounded-2xl text-xs font-medium shadow-2xl min-w-[200px] flex flex-col gap-2">
                        <div className="font-bold text-sm border-b border-gray-700/50 pb-2 mb-1 flex justify-between items-center gap-4">
                          <span className="text-gray-300">{idx === chartData.length - 1 ? 'Hoje' : bar.label}</span>
                          <span className="text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">{bar.value} atlz</span>
                        </div>
                        {bar.items.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {bar.items.slice(0, 3).map((item: any, i: number) => (
                              <span key={i} className="truncate text-gray-200 text-[11px] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                                {item.titulo}
                              </span>
                            ))}
                            {bar.items.length > 3 && (
                              <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mt-1 px-3">
                                + {bar.items.length - 3} itens alterados
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-[11px] italic">Nenhuma atividade neste dia</span>
                        )}
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45"></div>
                      </div>

                      <div className="flex-1 flex flex-col justify-end items-center w-full relative">
                         {bar.value > 0 && (
                            <span className="text-[10px] font-bold text-gray-400 mb-2 opacity-0 group-[&:hover]:opacity-100 group-[&:hover]:text-purple-600 transition-all group-[&:hover]:-translate-y-1">
                              {bar.value}
                            </span>
                         )}
                         <div className="w-full flex justify-center h-full items-end relative">
                            {/* The line track */}
                            <div className="absolute w-[4px] bottom-0 bg-gray-50 h-full rounded-t-full transition-colors group-[&:hover]:bg-gray-100"></div>
                            {/* The actual filled bar */}
                            <div 
                              className={`w-[4px] rounded-t-full z-10 opacity-70 group-[&:hover]:opacity-100 transition-all duration-500 relative bg-gradient-to-t from-gray-300 to-gray-400 group-[&:hover]:from-purple-500 group-[&:hover]:to-purple-400 ${bar.value === 0 ? 'min-h-[4px] from-gray-200 to-gray-200' : ''}`}
                              style={{ height: bar.height }}
                            ></div>
                         </div>
                      </div>
                      
                      <span className={`text-[10px] font-bold whitespace-nowrap mt-3 transition-colors ${idx === chartData.length - 1 ? 'text-gray-900' : 'text-gray-400 group-[&:hover]:text-gray-900'}`}>
                        {idx === chartData.length - 1 ? 'Hoje' : bar.label}
                      </span>
                    </div>
                  )) : (
                    <div className="w-full flex items-center justify-center text-gray-400 text-sm font-medium">Gerando evolução...</div>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Content Section */}
        <section className={`content ${["initial", "catalog", "events_capture", "home", "operational_insights"].includes(appState) ? "hidden" : ""}`}>
          <NavigationModes />
          
          {/* Decision / Loading Area */}
          <section className={`decision ${appState === "decision" || loading || appState === "empty" ? "flex flex-col items-center justify-center text-center py-24" : "hidden"}`}>
            <div className="mb-8 scale-150 transform transition-transform duration-500">
              <GradientSparkles className="w-12 h-12" animate={loading} />
            </div>
            
            {loading ? (
              <>
                <p className="text-3xl font-bold tracking-tight text-gray-900 mb-6 font-sans">
                  Buscando resultados para <strong className="text-[var(--bradesco-red)]">"{query}"</strong>...
                </p>
                <div className="flex flex-col gap-3 w-full max-w-md">
                  <div className="shimmer-bg h-3 rounded-full w-full"></div>
                  <div className="shimmer-bg h-3 rounded-full w-4/5 mx-auto"></div>
                  <div className="shimmer-bg h-3 rounded-full w-3/4 mx-auto"></div>
                </div>
              </>
            ) : appState === "empty" ? (
              <div className="no-results flex flex-col items-center">
                <div className="glass-card rounded-[40px] p-12 text-center max-w-lg border border-gray-100/50 shadow-2xl">
                  <h3 className="text-3xl font-bold mb-4 tracking-tight">Não foi possível encontrar resultados</h3>
                  <p className="text-gray-500 mb-10 text-lg">Nenhum artefato foi encontrado para <strong>"{query}"</strong>.</p>
                  <button 
                    className="hover:opacity-90 text-white px-10 py-4 rounded-full font-bold shadow-xl transition-all hover:scale-105" 
                    onClick={resetSearch}
                    style={{ background: 'linear-gradient(90deg, #7D046D 0%, #cc092f 100%)' }}
                  >
                    Continuar buscando
                  </button>
                </div>
              </div>
            ) : appState === "decision" ? (
              <div className="flex flex-col items-center">
                <p className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 leading-tight mb-12">
                  Foram encontrados <strong className="text-[var(--bradesco-red)]">{results.length}</strong> itens para <strong>"{query}"</strong>.<br />
                  O que você quer fazer agora?
                </p>
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <button className="bg-white border border-gray-200 hover:border-bradesco-red hover:text-bradesco-red text-gray-800 px-10 py-4 rounded-full font-bold transition-all shadow-sm hover:shadow-md min-w-[200px]" onClick={() => setAppState("results")}>Ver resultados</button>
                  <button className="bg-white border border-gray-200 hover:border-purple-600 hover:text-purple-600 text-gray-800 px-10 py-4 rounded-full font-bold transition-all shadow-sm hover:shadow-md min-w-[200px] flex items-center gap-2 justify-center" onClick={() => setAppState("operational_insights")}>
                    <Activity className="w-4 h-4" />
                    Ver insights
                  </button>
                  <button className="text-gray-400 hover:text-bradesco-red font-bold px-8 py-4 transition-colors" onClick={resetSearch}>Continuar buscando</button>
                </div>
              </div>
            ) : null}
          </section>

          {/* Summary / Insights Area */}
          {insights && insights.problemas && appState === "insights" && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="summary"
            >
              {/* Filter Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div className="flex items-center gap-4 bg-gray-50/50 p-2 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto max-w-full no-scrollbar">
                  <div className="flex items-center gap-2 px-3 py-1 border-r border-gray-200">
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] font-bold uppercase text-gray-500 whitespace-nowrap">Filtros</span>
                  </div>
                  
                  <select 
                    value={insightFilters.ga}
                    onChange={(e) => setInsightFilters(prev => ({ ...prev, ga: e.target.value }))}
                    className="bg-transparent text-xs font-bold text-gray-800 outline-none border-none py-1 cursor-pointer hover:text-bradesco-red transition-colors"
                  >
                    <option value="all">TODOS PADRÕES</option>
                    <option value="ga4 atual">APENAS GA4 ATUAL</option>
                    <option value="ga4 legado">APENAS GA4 LEGADO</option>
                    <option value="universal analytics">APENAS UNIVERSAL ANALYTICS</option>
                    <option value="doc">APENAS DOCUMENTOS</option>
                  </select>

                  <select 
                    value={insightFilters.produto}
                    onChange={(e) => setInsightFilters(prev => ({ ...prev, produto: e.target.value }))}
                    className="bg-transparent text-xs font-bold text-gray-800 outline-none border-none py-1 cursor-pointer hover:text-red-600 transition-colors max-w-[150px]"
                  >
                    <option value="all">TODOS PRODUTOS</option>
                    {(Array.from(new Set(results.map(r => r.produto))) as string[]).filter(Boolean).map(p => (
                      <option key={p} value={p}>{p.toUpperCase()}</option>
                    ))}
                  </select>

                  <select 
                    value={insightFilters.subproduto}
                    onChange={(e) => setInsightFilters(prev => ({ ...prev, subproduto: e.target.value }))}
                    className="bg-transparent text-xs font-bold text-gray-800 outline-none border-none py-1 cursor-pointer hover:text-red-600 transition-colors max-w-[150px]"
                  >
                    <option value="all">TODOS SUBPRODUTOS</option>
                    {(Array.from(new Set(results.map(r => r.subproduto))) as string[]).filter(Boolean).map(s => (
                      <option key={s} value={s}>{s.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* KPIs - Refreshed with Semantic Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
                <div className="group relative glass-card p-6 rounded-[32px] border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                    <Target className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Total Artefatos</p>
                  <p className="text-4xl font-extrabold text-gray-900 leading-none">{insights.total}</p>
                </div>

                <div className="group relative glass-card p-6 rounded-[32px] border-b-4 border-b-green-500 border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">GA4 Atual</p>
                  <p className="text-4xl font-extrabold text-gray-900 leading-none">{insights.ga4Atual}</p>
                  <span className="absolute top-6 right-6 text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full">{insights.porcentagens.ga4Atual}%</span>
                </div>

                <div className="group relative glass-card p-6 rounded-[32px] border-b-4 border-b-yellow-500 border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-600 mb-4 group-hover:scale-110 transition-transform">
                    <Activity className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">GA4 Legado</p>
                  <p className="text-4xl font-extrabold text-gray-900 leading-none">{insights.ga4Legado}</p>
                  <span className="absolute top-6 right-6 text-[10px] font-black text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">{insights.porcentagens.ga4Legado}%</span>
                </div>

                <div className="group relative glass-card p-6 rounded-[32px] border-b-4 border-b-bradesco-red border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-bradesco-red mb-4 group-hover:scale-110 transition-transform">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Universal Analytics</p>
                  <p className="text-4xl font-extrabold text-gray-900 leading-none">{insights.universalAnalytics}</p>
                  <span className="absolute top-6 right-6 text-[10px] font-black text-bradesco-red bg-red-50 px-2 py-1 rounded-full">{insights.porcentagens.universalAnalytics}%</span>
                </div>

                <div className="group relative glass-card p-6 rounded-[32px] border-b-4 border-b-gray-400 border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-4 group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Documentos</p>
                  <p className="text-4xl font-extrabold text-gray-900 leading-none">{insights.documentos}</p>
                </div>
              </div>

              {/* Gemini Insights UI Layout */}
              {loadingGemini ? (
                <div className="flex flex-col items-center justify-center p-20 glass-card rounded-[40px] border border-gray-100 mb-12">
                  <Sparkles className="w-8 h-8 text-purple-500 animate-pulse mb-6" />
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest animate-pulse">A Inteligência do Omni 360 está analisando os artefatos...</p>
                </div>
              ) : geminiError ? (
                <div className="flex flex-col items-center justify-center p-20 glass-card rounded-[40px] border border-red-100 bg-red-50/50 mb-12">
                  <AlertTriangle className="w-8 h-8 text-red-500 mb-6" />
                  <p className="text-sm font-bold text-red-600 mb-4">{geminiError}</p>
                  <button onClick={fetchGeminiInsights} className="px-6 py-2 bg-white rounded-full text-xs font-bold text-gray-800 border shadow-sm transition-colors hover:bg-gray-50">Tentar Novamente</button>
                </div>
              ) : geminiAnalysis && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                  <div className="lg:col-span-2 glass-card p-12 rounded-[40px] border border-gray-100 relative overflow-hidden flex flex-col gap-10">
                    <div>
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                        Análise Gemini
                      </h4>
                      <h3 className="text-3xl font-medium tracking-tight text-gray-900 leading-tight mb-6">Visão Executiva</h3>
                      <p className="text-[15px] text-gray-800 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                        {geminiAnalysis.resumoExecutivo}
                      </p>
                    </div>

                    <div className="bg-gray-50/80 rounded-3xl p-8 border border-gray-100 mt-auto">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-gray-400" /> Recomendação de Ação
                      </h5>
                      <p className="text-[14px] text-gray-700 leading-relaxed font-medium">
                        {geminiAnalysis.recomendacaoAcao}
                      </p>
                    </div>
                  </div>

                  <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="p-8 rounded-[40px] border border-gray-100 bg-white relative flex flex-col h-full shadow-sm">
                      <h4 className="text-sm font-bold text-gray-900 uppercase mb-6 flex items-center gap-2">
                        Saúde Geral do Hub
                      </h4>
                      <p className="text-sm text-gray-600 leading-relaxed font-medium mb-8">
                        {geminiAnalysis.saudeGeral}
                      </p>

                      <div className="mt-8 border-t border-gray-100 pt-8">
                        <h4 className="text-sm font-bold text-gray-900 uppercase mb-6">
                          Pontos de Atenção
                        </h4>
                        <ul className="space-y-4">
                          {geminiAnalysis.pontosAtencao?.map((ponto: string, i: number) => (
                            <li key={i} className="flex items-start gap-3 group">
                              <div className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                              <span className="text-[13px] font-bold text-gray-700 leading-snug">{ponto}</span>
                            </li>
                          ))}
                          {(!geminiAnalysis.pontosAtencao || geminiAnalysis.pontosAtencao.length === 0) && (
                            <li className="text-sm text-gray-500 italic">Nenhum alerta crítico encontrado.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.section>
          )}

          {/* Graph Visualization Section */}
          <AnimatePresence>
            {appState === "graph" && insights && (
              <motion.section 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="graph-container pb-20"
              >
                <GraphView 
                  data={results} 
                  isEmbedded={true}
                />
              </motion.section>
            )}
          </AnimatePresence>

          {/* Results Area */}
          <section className={`results space-y-6 ${appState === "results" && !loading ? "" : "hidden"}`}>
            <AnimatePresence>
              {results.map((item, index) => {
                let score = 100;
                if (item.ultima_atualizacao) {
                  if (item.ultima_atualizacao.includes('2023')) score -= 30;
                  else if (item.ultima_atualizacao.includes('2022') || item.ultima_atualizacao.includes('2021')) score -= 60;
                } else score -= 50;
                if (!item.responsavel || item.responsavel.toLowerCase() === 'n/a') score -= 20;
                if (!item.produto && !item.subproduto) score -= 20;

                const health = score >= 80 
                  ? { status: 'Saudável', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', icon: <CheckCircle2 className="w-3 h-3" /> }
                  : score >= 50 
                    ? { status: 'Atenção', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', icon: <AlertTriangle className="w-3 h-3" /> }
                    : { status: 'Crítico', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: <AlertCircle className="w-3 h-3" /> };

                return (
                <motion.article 
                  key={item.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card rounded-[40px] pt-10 px-10 pb-5 group transition-all relative overflow-hidden hover:shadow-xl hover:shadow-red-500/5 hover:-translate-y-1"
                >
                  <div className="absolute top-6 right-8 flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 cursor-default
                    ${health.bg} ${health.border} ${health.color}"
                    style={{ backgroundColor: score >= 80 ? '#ecfdf5' : score >= 50 ? '#fffbeb' : '#fef2f2', borderColor: score >= 80 ? '#d1fae5' : score >= 50 ? '#fef3c7' : '#fee2e2', color: score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626' }}
                  >
                    {health.icon} {health.status}
                  </div>
                  <div className="mb-6">
                    <a
                      className="text-[28px] brand-title group-hover:opacity-80 transition-opacity inline-flex items-center gap-2 mb-4"
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.titulo}
                    </a>
                    
                    <div className="flex flex-wrap gap-3">
                      <span className="red-badge">
                        {item.tipo_mapa && (normalizar(item.tipo_mapa) === "ga4 atual" || normalizar(item.tipo_mapa) === "ga4 legado" || normalizar(item.tipo_mapa) === "universal analytics") 
                          ? item.tipo_mapa.toUpperCase() 
                          : "Documento"}
                      </span>
                      {item.produto && <span className="red-badge">{item.produto}</span>}
                      {item.subproduto && <span className="red-badge">{item.subproduto}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 mt-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Identificador</span>
                      <span className="text-sm font-bold text-gray-800">{item.id}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Responsável</span>
                      <span className="text-sm font-bold text-gray-800">{item.responsavel || "N/A"}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Versão</span>
                      <span className="text-sm font-bold text-gray-800">{item.versao || "1"}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Nível Crítico</span>
                      <span className="text-sm font-bold text-gray-800">{item.nivel || "Standard"}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-2 border-t border-gray-100 pt-4">
                    <button 
                      className="font-bold text-[14px] text-gray-900 h-auto p-0 flex items-center gap-2 hover:text-bradesco-red transition-colors" 
                      onClick={() => toggleDetails(item.id)}
                    >
                      {expandedCards.has(item.id) ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Ocultar detalhes
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Ver detalhes
                        </>
                      )}
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
                          {item.figma_xd && item.figma_xd !== "-" ? (
                            <a 
                              href={item.figma_xd} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-sm font-bold text-red-600 hover:underline"
                            >
                              ACESSE AQUI
                            </a>
                          ) : (
                            <p className="text-sm text-gray-800">{item.figma_xd || "-"}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.article>
                );
              })}
            </AnimatePresence>
          </section>

          {/* Inventory Table View (Functional Explorer Interface) */}
          {appState === "inventory_table" && (
            <motion.section 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="inventory-table-container pb-20"
            >

              {/* Advanced Filter Architecture */}
              <div className="glass-card rounded-[32px] border border-gray-100 p-8 mb-8 shadow-sm bg-white/50 backdrop-blur-xl">
                {/* Search & Main Chips */}
                <div className="flex flex-col md:flex-row gap-6 mb-8 items-center justify-between border-b border-gray-100 pb-8">
                  <div className="w-full md:max-w-md relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-bradesco-red transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Busca global em toda a base..." 
                      className="w-full pl-14 pr-6 py-3.5 bg-gray-50/50 group-hover:bg-gray-100 group-focus:bg-white border border-gray-100 focus:border-red-200 rounded-3xl outline-none text-sm font-medium text-gray-800 transition-all"
                      value={tableFilter}
                      onChange={(e) => setTableFilter(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Todos', 'GA4 Atual', 'GA4 Legado', 'Universal Analytics', 'Doc', 'Sem responsável', 'Sem subproduto'].map(chip => (
                      <button 
                        key={chip}
                        onClick={() => setActiveChip(chip)}
                        className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all
                          ${activeChip === chip 
                            ? 'text-white shadow-lg shadow-red-200 scale-105' 
                            : 'bg-white border border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'}
                        `}
                        style={activeChip === chip ? { background: 'linear-gradient(90deg, #7D046D 0%, #cc092f 100%)' } : {}}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid of Independent Filters */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Tipo de Mapa', key: 'tipo_mapa', options: [{ v: 'all', l: 'QUALQUER TIPO' }, { v: 'universal analytics', l: 'UNIVERSAL ANALYTICS' }, { v: 'ga4 atual', l: 'GA4 ATUAL' }, { v: 'ga4 legado', l: 'GA4 LEGADO' }, { v: 'doc', l: 'DOC' }] },
                    { label: 'Produto', key: 'produto', options: [{ v: 'all', l: 'TODOS PRODUTOS' }, ...Array.from(new Set(results.map(r => r.produto))).filter(Boolean).map(p => ({ v: p, l: String(p).toUpperCase() }))] },
                    { label: 'Subproduto', key: 'subproduto', options: [{ v: 'all', l: 'QUALQUER SUB' }, ...Array.from(new Set(results.map(r => r.subproduto))).filter(Boolean).map(s => ({ v: s, l: String(s).toUpperCase() }))] },
                    { label: 'Responsável', key: 'responsavel', options: [{ v: 'all', l: 'RESPONSÁVEL' }, ...Array.from(new Set(results.map(r => r.responsavel))).filter(Boolean).map(r => ({ v: r, l: String(r).toUpperCase() }))] },
                    { label: 'Classificação', key: 'status', options: [{ v: 'all', l: 'STATUS' }, { v: 'ga4 atual', l: 'GA4 ATUAL' }, { v: 'ga4 legado', l: 'GA4 LEGADO' }, { v: 'universal analytics', l: 'UNIVERSAL ANALYTICS' }, { v: 'doc', l: 'DOC' }] },
                    { label: 'Ano Ref.', key: 'ano', options: [{ v: 'all', l: 'TODAS DATAS' }, { v: '2025', l: '2025' }, { v: '2024', l: '2024' }, { v: '2023', l: '2023' }] }
                  ].map(filter => (
                    <MultiSelect 
                      key={filter.key} 
                      label={filter.label} 
                      options={filter.options}
                      values={inventoryFilters[filter.key as keyof typeof inventoryFilters]}
                      onChange={(vals) => setInventoryFilters(f => ({ ...f, [filter.key]: vals }))}
                    />
                  ))}
                </div>

                <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-50">
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg">
                        <span className="text-[9px] font-black text-gray-400 uppercase">Filtrados:</span>
                        <span className="text-xs font-black text-gray-900">{inventorySummary.total} / {results.length}</span>
                      </div>
                   </div>
                   <button 
                    onClick={resetInventoryFilters}
                    className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                   >
                     <X className="w-3 h-3" /> Limpar Filtros
                   </button>
                </div>
              </div>

              {/* Main Content Area: Table or Panel */}
              <AnimatePresence mode="wait">
                {inventoryViewMode === 'table' ? (
                  <motion.div 
                    key="table"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="glass-card overflow-hidden rounded-xl border border-gray-100 shadow-xl bg-white"
                  >
                    <div className="overflow-x-auto overflow-y-auto custom-scrollbar excel-table-wrapper relative">
                      <table className="w-full text-left border-collapse min-w-[1200px] excel-table">
                        <thead className="sticky top-0 z-20">
                          <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th style={{ width: columnWidths['status'] }} className="text-[10px] font-black text-gray-400 tracking-widest text-center uppercase relative">
                              <div className="resizable-header justify-center">Status</div>
                              <div className="column-resize-handle" onMouseDown={(e) => startResize(e, 'status')} />
                            </th>
                            <th style={{ width: columnWidths['titulo'] }} className="text-[10px] font-black text-gray-400 tracking-widest group transition-colors relative">
                              <div className="resizable-header min-w-[350px]">
                                <span onClick={() => handleSort('titulo')} className="flex items-center gap-2 cursor-pointer hover:text-red-600 transition-colors w-max">
                                  TÍTULO / ID
                                  {inventorySort.field === 'titulo' && (inventorySort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                </span>
                              </div>
                              <div className="column-resize-handle" onMouseDown={(e) => startResize(e, 'titulo')} />
                            </th>
                            <th style={{ width: columnWidths['tipo_mapa'] }} className="text-[10px] font-black text-gray-400 tracking-widest group transition-colors relative">
                              <div className="resizable-header">
                                <span onClick={() => handleSort('tipo_mapa')} className="cursor-pointer hover:text-red-600 transition-colors">TIPO</span>
                              </div>
                              <div className="column-resize-handle" onMouseDown={(e) => startResize(e, 'tipo_mapa')} />
                            </th>
                            <th style={{ width: columnWidths['produto'] }} className="text-[10px] font-black text-gray-400 tracking-widest group transition-colors relative">
                              <div className="resizable-header">
                                <span onClick={() => handleSort('produto')} className="cursor-pointer hover:text-red-600 transition-colors">PRODUTO</span>
                              </div>
                              <div className="column-resize-handle" onMouseDown={(e) => startResize(e, 'produto')} />
                            </th>
                            <th style={{ width: columnWidths['subproduto'] }} className="text-[10px] font-black text-gray-400 tracking-widest group transition-colors relative">
                              <div className="resizable-header">
                                <span onClick={() => handleSort('subproduto')} className="cursor-pointer hover:text-red-600 transition-colors">SUBPRODUTO</span>
                              </div>
                              <div className="column-resize-handle" onMouseDown={(e) => startResize(e, 'subproduto')} />
                            </th>
                            <th style={{ width: columnWidths['responsavel'] }} className="text-[10px] font-black text-gray-400 tracking-widest group transition-colors relative">
                              <div className="resizable-header">
                                <span onClick={() => handleSort('responsavel')} className="cursor-pointer hover:text-red-600 transition-colors">RESPONSÁVEL</span>
                              </div>
                              <div className="column-resize-handle" onMouseDown={(e) => startResize(e, 'responsavel')} />
                            </th>
                            <th style={{ width: columnWidths['ultima_atualizacao'] }} className="text-[10px] font-black text-gray-400 tracking-widest group transition-colors relative">
                              <div className="resizable-header">
                                <span onClick={() => handleSort('ultima_atualizacao')} className="cursor-pointer hover:text-red-600 transition-colors">ATUALIZADO</span>
                              </div>
                              <div className="column-resize-handle" onMouseDown={(e) => startResize(e, 'ultima_atualizacao')} />
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredInventory.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-32 text-center">
                                <div className="flex flex-col items-center gap-6">
                                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                                    <Search className="w-10 h-10" />
                                  </div>
                                  <div>
                                    <h4 className="text-xl font-bold text-gray-900 mb-2">Nenhum artefato encontrado</h4>
                                    <p className="text-gray-400 text-sm mb-8">Refine seus filtros ou realize uma nova busca global.</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredInventory.map((item) => (
                              <React.Fragment key={item.id}>
                                <tr id={`row-${item.id}`} className={`group transition-all hover:bg-gray-50/50 ${expandedInventoryRows.has(item.id) ? 'bg-red-50/10' : ''}`}>
                                  <td className="p-6">
                                    <div className="flex items-center justify-center gap-3">
                                      <div className={`w-3 h-3 rounded-full ${normalizar(item.tipo_mapa) === 'ga4 atual' ? 'bg-green-500 shadow-lg shadow-green-200' : normalizar(item.tipo_mapa) === 'universal analytics' ? 'bg-red-600 shadow-lg shadow-red-200' : normalizar(item.tipo_mapa) === 'ga4 legado' ? 'bg-yellow-500 shadow-lg shadow-yellow-200' : 'bg-gray-300'}`} />
                                      <button 
                                        onClick={() => toggleInventoryRow(item.id)} 
                                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors"
                                      >
                                        {expandedInventoryRows.has(item.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </td>
                                  <td className="p-6">
                                    <div className="flex flex-col items-start w-full overflow-hidden">
                                      <a 
                                        href={item.link} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="block text-sm font-bold text-gray-900 leading-tight mb-1 truncate w-full hover:text-red-600 transition-colors"
                                      >
                                        {highlightText(item.titulo, tableFilter)}
                                      </a>
                                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest truncate w-full">{item.id}</span>
                                    </div>
                                  </td>
                                  <td className="p-6">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter truncate max-w-full
                                      ${normalizar(item.tipo_mapa) === 'ga4 atual' ? 'bg-green-100 text-green-700' : 
                                        normalizar(item.tipo_mapa) === 'universal analytics' ? 'bg-red-100 text-red-700' : 
                                        normalizar(item.tipo_mapa) === 'ga4 legado' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}
                                    `}>
                                      {item.tipo_mapa || "DOC"}
                                    </span>
                                  </td>
                                  <td className="p-6 text-xs font-bold text-gray-700 uppercase tracking-tighter">
                                    <div className="block truncate w-full">{highlightText(item.produto || "-", tableFilter)}</div>
                                  </td>
                                  <td className="p-6 text-xs font-bold text-gray-500 uppercase tracking-tighter">
                                    <div className="block truncate w-full">{highlightText(item.subproduto || "-", tableFilter)}</div>
                                  </td>
                                  <td className="p-6 text-xs font-bold text-gray-800 uppercase tracking-tighter">
                                    <div className="block truncate w-full">{highlightText(item.responsavel || "-", tableFilter)}</div>
                                  </td>
                                  <td className="p-6 text-[10px] font-black text-gray-400">
                                    {formatDataBR(item.ultima_atualizacao)}
                                  </td>
                                </tr>
                                
                                <AnimatePresence>
                                  {expandedInventoryRows.has(item.id) && (
                                    <tr>
                                      <td colSpan={7} className="p-0 border-none bg-gray-50/30">
                                        <motion.div 
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="p-10 border-x-4 border-red-600"
                                        >
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                                            <div className="space-y-4">
                                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Metadata Técnica</p>
                                              <div className="space-y-2">
                                                <div className="flex justify-between border-b pb-1">
                                                  <span className="text-[9px] font-bold text-gray-500">VERSÃO</span>
                                                  <span className="text-[9px] font-black text-gray-900">{item.versao || "-"}</span>
                                                </div>
                                                <div className="flex justify-between border-b pb-1">
                                                  <span className="text-[9px] font-bold text-gray-500">NÍVEL</span>
                                                  <span className="text-[9px] font-black text-gray-900">{item.nivel || "-"}</span>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="space-y-4">
                                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">IDs de Mensuração</p>
                                              <div className="space-y-2">
                                                <div className="flex justify-between border-b pb-1">
                                                  <span className="text-[9px] font-bold text-gray-500">GTM ID</span>
                                                  <span className="text-[9px] font-black text-red-600 font-mono tracking-tighter">{item.gtm_id || "-"}</span>
                                                </div>
                                                <div className="flex justify-between border-b pb-1">
                                                  <span className="text-[9px] font-bold text-gray-500">GA4 STREAM</span>
                                                  <span className="text-[9px] font-black text-gray-900 font-mono tracking-tighter">{item.propriedade_ga4_stream_id || "-"}</span>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="space-y-4">
                                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Operacional</p>
                                              <div className="space-y-2">
                                                <div className="flex justify-between border-b pb-1">
                                                  <span className="text-[9px] font-bold text-gray-500">Nº DA TASK</span>
                                                  <span className="text-[9px] font-black text-blue-600">{item.numero_da_task || "-"}</span>
                                                </div>
                                                <div className="flex justify-between border-b pb-1">
                                                  <span className="text-[9px] font-bold text-gray-500">FIREBASE</span>
                                                  <span className="text-[9px] font-black text-gray-900">{item.firebase || "-"}</span>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="space-y-4">
                                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ativos Externos</p>
                                              <div className="space-y-2">
                                                {item.figma_xd && item.figma_xd !== "-" ? (
                                                  <div className="flex justify-between border-b pb-1">
                                                    <span className="text-[9px] font-bold text-gray-500">PROTO/FIGMA</span>
                                                    <a href={item.figma_xd} target="_blank" rel="noreferrer" className="text-[9px] font-black text-red-600 hover:underline">VER LINK</a>
                                                  </div>
                                                ) : (
                                                  <div className="flex justify-between border-b pb-1">
                                                    <span className="text-[9px] font-bold text-gray-500">PROTO/FIGMA</span>
                                                    <span className="text-[9px] font-black text-gray-900">-</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </motion.div>
                                      </td>
                                    </tr>
                                  )}
                                </AnimatePresence>
                              </React.Fragment>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 lg:grid-cols-4 gap-8"
                  >
                    {/* Insights Panel Content */}
                    <div className="lg:col-span-1 space-y-6">
                       {/* Health Status */}
                       <div className={`p-8 rounded-[32px] border bg-white shadow-sm flex flex-col items-center text-center
                         ${currentInventoryInsights.problemas.nivelRisco === 'alto' ? 'border-red-200' : 'border-gray-100'}
                       `}>
                          <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-6">Governança</h4>
                          <div className="text-4xl font-black text-gray-900 mb-2">{currentInventoryInsights.aderencia.score}%</div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Aderência à Estratégia</p>
                          <div className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full text-white w-full
                            ${currentInventoryInsights.problemas.nivelRisco === 'alto' ? 'bg-bradesco-gradient shadow-lg shadow-red-100' : 'bg-green-600 shadow-lg shadow-green-100'}
                          `}>
                            Risco {currentInventoryInsights.problemas.nivelRisco}
                          </div>
                       </div>

                       {/* Quick Stats */}
                       <div className="p-8 rounded-[32px] border border-gray-100 bg-white shadow-sm space-y-4">
                          {[
                            { l: 'Sem Resp.', v: currentInventoryInsights.problemas.semResponsavel },
                            { l: 'Sem Subp.', v: currentInventoryInsights.problemas.semSubproduto },
                            { l: 'Problemas de Tagueamento', v: currentInventoryInsights.problemas.foraPadraoGA4 }
                          ].map((s, i) => (
                            <div key={i} className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                               <span className="text-gray-400">{s.l}</span>
                               <span className={s.v > 0 ? 'text-red-600 font-black' : 'text-gray-900'}>{s.v}</span>
                            </div>
                          ))}
                       </div>
                    </div>

                    <div className="lg:col-span-3 space-y-6">
                       {/* Main Insight Card */}
                       <div className="p-10 rounded-[32px] border border-gray-100 bg-white shadow-sm relative overflow-hidden h-full">
                          <div className="absolute top-0 right-0 p-8">
                             <Sparkles className="w-8 h-8 text-orange-400/20" />
                          </div>
                          
                          <div className="relative z-10">
                            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Análise de IA: Resumo do Cenário</h4>
                            <p className="text-2xl font-medium tracking-tight text-gray-800 leading-tight mb-10 font-sans whitespace-pre-wrap">
                               "{currentInventoryInsights.resumoInteligente.textoCenario}"
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                               <div>
                                  <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-6">Próximos Passos</h5>
                                  <div className="space-y-4">
                                     {currentInventoryInsights.resumoInteligente.recomendacoes.slice(0, 3).map((rec, i) => (
                                       <div key={i} className="flex gap-4 group">
                                          <div className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:bg-red-50 group-hover:text-red-600 transition-all">{i+1}</div>
                                          <p className="text-[12px] font-bold text-gray-700 leading-tight">{rec}</p>
                                       </div>
                                     ))}
                                  </div>
                               </div>
                               <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8">
                                  <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-6">Distribuição Operacional</h5>
                                  <div className="space-y-4">
                                     {currentInventoryInsights.distribProduto.slice(0, 4).map((item, i) => (
                                       <div key={i} className="space-y-2">
                                          <div className="flex justify-between items-center text-[9px] font-black">
                                             <span className="text-gray-700 uppercase truncate pr-4">{item.name}</span>
                                             <span className="text-gray-400">{item.percent}%</span>
                                          </div>
                                          <div className="h-1 bg-white rounded-full overflow-hidden">
                                             <div className="h-full bg-bradesco-gradient" style={{ width: `${item.percent}%` }} />
                                          </div>
                                       </div>
                                     ))}
                                  </div>
                               </div>
                            </div>
                          </div>
                          
                          <div className="mt-10 pt-10 border-t border-gray-50 flex gap-4">
                            <button className="px-6 py-2 bg-gray-900 transition-all hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-gray-200" onClick={() => setShowGraph(true)}>
                               <Network className="w-4 h-4" /> Conexões Map
                            </button>
                            <button className="px-6 py-2 bg-white border border-gray-200 hover:border-red-200 transition-all text-gray-400 hover:text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2" onClick={() => setShowExportModal(true)}>
                               <Download className="w-4 h-4" /> Exportar Planilha
                            </button>
                          </div>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}
        </section>
        </>
        )}
      </div>

      {/* Static Footer */}
      <footer className="fixed bottom-0 left-0 w-full px-8 py-4 bg-white/90 backdrop-blur-sm border-t border-gray-100 flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-gray-400 z-30">
        <div className="flex flex-col gap-1 text-left">
          <div className="normal-case">Desenvolvido por: <strong className="lowercase">lucas.doliveira@bradesco.com.br</strong></div>
          {lastSync && (
            <div className="text-[9px] font-medium text-gray-400 normal-case">
              Última sincronização: {lastSync}
            </div>
          )}
        </div>
        <div className="uppercase">Salla.MKT V1.0.0</div>
      </footer>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExportModal(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] p-10 shadow-2xl border border-gray-100 max-w-sm w-full text-center"
            >
              <button 
                onClick={() => setShowExportModal(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="mb-8 flex justify-center">
                <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center text-red-600">
                  <Download className="w-8 h-8" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Extrair Base</h3>
              <p className="text-gray-500 text-sm mb-8">Escolha o formato desejado para exportar todos os artefatos do inventário.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleExport("csv")}
                  className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-gray-50 hover:bg-red-50 border border-gray-100 hover:border-red-200 transition-all group"
                >
                  <span className="text-xl font-black text-gray-400 group-hover:text-red-600">CSV</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-red-500">Planilha</span>
                </button>
                <button 
                  onClick={() => handleExport("json")}
                  className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-gray-50 hover:bg-red-50 border border-gray-100 hover:border-red-200 transition-all group"
                >
                  <span className="text-xl font-black text-gray-400 group-hover:text-red-600">JSON</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-red-500">Dados</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </AIReveal>
    </main>
  );
}
