# 🛒 Lista del Súper

![Tests](https://github.com/mauroperez055/SuperList/actions/workflows/tests.yml/badge.svg)
[![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-blue.svg)](LICENSE)

App web estática para armar la lista de la compra. Agregás productos, marcás los que ya
compraste y la lista **se conserva al recargar la página**.

No tiene build, no tiene dependencias, no necesita backend: es HTML + CSS + JavaScript
vanilla y `localStorage`.

---

## ✨ Características

- **Persistencia automática** en `localStorage` después de cada cambio.
- **Marcar como comprado** con checkbox, con estilo tachado.
- **Borrar comprados** de un clic (el botón solo aparece si hay algo comprado).
- **Contadores** de pendientes y total, en singular y plural.
- **Sincronización entre pestañas**: si tenés la app abierta en dos, los cambios se reflejan al instante.
- **Resiliente**: si el navegador bloquea `localStorage`, la app sigue funcionando en memoria y te avisa con un mensaje visible en vez de perder la lista en silencio.
- **Migra datos viejos**: si guardaste una lista con una versión anterior, la repara sola.
- **39 tests** sin dependencias, con el runner nativo de Node.

---

## 🚀 Inicio rápido

```bash
npm install       # no instala nada: no hay dependencias. Es opcional.
npm start         # levanta el servidor local en http://localhost:8080
```

Abrí <http://localhost:8080> en el navegador.

Si el puerto 8080 está ocupado:

```bash
npm start -- 3000
```

> También podés abrir `index.html` directamente (doble click). Funciona, pero el
> `localStorage` en `file://` depende del navegador — para las pruebas usá `npm start`.

---

## 🧱 Arquitectura

La app está dividida en tres capas con responsabilidades separadas. La lógica de negocio
no sabe nada del DOM ni del almacenamiento, así que se puede testear sin navegador.

```
┌─────────────────────────────────────────────────────────┐
│  js/script.js  ·  Capa de interfaz (DOM)                │
│  Renderiza la lista, escucha eventos, Actualiza la UI.   │
│  No contiene lógica de lista ni accede al storage.       │
└───────────────────────┬─────────────────────────────────┘
                        │  store.add() / store.setDone() / store.remove()
                        ▼
┌─────────────────────────────────────────────────────────┐
│  js/store.js  ·  Estado + persistencia                   │
│  Carga y guarda en localStorage, notifica a los         │
│  suscriptores, sincroniza entre pestañas.                │
└───────────────────────┬─────────────────────────────────┘
                        │  list.addItem() / list.setDone() / ...
                        ▼
┌─────────────────────────────────────────────────────────┐
│  js/list.js  ·  Lógica de dominio (funciones puras)      │
│  Sin DOM, sin storage, sin aleatoriedad.                 │
│  Recibe un array, devuelve uno nuevo, nunca muta.        │
└─────────────────────────────────────────────────────────┘
```

### Por qué en ese orden

- `list.js` es **puro**: sin `Date.now()`, sin `Math.random()`, sin efectos. Por eso el
  resultado de cada función es predecible y se puede verificar con un `assert`.
- `store.js` es el **único** que habla con `localStorage`. Además, el storage se le
  **inyecta**, así que los tests pueden correr en Node con un storage falso.
- `script.js` solo se ocupa de pintar y de escuchar.

### Formato de los módulos

`list.js` y `store.js` usan un patrón **UMD**: se exponen como `window.SuperList` y
`window.SuperListStore` en el navegador, y como `module.exports` en Node.

Se eligió UMD en lugar de ES Modules a propósito: los ES Modules fallan con `file://`
(CORS), y con UMD la app funciona incluso si abrís el `index.html` con doble click.

> **Si tocás `js/list.js` o `js/store.js`**, mantené el orden de los `<script>` en
> `index.html`: `list.js` → `store.js` → `script.js`.

---

## 📁 Estructura del proyecto

```
listaSuperApp/
├── index.html            # Markup + orden de carga de los scripts
├── package.json          # Scripts de npm (start, test)
├── .gitignore
├── LICENSE               # MIT
├── add-to-cart.png       # Favicon
├── css/
│   └── styles.css        # Estilos (incluye el aviso de storage no persistente)
├── js/
│   ├── list.js           # Lógica de dominio pura
│   ├── store.js          # Estado + persistencia
│   └── script.js         # Capa DOM
├── scripts/
│   └── serve.js          # Servidor estático de desarrollo (sin dependencias)
└── tests/
    ├── list.test.js      # 22 tests de la lógica de dominio
    └── store.test.js     # 17 tests del store
```

---

## 💾 Persistencia

### Clave y formato

| | |
|---|---|
| **Clave** | `super-list` |
| **Origen** | `localStorage` del navegador |
| **Formato** | JSON: `[{ "id": string, "name": string, "done": boolean }]` |

Ejemplo:

```json
[
  { "id": "3f9c1e40-...", "name": "Leche", "done": false },
  { "id": "8b2a77d1-...", "name": "Huevos", "done": true }
]
```

### Qué se guarda

La lista se persiste después de **cada** mutación: agregar un producto, marcarlo como
comprado, eliminarlo o borrar los comprados.

### Cuando `localStorage` no está disponible

`localStorage` puede lanzar excepciones (modo incógnito en Safari, cookies bloqueadas,
iframes sin permisos, cuota excedida). En ese caso:

1. El store cae automáticamente a un **storage en memoria**.
2. La app **sigue funcionando** (agregar, marcar, eliminar), pero sin persistencia.
3. Aparece un **aviso visible** en la tarjeta: *"Este navegador no permite guardar la lista,
   así que se pierde al recargar la página."*

### Migración de datos anteriores

`list.normalizeItems()` repara automáticamente lo que haya en `localStorage`:

- Descarta entradas inválidas o con el nombre vacío.
- Normaliza los nombres (recorta espacios, colapsa los internos).
- Fuerza `done` a booleano.
- **Asigna `id` a los productos que no lo tengan** (listas guardadas por versiones previas).
- Desduplica ids repetidos.

No hace falta borrar nada a mano.

### Sincronización entre pestañas

`js/script.js` escucha el evento `storage` de la ventana. Cuando otra pestaña modifica la
clave `super-list`, esta llama a `store.reload()` y se actualiza al instante.

---

## 🧪 Tests

```bash
npm test              # corre todos los tests
npm run test:watch    # modo watch: re-corre al guardar un archivo
```

Usan el **runner nativo de Node** (`node:test`), sin dependencias externas.

> **Nota de versión:** el comando es `node --test` (sin argumentos). A partir de Node v22
> los directorios ya no se expanden, así que `node --test tests/` **no funciona** en
> Node 22+ — usa `npm test` o `node --test`.

### Qué cubren

**`tests/list.test.js` — 22 tests**

- Normalización de nombres (espacios, tabs, saltos de línea, largo máximo de 80).
- Validación de nombres vacíos o con solo espacios.
- Creación de productos (`createItem`).
- `addItem`, `setDone`, `toggleItem`, `removeItem`, `clearCompleted`.
- `countPending` y `countTotal`.
- Búsqueda por id (`findItem`, `findIndexById`).
- `normalizeItems`: reparación de datos corruptos, ids faltantes e ids duplicados.
- **Inmutabilidad**: ninguna función muta el array que recibe.

**`tests/store.test.js` — 17 tests**

- Persistencia real (con un storage en memoria inyectado).
- Carga de la lista guardada al crear el store.
- Notificación a los suscriptores y `unsubscribe`.
- `reload()` para sincronizar con otra pestaña.
- JSON corrupto → arranca con la lista vacía.
- `localStorage` inexistente o que lanza errores → la app no se rompe.
- `getItems()` devuelve una copia, no el estado interno.

### Ejemplo de un test

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const list = require("../js/list.js");

test("addItem agrega al final sin mutar el array original", () => {
  const original = [list.createItem("Leche", "id-1")];
  const result = list.addItem(original, list.createItem("Huevos", "id-2"));

  assert.equal(original.length, 1);
  assert.equal(result.length, 2);
});
```

---

## 🌐 Deploy

No hay build: **subís los archivos tal cual** a cualquier hosting estático
(GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3, o cualquier servidor con nginx).

```bash
npm test          # verificá que todo pasa antes de subir
git add -A
git commit -m "..."
git push
```

### Checklist post-deploy

1. **Verificá los 3 scripts** en la pestaña Network: `list.js`, `store.js` y `script.js`
   deben responder `200`. Si `list.js` da `404`, falta subirlo.
2. **Hard reload** (`Ctrl+Shift+R`) — los navegadores cachean los `.js` con agresividad.
   Si aun así sigue sirviendo la versión vieja, agregá un query param: `?v=2`.
3. **Probá en la URL final**, no en `localhost`. El `localStorage` está particionado por
   origen: `localhost:8080` y `tudominio.com` son datos **distintos**.
4. **Verificá la persistencia**: F12 → Application → Local Storage → tu dominio → debe
   aparecer la clave `super-list`.

### Archivos que NO affectan al sitio

`tests/`, `scripts/`, `package.json` y `.gitignore` no se usan en producción. Podés
excluirlos del deploy si tu hosting lo permite.

---

## 🐛 Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| La lista se reinicia al recargar | `localStorage` bloqueado o no se guardó | Revisá Application → Local Storage y la Console |
| Aparece el aviso amarillo "Este navegador no permite guardar la lista" | El navegador bloquea el almacenamiento | Permití cookies/storage para el sitio |
| Los cambios no se ven al recargar | Caché del navegador o del CDN | `Ctrl+Shift+R` o bump de versión en el `src` |
| `Cannot find module '.../tests'` | `node --test tests/` ya no funciona en Node 22+ | Usá `npm test` |
| `El puerto 8080 está ocupado` | Otro proceso lo usa | `npm start -- 3000` |
| Los datos no aparecen en el dominio final | Probaste en `localhost` | Probá en la URL real: el storage es por origen |

---

## ✅ Requisitos

- **Navegador**: cualquier navegador moderno (Chrome, Edge, Firefox, Safari 14+).
- **Node.js**: 18.13 o superior — solo para desarrollo y para correr los tests.
  La app en producción no necesita Node.

---

## 📄 Licencia

[MIT](LICENSE) © 2026 Mauro Perez

---

## 👤 Autor

Desarrollado por [Mauro Perez](https://github.com/mauroperez055) — <span>SuperListt</span>
