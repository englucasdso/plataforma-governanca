export interface Artifact {
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

export interface Insights {
  total: number;
  ga4: number;
  ga3: number;
  mapas: number;
  documentos: number;
  distribProduto: { name: string; count: number; percent: string }[];
  distribSubproduto: { name: string; count: number; percent: string }[];
  porcentagens: {
    ga4: string;
    ga3: string;
  };
  searchTerm?: string;
  problemas: {
    semResponsavel: number;
    semSubproduto: number;
    foraPadraoGA4: number;
    desatualizados: number;
    nivelRisco: 'baixo' | 'medio' | 'alto';
  };
  aderencia: {
    score: number;
    interpretacao: string;
    status: 'excelente' | 'bom' | 'critico';
  };
  resumoInteligente: {
    principalProduto: string;
    principalSubproduto: string;
    textoCenario: string;
    recomendacoes: string[];
  };
}

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface SearchResponse {
  total: number;
  resultados: Artifact[];
  insights: Insights;
  lastSync?: string;
}
