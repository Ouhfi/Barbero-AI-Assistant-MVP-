import express from "express";
import sequelize from "./config/database.js";
import "dotenv/config";

import seedAreas from "./seeders/areaSeeder.js";
import areaRoutes from "./routes/areaRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

import "./models/associations/index.js";
import "./models/User.js";
import "./models/Area.js";
import "./models/Order.js"

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api/areas", areaRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);



app.get("/", (req, res) => {
  res.status(200).json({
    message: "Server started successfully",
  });
});

try {
  await sequelize.authenticate();

  await sequelize.sync();

  await seedAreas();

  console.log("Database connected successfully");

  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
  
} catch (error) {
  console.error("Database connection failed:", error);
}