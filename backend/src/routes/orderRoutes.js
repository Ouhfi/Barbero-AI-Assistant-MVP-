import express from "express";
import {
  createOrder,
  getMyOrder,
  getMyOrderId,
  getAvailableOrders,
  acceptOrder,
  completeOrder,
  cancelOrder
} from "../controllers/orderController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { createOrderSchema } from "../middleware/orderSchemas.js";
import asyncHandler from "../middleware/asyncHandler.js";


const router = express.Router();

router.post("/", authenticate, validate(createOrderSchema),asyncHandler(createOrder) );
router.get("/", authenticate, getMyOrder);
router.get("/available", authenticate, getAvailableOrders);
router.get("/:id", authenticate, getMyOrderId);
router.patch("/:id/complete", authenticate, completeOrder);
router.patch("/:id/accept", authenticate, acceptOrder);
router.patch("/:id/cancel", authenticate , cancelOrder);
export default router;
