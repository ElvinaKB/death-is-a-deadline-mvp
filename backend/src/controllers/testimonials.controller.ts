import { Request, Response } from "express";
import { prisma } from "../libs/config/prisma";

// List testimonials for a place
export async function listTestimonials(req: Request, res: Response) {
  const { placeId } = req.query;
  if (!placeId || typeof placeId !== "string") {
    return res.status(400).json({ error: "placeId is required" });
  }
  const testimonials = await prisma.testimonial.findMany({
    where: { placeId },
  });
  res.json({ data: testimonials });
}

// Create testimonial
export async function createTestimonial(req: Request, res: Response) {
  const { placeId, rating, title, content, author, authorRole } = req.body;
  if (!placeId || !rating || !title || !content || !author) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const testimonial = await prisma.testimonial.create({
      data: { placeId, rating, title, content, author, authorRole },
    });
    res.status(201).json({ data: testimonial });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// Update testimonial
export async function updateTestimonial(req: Request, res: Response) {
  const { id } = req.params;
  const { rating, title, content, author, authorRole } = req.body;
  try {
    const testimonial = await prisma.testimonial.update({
      where: { id },
      data: { rating, title, content, author, authorRole },
    });
    res.json({ data: testimonial });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// Delete testimonial
export async function deleteTestimonial(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await prisma.testimonial.delete({ where: { id } });
    res.status(204).end();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// ============ REVIEW PLATFORMS ============

// List review platforms for a place
export async function listReviewPlatforms(req: Request, res: Response) {
  const { placeId } = req.query;
  if (!placeId || typeof placeId !== "string") {
    return res.status(400).json({ error: "placeId is required" });
  }
  const reviewPlatforms = await prisma.reviewPlatform.findMany({
    where: { placeId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: reviewPlatforms });
}

// Create review platform
export async function createReviewPlatform(req: Request, res: Response) {
  const { placeId, name, rating, reviewCount, url, source } = req.body;
  if (
    !placeId ||
    !name ||
    rating === undefined ||
    !reviewCount ||
    !url ||
    !source
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const reviewPlatform = await prisma.reviewPlatform.create({
      data: { placeId, name, rating, reviewCount, url, source },
    });
    res.status(201).json({ data: reviewPlatform });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// Update review platform
export async function updateReviewPlatform(req: Request, res: Response) {
  const { id } = req.params;
  const { name, rating, reviewCount, url, source } = req.body;
  try {
    const reviewPlatform = await prisma.reviewPlatform.update({
      where: { id },
      data: { name, rating, reviewCount, url, source },
    });
    res.json({ data: reviewPlatform });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// Delete review platform
export async function deleteReviewPlatform(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await prisma.reviewPlatform.delete({ where: { id } });
    res.status(204).end();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
