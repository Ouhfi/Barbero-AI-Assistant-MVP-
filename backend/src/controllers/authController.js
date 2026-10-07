import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import "dotenv/config";
import Area from "../models/Area.js";
import E from "dotenv";

//====================== REGISTER ======================

export const register = async (req, res) => {
  try {
    const { email, password, role, area_id } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const userRole = role || "CUSTOMER";

    
    if (userRole === "BARBER") {
      if (!area_id) {
        return res.status(400).json({
          message: "area_id is required for BARBER role",
        });
      }

      const area = await Area.findByPk(area_id);
      if (!area) {
        return res.status(404).json({
          message: "Area not found. Please provide a valid area_id",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      role: userRole, 
      area_id: userRole === "BARBER" ? area_id : null, 
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        area_id: user.area_id,
      },
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
};

// ====================== LOGIN ======================

export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      where: { email },
    });

    
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        area_id: user.area_id,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Login failed",
    });
  }
};

//====================== ME ======================

export const me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        area_id: user.area_id,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to get user",
    });
  }
};