import express from "express";
import { GetArea } from "../controllers/areaController.js";

const router = express.Router();
router.get("/", GetArea);
export default router;

