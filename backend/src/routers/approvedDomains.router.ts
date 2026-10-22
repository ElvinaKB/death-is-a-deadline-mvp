import { Router, Request, Response } from "express";
import { authenticate } from "../libs/middlewares/authenticate";
import { UserRole } from "../types/auth.types";
import { prisma } from "../libs/config/prisma";
import { CustomError } from "../libs/utils/CustomError";

// Admin: company email domains whose employees are auto-approved at sign-up.
const router = Router();
router.use(authenticate(UserRole.ADMIN));

// Free-mail providers can never be whitelisted — anyone can get an address.
const FREE_MAIL = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "live.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com",
  "gmx.com", "mail.com", "yandex.com", "zoho.com",
]);

function normalizeDomain(input: unknown): string {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/^.*@/, "")
    .replace(/\/.*$/, "");
}

router.get("/", async (_req: Request, res: Response) => {
  const domains = await prisma.approvedEmailDomain.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.status(200).json({ data: { domains } });
});

router.post("/", async (req: Request, res: Response) => {
  const domain = normalizeDomain(req.body?.domain);
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
    throw new CustomError("Enter a domain like hawkemedia.com", 400);
  }
  if (FREE_MAIL.has(domain)) {
    throw new CustomError(`${domain} is a free email provider — it can't be auto-approved`, 400);
  }
  const label = typeof req.body?.label === "string" ? req.body.label.trim() || null : null;
  const row = await prisma.approvedEmailDomain.upsert({
    where: { domain },
    create: { domain, label },
    update: { label },
  });
  res.status(201).json({ data: row });
});

router.delete("/:domain", async (req: Request, res: Response) => {
  const domain = normalizeDomain(req.params.domain);
  await prisma.approvedEmailDomain.deleteMany({ where: { domain } });
  res.status(200).json({ data: { removed: domain } });
});

export { router };
