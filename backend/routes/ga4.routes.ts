import express from "express";
import {
  checkStatus,
  getAccounts,
  getProperties,
  getEventsFromProperty,
  getAllEvents
} from "../services/integrations/ga4.service";

const router = express.Router();

router.get("/ga4/status", async (req, res) => {
  try {
    const status = await checkStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
