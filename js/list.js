/**
 * list.js — Lógica de dominio pura de la lista del súper.
 *
 * Reglas de este módulo:
 *   - Sin DOM.
 *   - Sin localStorage.
 *   - Sin Date.now(), Math.random() ni ninguna otra fuente de aleatoriedad:
 *     el id de cada producto lo genera quien llama (el store).
 *   - Las funciones nunca mutan los arrays que reciben: devuelven uno nuevo.
 *
 * Esto permite testear toda la lógica de la lista sin depender del navegador.
 *
 * Se expone como `window.SuperList` en el navegador y como `module.exports`
 * en Node (tests).
 */
(function (root, factory) {
  "use strict";

  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SuperList = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const MAX_NAME_LENGTH = 80;

  /**
   * Normaliza el texto de un producto: recorta los extremos, colapsa los
   * espacios internos en uno solo y limita el largo máximo.
   *
   * @param {unknown} name
   * @returns {string}
   */
  function normalizeName(name) {
    if (typeof name !== "string") return "";

    return name.trim().replace(/\s+/g, " ").slice(0, MAX_NAME_LENGTH);
  }

  /**
   * Indica si un nombre de producto es utilizable.
   *
   * @param {unknown} name
   * @returns {boolean}
   */
  function isValidName(name) {
    return normalizeName(name) !== "";
  }

  /**
   * Crea un producto nuevo, siempre sin marcar.
   * El id lo provee el llamador para que esta función siga siendo pura.
   *
   * @param {unknown} name
   * @param {string|number} id
   * @returns {{id: string, name: string, done: boolean}}
   */
  function createItem(name, id) {
    return {
      id: String(id),
      name: normalizeName(name),
      done: false
    };
  }

  /**
   * @param {unknown} items
   * @param {string} id
   * @returns {number} índice del producto o -1
   */
  function findIndexById(items, id) {
    if (!Array.isArray(items)) return -1;

    return items.findIndex((item) => item && item.id === id);
  }

  /**
   * @param {unknown} items
   * @param {string} id
   * @returns {object|undefined}
   */
  function findItem(items, id) {
    const index = findIndexById(items, id);

    return index === -1 ? undefined : items[index];
  }

  /**
   * Agrega un producto al final de la lista.
   * Si el producto es inválido (sin id o sin nombre utilizable) la lista
   * se devuelve sin cambios.
   *
   * @param {Array} items
   * @param {{id: string, name: string, done?: boolean}} item
   * @returns {Array} nueva lista
   */
  function addItem(items, item) {
    if (!Array.isArray(items)) return [];

    if (!item || typeof item.id !== "string" || item.id === "") {
      return items.slice();
    }

    if (!isValidName(item.name)) {
      return items.slice();
    }

    return [
      ...items,
      {
        id: item.id,
        name: normalizeName(item.name),
        done: Boolean(item.done)
      }
    ];
  }

  /**
   * Marca o desmarca un producto como comprado.
   *
   * @param {Array} items
   * @param {string} id
   * @param {boolean} done
   * @returns {Array} nueva lista
   */
  function setDone(items, id, done) {
    if (!Array.isArray(items)) return [];

    const index = findIndexById(items, id);

    if (index === -1) return items.slice();

    const next = items.slice();
    next[index] = { ...next[index], done: Boolean(done) };

    return next;
  }

  /**
   * Invierte el estado "comprado" de un producto.
   *
   * @param {Array} items
   * @param {string} id
   * @returns {Array} nueva lista
   */
  function toggleItem(items, id) {
    const item = findItem(items, id);

    if (!item) {
      return Array.isArray(items) ? items.slice() : [];
    }

    return setDone(items, id, !item.done);
  }

  /**
   * Elimina un producto de la lista.
   *
   * @param {Array} items
   * @param {string} id
   * @returns {Array} nueva lista
   */
  function removeItem(items, id) {
    if (!Array.isArray(items)) return [];

    return items.filter((item) => item && item.id !== id);
  }

  /**
   * Elimina todos los productos ya comprados.
   *
   * @param {Array} items
   * @returns {Array} nueva lista
   */
  function clearCompleted(items) {
    if (!Array.isArray(items)) return [];

    return items.filter((item) => item && !item.done);
  }

  /**
   * Cantidad de productos pendientes (no comprados).
   *
   * @param {Array} items
   * @returns {number}
   */
  function countPending(items) {
    if (!Array.isArray(items)) return 0;

    return items.filter((item) => item && !item.done).length;
  }

  /**
   * Cantidad total de productos.
   *
   * @param {Array} items
   * @returns {number}
   */
  function countTotal(items) {
    if (!Array.isArray(items)) return 0;

    return items.length;
  }

  /**
   * Repara y normaliza los datos guardados en el storage.
   *
   * Descarta las entradas inválidas, normaliza los nombres, fuerza el tipo
   * booleano de `done` y asigna ids a los productos que no los tengan
   * (por ejemplo, listas guardadas por una versión anterior de la app).
   *
   * @param {unknown} raw
   * @param {() => string} createId generador de ids
   * @returns {Array} lista válida
   */
  function normalizeItems(raw, createId) {
    if (!Array.isArray(raw)) return [];

    const makeId = typeof createId === "function" ? createId : () => "";
    const usedIds = new Set();
    const result = [];

    for (const entry of raw) {
      if (!entry || typeof entry !== "object" || typeof entry.name !== "string") continue;

      const name = normalizeName(entry.name);

      if (name === "") continue;

      const baseId = typeof entry.id === "string" && entry.id !== "" ? entry.id : makeId();
      let id = baseId;
      let suffix = 0;

      while (usedIds.has(id)) {
        suffix += 1;
        id = `${baseId}-${suffix}`;
      }

      usedIds.add(id);
      result.push({ id, name, done: Boolean(entry.done) });
    }

    return result;
  }

  return {
    MAX_NAME_LENGTH,
    normalizeName,
    isValidName,
    createItem,
    findIndexById,
    findItem,
    addItem,
    setDone,
    toggleItem,
    removeItem,
    clearCompleted,
    countPending,
    countTotal,
    normalizeItems
  };
});
