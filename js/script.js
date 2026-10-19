(() => {
  "use strict";

  // falta implementar localStorage para que los productos se mantengan al recargar la página
  const localStorageKey = "super-list";

  const form = document.getElementById("item-form");
  const input = document.getElementById("item-input");
  const listContent = document.getElementById("list-content");

  const pendingCount = document.getElementById("pending-count");
  const totalCount = document.getElementById("total-count");
  const clearCompletedButton = document.getElementById("clear-completed");

  let items = [];

  /* agrego los productos a la lista*/
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const itemName = input.value.trim();
    items.push(
      {
        name: itemName,
        done: false
      }
    );

    input.value = "";
    render();
  })


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
    checkButton.setAttribute("aria-label", `Marcar ${item.name}  como comprado`);

    /* cuando se marca el checkbox se actualiza el item y 
    se agrega la clase "done" y viceversa */
    checkButton.addEventListener("change", () => {
      item.done = checkButton.checked;
      render();
    })

    const removeButton = document.createElement("button");
    removeButton.className = "remove";
    removeButton.setAttribute("aria-label", `Eliminar ${item.name}`);
    removeButton.textContent = "×";
    removeButton.addEventListener("click", () => {
      items = items.filter((i) => i !== item);
      render();
    })

    itemLi.append(checkButton, nameItem, removeButton);
    return itemLi;
  }

  function render() {

    if (items.length === 0) {
      pendingCount.textContent = "0 pendientes";
      totalCount.textContent = "0 productos en total";

      const empty = document.createElement("div");
      empty.className = "empty";
      empty.innerHTML =
        '<span class="empty-icon" aria-hidden="true">🛒</span>Tu lista está vacía. Agregá tu primer producto.';
      listContent.replaceChildren(empty);
    } else {
      const pending = items.filter((item) => !item.done).length;

      if (pending === 1) {
        pendingCount.textContent = `${pending} pendiente`;
      } else {
        pendingCount.textContent = `${pending} pendientes`;
      }

      const total = items.length;
      if (total === 1) {
        totalCount.textContent = `${total} producto en total`;
      } else {
        totalCount.textContent = `${total} productos en total`;
      }

      const listItem = document.createElement("ul");
      listItem.className = "items";
      listItem.setAttribute("aria-label", "Lista de productos");
      listItem.append(...items.map(createElement));
      listContent.replaceChildren(listItem);
    }

    clearCompletedButton.hidden = !items.some((item) => item.done);
  }

  clearCompletedButton.addEventListener("click", () => {
    items = items.filter((item) => !item.done);
    render();
  })

  render();
})();