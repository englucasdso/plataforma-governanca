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
import { 
  Search, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  ArrowRight, 
  Download, 
  X, 
  AlertTriangle, 
  Target, 
  Network, 
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Info,
  Shield,
  LogOut,
  Trash2,
  Plus,
  Settings,
  Landmark,
  LayoutList,
  RefreshCw,
  Check,
  Loader2
} from "lucide-react";
import { fetchInventory, searchContent } from "@/services/api";
import { Artifact, Insights, SearchResponse, User as UserType, UserRole } from "@/types";
import { normalizar, formatDataBR, getFilteredInsights } from "@/utils/helpers";

const INITIAL_USERS: UserType[] = [
  {
    id: '1',
    name: 'Lucas Admin',
    email: 'lucas.doliveira@bradesco.com.br',
    role: 'admin',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Usuário Teste',
    email: 'teste@bradesco.com.br',
    role: 'user',
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
      <div className="flex-1 p-12 bg-gray-50/30 rounded-[50px] border border-gray-100 relative overflow-auto custom-scrollbar select-none">
        <div className="flex flex-col gap-24 min-w-max">
          {products.map((product, pIdx) => {
            const productSubpros = Array.from(new Set(data.filter(i => i.produto === product).map(i => i.subproduto || "Sem Subproduto")));
            const isCollapsed = collapsedProducts.has(product);
            
            return (
              <motion.div 
                key={pIdx} 
                drag
                dragMomentum={false}
                className="flex items-start gap-32 relative group/prod"
              >
                {/* Produto Node */}
                <div className="w-80 p-8 glass-card rounded-[40px] border-2 border-purple-500/20 bg-purple-50/30 relative z-10 shadow-xl cursor-grab active:cursor-grabbing">
                  <button 
                    onClick={() => toggleProduct(product)}
                    className="absolute -top-4 -right-4 bg-white border-2 border-purple-200 text-purple-600 text-xs font-black min-w-[40px] h-[40px] flex items-center justify-center rounded-2xl shadow-lg hover:scale-110 transition-transform active:scale-95 cursor-pointer z-20"
                    title={isCollapsed ? "Expandir" : "Recolher"}
                  >
                    {data.filter(i => i.produto === product).length}
                  </button>
                  <span className="text-[10px] font-black text-purple-600 uppercase tracking-[0.2em] block mb-2">Produto Estratégico</span>
                  <h4 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">{product}</h4>
                </div>
                
                {!isCollapsed && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-16"
                  >
                    {productSubpros.map((sub, sIdx) => {
                      const subMapas = data.filter(i => i.produto === product && i.subproduto === sub);
                      const isSubCollapsed = collapsedSubproducts.has(sub);

                      return (
                        <motion.div 
                          key={sIdx} 
                          drag
                          dragMomentum={false}
                          className="flex items-start gap-32 relative group/sub cursor-grab active:cursor-grabbing"
                        >
                          {/* Connection Line Product -> Subproduto */}
                          <div className="absolute top-1/2 -left-32 w-32 h-px bg-purple-200/50" />
                          
                          {/* Subproduto Node */}
                          <div className="w-80 p-7 glass-card rounded-[35px] border-2 border-blue-500/20 bg-blue-50/30 relative z-10 shadow-lg">
                            <button 
                              onClick={() => toggleSubproduct(sub)}
                              className="absolute -top-4 -right-4 bg-white border-2 border-blue-200 text-blue-600 text-xs font-black min-w-[40px] h-[40px] flex items-center justify-center rounded-2xl shadow-lg hover:scale-110 transition-transform active:scale-95 cursor-pointer z-20"
                              title={isSubCollapsed ? "Expandir" : "Recolher"}
                            >
                              {subMapas.length}
                            </button>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] block mb-2">Linha de Negócio</span>
                            <h4 className="text-lg font-bold text-gray-900 tracking-tight">{sub}</h4>
                          </div>
                          
                          {!isSubCollapsed && (
                            <motion.div 
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex flex-col gap-6"
                            >
                              {subMapas.map((m, mIdx) => (
                                <div key={mIdx} className="relative group">
                                  {/* Connection Line Subproduto -> Mapa */}
                                  <div className="absolute top-1/2 -left-32 w-32 h-px bg-blue-200/50" />
                                  
                                  <div className="flex items-center gap-2">
                                    <motion.div 
                                      drag
                                      dragMomentum={false}
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
                                              ${normalizar(m.tipo_mapa) === 'ga4' 
                                                ? 'bg-green-100 text-green-700 border border-green-200' 
                                                : 'bg-red-50 text-bradesco-red border border-red-100'}
                                           `}>
                                              {m.tipo_mapa || 'Documento'}
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
                              ))}
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

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
  const [formData, setFormData] = useState({ name: '', email: '', role: 'user' as UserRole });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      onUpdateUser({ ...editingUser, ...formData });
      setEditingUser(null);
    } else {
      onAddUser(formData);
      setShowAddForm(false);
    }
    setFormData({ name: '', email: '', role: 'user' });
  };

  const startEdit = (user: UserType) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, role: user.role });
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
                  onClick={() => { setShowAddForm(true); setEditingUser(null); setFormData({ name: '', email: '', role: 'user' }); }}
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
                  <option value="user">USER (Visualização)</option>
                  <option value="admin">ADMIN (Gestão Total)</option>
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
                  <th className="p-6 text-[10px] font-black text-gray-400 tracking-widest">NOME</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 tracking-widest">E-MAIL</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 tracking-widest">PERFIL</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 tracking-widest text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-6 text-sm font-bold text-gray-900">{u.name}</td>
                    <td className="p-6 text-sm text-gray-500">{u.email}</td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
                        {u.role}
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
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      onLogin(user);
    } else {
      setError("Acesso não autorizado. Procure um administrador.");
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
            <Landmark className="w-8 h-8" />
          </div>
          <h1 className="text-[26px] font-black text-gray-900 mb-1 tracking-tight">Hub de Artefatos</h1>
          <div className="flex items-center gap-3">
            <p className="text-gray-400 text-sm font-medium">Visualização e análise do ecossistema de mensuração</p>
            {lastSync && (
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200 shadow-sm flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Atualizado: {lastSync}
              </span>
            )}
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

        <div className="mt-10 pt-10 border-t border-gray-100 text-center">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">bradesco - beta v1.0.0</p>
        </div>
      </motion.div>
    </div>
  );
};

const SyncScreen = ({ onComplete, onCancel }: { onComplete: () => void, onCancel: () => void }) => {
  const [step, setStep] = useState(-1);
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const steps = [
    "Conectando ao ambiente de documentação...",
    "Mapeando estrutura de produtos...",
    "Organizando artefatos e métricas...",
    "Atualizando base de conhecimento local...",
    "Concluído"
  ];

  const handleStartSync = async () => {
    if (!username || !password) {
      setErrorMsg("Digite seu usuário e senha do Confluence.");
      return;
    }
    
    setErrorMsg("");
    setStatus("running");
    setStep(0);
    
    try {
      // Simular progressão visual da sincronização (já que pode demorar)
      const timer1 = setTimeout(() => { if (status !== "error") setStep(1); }, 1500); 
      const timer2 = setTimeout(() => { if (status !== "error") setStep(2); }, 12000); 
      const timer3 = setTimeout(() => { if (status !== "error") setStep(3); }, 35000); 

      const res = await fetch("/api/update-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rootId: "1542391004", maxRows: null, username, password })
      });
      
      const data = await res.json();
      
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      
      if (!res.ok) {
         throw new Error(data.error || "Falha na sincronização com o Confluence");
      }

      setStep(4);
      setStatus("success");
      await new Promise(r => setTimeout(r, 1500));
      onComplete();
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Erro desconhecido");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md"
    >
      <div className="bg-white rounded-[40px] p-12 max-w-2xl w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-bradesco-gradient" />
        
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-8 relative">
            {(status === "running" || status === "idle") && <Loader2 className={`w-10 h-10 text-bradesco-red ${status === "running" ? "animate-spin" : ""}`} />}
            {status === "success" && <CheckCircle2 className="w-10 h-10 text-green-500" />}
            {status === "error" && <AlertTriangle className="w-10 h-10 text-red-500" />}
          </div>

          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
            Verificando Base de Conhecimento
          </h2>
          <p className="text-gray-500 font-medium mb-10 max-w-md">
            {status === "error" ? "Não foi possível concluir a verificação." : status === "idle" ? "Insira suas credenciais do Confluence para atualizar a base de conhecimento." : "Este processo garante as definições mais recentes. Não feche a janela."}
          </p>

          {status === "idle" && (
            <div className="w-full max-w-sm space-y-4 mb-8 text-left">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Usuário (Ex: i462211)</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bradesco-red focus:border-bradesco-red outline-none"
                  placeholder="Seu usuário de rede"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Senha</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bradesco-red focus:border-bradesco-red outline-none"
                  placeholder="Sua senha corporativa"
                />
              </div>
            </div>
          )}

          {status !== "idle" && (
            <div className="w-full space-y-4 mb-10 text-left">
              {steps.map((text, idx) => (
                <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${step === idx ? 'bg-red-50 border border-red-100' : step > idx ? 'bg-gray-50' : 'opacity-40'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step > idx ? 'bg-green-100 text-green-600' : step === idx && status === 'error' ? 'bg-red-100 text-red-600' : step === idx ? 'bg-white shadow-sm text-bradesco-red' : 'bg-gray-100 text-gray-400'}`}>
                    {step > idx ? <Check className="w-4 h-4" /> : step === idx && status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> : step === idx && status === "error" ? <X className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                  </div>
                  <span className={`text-sm font-semibold ${step >= idx ? 'text-gray-900' : 'text-gray-400'}`}>
                    {text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {status === "error" && (
            <div className="w-full p-4 bg-red-50 text-red-700 text-sm rounded-2xl mb-8 font-medium border border-red-100">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-3">
             {status === "idle" && (
               <button 
                 onClick={handleStartSync}
                 className="px-8 py-3 rounded-full font-bold transition-colors text-sm uppercase tracking-wider bg-bradesco-red text-white hover:bg-black w-full"
               >
                 Iniciar Sincronização
               </button>
             )}
             <button 
               onClick={onCancel}
               className={`px-8 py-3 rounded-full font-bold transition-colors text-sm uppercase tracking-wider ${
                 status === "error" || status === "idle"
                   ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                   : "bg-red-50 text-bradesco-red hover:bg-red-100"
               }`}
             >
               {status === "error" || status === "idle" ? "Voltar para a aplicação" : "Cancelar Sincronização"}
             </button>
          </div>
        </div>
      </div>
    </motion.div>
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
  const [appState, setAppState] = useState<"initial" | "results" | "decision" | "insights" | "empty" | "inventory_table" | "graph" | "syncing">("initial");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [tableFilter, setTableFilter] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('last_sync'));
  const [showExportModal, setShowExportModal] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [expandedInventoryRows, setExpandedInventoryRows] = useState<Set<string>>(new Set());
  const [insightFilters, setInsightFilters] = useState({ ga: 'all', produto: 'all', subproduto: 'all' });
  const [inventoryViewMode, setInventoryViewMode] = useState<'table' | 'panel'>('table');
  
  // Advanced Inventory State
  const [inventoryFilters, setInventoryFilters] = useState({
    tipo_mapa: 'all',
    produto: 'all',
    subproduto: 'all',
    responsavel: 'all',
    status: 'all',
    ano: 'all'
  });
  const [inventorySort, setInventorySort] = useState<{
    field: keyof Artifact | 'null';
    direction: 'asc' | 'desc';
  }>({ field: 'null', direction: 'desc' });

  // Quick Chips logic
  const [activeChip, setActiveChip] = useState('Todos');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // Users DB check
    const savedDb = localStorage.getItem('cortex_users_db');
    if (savedDb) {
      setUsersDb(JSON.parse(savedDb));
    } else {
      setUsersDb(INITIAL_USERS);
      localStorage.setItem('cortex_users_db', JSON.stringify(INITIAL_USERS));
    }
  }, []);

  const handleLogin = (user: UserType) => {
    setCurrentUser(user);
    localStorage.setItem('cortex_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowAdmin(false);
    localStorage.removeItem('cortex_current_user');
    resetSearch();
  };

  const handleAddUser = (userData: Omit<UserType, 'id' | 'createdAt'>) => {
    const newUser: UserType = {
      ...userData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    const nextDb = [...usersDb, newUser];
    setUsersDb(nextDb);
    localStorage.setItem('cortex_users_db', JSON.stringify(nextDb));
  };

  const handleUpdateUser = (updated: UserType) => {
    const nextDb = usersDb.map(u => u.id === updated.id ? updated : u);
    setUsersDb(nextDb);
    localStorage.setItem('cortex_users_db', JSON.stringify(nextDb));
    // If I updated myself, refresh session
    if (currentUser?.id === updated.id) {
      setCurrentUser(updated);
      localStorage.setItem('cortex_current_user', JSON.stringify(updated));
    }
  };

  const handleDeleteUser = (id: string) => {
    const nextDb = usersDb.filter(u => u.id !== id);
    setUsersDb(nextDb);
    localStorage.setItem('cortex_users_db', JSON.stringify(nextDb));
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
      setAppState("syncing");
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

  useEffect(() => {
    if (appState === "insights") {
      applyInsightFilters();
    }
  }, [insightFilters]);

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
    if (activeChip === 'GA4') base = base.filter(i => normalizar(i.tipo_mapa) === 'ga4');
    if (activeChip === 'GA3') base = base.filter(i => normalizar(i.tipo_mapa) === 'ga3');
    if (activeChip === 'Documento') base = base.filter(i => normalizar(i.tipo_mapa) !== 'ga4' && normalizar(i.tipo_mapa) !== 'ga3');
    if (activeChip === 'Sem responsável') base = base.filter(i => !i.responsavel || i.responsavel === '-');
    if (activeChip === 'Sem subproduto') base = base.filter(i => !i.subproduto || i.subproduto === '-');

    // Independent Filters
    if (inventoryFilters.tipo_mapa !== 'all') {
      base = base.filter(i => normalizar(i.tipo_mapa) === inventoryFilters.tipo_mapa);
    }
    if (inventoryFilters.produto !== 'all') {
      base = base.filter(i => i.produto === inventoryFilters.produto);
    }
    if (inventoryFilters.subproduto !== 'all') {
      base = base.filter(i => i.subproduto === inventoryFilters.subproduto);
    }
    if (inventoryFilters.responsavel !== 'all') {
      base = base.filter(i => i.responsavel === inventoryFilters.responsavel);
    }
    if (inventoryFilters.status !== 'all') {
      if (inventoryFilters.status === 'ga4') base = base.filter(i => normalizar(i.tipo_mapa) === 'ga4');
      if (inventoryFilters.status === 'legado') base = base.filter(i => normalizar(i.tipo_mapa) === 'ga3');
      if (inventoryFilters.status === 'documento') base = base.filter(i => normalizar(i.tipo_mapa) !== 'ga4' && normalizar(i.tipo_mapa) !== 'ga3');
    }
    if (inventoryFilters.ano !== 'all') {
      base = base.filter(i => {
        const date = new Date(i.ultima_atualizacao);
        return date.getFullYear().toString() === inventoryFilters.ano;
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
      ga4: filteredInventory.filter(i => normalizar(i.tipo_mapa) === 'ga4').length,
      ga3: filteredInventory.filter(i => normalizar(i.tipo_mapa) === 'ga3').length,
      docs: filteredInventory.filter(i => normalizar(i.tipo_mapa) !== 'ga4' && normalizar(i.tipo_mapa) !== 'ga3').length
    };
  }, [filteredInventory]);

  const toggleInventoryRow = (id: string) => {
    const next = new Set(expandedInventoryRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedInventoryRows(next);
  };

  const handleViewArtifactDetails = (id: string) => {
    setShowGraph(false);
    setAppState("inventory_table");
    setTableFilter(id);
    setInventoryFilters({
      tipo_mapa: 'all',
      produto: 'all',
      subproduto: 'all',
      responsavel: 'all',
      status: 'all',
      ano: 'all'
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
      tipo_mapa: 'all',
      produto: 'all',
      subproduto: 'all',
      responsavel: 'all',
      status: 'all',
      ano: 'all'
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
        <div className="bg-gray-100/50 p-1.5 rounded-[24px] border border-gray-100 shadow-sm flex gap-2">
          {modes.map(mode => {
            const isActive = appState === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setAppState(mode.id as any)}
                className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all duration-300
                  ${isActive 
                    ? "bg-white shadow-lg text-bradesco-red scale-105" 
                    : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
                  }`}
              >
                <mode.icon className={`w-4 h-4 ${isActive ? 'text-bradesco-red' : 'text-gray-400'}`} />
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

  return (
    <main className="app">
      <AnimatePresence>
        {appState === 'syncing' && (
          <SyncScreen 
            onCancel={() => { setAppState('initial'); setQuery(''); }} 
            onComplete={() => {
              const now = new Date().toLocaleString('pt-BR');
              localStorage.setItem('last_sync', now);
              setLastSync(now);
              setQuery('base completa');
              executeSearch('base completa');
            }} 
          />
        )}
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

      <div className="flex-1 flex flex-col p-8 overflow-x-hidden">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-8 flex-1">
            <div className="flex flex-col cursor-pointer group" onClick={resetSearch}>
              <h1 className="brand-text text-2xl font-black tracking-tight text-gray-900 group-hover:text-red-600 transition-colors">
                Hub de Artefatos
              </h1>
              {lastSync && (
                <span className="text-[9px] font-bold text-gray-400 tracking-wider">
                  ÚLTIMA SYNC: {lastSync}
                </span>
              )}
            </div>
            
            {appState !== "initial" && appState !== "decision" && !loading && (
              <div className="relative flex-1 max-w-xl group">
                <input 
                  type="text" 
                  className="w-full px-6 py-2.5 bg-gray-50 border border-transparent rounded-full text-sm focus:outline-none focus:bg-white focus:border-bradesco-red focus:ring-4 focus:ring-bradesco-red/10 transition-all font-medium"
                  placeholder="Pesquisar novamente..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && executeSearch()}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm font-medium text-gray-500 shrink-0">
            {appState !== "initial" && appState !== "decision" && (
              <button 
                onClick={resetSearch}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 shadow-sm hover:border-bradesco-red hover:text-bradesco-red transition-all font-bold text-xs uppercase tracking-wider h-10"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                Voltar ao início
              </button>
            )}
            
            {!loading && appState === "inventory_table" && (
              <button 
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 shadow-sm hover:border-bradesco-red hover:text-bradesco-red transition-all font-bold text-xs uppercase tracking-wider h-10"
              >
                <Download className="w-3.5 h-3.5" />
                Extrair Dados
              </button>
            )}
            
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center font-bold text-gray-600 hover:border-bradesco-red hover:text-bradesco-red transition-all overflow-hidden"
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

        {/* Hero Section */}
        <section className={`hero flex-col items-center justify-start pt-8 ${appState !== "initial" ? "hidden" : ""}`}>
          <div className="text-center mb-10">
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-gray-900 mb-2"
            >
              Olá, {currentUser.name.split(' ')[0]}!
            </motion.p>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl font-medium text-gray-900 tracking-tight leading-tight mb-4"
            >
              Qual artefato você precisa encontrar hoje?
            </motion.h2>
            <p className="text-gray-500 text-lg">Descubra, conecte e analise artefatos em tempo real</p>
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
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className={`content ${appState === "initial" ? "hidden" : ""}`}>
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
                  <button className="bg-white border border-gray-200 hover:border-bradesco-red hover:text-bradesco-red text-gray-800 px-10 py-4 rounded-full font-bold transition-all shadow-sm hover:shadow-md min-w-[200px]" onClick={() => setAppState("insights")}>Ver insights</button>
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
                    <option value="ga4">APENAS GA4</option>
                    <option value="ga3">APENAS GA3</option>
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
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Padrão GA4</p>
                  <p className="text-4xl font-extrabold text-gray-900 leading-none">{insights.ga4}</p>
                  <span className="absolute top-6 right-6 text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full">{insights.porcentagens.ga4}%</span>
                </div>

                <div className="group relative glass-card p-6 rounded-[32px] border-b-4 border-b-bradesco-red border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-bradesco-red mb-4 group-hover:scale-110 transition-transform">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Padrão GA3</p>
                  <p className="text-4xl font-extrabold text-gray-900 leading-none">{insights.ga3}</p>
                  <span className="absolute top-6 right-6 text-[10px] font-black text-bradesco-red bg-red-50 px-2 py-1 rounded-full">{insights.porcentagens.ga3}%</span>
                </div>

                <div className="group relative glass-card p-6 rounded-[32px] border-b-4 border-b-blue-500 border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                    <Filter className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Total Mapas</p>
                  <p className="text-4xl font-extrabold text-gray-900 leading-none">{insights.mapas}</p>
                </div>

                <div className="group relative glass-card p-6 rounded-[32px] border-b-4 border-b-gray-400 border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-4 group-hover:scale-110 transition-transform">
                    <Download className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Documentos</p>
                  <p className="text-4xl font-extrabold text-gray-900 leading-none">{insights.documentos}</p>
                </div>
              </div>

              {/* Advanced UI Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
                
                {/* Bloco Principal: Resumo Executivo + Pontos de Atenção */}
                <div className="lg:col-span-3 glass-card p-12 rounded-[40px] border border-gray-100 relative overflow-hidden flex flex-col justify-between">
                   <div className="flex justify-between items-start mb-10">
                      <div>
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Visão Geral do Cenário</h4>
                        <h3 className="text-3xl font-medium tracking-tight text-gray-900 leading-tight">Resumo Executivo</h3>
                      </div>
                      <Target className="w-10 h-10 text-gray-300 opacity-20" />
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
                      <div>
                         <p className="text-[15px] text-gray-800 leading-relaxed font-sans font-medium">
                            {insights.resumoInteligente.textoCenario}
                         </p>
                      </div>
                      <div className="bg-gray-50/80 rounded-3xl p-8 border border-gray-100">
                         <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                           <CheckCircle2 className="w-3 h-3 text-gray-400" /> Ações Recomendadas
                         </h5>
                         <ul className="space-y-4">
                            {insights.resumoInteligente.recomendacoes.map((rec, i) => (
                              <li key={i} className="flex items-start gap-3 group">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                                <span className="text-[13px] font-bold text-gray-700 leading-snug">{rec}</span>
                              </li>
                            ))}
                         </ul>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-gray-50 pt-8 mt-auto">
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Impacto em</p>
                        <p className="text-sm font-black text-gray-900 truncate">{insights.resumoInteligente.principalProduto}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Foco no Sub</p>
                        <p className="text-sm font-black text-gray-900 truncate">{insights.resumoInteligente.principalSubproduto}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Conformidade Global</p>
                        <p className="text-sm font-black text-green-600">{insights.aderencia.score.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Volume Visualizado</p>
                        <p className="text-sm font-black text-gray-900 truncate">{insights.total} Itens</p>
                      </div>
                   </div>
                </div>

                {/* Pontos de Atenção Section */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                  <div className={`p-8 rounded-[40px] border relative overflow-hidden flex flex-col h-full bg-white transition-all
                    ${insights.problemas.nivelRisco === 'alto' ? 'border-[#cc092f]/20 bg-[#cc092f]/5' : 
                      insights.problemas.nivelRisco === 'medio' ? 'border-amber-200 bg-amber-50/20' : 'border-green-200 bg-green-50/20'}
                  `}>
                    <div className="absolute top-6 right-6">
                       <AlertTriangle className={`w-8 h-8 opacity-20 
                        ${insights.problemas.nivelRisco === 'alto' ? 'text-[#cc092f]' : 
                          insights.problemas.nivelRisco === 'medio' ? 'text-amber-500' : 'text-green-500'}
                       `} />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 uppercase mb-8 flex items-center gap-2">
                       Pontos de Atenção
                    </h4>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-xs font-bold text-gray-700">Sem Responsável</span>
                        </div>
                        <span className={`text-sm font-black p-1.5 rounded-lg ${insights.problemas.semResponsavel > 0 ? 'text-red-700 bg-red-100' : 'text-green-700 bg-green-100'}`}>{insights.problemas.semResponsavel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Filter className="w-4 h-4 text-gray-500" />
                          <span className="text-xs font-bold text-gray-700">Sem Subproduto</span>
                        </div>
                        <span className={`text-sm font-black p-1.5 rounded-lg ${insights.problemas.semSubproduto > 0 ? 'text-amber-700 bg-amber-100' : 'text-green-700 bg-green-100'}`}>{insights.problemas.semSubproduto}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-4 h-4 text-gray-500" />
                          <span className="text-xs font-bold text-gray-700">Fora GA4</span>
                        </div>
                        <span className={`text-sm font-black p-1.5 rounded-lg ${insights.problemas.foraPadraoGA4 > 0 ? 'text-[#cc092f] bg-[#cc092f]/10' : 'text-green-700 bg-green-100'}`}>{insights.problemas.foraPadraoGA4}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-xs font-bold text-gray-700">Desatualizados</span>
                        </div>
                        <span className={`text-sm font-black p-1.5 rounded-lg ${insights.problemas.desatualizados > 0 ? 'text-[#cc092f] bg-[#cc092f]/10' : 'text-green-700 bg-green-100'}`}>{insights.problemas.desatualizados}</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-8">
                       <div 
                          className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full inline-block
                          ${insights.problemas.nivelRisco === 'alto' ? 'text-white shadow-lg shadow-red-200' : 
                            insights.problemas.nivelRisco === 'medio' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-green-600 text-white shadow-lg shadow-green-200'}
                       `}
                       style={insights.problemas.nivelRisco === 'alto' ? { background: 'linear-gradient(90deg, #7D046D 0%, #cc092f 100%)' } : {}}
                       >
                          Risco: {insights.problemas.nivelRisco.toUpperCase()}
                       </div>
                    </div>
                  </div>
                </div>

                {/* Produtos & Subprodutos Rows */}
                <div className="lg:col-span-2 glass-card p-10 rounded-[40px] border border-gray-100">
                  <h4 className="text-sm font-bold text-gray-400 uppercase mb-10 flex justify-between items-center">
                    <span>Distribuição por Produto</span>
                    <span className="text-[10px] font-black text-gray-300">Volume & %</span>
                  </h4>
                  <div className="space-y-8">
                    {insights.distribProduto.slice(0, 6).map((p, idx) => (
                      <div key={idx} className="group">
                        <div className="flex justify-between items-end mb-3">
                          <span className="text-sm font-black text-gray-800 uppercase tracking-tighter">{p.name}</span>
                          <div className="text-right">
                             <span className="text-xs font-black text-gray-900">{p.count} <span className="text-gray-300 text-[10px] ml-1">MAPAS</span></span>
                             <span className="ml-3 text-xs font-black text-gray-400">{p.percent}%</span>
                          </div>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden relative">
                           <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${p.percent}%` }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-gray-900 to-gray-700"
                           />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-8">
                   {/* Aderência ao Padrão - Revamped */}
                   <div className="glass-card p-10 rounded-[40px] border border-gray-100">
                      <h4 className="text-sm font-bold text-gray-400 uppercase mb-8">Conformidade ao Padrão</h4>
                      <div className="flex items-center gap-10">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                           <svg className="w-full h-full -rotate-90">
                              <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-50" />
                              <motion.circle 
                                cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" 
                                strokeDasharray={364}
                                initial={{ strokeDashoffset: 364 }}
                                animate={{ strokeDashoffset: 364 - (364 * insights.aderencia.score / 100) }}
                                transition={{ duration: 2, ease: "easeOut" }}
                                className={insights.aderencia.status === 'excelente' ? 'text-green-500' : insights.aderencia.status === 'bom' ? 'text-amber-500' : 'text-[var(--bradesco-red)]'}
                              />
                           </svg>
                           <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-black text-gray-900 leading-none">{insights.aderencia.score.toFixed(0)}%</span>
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Global</span>
                           </div>
                        </div>

                        <div className="flex-1">
                           <h5 className={`text-lg font-bold mb-2 ${insights.aderencia.status === 'excelente' ? 'text-green-600' : insights.aderencia.status === 'bom' ? 'text-amber-600' : 'text-[var(--bradesco-red)]'}`}>
                              Interface {insights.aderencia.status.toUpperCase()}
                           </h5>
                           <p className="text-sm text-gray-500 leading-relaxed font-medium">
                              {insights.aderencia.interpretacao}
                           </p>
                        </div>
                      </div>
                   </div>

                   {/* Subprodutos */}
                   <div className="glass-card p-10 rounded-[40px] border border-gray-100">
                      <h4 className="text-sm font-bold text-gray-400 uppercase mb-8">Detalhamento por Subproduto</h4>
                      <div className="grid grid-cols-2 gap-4">
                         {insights.distribSubproduto.slice(0, 4).map((s, idx) => (
                           <div key={idx} className="p-6 rounded-3xl bg-gray-50/50 border border-gray-100/50 hover:border-gray-200 transition-all">
                              <p className="text-[10px] font-black text-gray-400 uppercase mb-3 truncate">{s.name}</p>
                              <div className="flex items-end justify-between leading-none">
                                 <span className="text-2xl font-black text-gray-900">{s.count}</span>
                                 <span className="text-[10px] font-black text-[var(--bradesco-red)]">{s.percent}%</span>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

              </div>

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
              {results.map((item, index) => (
                <motion.article 
                  key={item.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card rounded-[40px] pt-10 px-10 pb-5 group transition-all relative overflow-hidden hover:shadow-xl hover:shadow-red-500/5 hover:-translate-y-1"
                >
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
                        {item.tipo_mapa && (normalizar(item.tipo_mapa) === "ga4" || normalizar(item.tipo_mapa) === "ga3") 
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
              ))}
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
                    {['Todos', 'GA4', 'GA3', 'Documento', 'Sem responsável', 'Sem subproduto'].map(chip => (
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
                    { label: 'Tipo de Mapa', key: 'tipo_mapa', options: [{ v: 'all', l: 'QUALQUER TIPO' }, { v: 'ga4', l: 'PADRÃO GA4' }, { v: 'ga3', l: 'PADRÃO GA3' }] },
                    { label: 'Produto', key: 'produto', options: [{ v: 'all', l: 'TODOS PRODUTOS' }, ...Array.from(new Set(results.map(r => r.produto))).filter(Boolean).map(p => ({ v: p, l: String(p).toUpperCase() }))] },
                    { label: 'Subproduto', key: 'subproduto', options: [{ v: 'all', l: 'QUALQUER SUB' }, ...Array.from(new Set(results.map(r => r.subproduto))).filter(Boolean).map(s => ({ v: s, l: String(s).toUpperCase() }))] },
                    { label: 'Responsável', key: 'responsavel', options: [{ v: 'all', l: 'RESPONSÁVEL' }, ...Array.from(new Set(results.map(r => r.responsavel))).filter(Boolean).map(r => ({ v: r, l: String(r).toUpperCase() }))] },
                    { label: 'Classificação', key: 'status', options: [{ v: 'all', l: 'STATUS' }, { v: 'ga4', l: 'PADRÃO GA4' }, { v: 'legado', l: 'LEGADO (GA3)' }, { v: 'documento', l: 'DOCUMENTO' }] },
                    { label: 'Ano Ref.', key: 'ano', options: [{ v: 'all', l: 'TODAS DATAS' }, { v: '2025', l: '2025' }, { v: '2024', l: '2024' }, { v: '2023', l: '2023' }] }
                  ].map(filter => (
                    <div key={filter.key} className="flex flex-col gap-1.5 text-center">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">{filter.label}</label>
                      <select 
                        value={inventoryFilters[filter.key as keyof typeof inventoryFilters]}
                        onChange={(e) => setInventoryFilters(f => ({ ...f, [filter.key]: e.target.value }))}
                        className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[10px] font-bold text-gray-800 outline-none focus:border-red-200 transition-colors cursor-pointer appearance-none text-center"
                      >
                        {filter.options.map((opt: any) => <option key={opt.v} value={opt.v}>{opt.l}</option>)}
                      </select>
                    </div>
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
                    className="glass-card overflow-hidden rounded-[32px] border border-gray-100 shadow-xl bg-white"
                  >
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                          <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="p-6 text-[10px] font-black text-gray-400 tracking-widest text-center uppercase">Status</th>
                            <th onClick={() => handleSort('titulo')} className="p-6 text-[10px] font-black text-gray-400 tracking-widest cursor-pointer group hover:text-red-600 transition-colors">
                              <div className="flex items-center gap-2">
                                TÍTULO / ID
                                {inventorySort.field === 'titulo' && (inventorySort.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                              </div>
                            </th>
                            <th onClick={() => handleSort('tipo_mapa')} className="p-6 text-[10px] font-black text-gray-400 tracking-widest cursor-pointer hover:text-red-600">TIPO</th>
                            <th onClick={() => handleSort('produto')} className="p-6 text-[10px] font-black text-gray-400 tracking-widest cursor-pointer hover:text-red-600">PRODUTO</th>
                            <th onClick={() => handleSort('subproduto')} className="p-6 text-[10px] font-black text-gray-400 tracking-widest cursor-pointer hover:text-red-600">SUBPRODUTO</th>
                            <th onClick={() => handleSort('responsavel')} className="p-6 text-[10px] font-black text-gray-400 tracking-widest cursor-pointer hover:text-red-600">RESPONSÁVEL</th>
                            <th onClick={() => handleSort('ultima_atualizacao')} className="p-6 text-[10px] font-black text-gray-400 tracking-widest cursor-pointer hover:text-red-600">ATUALIZADO</th>
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
                                      <div className={`w-3 h-3 rounded-full ${normalizar(item.tipo_mapa) === 'ga4' ? 'bg-green-500 shadow-lg shadow-green-200' : normalizar(item.tipo_mapa) === 'ga3' ? 'bg-red-600 shadow-lg shadow-red-200' : 'bg-gray-300'}`} />
                                      <button 
                                        onClick={() => toggleInventoryRow(item.id)} 
                                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors"
                                      >
                                        {expandedInventoryRows.has(item.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </td>
                                  <td className="p-6">
                                    <div className="flex flex-col items-start max-w-[250px]">
                                      <a 
                                        href={item.link} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-sm font-bold text-gray-900 leading-tight mb-1 truncate w-full hover:text-red-600 transition-colors"
                                      >
                                        {highlightText(item.titulo, tableFilter)}
                                      </a>
                                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.id}</span>
                                    </div>
                                  </td>
                                  <td className="p-6">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter
                                      ${normalizar(item.tipo_mapa) === 'ga4' ? 'bg-green-100 text-green-700' : 
                                        normalizar(item.tipo_mapa) === 'ga3' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}
                                    `}>
                                      {item.tipo_mapa || "DOC"}
                                    </span>
                                  </td>
                                  <td className="p-6 text-xs font-bold text-gray-700 uppercase tracking-tighter truncate max-w-[120px]">
                                    {highlightText(item.produto || "-", tableFilter)}
                                  </td>
                                  <td className="p-6 text-xs font-bold text-gray-500 uppercase tracking-tighter truncate max-w-[120px]">
                                    {highlightText(item.subproduto || "-", tableFilter)}
                                  </td>
                                  <td className="p-6 text-xs font-bold text-gray-800 uppercase tracking-tighter truncate max-w-[120px]">
                                    {highlightText(item.responsavel || "-", tableFilter)}
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
                            { l: 'GA3 (Legado)', v: currentInventoryInsights.problemas.foraPadraoGA4 }
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
                            <p className="text-2xl font-medium tracking-tight text-gray-800 leading-tight mb-10 font-sans">
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
      </div>

      {/* Static Footer */}
      <footer className="w-full px-8 py-4 bg-white/30 backdrop-blur-md border-t border-gray-200 flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-[#B0B0B0]">
        <div className="normal-case">desenvolvido por: lucas.doliveira@bradesco.com.br</div>
        <div>Salla.Mkt beta V1.0.0</div>
      </footer>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
    </main>
  );
}
