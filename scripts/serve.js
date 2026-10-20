/**
 * serve.js — Servidor estático mínimo para desarrollo.
 *
 * Uso:
 *   npm start
 *   npm start -- 3000     (si el puerto 8080 está ocupado)
 *
 * No tiene dependencias: funciona sin Python y sin conexión a internet.
 * Envía `Cache-Control: no-store` para que nunca veas archivos viejos.
 */
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.argv[2] || process.env.PORT || 8080);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function send(res, status, message) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(message);
}

const server = http.createServer((req, res) => {
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  } catch (error) {
    return send(res, 400, "400 — URL inválida");
  }

  if (pathname === "/") pathname = "/index.html";

  /* Se resuelve dentro del ROOT: bloquea intentos de path traversal (../). */
  const resolved = path.resolve(path.join(ROOT, pathname));

  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    return send(res, 403, "403 — Forbidden");
  }

  fs.stat(resolved, (error, stats) => {
    if (error || stats.isDirectory()) {
      return send(res, 404, `404 — No se encontró ${pathname}`);
    }

    const contentType = MIME_TYPES[path.extname(resolved).toLowerCase()] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    });

    const stream = fs.createReadStream(resolved);

    stream.on("error", () => res.destroy());
    stream.pipe(res);
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`\n  ❌ El puerto ${PORT} está ocupado. Probá con:  npm start -- 3000\n`);
  } else {
    console.error(`\n  ❌ No se pudo iniciar el servidor: ${error.message}\n`);
  }

  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`\n  ✅  Lista del súper corriendo en  http://localhost:${PORT}\n`);
  console.log(`      Serviendo: ${ROOT}`);
  console.log(`      Ctrl+C para detenerlo.\n`);
});
