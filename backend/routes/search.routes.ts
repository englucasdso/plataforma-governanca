/**
 * Arquivo: backend/routes/search.routes.ts
 * Propósito: Define os "caminhos" (rotas) da API. Quando o frontend faz um 
 * request para `/api/qualquer-coisa`, é este arquivo que intercepta esse pedido
 * e decide qual função do service deve ser acionada.
 */
import { Router } from "express";
import { getInventoryData, calculateInsights, searchArtifacts } from "../services/inventory.service.js";
import { runCollection } from "../confluenceClient.js";

const router = Router();

/**
 * ROTA: GET /api/inventario
 * Traz todos os artefatos disponíveis de forma bruta, montando os insights gerais.
 */
router.get("/inventario", (req, res) => {
  try {
    const inventory = getInventoryData();
    res.json({
      total: inventory.length,
      resultados: inventory,
      insights: calculateInsights(inventory) // Os insights são gerados em tempo real com base na base total
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

export default router;
