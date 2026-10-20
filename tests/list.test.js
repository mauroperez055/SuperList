"use strict";

/**
 * Tests de la lógica de dominio (js/list.js).
 * No dependen del DOM ni del navegador: `npm test`
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const list = require("../js/list.js");

/* Generador de ids determinista para poder verificar los resultados exactos. */
function createCounter() {
  let counter = 0;

  return () => `id-${++counter}`;
}

test("normalizeName recorta extremos y colapsa espacios internos", () => {
  assert.equal(list.normalizeName("  Leche   entera  "), "Leche entera");
  assert.equal(list.normalizeName("Yogur"), "Yogur");
  assert.equal(list.normalizeName("Pan\tde\nmiel"), "Pan de miel");
});

test("normalizeName recorta al largo máximo permitido", () => {
  const result = list.normalizeName("a".repeat(150));

  assert.equal(result.length, list.MAX_NAME_LENGTH);
  assert.equal(list.MAX_NAME_LENGTH, 80);
});

test("normalizeName tolera valores que no son strings", () => {
  assert.equal(list.normalizeName(undefined), "");
  assert.equal(list.normalizeName(null), "");
  assert.equal(list.normalizeName(42), "");
  assert.equal(list.normalizeName({}), "");
});

test("isValidName distingue nombres utilizables de los vacíos", () => {
  assert.equal(list.isValidName("Leche"), true);
  assert.equal(list.isValidName("   "), false);
  assert.equal(list.isValidName(""), false);
  assert.equal(list.isValidName(undefined), false);
});

test("createItem normaliza el nombre y arranca sin comprar", () => {
  const item = list.createItem("  Leche  ", "id-1");

  assert.deepEqual(item, { id: "id-1", name: "Leche", done: false });
});

test("addItem agrega al final sin mutar el array original", () => {
  const original = [list.createItem("Leche", "id-1")];
  const result = list.addItem(original, list.createItem("Huevos", "id-2"));

  assert.equal(original.length, 1);
  assert.equal(result.length, 2);
  assert.equal(result[0].name, "Leche");
  assert.equal(result[1].name, "Huevos");
  assert.equal(result[1].done, false);
});

test("addItem ignora productos sin nombre válido", () => {
  const original = [list.createItem("Leche", "id-1")];
  const result = list.addItem(original, list.createItem("   ", "id-2"));

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "Leche");
});

test("addItem ignora productos sin id", () => {
  const result = list.addItem([], { id: "", name: "Leche" });

  assert.equal(result.length, 0);
});

test("addItem normaliza el nombre del producto agregado", () => {
  const result = list.addItem([], { id: "id-1", name: "  Leche   entera  " });

  assert.equal(result[0].name, "Leche entera");
});

test("setDone marca como comprado sin mutar el original", () => {
  const original = [list.createItem("Leche", "id-1")];
  const result = list.setDone(original, "id-1", true);

  assert.equal(original[0].done, false);
  assert.equal(result[0].done, true);
  assert.equal(result[0].name, "Leche");
});

test("setDone desmarca cuando recibe false", () => {
  const original = [{ ...list.createItem("Leche", "id-1"), done: true }];
  const result = list.setDone(original, "id-1", false);

  assert.equal(result[0].done, false);
});

test("setDone no hace nada con un id inexistente", () => {
  const original = [list.createItem("Leche", "id-1")];
  const result = list.setDone(original, "no-existe", true);

  assert.equal(result.length, 1);
  assert.equal(result[0].done, false);
});

test("toggleItem invierte el estado comprado", () => {
  const original = [list.createItem("Leche", "id-1")];
  const once = list.toggleItem(original, "id-1");
  const twice = list.toggleItem(once, "id-1");

  assert.equal(original[0].done, false);
  assert.equal(once[0].done, true);
  assert.equal(twice[0].done, false);
});

test("removeItem elimina únicamente el producto indicado", () => {
  const original = [list.createItem("Leche", "id-1"), list.createItem("Huevos", "id-2")];
  const result = list.removeItem(original, "id-1");

  assert.equal(original.length, 2);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "id-2");
});

test("removeItem con un id inexistente deja la lista igual", () => {
  const original = [list.createItem("Leche", "id-1")];
  const result = list.removeItem(original, "no-existe");

  assert.equal(result.length, 1);
});

test("clearCompleted deja solo los pendientes", () => {
  const items = [
    list.createItem("Leche", "id-1"),
    { ...list.createItem("Huevos", "id-2"), done: true },
    { ...list.createItem("Pan", "id-3"), done: true }
  ];
  const result = list.clearCompleted(items);

  assert.equal(items.length, 3);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, "Leche");
});

test("countPending y countTotal calculan los totales", () => {
  const items = [
    list.createItem("Leche", "id-1"),
    { ...list.createItem("Huevos", "id-2"), done: true }
  ];

  assert.equal(list.countPending(items), 1);
  assert.equal(list.countTotal(items), 2);
  assert.equal(list.countPending([]), 0);
  assert.equal(list.countTotal([]), 0);
});

test("findItem y findIndexById localizan por id", () => {
  const items = [list.createItem("Leche", "id-1"), list.createItem("Huevos", "id-2")];

  assert.equal(list.findItem(items, "id-2").name, "Huevos");
  assert.equal(list.findIndexById(items, "id-2"), 1);
  assert.equal(list.findItem(items, "no-existe"), undefined);
  assert.equal(list.findIndexById(items, "no-existe"), -1);
});

test("normalizeItems repara datos guardados por versiones anteriores", () => {
  const createId = createCounter();
  const result = list.normalizeItems(
    [
      { name: "  Leche  " },
      { name: "Huevos", done: true, id: "abc" },
      { name: "   " },
      null,
      "no soy un objeto",
      { sinNombre: true }
    ],
    createId
  );

  assert.equal(result.length, 2);
  assert.equal(result[0].name, "Leche");
  assert.equal(result[0].done, false);
  assert.equal(typeof result[0].id, "string");
  assert.equal(result[1].id, "abc");
  assert.equal(result[1].done, true);
});

test("normalizeItems genera ids únicos cuando vienen repetidos", () => {
  const createId = createCounter();
  const result = list.normalizeItems(
    [
      { name: "Leche", id: "dup" },
      { name: "Huevos", id: "dup" }
    ],
    createId
  );

  assert.equal(result.length, 2);
  assert.equal(result[0].id, "dup");
  assert.notEqual(result[1].id, "dup");
});

test("normalizeItems ignora valores que no son arrays", () => {
  const createId = createCounter();

  assert.deepEqual(list.normalizeItems(null, createId), []);
  assert.deepEqual(list.normalizeItems(undefined, createId), []);
  assert.deepEqual(list.normalizeItems({ name: "Leche" }, createId), []);
  assert.deepEqual(list.normalizeItems("texto", createId), []);
});

test("las funciones puras no mutan los arrays que reciben", () => {
  const original = [list.createItem("Leche", "id-1")];
  const snapshot = JSON.stringify(original);

  list.addItem(original, list.createItem("Huevos", "id-2"));
  list.setDone(original, "id-1", true);
  list.toggleItem(original, "id-1");
  list.removeItem(original, "id-1");
  list.clearCompleted(original);

  assert.equal(JSON.stringify(original), snapshot);
});
