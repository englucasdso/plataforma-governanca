import express from "express";
import fs from "fs";
import path from "path";
import {
  checkStatus,
  getAccounts,
  getProperties,
  getEventsFromProperty,
  getAllEvents
} from "../services/integrations/ga4.service";

const router = express.Router();

let syncJob = { active: false, step: 0, status: "idle", errorMsg: "" };

async function runGa4Sync() {
    try {
        syncJob.step = 1;
        const auth = await checkStatus();
        if(!auth.connected) throw new Error("ADC não configurado");
        
        syncJob.step = 2;
        const events = await getAllEvents();
        
        syncJob.step = 3;
        const dirPath = path.join(process.cwd(), "data");
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        
        const filePath = path.join(dirPath, "ga4-events.json");
        fs.writeFileSync(filePath, JSON.stringify(events, null, 2));
        
        syncJob.step = 4;
        syncJob.status = "success";
        
    } catch (error: any) {
        syncJob.status = "error";
        const errorMsg = error.message || "";
        
        const type = (errorMsg.includes("UNAVAILABLE") || errorMsg.includes("ETIMEDOUT") || errorMsg.includes("timeout") || errorMsg.includes("read ECONNRESET") || errorMsg.includes("oauth")) ? "network/proxy" : "unknown";

        if (type === "network/proxy") {
            syncJob.errorMsg = "Não foi possível concluir a sincronização com o GA4. A autenticação foi iniciada, mas a rede corporativa bloqueou a comunicação com o Google OAuth.";
        } else {
            syncJob.errorMsg = "Não foi possível concluir a sincronização com o GA4. Erro: " + errorMsg;
        }

        try {
            const dirPath = path.join(process.cwd(), "data");
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            const logPath = path.join(dirPath, "ga4-update-log.json");
            const logEntry = {
                timestamp: new Date().toISOString(),
                step: syncJob.step,
                originalMessage: errorMsg,
                type: type,
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

router.get("/ga4/sync/status", (req, res) => {
   res.json(syncJob);
});

router.get("/ga4/saved", (req, res) => {
   const filepath = path.join(process.cwd(), "data", "ga4-events.json");
   if (fs.existsSync(filepath)) {
      res.json(JSON.parse(fs.readFileSync(filepath, "utf8")));
   } else {
      res.json([]);
   }
});

router.get("/ga4/accounts", async (req, res) => {
  try {
    const accounts = await getAccounts();
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/ga4/properties", async (req, res) => {
  try {
    const accountFilter = req.query.account as string;
    const properties = await getProperties(accountFilter);
    res.json(properties);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/ga4/events", async (req, res) => {
  try {
    const propertyId = req.query.propertyId as string;
    if (!propertyId) {
       res.status(400).json({ error: "propertyId is required" });
       return;
    }
    const events = await getEventsFromProperty(propertyId);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/ga4/events/all", async (req, res) => {
  try {
    const events = await getAllEvents();
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
