import dotenv from "dotenv";
dotenv.config();

import "express-async-errors";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { errorHandler } from "./libs/middlewares/errorHandler";
import { router as authRouter } from "./routers/auth.router";
import { router as studentsRouter } from "./routers/students.router";
import { router as placesRouter } from "./routers/places.router";
import { router as bidsRouter } from "./routers/bids.router";
import { router as paymentsRouter } from "./routers/payments.router";

const app = express();

app.use(cors());

// Stripe webhook needs raw body - must be BEFORE express.json()
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

// JSON parser for all other routes
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

// Routers
app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);
app.use("/api/places", placesRouter);
app.use("/api/bids", bidsRouter);
app.use("/api/payments", paymentsRouter);

// Fallback error handler
app.use(errorHandler);

export default app;
