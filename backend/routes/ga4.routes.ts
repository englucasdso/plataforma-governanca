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
        if (errorMsg.includes("UNAVAILABLE") || errorMsg.includes("ETIMEDOUT") || errorMsg.includes("timeout") || errorMsg.includes("rede corporativa bloqueou")) {
            syncJob.errorMsg = "Autenticação iniciada, mas a conexão com Google Analytics foi bloqueada pela rede corporativa. Tente novamente ou use o modo de atualização assistida.";
        } else {
            syncJob.errorMsg = errorMsg;
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
