import { or } from "sequelize";
import Order from "../models/Order.js";
import User from "../models/User.js";

export const createOrder = async (req, res) => {
  try {
    const { area_id, service_details } = req.body || {};

    if (!area_id || !service_details) {
      return res.status(400).json({
        message: "area_id and service_details are required",
      });
    }
     const order = await Order.create({
      customer_id: req.user.id,
      area_id,
      service_details,
    });

    const io = req.app.get("io");

    if (io) {
      io.to(`area_${order.area_id}`).emit("new_order", {
        id: order.id,
        area_id: order.area_id,
        service_details: order.service_details,
        status: order.status,
        createdAt: order.createdAt,
      });
    }

    return res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to create order",
      error : error.message
    });
  }
};

//======================getMyOrder===================

export const getMyOrder = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: {
        customer_id: req.user.id,
      },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      message: " Orders retrieved successfully",
      orders,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "failed to fetch order ",
      error: error.message,
    });
  }
};

//==========================getMyOrderId=====================

export const getMyOrderId = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      where: {
        id,
        customer_id: req.user.id,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: " order is not found ",
      });
    }

    return res.status(200).json({
      order,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: " failed to fetch order",
      error: error.message,
    });
  }
};

//====================getAvailableOrders================

export const getAvailableOrders = async (req, res) => {
  try {
    const barber = await User.findByPk(req.user.id);

    if (!barber) {
      return res.status(404).json({
        message: "barber is not found",
      });
    }

    if (barber.role !== "BARBER") {
      return res.status(403).json({
        message: "Only barbers can access available orders",
      });
    }

    const orders = await Order.findAll({
      where: {
        area_id: barber.area_id,
        status: "PENDING",
        barber_id: null,
      },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      orders,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: " Failed to fetch available orders",
    });
  }
};

///=================acceptOrder==================

export const acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const barber = await User.findByPk(req.user.id);

    if (!barber) {
      return res.status(404).json({
        message: "barber is not found",
      });
    }

    if (barber.role !== "BARBER") {
      return res.status(403).json({
        message: "Only barbers can accept orders",
      });
    }

    const [updatedRows] = await Order.update(
      {
        barber_id: barber.id,
        status: "ACCEPTED",
      },
      {
        where: {
          id,
          area_id: barber.area_id,
          status: "PENDING",
          barber_id: null,
        },
      },
    );

    if (updatedRows === 0) {
      return res.status(400).json({
        message: "Order not found or already accepted by another barber",
      });
    }

    // جلب الطلب وإرسال الـ Socket Events في المكان الصحيح بعد نجاح التحديث
    const order = await Order.findByPk(id);
    const io = req.app.get("io");

    if (io) {
      io.to(`user_${order.customer_id}`).emit("order_accepted", {
        order_id: order.id,
        barber_id: barber.id,
      });

      io.to(`area_${order.area_id}`).emit("order_taken", {
        order_id: order.id,
      });
    }

    return res.status(200).json({
      message: "order accepted successfully",
      order,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "failed to accept order",
      error: error.message,
    });
  }
};

//===================completeOrder===============
export const completeOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const barber = await User.findByPk(req.user.id);

    if (!barber) {
      return res.status(404).json({
        message: "barber is not found",
      });
    }

    if (barber.role !== "BARBER") {
      return res.status(403).json({
        message: "Only barbers can complete orders",
      });
    }

    const [updatedRows] = await Order.update(
      {
        status: "COMPLETED",
      },
      {
        where: {
          id,
          barber_id: barber.id,
          status: "ACCEPTED",
        },
      },
    );

    if (updatedRows === 0) {
      return res.status(409).json({
        message: "Order cannot be completed",
      });
    }

    const order = await Order.findByPk(id);
    const io = req.app.get("io");

    if (io) {
      io.to(`user_${order.customer_id}`).emit("order_completed", {
        order_id: order.id,
      });
    }

    return res.status(200).json({
      message: "Order completed successfully",
      order,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to complete order",
      error: error.message,
    });
  }
};

//======================cancelOrder=====================

export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    let updatedRows = 0;

    if (user.role === "CUSTOMER") {
      [updatedRows] = await Order.update(
        { status: "CANCELED" },
        {
          where: {
            id,
            customer_id: user.id,
            status: "PENDING",
          },
        },
      );
    } else if (user.role === "BARBER") {
      [updatedRows] = await Order.update(
        { status: "CANCELED" },
        {
          where: {
            id,
            barber_id: user.id,
            status: "ACCEPTED",
          },
        },
      );
    } else {
      return res.status(403).json({
        message: "Invalid user role",
      });
    }

    if (updatedRows === 0) {
      return res.status(409).json({
        message: "Order cannot be canceled or was not found",
      });
    }

    const order = await Order.findByPk(id);
    const io = req.app.get("io");

    if (io) {
      if (user.role === "CUSTOMER") {
        io.to(`area_${order.area_id}`).emit("order_canceled", {
          order_id: order.id,
        });
      } else {
        io.to(`user_${order.customer_id}`).emit("order_canceled", {
          order_id: order.id,
        });
      }
    }

    return res.status(200).json({
      message: "Order canceled successfully",
      order,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to cancel order",
      error: error.message,
    });
  }
};