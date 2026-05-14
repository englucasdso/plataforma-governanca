import express from "express";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const router = express.Router();

let syncJob = { active: false, step: 0, status: "idle", errorMsg: "" };
const SA_FILE_PATH = path.join(process.cwd(), "backend", "src", "secrets", "ga4-service-account.json");
const DATA_FILE_PATH = path.join(process.cwd(), "backend", "src", "data", "ga4-events.json");
const PYTHON_SCRIPT_PATH = path.join(process.cwd(), "backend", "src", "integrations", "sync_ga4.py");
const PYTHON_EXE = "C:\\Users\\i462913\\AppData\\Local\\Programs\\Python\\Python313\\python.exe";

async function executeSync() {
    try {
        console.log("[GA4-SYNC] Executando Python");
        syncJob.step = 1; // Start
        
        syncJob.step = 2; // Extraindo dados
        const { stdout, stderr } = await execFileAsync(PYTHON_EXE, [PYTHON_SCRIPT_PATH], { cwd: process.cwd() });
        
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        
        syncJob.step = 3; // Sucesso
        syncJob.status = "success";
        console.log("[GA4-SYNC] Sincronização concluída");
        
    } catch (error: any) {
        syncJob.status = "error";
        const errorMsg = error.message || String(error);
        
        syncJob.errorMsg = "Não foi possível concluir a sincronização com o GA4. Erro: " + errorMsg;
        console.error("[GA4-SYNC] Erro na sincronização: ", errorMsg);
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
    const saExists = fs.existsSync(SA_FILE_PATH);
    res.json({
        connected: saExists,
        authType: saExists ? "service_account" : null,
        message: saExists 
            ? "Service Account configurada."
            : "Service Account não encontrada em backend/secrets/ga4-service-account.json."
    });
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
   const filepath = DATA_FILE_PATH;
   if (fs.existsSync(filepath)) {
      res.json(JSON.parse(fs.readFileSync(filepath, "utf8")));
   } else {
      res.json([]);
   }
});

function getSavedData() {
    const filepath = DATA_FILE_PATH;
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
                    allEvents.push({ 
                        ...e, 
                        accountId: a.accountId, 
                        accountName: a.accountName,
                        propertyId: p.propertyId,
                        propertyName: p.propertyName
                    });
                });
            }
        });
    });
    res.json(allEvents);
});

export default router;
