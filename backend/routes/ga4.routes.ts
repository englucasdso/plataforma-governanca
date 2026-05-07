import express from "express";
import fs from "fs";
import path from "path";
import { checkStatus } from "../services/integrations/ga4.service";
import { runGA4Collection, abortGA4Collection } from "../ga4Client.js";

const router = express.Router();

let syncJob = { active: false, step: 0, status: "idle", errorMsg: "" };

async function runGa4Sync() {
    try {
        console.log("[GA4-SYNC] iniciando sincronização");
        syncJob.step = 1; // Playwright / Setup local
        
        // Validação ADC apenas para checar se o usuário está logado
        await checkStatus();
        console.log("[GA4-AUTH] ADC OK");
        
        syncJob.step = 2; // Extraindo dados
        const events = await runGA4Collection();
        
        syncJob.step = 3; // Sucesso
        syncJob.status = "success";
        
    } catch (error: any) {
        syncJob.status = "error";
        const errorMsg = error.message || "";
        
        syncJob.errorMsg = "Não foi possível concluir a sincronização com o GA4. Erro: " + errorMsg;

        try {
            const dirPath = path.join(process.cwd(), "backend", "data");
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            const logPath = path.join(dirPath, "ga4-update-log.json");
            const logEntry = {
                timestamp: new Date().toISOString(),
                step: syncJob.step,
                originalMessage: errorMsg,
                type: "playwright/ui",
                status: "failed"
            };
            const logs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, "utf8")) : [];
            logs.push(logEntry);
            fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
        } catch (e) {
            console.error("Erro ao salvar log de ga4", e);
        }
    }
}

router.get("/ga4/status", async (req, res) => {
  try {
    const status = await checkStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/ga4/sync", (req, res) => {
   if (syncJob.active && syncJob.status === "running") {
       res.status(400).json({ error: "Sync already running" });
       return;
   }
   
   syncJob = { active: true, step: 0, status: "running", errorMsg: "" };
   
   runGa4Sync().catch(console.error);

   res.json({ message: "Started" });
});

router.post("/ga4/sync/cancel", async (req, res) => {
   try {
       await abortGA4Collection();
       syncJob.status = "error";
       syncJob.errorMsg = "Sincronização cancelada pelo usuário.";
       res.json({ message: "Cancelled" });
   } catch (e: any) {
       res.status(500).json({ error: e.message });
   }
});

router.get("/ga4/sync/status", (req, res) => {
   res.json(syncJob);
});

router.get("/ga4/saved", (req, res) => {
   const filepath = path.join(process.cwd(), "backend", "data", "ga4-events.json");
   if (fs.existsSync(filepath)) {
      res.json(JSON.parse(fs.readFileSync(filepath, "utf8")));
   } else {
      res.json([]);
   }
});

export default router;
