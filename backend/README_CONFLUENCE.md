# Confluence Data Collector (REST API)

Este módulo foi desenvolvido para automatizar a coleta de metadados de artefatos (Mapas de Métricas) do Confluence utilizando exclusivamente a **API REST**.

## 📑 Requisitos
- Acesso à rede interna (VPN se aplicável).
- Permissão de leitura nas páginas do Confluence.

---

## 🚀 Como Rodar

### Modo 1: Console do Navegador (Execução Manual)
Este é o modo mais simples, pois utiliza sua sessão já autenticada no Jira/Confluence.

1. Abra o Confluence no seu navegador e faça login.
2. Pressione `F12` para abrir o Developer Tools e vá em **Console**.
3. Copie o conteúdo de `backend/confluenceClient.js`.
4. Devido ao uso de `import`, você deve envelopar em um bloco ou rodar as funções diretamente se o site permitir. 
   *Dica: Você pode usar uma versão adaptada (sem imports) para o console.*
5. Execute:
   ```javascript
   const ROOT_ID = '2641724179'; // ID da página raiz
   runCollection(ROOT_ID).then(data => console.log("Finalizado!", data));
   ```

### Modo 2: No Projeto (Servidor Node.js)
O projeto está configurado para ler o arquivo `backend/data/inventario.json`.

1. No terminal do projeto, você pode rodar o script usando `tsx`:
   ```bash
   npx tsx -e "import { runCollection } from './backend/confluenceClient.js'; runCollection('2641724179')"
   ```
2. O arquivo `backend/data/inventario.json` será atualizado automaticamente com os novos dados.

---

## 🛠 Evolução: API Token
Para rodar em pipelines de CI/CD ou servidores sem intervenção humana:

1. Gere um **Personal Access Token** no seu perfil do Confluence.
2. Adicione ao seu arquivo `.env`:
   ```env
   CONFLUENCE_TOKEN=seu_token_aqui
   ```
3. O `confluenceClient.js` já está preparado para ler essa variável e injetar no header `Authorization`.

---

## 🔍 Lógica de Extração
O script utiliza **Regex** (`extractMetadata`) para buscar padrões comuns no HTML das páginas:
- Tabelas com rótulos como "Responsável", "Produto", "GTM-ID".
- Você pode expandir o objeto `patterns` no arquivo `confluenceClient.js` para capturar novos campos.

---

## ⚠️ Observações
- **Recursividade:** O script percorre todos os filhos da página raiz. Cuidado ao rodar em árvores gigantescas.
- **Formato:** O script extrai o `body.storage`, que é o XML/HTML base do Confluence, mais limpo que o HTML final do browser.
