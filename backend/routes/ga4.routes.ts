import express from "express";
import fs from "fs";
import path from "path";
import { checkStatus, runGA4Sync } from "../services/integrations/ga4.service";

const router = express.Router();

let syncJob = { active: false, step: 0, status: "idle", errorMsg: "" };

async function executeSync() {
    try {
        console.log("[GA4-SYNC] iniciando sincronização");
        syncJob.step = 1; // Start
        
        await checkStatus();
        
        syncJob.step = 2; // Extraindo dados
        const result = await runGA4Sync();
        
        syncJob.step = 3; // Sucesso
        syncJob.status = "success";
        
        return result;
    } catch (error: any) {
        syncJob.status = "error";
        const errorMsg = error.message || "";
        
        syncJob.errorMsg = "Não foi possível concluir a sincronização com o GA4. Erro: " + errorMsg;
        console.error("Erro na sincronizacao: ", error);
        throw error;
    } finally {
        setTimeout(() => {
           // Reset after a while so we can run again
           if (syncJob.status === "success" || syncJob.status === "error") {
               syncJob.active = false;
           }
        }, 10000);
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
   
   // Run in background
   executeSync().catch(console.error);

   res.json({ message: "Started" });
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

function getSavedData() {
    const filepath = path.join(process.cwd(), "backend", "data", "ga4-events.json");
    if (fs.existsSync(filepath)) {
        return JSON.parse(fs.readFileSync(filepath, "utf8"));
    }
    return { accounts: [] };
}

router.get("/ga4/accounts", (req, res) => {
    const data = getSavedData();
    res.json(data.accounts.map((a: any) => ({ accountId: a.accountId, accountName: a.accountName })));
});

router.get("/ga4/properties", (req, res) => {
    const data = getSavedData();
    const accountId = req.query.accountId;
    if (!accountId) {
        // Return all properties across accounts if no filter
        const allProps = data.accounts.flatMap((a: any) => a.properties);
        res.json(allProps);
    } else {
        const acc = data.accounts.find((a: any) => a.accountId === accountId);
        res.json(acc ? acc.properties : []);
    }
});

router.get("/ga4/events", (req, res) => {
    const data = getSavedData();
    const accountId = req.query.accountId;
    const propertyId = req.query.propertyId;
    
    let allEvents: any[] = [];
    data.accounts.forEach((a: any) => {
        if (accountId && a.accountId !== accountId) return;
        a.properties.forEach((p: any) => {
            if (propertyId && p.propertyId !== propertyId) return;
            // append event with context
            if (p.events) {
                p.events.forEach((e: any) => {
                    allEvents.push({ ...e, accountId: a.accountId, propertyId: p.propertyId });
                });
            }
        });
    });
    res.json(allEvents);
});

export default router;
