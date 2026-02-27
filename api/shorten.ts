import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body ?? {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  try {
    const resp = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
    );
    if (resp.ok) {
      const shortUrl = await resp.text();
      if (shortUrl.startsWith("http")) {
        return res.status(200).json({ shortUrl });
      }
    }
    return res.status(502).json({ error: "TinyURL returned invalid response" });
  } catch {
    return res.status(502).json({ error: "Failed to reach TinyURL" });
  }
}
