"use strict";

/**
 * Tests del servidor estático de desarrollo (scripts/serve.js).
 *
 * Levanta el servidor en un puerto efímero de loopback y verifica las
 * defensas: allowlist de archivos, bloqueo de traversal/dotfiles/bytes
 * nulos, métodos permitidos y cabeceras de seguridad.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { ROOT, createServer, resolvePublicPath } = require("../scripts/serve.js");

async function withServer(run) {
  const server = createServer();

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    if (typeof server.closeAllConnections === "function") {
      server.closeAllConnections();
    }

    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET / sirve index.html con cabeceras de seguridad", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^text\/html/);
    assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.equal(response.headers.get("cache-control"), "no-store");

    const body = await response.text();

    assert.match(body, /Lista del súper/);
  });
});

test("sirve los recursos públicos (CSS y JS)", async () => {
  await withServer(async (baseUrl) => {
    const css = await fetch(`${baseUrl}/css/styles.css`);
    assert.equal(css.status, 200);
    assert.match(css.headers.get("content-type"), /^text\/css/);

    const js = await fetch(`${baseUrl}/js/script.js`);
    assert.equal(js.status, 200);
    assert.match(js.headers.get("content-type"), /^text\/javascript/);
  });
});

test("HEAD / responde 200 sin cuerpo", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`, { method: "HEAD" });

    assert.equal(response.status, 200);
    assert.equal(await response.text(), "");
  });
});

test("rechaza métodos distintos de GET y HEAD", async () => {
  await withServer(async (baseUrl) => {
    for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
      const response = await fetch(`${baseUrl}/`, { method });

      assert.equal(response.status, 405);
      assert.equal(response.headers.get("allow"), "GET, HEAD");
    }
  });
});

test("bloquea dotfiles y directorios internos", async () => {
  await withServer(async (baseUrl) => {
    const paths = [
      "/.git/config",
      "/.gitignore",
      "/.github/workflows/tests.yml",
      "/package.json",
      "/README.md",
      "/scripts/serve.js",
      "/tests/list.test.js"
    ];

    for (const pathname of paths) {
      const response = await fetch(`${baseUrl}${pathname}`);

      assert.equal(response.status, 404, `${pathname} no debería ser público`);
    }
  });
});

test("bloquea path traversal codificado", async () => {
  await withServer(async (baseUrl) => {
    const responses = await Promise.all([
      fetch(`${baseUrl}/%2e%2e%2fpackage.json`),
      fetch(`${baseUrl}/js/%2e%2e%2fpackage.json`),
      fetch(`${baseUrl}/%2e%2e%5cpackage.json`)
    ]);

    for (const response of responses) {
      assert.equal(response.status, 404);
    }
  });
});

test("rechaza bytes nulos sin tumbar el servidor", async () => {
  await withServer(async (baseUrl) => {
    const badResponse = await fetch(`${baseUrl}/%00`);

    assert.equal(badResponse.status, 400);

    const goodResponse = await fetch(`${baseUrl}/`);
    assert.equal(goodResponse.status, 200);
  });
});

test("devuelve 404 para archivos inexistentes", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/js/no-existe.js`);

    assert.equal(response.status, 404);
  });
});

test("resolvePublicPath solo acepta rutas públicas dentro del proyecto", () => {
  assert.equal(resolvePublicPath("/index.html"), path.join(ROOT, "index.html"));
  assert.equal(resolvePublicPath("/js/script.js"), path.join(ROOT, "js", "script.js"));
  assert.equal(resolvePublicPath("/../package.json"), null);
  assert.equal(resolvePublicPath("/js/../package.json"), null);
  assert.equal(resolvePublicPath("/.git/config"), null);
  assert.equal(resolvePublicPath("/tests/list.test.js"), null);
  assert.equal(resolvePublicPath("C:/Windows/win.ini"), null);
});
