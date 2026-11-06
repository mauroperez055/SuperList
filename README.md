# SuperList — Lista del súper

![Tests](https://github.com/mauroperez055/SuperList/actions/workflows/tests.yml/badge.svg)
[![Demo](https://img.shields.io/badge/demo-online-brightgreen)](https://superlistt.netlify.app/)
[![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-blue.svg)](LICENSE)

Aplicación web para armar la lista del súper: agregás productos, los marcás como
comprados y la lista **se conserva al recargar la página**.

Es una app **100 % estática** —HTML, CSS y JavaScript vanilla— sin build, sin
dependencias y sin backend. Toda la persistencia vive en el navegador.

> **Demo en vivo:** <https://superlistt.netlify.app/>

---

## Probala en 30 segundos

1. Abrí <https://superlistt.netlify.app/>.
2. Agregá tres productos.
3. Marcá uno como comprado y recargá la página: la lista sigue ahí.
4. Abrí la app en otra pestaña y cambiá algo: las dos pestañas se sincronizan.

No hace falta registrarse ni instalar nada.

---

## Stack

| Capa | Tecnología |
|---|---|
| Interfaz | HTML5 + CSS3 (responsive, mobile-first) |
| Lógica | JavaScript vanilla (ES6+), sin frameworks |
| Persistencia | `localStorage` con fallback en memoria |
| Tests | Runner nativo de Node (`node:test`), sin dependencias |
| CI | GitHub Actions (Node 20, 22 y 24) |
| Deploy | Netlify (sitio estático, sin build) |

---

## Funcionalidades

- **Persistencia automática** en `localStorage` después de cada cambio.
- **Marcar como comprado** con checkbox y estilo tachado.
- **Borrar comprados** con un clic (el botón solo aparece si hay algo comprado).
- **Contadores** de pendientes y total, con singular y plural correctos.
- **Sincronización entre pestañas** mediante el evento `storage`.
- **Resiliencia**: si el navegador bloquea `localStorage`, la app sigue funcionando
  en memoria y avisa al usuario en pantalla en vez de perder datos en silencio.
- **Migración de datos**: repara listas guardadas por versiones anteriores
  (ids faltantes o duplicados, nombres inválidos, `done` no booleano).
- **Accesibilidad**: etiquetas `aria-label`, `aria-live` en los contadores y
  navegación por teclado.
- **48 tests** que corren sin navegador y sin dependencias.

---

## Cómo correrlo localmente

Requiere **Node.js 18.13+** (solo para el servidor de desarrollo y los tests;
la app en producción no necesita Node).

```bash
npm start          # servidor local en http://127.0.0.1:8080
```

Si el puerto está ocupado:

```bash
npm start -- 3000
```

> También podés abrir `index.html` con doble clic. Funciona, pero el
> `localStorage` en `file://` depende del navegador; para probar de verdad usá
> `npm start`.

### Tests

```bash
npm test              # corre los 48 tests
npm run test:watch    # modo watch
```

Los tests usan `node:test` y no tienen dependencias externas. Se ejecutan en la
CI en Node 20, 22 y 24.

---

## Arquitectura

La app está dividida en tres capas con responsabilidades separadas. La lógica de
negocio no conoce el DOM ni el almacenamiento, por eso se puede testear sin
navegador.

```
┌──────────────────────────────────────────────────────────┐
│  js/script.js  ·  Capa de interfaz (DOM)                 │
│  Renderiza, escucha eventos y actualiza la UI.           │
│  No tiene lógica de lista ni toca el storage.            │
└────────────────────────┬─────────────────────────────────┘
                         │  store.add() / setDone() / remove()
                         ▼
┌──────────────────────────────────────────────────────────┐
│  js/store.js  ·  Estado + persistencia                   │
│  Carga y guarda en localStorage, notifica suscriptores,  │
│  sincroniza entre pestañas y cae a memoria si falla.     │
└────────────────────────┬─────────────────────────────────┘
                         │  list.addItem() / setDone() / ...
                         ▼
┌──────────────────────────────────────────────────────────┐
│  js/list.js  ·  Lógica de dominio (funciones puras)      │
│  Sin DOM, sin storage, sin aleatoriedad.                 │
│  Recibe un array, devuelve uno nuevo, nunca muta.        │
└──────────────────────────────────────────────────────────┘
```

### Decisiones técnicas

- **Funciones puras en `list.js`**: sin `Date.now()`, sin `Math.random()` y sin
  mutaciones. Cada operación devuelve un array nuevo, lo que hace la lógica
  predecible y trivial de testear.
- **Storage inyectado en `store.js`**: los tests usan un storage en memoria, así
  que corren en Node sin tocar datos reales del navegador.
- **Patrón UMD**: `list.js` y `store.js` se exponen como `window.SuperList` /
  `window.SuperListStore` en el navegador y como `module.exports` en Node. Se
  eligió sobre ES Modules para que la app funcione incluso abriendo el
  `index.html` con `file://` (los ES Modules fallan por CORS).
- **Fallback de almacenamiento**: si `localStorage` lanza excepciones (modo
  incógnito, cookies bloqueadas, cuota excedida), el store usa memoria y la UI
  muestra un aviso visible.
- **Migración defensiva**: `normalizeItems()` sanea cualquier dato guardado antes
  de usarlo, sin necesidad de que el usuario borre nada a mano.
- **Cero dependencias**: no hay `node_modules` ni build. Menos superficie de
  ataque, deploy inmediato y arranque instantáneo.

---

## Estructura del proyecto

```
listaSuperApp/
├── index.html            # Markup y orden de carga de scripts
├── _headers              # Cabeceras de seguridad para Netlify
├── css/
│   └── styles.css        # Estilos y aviso de storage no persistente
├── js/
│   ├── list.js           # Lógica de dominio pura
│   ├── store.js          # Estado + persistencia
│   └── script.js         # Capa DOM
├── scripts/
│   └── serve.js          # Servidor estático de desarrollo (sin dependencias)
├── tests/
│   ├── list.test.js      # 22 tests de la lógica de dominio
│   ├── store.test.js     # 17 tests del store
│   └── serve.test.js     # 9 tests del servidor de desarrollo
├── .github/workflows/
│   └── tests.yml         # CI en Node 20, 22 y 24
├── package.json          # Scripts de npm (start, test)
├── add-to-cart.png       # Favicon
├── LICENSE               # MIT
└── README.md
```

---

## Deploy

La app está desplegada en:

**<https://superlistt.netlify.app/>**

Al ser un sitio estático sin build, el deploy consiste en publicar los archivos
tal cual. Netlify sirve la raíz del repositorio y aplica automáticamente el
archivo [`_headers`](_headers) con las cabeceras de seguridad.

Para replicar el deploy en cualquier hosting estático (Netlify, Vercel, GitHub
Pages, Cloudflare Pages, S3, nginx):

```bash
npm test          # verificá que todo pasa antes de publicar
git add -A
git commit -m "..."
git push
```

### Checklist post-deploy

1. Verificá en Network que `list.js`, `store.js` y `script.js` respondan `200`.
2. Hacé un hard reload (`Ctrl+Shift+R`) para evitar caché de los `.js`.
3. Probá en la URL final: el `localStorage` está separado por origen, así que
   `localhost` y el dominio de producción no comparten datos.
4. Confirmá la persistencia en DevTools → Application → Local Storage → clave
   `super-list`.
5. Verificá las cabeceras de seguridad con `curl -I https://superlistt.netlify.app/`:
   deben aparecer `content-security-policy`, `strict-transport-security`,
   `x-content-type-options`, `x-frame-options`, `referrer-policy` y
   `permissions-policy`.

---

## Seguridad

- **CSP estricta y cabeceras de seguridad en producción** mediante
  [`_headers`](_headers): `Content-Security-Policy`,
  `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy` y `Cross-Origin-*`.
- **CSP de respaldo** en `index.html` para otros hostings estáticos. Si agregás
  scripts, estilos o recursos externos, actualizá la CSP y usá
  `integrity`/`crossorigin` (SRI).
- **Servidor de desarrollo endurecido**: escucha solo en `127.0.0.1`, sirve
  únicamente `index.html`, `css/` y `js/`, acepta solo `GET`/`HEAD` y bloquea
  dotfiles, path traversal y bytes nulos. Para exponerlo en la red local (solo
  en redes de confianza):

  ```bash
  # PowerShell
  $env:HOST="0.0.0.0"; npm start

  # Bash
  HOST=0.0.0.0 npm start
  ```

- **Cero dependencias de producción y cero secretos** en el repositorio. En CI
  las actions están fijadas a commits y el token es de solo lectura.
- La lista vive en `localStorage`: cualquier script del mismo origen o persona
  con acceso al dispositivo puede leerla. **No guardes datos sensibles**
  (contraseñas, datos de tarjetas, etc.).
- Para reportar una vulnerabilidad, usá el
  [aviso privado de seguridad de GitHub](https://github.com/mauroperez055/SuperList/security/advisories/new)
  en lugar de un issue público.

---

## Persistencia

| | |
|---|---|
| **Clave** | `super-list` |
| **Storage** | `localStorage` del navegador (fallback en memoria) |
| **Formato** | JSON: `[{ "id": string, "name": string, "done": boolean }]` |

La lista se guarda después de cada mutación: agregar, marcar, desmarcar,
eliminar o borrar comprados. Si el JSON guardado está corrupto, la app arranca
con la lista vacía en lugar de romperse.

---

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| La lista se reinicia al recargar | `localStorage` bloqueado | Revisá Application → Local Storage y la consola |
| Aparece el aviso "Este navegador no permite guardar la lista" | El navegador bloquea el storage | Permití cookies/storage para el sitio |
| Los cambios no se ven al recargar | Caché del navegador o del CDN | `Ctrl+Shift+R` |
| `Cannot find module '.../tests'` | `node --test tests/` no funciona en Node 22+ | Usá `npm test` |
| El puerto 8080 está ocupado | Otro proceso lo usa | `npm start -- 3000` |

---

## Requisitos

- **Navegador**: Chrome, Edge, Firefox o Safari 14+.
- **Node.js**: 18.13+ solo para desarrollo y tests.

---

## Autor y licencia

Desarrollado por [Mauro Perez](https://github.com/mauroperez055).

[MIT](LICENSE) © 2026 Mauro Perez.
