import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "role", "area_id"], 
    });

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.data.user = { 
      id: user.id, 
      role: user.role, 
      area_id: user.area_id 
    };
    
    next();
  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
};