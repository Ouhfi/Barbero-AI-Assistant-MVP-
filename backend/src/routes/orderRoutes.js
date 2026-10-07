import express from "express";
import { createOrder , getMyOrder  ,getMyOrderId , getAvailableOrders , acceptOrder , completeOrder} from "../controllers/orderController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authenticate, createOrder);
router.get("/" , authenticate , getMyOrder);
router.get("/available" ,authenticate , getAvailableOrders);
router.get("/:id" , authenticate , getMyOrderId);
router.patch("/:id/complete" , authenticate , completeOrder);
router.patch("/:id/accept", authenticate , acceptOrder);
export default router;