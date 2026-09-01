/**
 * Recognizes a YouTube watch/Shorts/short-link URL and returns an embeddable
 * iframe src for it. Returns null for anything else (e.g. a direct
 * .mp4/.webm file link, which renders in a plain <video> tag instead, or an
 * Instagram/TikTok page link, which isn't supported).
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\.|^m\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (host === "youtube.com") {
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/?]+)/);
    if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    if (/^\/embed\//.test(parsed.pathname)) return url;
  }

  return null;
}
