import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy route for Gemini API
  app.all("/api/proxy/gemini/*", async (req, res) => {
    const path = req.params[0] || "";
    const targetUrl = `https://generativelanguage.googleapis.com/${path}${req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : ""}`;
    
    try {
      console.log(`Proxying Gemini request to: ${targetUrl}`);
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          "Content-Type": req.get("Content-Type") || "application/json",
          "x-goog-api-key": req.get("x-goog-api-key") || "",
          "x-goog-api-client": req.get("x-goog-api-client") || ""
        },
        body: ["POST", "PUT", "PATCH"].includes(req.method) ? JSON.stringify(req.body) : undefined
      });

      const data = await response.arrayBuffer();
      res.status(response.status).send(Buffer.from(data));
    } catch (error) {
      console.error("Gemini proxy error:", error);
      res.status(500).json({ error: "Failed to proxy to Gemini" });
    }
  });

  // Proxy route for Ravenol and other APIs
  app.get("/api/proxy/ravenol", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      console.log(`Proxying request to: ${url}`);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        }
      });
      
      console.log(`Response status: ${response.status} ${response.statusText}`);
      
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Proxy fetch failed: ${response.status}`, errorText.substring(0, 200));
        return res.status(response.status).send(errorText);
      }
      
      const data = await response.arrayBuffer();
      res.send(Buffer.from(data));
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Failed to fetch from external API" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
