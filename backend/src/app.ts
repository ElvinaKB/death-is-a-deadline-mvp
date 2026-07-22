import dotenv from "dotenv";
dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || ".env",
  override: true,
});

import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./libs/middlewares/errorHandler";
import { auditLogger } from "./libs/middlewares/auditLogger";
import { rateLimit } from "./libs/middlewares/rateLimit";
import { router as authRouter } from "./routers/auth.router";
import { router as studentsRouter } from "./routers/students.router";
import { router as placesRouter } from "./routers/places.router";
import { router as bidsRouter } from "./routers/bids.router";
import { router as paymentsRouter } from "./routers/payments.router";
import { router as testimonialsRouter } from "./routers/testimonials.router";
import { router as contactRouter } from "./routers/contact.router";
import { router as newsletterRouter } from "./routers/newsletter.router";
import { router as waitlistRouter } from "./routers/waitlist.router";
import { router as profileRouter } from "./routers/profile.router";
import { router as uploadsRouter } from "./routers/uploads.router";
import { router as myallocatorRouter } from "./routers/myallocator.router";

const app = express();

// Vercel puts the real client IP in X-Forwarded-For — without this,
// req.ip resolves to Vercel's proxy for every request, which would
// collapse IP-keyed rate limiting into one shared bucket for all visitors.
app.set("trust proxy", 1);

app.use(helmet());

// Known frontend origins only — CLIENT_URL covers local dev, the rest are
// production domains (deathisadeadline.com is referenced in the ToS as a
// domain the Service runs on), plus Vercel's own preview-deployment URLs
// for this project.
const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://www.deadlinetravel.com",
  "https://deadlinetravel.com",
  "https://www.deathisadeadline.com",
  "https://deathisadeadline.com",
].filter((origin): origin is string => Boolean(origin));
const vercelPreviewPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (server-to-server calls, curl, Postman) — allow.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  }),
);

// Stripe webhook needs raw body - must be BEFORE express.json()
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

// JSON parser for all other routes
app.use(express.json());
app.use(morgan("dev"));

// Audit logging middleware - logs all requests to database
app.use(auditLogger);

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

// General API floor — a backstop against scraping/abuse, not a tight limit.
// Excludes the Stripe webhook (Stripe's own retry behavior shouldn't be
// throttled) and the myallocator callbacks (Cloudbeds' polling cadence is
// contractual, and that router already fails closed on shared_secret).
const apiRateLimit = rateLimit({ window: "1 m", max: 60, keyPrefix: "api" });
app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/payments/webhook") || req.path.startsWith("/myallocator")) {
    return next();
  }
  return apiRateLimit(req, res, next);
});

// Routers
app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);
app.use("/api/places", placesRouter);
app.use("/api/bids", bidsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/testimonials", testimonialsRouter);
app.use("/api/contact", contactRouter);
app.use("/api/newsletter", newsletterRouter);
app.use("/api/waitlist", waitlistRouter);
app.use("/api/profile", profileRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/myallocator", myallocatorRouter);

// Dev-only routes
// if (process.env.NODE_ENV === "development") {
const { router: devRouter } = require("./routers/dev.router");
app.use("/api/dev", devRouter);
// }

// Fallback error handler
app.use(errorHandler);

export default app;
