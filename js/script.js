/**
 * script.js — Capa de interfaz: conecta el DOM con el store.
 *
 * No contiene lógica de lista ni acceso directo al storage: todo eso vive
 * en `list.js` y `store.js`.
 */
(function () {
  "use strict";

  const SuperListStore = window.SuperListStore;

  if (!SuperListStore) {
    console.error("[super-list] No se pudo cargar js/store.js. Revisá el orden de los scripts.");
    return;
  }

  const form = document.getElementById("item-form");
  const input = document.getElementById("item-input");
  const listContent = document.getElementById("list-content");

  const pendingCount = document.getElementById("pending-count");
  const totalCount = document.getElementById("total-count");
  const clearCompletedButton = document.getElementById("clear-completed");
  const storageWarning = document.getElementById("storage-warning");

  /* Acceder a window.localStorage puede lanzar SecurityError si el navegador
     tiene las cookies bloqueadas, por eso va protegido. */
  function getLocalStorage() {
    try {
      return window.localStorage;
    } catch (error) {
      return null;
    }
  }

  const store = SuperListStore.createStore({
    storage: getLocalStorage()
  });

  store.subscribe(render);

  /* --- Acciones --------------------------------------------------------- */

  /* agrego los productos a la lista */
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const added = store.add(input.value);

    if (!added) {
      input.focus();
      return;
    }

    input.value = "";
    input.focus();
  });

  clearCompletedButton.addEventListener("click", () => {
    store.clearCompleted();
  });

  /* Mantiene la lista sincronizada si la app está abierta en más de una
     pestaña: el evento `storage` se dispara en las otras pestañas cuando
     una de ellas modifica la clave. */
  window.addEventListener("storage", (event) => {
    if (event.key !== store.getKey()) return;

    store.reload();
  });

  /* --- Render ----------------------------------------------------------- */

  function createElement(item) {
    const itemLi = document.createElement("li");
    itemLi.className = "item";

    const nameItem = document.createElement("span");
    nameItem.className = "item-name";
    nameItem.textContent = item.name;
    nameItem.classList.toggle("done", item.done);

    const checkButton = document.createElement("input");
    checkButton.checked = item.done;
    checkButton.className = "check-item";
    checkButton.type = "checkbox";
    checkButton.setAttribute("aria-label", `Marcar ${item.name} como comprado`);

    /* cuando se marca el checkbox se actualiza el item y
    se agrega la clase "done" y viceversa */
    checkButton.addEventListener("change", () => {
      store.setDone(item.id, checkButton.checked);
    });

    const removeButton = document.createElement("button");
    removeButton.className = "remove";
    removeButton.setAttribute("aria-label", `Eliminar ${item.name}`);
    removeButton.textContent = "×";

    removeButton.addEventListener("click", () => {
      store.remove(item.id);
    });

    itemLi.append(checkButton, nameItem, removeButton);
    return itemLi;
  }

  function render(items) {
    const total = items.length;
    const pending = items.filter((item) => !item.done).length;

    pendingCount.textContent = pending === 1 ? "1 pendiente" : `${pending} pendientes`;
    totalCount.textContent = total === 1 ? "1 producto en total" : `${total} productos en total`;

    if (total === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.innerHTML =
        '<span class="empty-icon" aria-hidden="true">🛒</span>Tu lista está vacía. Agregá tu primer producto.';
      listContent.replaceChildren(empty);
    } else {
      const listItem = document.createElement("ul");
      listItem.className = "items";
      listItem.setAttribute("aria-label", "Lista de productos");
      listItem.append(...items.map(createElement));
      listContent.replaceChildren(listItem);
    }

    clearCompletedButton.hidden = !items.some((item) => item.done);
  }

  /* --- Estado inicial --------------------------------------------------- */

  render(store.getItems());

  /* Si el navegador no permite guardar en localStorage, avisamos al usuario
     en lugar de dejarle descubrir que la lista se pierde al recargar. */
  if (!store.isPersistent()) {
    console.warn(
      "[super-list] localStorage no está disponible: la lista no se conservará al recargar la página."
    );

    if (storageWarning) {
      storageWarning.hidden = false;
    }
  }
})();
