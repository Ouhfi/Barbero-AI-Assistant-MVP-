import express from "express";
import http from "http";
import { Server } from "socket.io";
import "dotenv/config";

import sequelize from "./config/database.js";
import "./models/associations/index.js";
import seedAreas from "./seeders/areaSeeder.js";
import areaRoutes from "./routes/areaRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

import { socketAuth } from "./middleware/socketAuth.js";
import { registerSocketHandlers } from "./sockets/socketHandler.js";
import {
notFound,
errorHandler,
} from "./middleware/errorMiddleware.js";


const app = express();
const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);
export const io = new Server(httpServer, { cors: { origin: "*" } });


app.use(express.json());
app.set("io", io);

app.use("/api/areas", areaRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);


app.use(notFound);
app.use(errorHandler);

io.use(socketAuth);
registerSocketHandlers(io);

app.get("/", (req, res) => res.status(200).json({ message: "Server started successfully" }));

try {
  await sequelize.authenticate();
  await sequelize.sync();
  await seedAreas();
  console.log("Database connected successfully");

  httpServer.listen(PORT, () => console.log(`Server started on port ${PORT}`));
} catch (error) {
  console.error("Database connection failed:", error);
}