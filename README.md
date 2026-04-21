# Governance Search - Buscador Inteligente de Artefatos

Buscador inteligente para o time de Martech, focado em encontrar mapas de métricas, documentos e trilhas de GA4/GTM na base de conhecimento Confluence.

## 🚀 Arquitetura do Projeto

O projeto segue uma arquitetura moderna e separada em camadas:

### Frontend (React + TypeScript)
Localizado em `/frontend`, utiliza Vite como build tool.
- **src/components**: Componentes visuais modulares.
- **src/services**: Integração com a API do backend.
- **src/styles**: Estilos globais e utilitários de animação (CSS + Tailwind).
- **src/pages**: Layouts principais de página.

### Backend (Node.js + Express)
Localizado em `/backend`, processa buscas inteligentes e insights.
- **routes**: Definição das rotas de API.
- **services**: Lógica de negócio, normalização e algoritmos de busca (fuzzy search).
- **data**: Armazenamento de mocks e inventário estático.

## 🛠️ Como rodar o projeto

### Requisitos
- Node.js (v18 ou superior)
- npm

### Passo a Passo
1. Clone o repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o projeto em modo desenvolvimento:
   ```bash
   npm run dev
   ```
   *O backend subirá na porta 3000 e o Vite servirá o frontend através do middleware integrado.*

## 📂 Estrutura de Pastas

```text
├── backend/
│   ├── data/           # JSONs e mocks
│   ├── routes/         # Endpoints da API
│   ├── services/       # Lógica de busca e insights
│   └── index.ts        # Entrada principal do servidor
├── frontend/
│   └── src/
│       ├── components/ # UI Components
│       ├── services/   # Fetch e integrações
│       ├── styles/     # CSS Global
│       ├── utils/      # Helpers frontend
│       ├── App.tsx     # Orquestrador da aplicação
│       └── main.tsx    # Entrypoint React
├── index.html          # HTML Principal
├── package.json        # Dependências e Scripts
└── tsconfig.json       # Configuração TypeScript
```

## 🗺️ Roadmap (Próximos Passos)
- [ ] Implementar autenticação via SSO Bradesco.
- [ ] Integrar com a API real do Confluence.
- [ ] Adicionar suporte a busca por voz.
- [ ] Dashboard de auditoria de qualidade dos mapas.
