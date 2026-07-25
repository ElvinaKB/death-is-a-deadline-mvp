import { Router } from "express";
import { getGeoHint } from "../controllers/geo.controller";

const router = Router();

// Public, unauthenticated, cheap. Reads Vercel edge IP headers only.
router.get("/hint", getGeoHint);

export { router };
