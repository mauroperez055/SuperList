/**
 * serve.js — Servidor estático mínimo para desarrollo.
 *
 * Uso:
 *   npm start
 *   npm start -- 3000        (si el puerto 8080 está ocupado)
 *   HOST=0.0.0.0 npm start   (exponerlo en la red local: solo en redes de confianza)
 *
 * No tiene dependencias: funciona sin Python y sin conexión a internet.
 *
 * Medidas de seguridad:
 *   - Escucha en 127.0.0.1 por defecto (no queda expuesto en la LAN).
 *   - Sirve únicamente una allowlist de archivos públicos.
 *   - Bloquea dotfiles/dot-directorios, path traversal y bytes nulos.
 *   - Solo acepta GET y HEAD.
 *   - Envía cabeceras de seguridad y `Cache-Control: no-store`.
 */
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

/* Archivos y directorios que el servidor de desarrollo puede entregar.
   Todo lo demás (README, tests, scripts, package.json, .git, etc.) da 404. */
const PUBLIC_FILES = new Set(["/index.html", "/add-to-cart.png"]);
const PUBLIC_DIRECTORIES = ["/css/", "/js/"];

const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin"
};

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

function send(res, status, message, extraHeaders) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(message);
}

function isPublicPath(pathname) {
  if (PUBLIC_FILES.has(pathname)) return true;

  return PUBLIC_DIRECTORIES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Convierte un pathname ya decodificado en una ruta absoluta dentro de ROOT.
 * Devuelve null si la ruta no es pública o intenta salir del proyecto.
 *
 * @param {string} pathname
 * @returns {string|null}
 */
function resolvePublicPath(pathname) {
  if (typeof pathname !== "string" || pathname.includes("\0")) return null;

  const segments = [];

  for (const segment of pathname.replace(/\\/g, "/").split("/")) {
    if (segment === "") continue;

    /* "." y ".." habilitan path traversal; ":" habilita rutas de unidad y
       flujos alternativos de NTFS; un segmento oculto nunca es público. */
    if (segment === "." || segment === "..") return null;
    if (segment.startsWith(".")) return null;
    if (segment.includes(":")) return null;

    segments.push(segment);
  }

  if (segments.length === 0) return null;

  const safePathname = `/${segments.join("/")}`;

  if (!isPublicPath(safePathname)) return null;

  const resolved = path.resolve(ROOT, ...segments);

  if (!resolved.startsWith(`${ROOT}${path.sep}`)) return null;

  return resolved;
}

/**
 * Crea el servidor HTTP sin ponerlo a escuchar.
 * Se exporta para poder testearlo con un puerto efímero.
 *
 * @returns {import("node:http").Server}
 */
function createServer() {
  return http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return send(res, 405, "405 — Method Not Allowed", { Allow: "GET, HEAD" });
    }

    let pathname;

    try {
      pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch (error) {
      return send(res, 400, "400 — URL inválida");
    }

    /* Los bytes nulos hacen que fs.stat lance una excepción síncrona que
       tumbaría el proceso: se rechazan antes de tocar el filesystem. */
    if (pathname.includes("\0")) {
      return send(res, 400, "400 — URL inválida");
    }

    if (pathname === "/") pathname = "/index.html";

    const filePath = resolvePublicPath(pathname);

    if (!filePath) {
      return send(res, 404, "404 — No encontrado");
    }

    let stats;

    try {
      stats = fs.statSync(filePath);
    } catch (error) {
      return send(res, 404, "404 — No encontrado");
    }

    if (!stats.isFile()) {
      return send(res, 404, "404 — No encontrado");
    }

    const contentType =
      MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";

    res.writeHead(200, {
      ...SECURITY_HEADERS,
      "Content-Type": contentType,
      "Content-Length": stats.size,
      "Cache-Control": "no-store"
    });

    if (req.method === "HEAD") {
      return res.end();
    }

    const stream = fs.createReadStream(filePath);

    stream.on("error", () => res.destroy());
    stream.pipe(res);
  });
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function parsePort(value) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 0 || port > 65535) return null;

  return port;
}

if (require.main === module) {
  const PORT = parsePort(process.argv[2] || process.env.PORT || 8080);
  const HOST = process.env.HOST || "127.0.0.1";

  if (PORT === null) {
    console.error("\n  ❌ Puerto inválido. Usá un número entre 0 y 65535.\n");
    process.exit(1);
  }

  const server = createServer();

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`\n  ❌ El puerto ${PORT} está ocupado. Probá con:  npm start -- 3000\n`);
    } else {
      console.error(`\n  ❌ No se pudo iniciar el servidor: ${error.message}\n`);
    }

    process.exit(1);
  });

  server.listen(PORT, HOST, () => {
    const address = server.address();
    const shownPort = typeof address === "object" && address ? address.port : PORT;
    const shownHost = HOST.includes(":") ? `[${HOST}]` : HOST;

    console.log(`\n  ✅  Lista del súper corriendo en  http://${shownHost}:${shownPort}\n`);
    console.log(`      Serviendo: ${ROOT}`);
    console.log(`      Escuchando en: ${HOST}`);

    if (HOST !== "127.0.0.1" && HOST !== "::1" && HOST !== "localhost") {
      console.warn(
        "      ⚠️  El servidor está expuesto más allá de localhost. Usalo solo en redes de confianza."
      );
    }

    console.log("      Ctrl+C para detenerlo.\n");
  });
}

module.exports = {
  ROOT,
  PUBLIC_FILES,
  PUBLIC_DIRECTORIES,
  SECURITY_HEADERS,
  MIME_TYPES,
  resolvePublicPath,
  createServer
};
