import express from "express";
import { upload } from "../middlewares/upload.js";

import {
  analyzeReading,
  getLogs
} from "../controllers/readingController.js";

import {
  listStories,
  fetchPage,
  fetchStorySequence
} from "../controllers/storyController.js";

import {
  loginSession,
  updateProgress,
  linkStoryToSession
} from "../controllers/sessionController.js";

const router = express.Router();

// Story & Content Routes
router.get("/stories", listStories);

// NEW: Retrieve the complete ordered sequence
router.get("/stories/:storyId/pages", fetchStorySequence);

// Existing single-page route
router.get("/stories/:storyId/pages/:pageNumber", fetchPage);

// Reading & Analysis Routes
router.post(
  "/analyze-reading",
  upload.single("audioFile"),
  analyzeReading
);

router.get("/logs", getLogs);

// Session Routes
router.post("/sessions/login", loginSession);

router.put(
  "/sessions/:sessionId/progress",
  updateProgress
);

router.put(
  "/sessions/:sessionId/story",
  linkStoryToSession
);

export default router;
