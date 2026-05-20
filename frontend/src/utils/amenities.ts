/** Extract amenity-like lines from full description for display. */
export function extractAmenities(fullDescription: string): string[] {
  if (!fullDescription) return [];

  const lines = fullDescription
    .split(/\n|•|·|–|—/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3 && s.length < 120);

  if (lines.length > 1) return lines.slice(0, 12);

  const sentences = fullDescription
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  return sentences.slice(0, 6);
}
