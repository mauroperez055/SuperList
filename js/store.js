/**
 * store.js — Estado de la lista + persistencia en localStorage.
 *
 * Se encarga de:
 *   - Cargar la lista guardada al crear el store.
 *   - Guardar la lista en el storage después de cada cambio.
 *   - Notificar a los suscriptores (la capa DOM) cuando cambia el estado.
 *   - Caer a un storage en memoria si el navegador no permite localStorage,
 *     de modo que la app siga funcionando aunque no pueda persistir.
 *
 * Se expone como `window.SuperListStore` en el navegador y como
 * `module.exports` en Node (tests).
 */
(function (root, factory) {
  "use strict";

  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./list.js"));
  } else {
    root.SuperListStore = factory(root.SuperList);
  }
})(typeof self !== "undefined" ? self : this, function (list) {
  "use strict";

  const DEFAULT_KEY = "super-list";
  const PROBE_KEY = "__super-list-probe__";

  /* Contador monotónico: garantiza ids únicos incluso cuando el fallback
     aleatorio se repite dentro de la misma sesión. */
  let idCounter = 0;

  /**
   * Genera un id único para un producto.
   * Usa crypto.randomUUID cuando está disponible (solo en contextos
   * seguros) y un fallback en el caso contrario.
   *
   * @returns {string}
   */
  function createId() {
    try {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }
    } catch (error) {
      /* algunos navegadores bloquean crypto en contextos no seguros */
    }

    idCounter += 1;

    return `id-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Storage en memoria. Se usa como fallback cuando localStorage no está
   * disponible: la app funciona, pero la lista no sobrevive a la recarga.
   *
   * @returns {{getItem: Function, setItem: Function, removeItem: Function}}
   */
  function createMemoryStorage() {
    const data = new Map();

    return {
      getItem(key) {
        return data.has(key) ? data.get(key) : null;
      },
      setItem(key, value) {
        data.set(key, String(value));
      },
      removeItem(key) {
        data.delete(key);
      }
    };
  }

  /**
   * Verifica si un storage es usable. localStorage puede lanzar
   * SecurityError incluso al leer la propiedad, por eso todo va protegido.
   *
   * @param {object|null} candidate
   * @returns {{storage: object, persistent: boolean}}
   */
  function resolveStorage(candidate) {
    if (!candidate) {
      return { storage: createMemoryStorage(), persistent: false };
    }

    try {
      candidate.setItem(PROBE_KEY, "1");
      candidate.removeItem(PROBE_KEY);

      return { storage: candidate, persistent: true };
    } catch (error) {
      return { storage: createMemoryStorage(), persistent: false };
    }
  }

  /**
   * Crea el store de la lista.
   *
   * @param {object} [options]
   * @param {object} [options.storage] storage a usar (por defecto localStorage)
   * @param {string} [options.key] clave del storage
   * @param {() => string} [options.createId] generador de ids
   * @returns {object} store
   */
  function createStore(options) {
    const config = options || {};
    const key = typeof config.key === "string" && config.key !== "" ? config.key : DEFAULT_KEY;
    const resolved = resolveStorage(config.storage);
    const storage = resolved.storage;
    const persistent = resolved.persistent;
    const createIdFn = typeof config.createId === "function" ? config.createId : createId;
    const listeners = [];

    let items = [];

    /* --- internas ------------------------------------------------------- */

    function notify() {
      const snapshot = items.slice();

      for (const listener of listeners.slice()) {
        listener(snapshot);
      }
    }

    function readStored() {
      let raw = null;

      try {
        raw = storage.getItem(key);
      } catch (error) {
        return [];
      }

      if (typeof raw !== "string" || raw === "") return [];

      try {
        return list.normalizeItems(JSON.parse(raw), createIdFn);
      } catch (error) {
        /* contenido corrupto: se descarta y se arranca con la lista vacía */
        return [];
      }
    }

    function persist() {
      try {
        storage.setItem(key, JSON.stringify(items));

        return true;
      } catch (error) {
        /* cuota excedida o storage bloqueado: la app sigue en memoria */
        return false;
      }
    }

    /* --- API pública ---------------------------------------------------- */

    /**
     * @returns {Array} copia de la lista actual
     */
    function getItems() {
      return items.slice();
    }

    /**
     * Agrega un producto a la lista y lo persiste.
     *
     * @param {string} name
     * @returns {object|null} el producto creado o null si el nombre no es válido
     */
    function add(name) {
      if (!list.isValidName(name)) return null;

      const item = list.createItem(name, createIdFn());

      items = list.addItem(items, item);
      persist();
      notify();

      return item;
    }

    /**
     * Marca o desmarca un producto como comprado.
     *
     * @param {string} id
     * @param {boolean} done
     * @returns {boolean} true si el producto existía
     */
    function setDone(id, done) {
      if (!list.findItem(items, id)) return false;

      items = list.setDone(items, id, done);
      persist();
      notify();

      return true;
    }

    /**
     * Invierte el estado "comprado" de un producto.
     *
     * @param {string} id
     * @returns {boolean} true si el producto existía
     */
    function toggle(id) {
      if (!list.findItem(items, id)) return false;

      items = list.toggleItem(items, id);
      persist();
      notify();

      return true;
    }

    /**
     * Elimina un producto de la lista.
     *
     * @param {string} id
     * @returns {boolean} true si el producto existía
     */
    function remove(id) {
      if (!list.findItem(items, id)) return false;

      items = list.removeItem(items, id);
      persist();
      notify();

      return true;
    }

    /**
     * Elimina todos los productos comprados.
     *
     * @returns {boolean} true si había algo para borrar
     */
    function clearCompleted() {
      const previousLength = items.length;

      items = list.clearCompleted(items);

      if (items.length === previousLength) return false;

      persist();
      notify();

      return true;
    }

    /**
     * Vuelve a leer el storage. Se usa para sincronizar con otras pestañas.
     */
    function reload() {
      items = readStored();
      notify();
    }

    /**
     * Registra un listener que se llama con la lista cada vez que cambia.
     *
     * @param {(items: Array) => void} listener
     * @returns {() => void} función para desuscribirse
     */
    function subscribe(listener) {
      if (typeof listener !== "function") return () => {};

      listeners.push(listener);

      return () => {
        const index = listeners.indexOf(listener);

        if (index !== -1) listeners.splice(index, 1);
      };
    }

    /* Carga inicial: la lista persistida es la fuente de verdad. */
    items = readStored();

    return {
      getItems,
      add,
      setDone,
      toggle,
      remove,
      clearCompleted,
      reload,
      subscribe,
      isPersistent: () => persistent,
      getKey: () => key
    };
  }

  return {
    DEFAULT_KEY,
    createId,
    createMemoryStorage,
    createStore
  };
});
