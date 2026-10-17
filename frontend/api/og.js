// Link previews (iMessage, WhatsApp, Slack, Facebook, X, LinkedIn…). Their
// crawlers don't run JavaScript, so the single-page app would only ever show
// the site logo. vercel.json sends crawler requests for "/<hotel-slug>" here;
// we answer with the hotel's photo, name and price as Open Graph tags.
// People never hit this — their browsers get the normal app.

const SITE = "https://www.deadlinetravel.com";
const API =
  process.env.VITE_API_BASE_URL || "https://deadline-production-backend.vercel.app";
const DEFAULT = {
  title: "DEADLINE — secret hotel prices",
  description: "Private pricing. Verified travelers. Guess the price, win the room.",
  image: `${SITE}/Favicon.png`,
};

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

async function loadPlace(slug) {
  if (!/^[a-z0-9-]{1,120}$/i.test(slug)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(`${API}/api/places/public/${encodeURIComponent(slug)}`, {
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = await r.json();
    return j?.data?.place ?? j?.data ?? null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const slug = String(req.query.slug || "");
  const place = await loadPlace(slug);
  const url = `${SITE}/${slug}`;

  let meta = { ...DEFAULT, url: SITE };
  if (place?.name) {
    const image = place.images?.[0]?.url;
    const price = Number(place.retailPrice) > 0 ? `from $${Math.round(place.retailPrice)}/night` : "";
    const where = [place.city].filter(Boolean).join(", ");
    meta = {
      title: `${place.name}${where ? ` · ${where}` : ""}`,
      description: [
        price && `Public price ${price}.`,
        "Members bid their price — there's a secret rate below.",
      ]
        .filter(Boolean)
        .join(" "),
      image: image ? (image.startsWith("http") ? image : `${SITE}${image}`) : DEFAULT.image,
      url,
    };
  }

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>${esc(meta.title)} | DEADLINE</title>
<meta name="description" content="${esc(meta.description)}" />
<meta property="og:site_name" content="DEADLINE" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(meta.title)}" />
<meta property="og:description" content="${esc(meta.description)}" />
<meta property="og:image" content="${esc(meta.image)}" />
<meta property="og:url" content="${esc(meta.url)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(meta.title)}" />
<meta name="twitter:description" content="${esc(meta.description)}" />
<meta name="twitter:image" content="${esc(meta.image)}" />
<link rel="canonical" href="${esc(meta.url)}" />
</head><body><a href="${esc(meta.url)}">${esc(meta.title)}</a></body></html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(html);
}
