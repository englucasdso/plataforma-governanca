import express from "express";
import fs from "fs";
import path from "path";
import { checkStatus, getAccounts, getProperties, getEventsFromProperty, getAllEvents } from "../services/integrations/ga4.service";
import { extractEventsPW, closePlaywright } from "../ga4Client.js";

const router = express.Router();

let pwSyncState = {
    active: false,
    phase: 'idle', // idle, accounts, properties-wait, properties, events-wait, events, success, error
    accounts: [] as any[],
    properties: [] as any[],
    errorMsg: ""
};

function logPwError(e: any) {
    try {
        const dirPath = path.join(process.cwd(), "data");
        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
        const logPath = path.join(dirPath, "ga4-update-log.json");
        const logEntry = {
            timestamp: new Date().toISOString(),
            step: pwSyncState.phase,
            originalMessage: e.message || String(e),
            type: "adc/playwright",
            status: "failed"
        };
        const logs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, "utf8")) : [];
        logs.push(logEntry);
        fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
    } catch (logErr) {
        console.error("Erro ao salvar log de ga4", logErr);
    }
}

router.post("/ga4/pw/start", async (req, res) => {
    pwSyncState = { active: true, phase: 'accounts', accounts: [], properties: [], errorMsg: "" };
    res.json({ message: "Started" });
    try {
        const rawAccounts = await getAccounts();
        pwSyncState.accounts = rawAccounts.map((a: any) => ({ id: a.name, name: a.displayName || a.name }));
        pwSyncState.phase = 'properties-wait';
    } catch (e: any) {
        pwSyncState.phase = 'error';
        pwSyncState.errorMsg = "Erro de autenticação ADC. Execute gcloud auth application-default login. Detalhes: " + e.message;
        logPwError(e);
    }
});

router.post("/ga4/pw/select-account", async (req, res) => {
    const { accountId } = req.body;
    pwSyncState.phase = 'properties';
    res.json({ message: "Fetching properties" });
    try {
        const rawProps = await getProperties(accountId);
        pwSyncState.properties = rawProps.map((p: any) => ({ id: p.propertyId, name: p.displayName || p.name }));
        pwSyncState.phase = 'events-wait';
    } catch(e: any) {
        pwSyncState.phase = 'error';
        pwSyncState.errorMsg = "Erro usando ADC: " + e.message;
        logPwError(e);
    }
});

router.post("/ga4/pw/select-property", async (req, res) => {
    const { accountId, accountName, propertyId, propertyName } = req.body;
    pwSyncState.phase = 'events';
    res.json({ message: "Fetching events" });
    try {
        await extractEventsPW(accountId, accountName, propertyId, propertyName);
        pwSyncState.phase = 'success';
    } catch (e: any) {
        pwSyncState.phase = 'error';
        pwSyncState.errorMsg = e.message;
        logPwError(e);
    }
});

router.post("/ga4/pw/cancel", async (req, res) => {
    pwSyncState.active = false;
    await closePlaywright();
    res.json({ message: "Cancelled" });
});

router.get("/ga4/pw/status", (req, res) => {
    res.json(pwSyncState);
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
