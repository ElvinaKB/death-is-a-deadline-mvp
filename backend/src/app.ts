import dotenv from "dotenv";
dotenv.config();

import "express-async-errors";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { errorHandler } from "./libs/middlewares/errorHandler";
import { router as authRouter } from "./routers/auth.router";
import { router as studentsRouter } from "./routers/students.router";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

// Routers
app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);

// Fallback error handler
app.use(errorHandler);

export default app;
