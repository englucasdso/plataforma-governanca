/**
 * Arquivo: backend/routes/search.routes.ts
 * Propósito: Define os "caminhos" (rotas) da API. Quando o frontend faz um 
 * request para `/api/qualquer-coisa`, é este arquivo que intercepta esse pedido
 * e decide qual função do service deve ser acionada.
 */
import { Router } from "express";
import { getInventoryData, calculateInsights, searchArtifacts } from "../services/inventory.service.js";
import { runCollection, runPremiumSync } from "../confluenceClient.js";

const router = Router();

/**
 * ROTA: GET /api/inventario
 * Traz todos os artefatos disponíveis de forma bruta, montando os insights gerais.
 */
router.get("/inventario", (req, res) => {
  try {
    const inventoryResult = getInventoryData();
    const inventory = inventoryResult.data;
    res.json({
      total: inventory.length,
      resultados: inventory,
      insights: calculateInsights(inventory),
      lastSync: inventoryResult.lastSync
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao carregar inventário" });
  }
});

/**
 * ROTA: POST /api/collect
 * Uma rota "admin" usada para disparar a atualização do banco de dados 
 * lendo lábios diretamente do sistema Confluence.
 */
router.post("/collect", async (req, res) => {
  const { rootId } = req.body;
  if (!rootId) return res.status(400).json({ error: "ID root da página é obrigatório" });
  
  try {
    const data = await runCollection(rootId);
    res.json({ success: true, count: data.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ROTA: GET /api/search?q=algumTexto
 * Responsável por filtrar os artefatos com base no parâmetro 'q' 
 * (abreviação comum para query). Retorna apenas os achados relevantes.
 */
router.get("/search", (req, res) => {
  const query = req.query.q as string || "";
  try {
    const results = searchArtifacts(query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Erro ao processar busca" });
  }
});

/**
 * ROTA: GET /api/sync-stream
 * Conexão persistente (SSE) para stream de log da sincronização com Confluence
 */
router.get("/sync-stream", async (req, res) => {
  // SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const cbProgress = (step, description) => {
    res.write(`data: ${JSON.stringify({ step, description })}\n\n`);
  };

  try {
    const result = await runPremiumSync(cbProgress, {
      maxRows: req.query.maxRows ? parseInt(req.query.maxRows as string, 10) : null
    });
    res.write(`data: ${JSON.stringify({ step: 'CONCLUIDA', description: 'Base sincronizada com sucesso.', result })}\n\n`);
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ step: 'ERRO', description: error.message || 'Falha na Sincronização' })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
