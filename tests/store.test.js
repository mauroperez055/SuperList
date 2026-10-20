"use strict";

/**
 * Tests del store (js/store.js).
 *
 * El storage se inyecta, así que los tests corren en Node sin navegador
 * y sin tocar el localStorage real del usuario.
 *
 * `npm test`
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { createStore, createMemoryStorage, DEFAULT_KEY } = require("../js/store.js");

/** Crea un store con storage en memoria y ids deterministas. */
function setup() {
  const storage = createMemoryStorage();
  let counter = 0;

  const store = createStore({
    storage,
    createId: () => `id-${++counter}`
  });

  return { storage, store };
}

test("agregar un producto lo guarda en el storage", () => {
  const { storage, store } = setup();

  const added = store.add("Leche");

  assert.equal(added.name, "Leche");
  assert.equal(added.done, false);

  const saved = JSON.parse(storage.getItem(DEFAULT_KEY));

  assert.equal(saved.length, 1);
  assert.equal(saved[0].name, "Leche");
});

test("al crear el store se carga la lista que ya estaba guardada", () => {
  const storage = createMemoryStorage();

  storage.setItem(
    DEFAULT_KEY,
    JSON.stringify([
      { id: "x", name: "Leche", done: false },
      { id: "y", name: "Huevos", done: true }
    ])
  );

  const store = createStore({ storage });

  assert.equal(store.getItems().length, 2);
  assert.equal(store.getItems()[0].name, "Leche");
  assert.equal(store.getItems()[1].done, true);
});

test("no se guardan productos con nombre vacío", () => {
  const { storage, store } = setup();

  assert.equal(store.add("   "), null);
  assert.equal(store.add(""), null);
  assert.equal(store.getItems().length, 0);
  assert.equal(storage.getItem(DEFAULT_KEY), null);
});

test("setDone marca un producto como comprado y lo persiste", () => {
  const { storage, store } = setup();
  const item = store.add("Leche");

  assert.equal(store.setDone(item.id, true), true);
  assert.equal(store.getItems()[0].done, true);
  assert.equal(JSON.parse(storage.getItem(DEFAULT_KEY))[0].done, true);
});

test("toggle invierte el estado comprado", () => {
  const { store } = setup();
  const item = store.add("Leche");

  store.toggle(item.id);
  assert.equal(store.getItems()[0].done, true);

  store.toggle(item.id);
  assert.equal(store.getItems()[0].done, false);
});

test("remove elimina un producto y lo persiste", () => {
  const { storage, store } = setup();
  const item = store.add("Leche");

  assert.equal(store.remove(item.id), true);
  assert.equal(store.getItems().length, 0);
  assert.equal(JSON.parse(storage.getItem(DEFAULT_KEY)).length, 0);
});

test("las operaciones sobre ids inexistentes no modifican la lista", () => {
  const { store } = setup();

  store.add("Leche");

  assert.equal(store.setDone("no-existe", true), false);
  assert.equal(store.toggle("no-existe"), false);
  assert.equal(store.remove("no-existe"), false);
  assert.equal(store.getItems().length, 1);
  assert.equal(store.getItems()[0].done, false);
});

test("clearCompleted borra solo los productos comprados", () => {
  const { store } = setup();
  const leche = store.add("Leche");
  const huevos = store.add("Huevos");

  store.setDone(huevos.id, true);

  assert.equal(store.clearCompleted(), true);
  assert.equal(store.getItems().length, 1);
  assert.equal(store.getItems()[0].id, leche.id);
});

test("clearCompleted devuelve false cuando no hay nada comprado", () => {
  const { store } = setup();

  store.add("Leche");

  assert.equal(store.clearCompleted(), false);
  assert.equal(store.getItems().length, 1);
});

test("los suscriptores reciben la lista cuando cambia el estado", () => {
  const { store } = setup();
  const received = [];

  store.subscribe((items) => received.push(items.map((item) => item.name)));

  store.add("Leche");
  store.add("Huevos");

  assert.equal(received.length, 2);
  assert.deepEqual(received[0], ["Leche"]);
  assert.deepEqual(received[1], ["Leche", "Huevos"]);
});

test("unsubscribe deja de recibir notificaciones", () => {
  const { store } = setup();
  const received = [];

  const unsubscribe = store.subscribe(() => received.push(1));

  store.add("Leche");
  unsubscribe();
  store.add("Huevos");

  assert.equal(received.length, 1);
});

test("reload sincroniza los cambios que hizo otra pestaña", () => {
  const { storage, store } = setup();

  store.add("Leche");

  /* simula otra pestaña que escribió en el mismo storage */
  storage.setItem(
    DEFAULT_KEY,
    JSON.stringify([{ id: "z", name: "Huevos", done: true }])
  );

  store.reload();

  assert.equal(store.getItems().length, 1);
  assert.equal(store.getItems()[0].name, "Huevos");
  assert.equal(store.getItems()[0].done, true);
});

test("si el JSON guardado está corrupto arranca con la lista vacía", () => {
  const storage = createMemoryStorage();

  storage.setItem(DEFAULT_KEY, "{ esto no es json");

  const store = createStore({ storage });

  assert.deepEqual(store.getItems(), []);
});

test("si el storage no está disponible la app sigue funcionando en memoria", () => {
  const store = createStore({ storage: null });

  assert.equal(store.isPersistent(), false);

  store.add("Leche");

  assert.equal(store.getItems().length, 1);
});

test("un storage que lanza errores no rompe la app", () => {
  const brokenStorage = {
    getItem() {
      throw new Error("boom");
    },
    setItem() {
      throw new Error("boom");
    },
    removeItem() {
      throw new Error("boom");
    }
  };

  const store = createStore({ storage: brokenStorage });

  assert.equal(store.isPersistent(), false);

  const added = store.add("Leche");

  assert.equal(added.name, "Leche");
  assert.equal(store.getItems().length, 1);
});

test("isPersistent y getKey exponen la configuración del store", () => {
  const { storage } = setup();
  const store = createStore({ storage, key: "mi-clave" });

  assert.equal(store.isPersistent(), true);
  assert.equal(store.getKey(), "mi-clave");
});

test("getItems devuelve una copia, no el estado interno", () => {
  const { store } = setup();

  store.add("Leche");

  const items = store.getItems();

  items.push({ id: "hack", name: "Intruso", done: false });

  assert.equal(store.getItems().length, 1);
});
