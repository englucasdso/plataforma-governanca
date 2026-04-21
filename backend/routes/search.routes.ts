import { Router } from "express";
import { getInventoryData, calculateInsights, searchArtifacts } from "../services/inventory.service.js";
import { runCollection } from "../confluenceClient.js";

const router = Router();

router.get("/inventario", (req, res) => {
  try {
    const inventory = getInventoryData();
    res.json({
      total: inventory.length,
      resultados: inventory,
      insights: calculateInsights(inventory)
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao carregar inventário" });
  }
});

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
