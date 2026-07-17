import { prisma } from "../config/prisma";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** URL-safe slug from a place name (e.g. "The Sunset Inn" → "the-sunset-inn"). */
export function slugifyPlaceName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "place";
}

export async function generateUniquePlaceSlug(
  name: string,
  excludeId?: string,
): Promise<string> {
  const base = slugifyPlaceName(name);
  let slug = base;
  let counter = 2;

  while (true) {
    const existing = await prisma.place.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || (excludeId && existing.id === excludeId)) {
      return slug;
    }

    const suffix = `-${counter}`;
    slug = `${base.slice(0, Math.max(1, 80 - suffix.length))}${suffix}`;
    counter++;
  }
}
