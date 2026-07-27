import express from "express";
import { upload } from "../middlewares/upload.js";
import { analyzeReading, getLogs } from "../controllers/readingController.js";

const router = express.Router();

router.post("/analyze-reading", upload.single("audioFile"), analyzeReading);
router.get("/logs", getLogs);

export default router;