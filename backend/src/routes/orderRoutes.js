import express from "express";
import { createOrder , getMyOrder  ,getMyOrderId , getAvailableOrders} from "../controllers/orderController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authenticate, createOrder);
router.get("/" , authenticate , getMyOrder);
router.get("/available" ,authenticate , getAvailableOrders);
router.get("/:id" , authenticate , getMyOrderId);
export default router;