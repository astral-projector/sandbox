import type { VercelRequest, VercelResponse } from "@vercel/node";

const JSONBLOB_API = "https://jsonblob.com/api/jsonBlob";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // POST: create new blob
  if (req.method === "POST") {
    try {
      const resp = await fetch(JSONBLOB_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(req.body),
      });
      if (resp.status === 201) {
        const location = resp.headers.get("Location") ?? "";
        const blobId = location.split("/").pop();
        return res.status(201).json({ blobId });
      }
      return res.status(502).json({ error: "Failed to create blob" });
    } catch {
      return res.status(502).json({ error: "Failed to reach storage" });
    }
  }

  // PUT: update existing blob
  if (req.method === "PUT") {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Missing id parameter" });
    }
    try {
      const resp = await fetch(`${JSONBLOB_API}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(req.body),
      });
      if (resp.ok) {
        return res.status(200).json({ ok: true });
      }
      return res.status(502).json({ error: "Failed to update blob" });
    } catch {
      return res.status(502).json({ error: "Failed to reach storage" });
    }
  }

  // GET: read blob
  if (req.method === "GET") {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Missing id parameter" });
    }
    try {
      const resp = await fetch(`${JSONBLOB_API}/${id}`, {
        headers: { Accept: "application/json" },
      });
      if (resp.ok) {
        const data = await resp.json();
        return res.status(200).json(data);
      }
      return res
        .status(resp.status === 404 ? 404 : 502)
        .json({ error: "Blob not found" });
    } catch {
      return res.status(502).json({ error: "Failed to reach storage" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
