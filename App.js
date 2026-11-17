// ShopEase capstone 鈥� browser-side demo application.
// IMPORTANT: localStorage is for this educational demo, not secure production auth.
const KEYS = {
  products: "shopease_products_v1",
  cart: "shopease_cart_v1",
  user: "shopease_demo_user_v1"
};

const starterProducts = [
  {id:"p1",name:"Everyday Canvas Tote",category:"Accessories",price:599,description:"A lightweight carry-all for busy days.",emoji:"馃憸"},
  {id:"p2",name:"Minimal Desk Lamp",category:"Home",price:1299,description:"Soft lighting for focused evenings.",emoji:"馃挕"},
  {id:"p3",name:"Wireless Earbuds",category:"Tech",price:1899,description:"Compact audio for work and travel.",emoji:"馃帶"},
  {id:"p4",name:"Pastel Notebook Set",category:"Stationery",price:349,description:"A little space for all your ideas.",emoji:"馃搾"},
  {id:"p5",name:"Ceramic Coffee Mug",category:"Home",price:449,description:"A simple favorite for slow mornings.",emoji:"鈽�"},
  {id:"p6",name:"Classic Wrist Watch",category:"Accessories",price:1599,description:"An understated everyday accessory.",emoji:"鈱�"},
  {id:"p7",name:"Portable Bluetooth Speaker",category:"Tech",price:2199,description:"Bring your playlist along.",emoji:"馃攰"},
  {id:"p8",name:"Color Pop Pen Pack",category:"Stationery",price:199,description:"Bright colors for notes and sketches.",emoji:"馃枈锔�"}
];

const $ = selector => document.querySelector(selector);
const productGrid = $("#productGrid");
const searchInput = $("#searchInput");
const categoryFilter = $("#categoryFilter");
const sortSelect = $("#sortSelect");
const productCount = $("#productCount");
const accountModal = $("#accountModal");
const cartModal = $("#cartModal");
const productModal = $("#productModal");
const toast = $("#toast");

let products = readStore(KEYS.products, starterProducts);
let cart = readStore(KEYS.cart, []);
let currentUser = readStore(KEYS.user, null);
let manageMode = false;

function readStore(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : structuredClone(fallback);
  } catch (error) {
    console.warn(`Could not read ${key}`, error);
    return structuredClone(fallback);
  }
}
function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    notify("Browser storage is unavailable. Changes may not persist.");
    console.error(error);
  }
}
function money(value) {
  return new Intl.NumberFormat("en-IN", {style:"currency",currency:"INR",maximumFractionDigits:0}).format(value);
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}
function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 2500);
}
function persistProducts() { writeStore(KEYS.products, products); }
function persistCart() { writeStore(KEYS.cart, cart); }

function renderCategories() {
  const selected = categoryFilter.value || "all";
  const categories = ["all", ...new Set(products.map(p => p.category))];
  categoryFilter.innerHTML = categories.map(c => `<option value="${escapeHTML(c)}">${c === "all" ? "All categories" : escapeHTML(c)}</option>`).join("");
  categoryFilter.value = categories.includes(selected) ? selected : "all";
}
function visibleProducts() {
  const term = searchInput.value.trim().toLowerCase();
  let result = products.filter(p => {
    const matchesTerm = `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(term);
    return matchesTerm && (categoryFilter.value === "all" || p.category === categoryFilter.value);
  });
  if (sortSelect.value === "price-low") result.sort((a,b) => a.price-b.price);
  if (sortSelect.value === "price-high") result.sort((a,b) => b.price-a.price);
  if (sortSelect.value === "name") result.sort((a,b) => a.name.localeCompare(b.name));
  return result;
}
function renderProducts() {
  const list = visibleProducts();
  productCount.textContent = `${list.length} item${list.length === 1 ? "" : "s"} available`;
  if (!list.length) {
    productGrid.innerHTML = `<div class="empty-state"><strong>No products found</strong>Try changing your search or category filter.</div>`;
    return;
  }
  productGrid.innerHTML = list.map(p => `
    <article class="product-card">
      <div class="product-visual">
        <span class="product-category">${escapeHTML(p.category)}</span>
        ${p.image ? `<img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" onerror="this.remove()">` : `<span class="product-emoji" aria-hidden="true">${escapeHTML(p.emoji || "鉁�")}</span>`}
      </div>
      <div class="product-info">
        <strong class="product-title">${escapeHTML(p.name)}</strong>
        <p class="product-description">${escapeHTML(p.description)}</p>
        <div class="product-bottom"><strong class="product-price">${money(p.price)}</strong><button class="add-button" data-add="${escapeHTML(p.id)}" type="button">锛� Add</button></div>
        ${manageMode ? `<div class="manage-actions"><button class="tiny-button" data-edit="${escapeHTML(p.id)}" type="button">Edit</button><button class="tiny-button" data-delete="${escapeHTML(p.id)}" type="button">Delete</button></div>` : ""}
      </div>
    </article>`).join("");
}
function renderCartCount() {
  $("#cartCount").textContent = cart.reduce((sum,item) => sum + item.quantity, 0);
}
function renderCart() {
  const lines = cart.map(item => {
    const p = products.find(product => product.id === item.id);
    return p ? {product:p,quantity:item.quantity} : null;
  }).filter(Boolean);
  const total = lines.reduce((sum,line) => sum + line.product.price * line.quantity, 0);
  $("#cartItems").innerHTML = lines.length ? lines.map(({product,quantity}) => `
    <div class="cart-row">
      <div class="cart-thumb">${escapeHTML(product.emoji || "鉁�")}</div>
      <div class="cart-row-info"><strong>${escapeHTML(product.name)}</strong><small>${money(product.price)} each</small></div>
      <div class="quantity-controls">
        <button type="button" data-quantity="${escapeHTML(product.id)}" data-change="-1" aria-label="Decrease quantity">鈭�</button>
        <span>${quantity}</span>
        <button type="button" data-quantity="${escapeHTML(product.id)}" data-change="1" aria-label="Increase quantity">+</button>
      </div>
    </div>`).join("") : `<div class="empty-state"><strong>Your bag is empty</strong>Add a product to see it here.</div>`;
  $("#cartTotal").textContent = money(total);
  renderCartCount();
}
function updateAccountButton() {
  $("#accountButton").textContent = currentUser ? `Hi, ${currentUser.name}` : "Sign in";
}
function openProductEditor(product = null) {
  $("#productModalTitle").textContent = product ? "Edit product" : "Add a product";
  $("#productId").value = product?.id || "";
  $("#productName").value = product?.name || "";
  $("#productCategory").value = product?.category || "Accessories";
  $("#productPrice").value = product?.price || "";
  $("#productImage").value = product?.image || "";
  $("#productDescription").value = product?.description || "";
  productModal.showModal();
}

// Product catalogue events
searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);
sortSelect.addEventListener("change", renderProducts);

productGrid.addEventListener("click", event => {
  const add = event.target.closest("[data-add]");
  const edit = event.target.closest("[data-edit]");
  const remove = event.target.closest("[data-delete]");
  if (add) {
    const id = add.dataset.add;
    const line = cart.find(item => item.id === id);
    if (line) line.quantity += 1;
    else cart.push({id,quantity:1});
    persistCart(); renderCartCount(); notify("Added to your shopping bag.");
  }
  if (edit) openProductEditor(products.find(p => p.id === edit.dataset.edit));
  if (remove) {
    const product = products.find(p => p.id === remove.dataset.delete);
    if (!product) return;
    if (!confirm(`Delete "${product.name}" from the demo catalogue?`)) return;
    products = products.filter(p => p.id !== product.id);
    cart = cart.filter(item => item.id !== product.id);
    persistProducts(); persistCart(); renderCategories(); renderProducts(); renderCartCount();
    notify("Product deleted.");
  }
});

// Product create/update (CRUD)
$("#manageButton").addEventListener("click", () => {
  manageMode = !manageMode;
  $("#manageButton").textContent = manageMode ? "鉁� Done managing" : "锛� Manage products";
  renderProducts();
  notify(manageMode ? "Management controls enabled." : "Management controls hidden.");
});
$("#productForm").addEventListener("submit", event => {
  event.preventDefault();
  const id = $("#productId").value;
  const name = $("#productName").value.trim();
  const category = $("#productCategory").value;
  const price = Number($("#productPrice").value);
  const image = $("#productImage").value.trim();
  const description = $("#productDescription").value.trim();
  if (!name || !Number.isFinite(price) || price <= 0) {
    notify("Enter a product name and a valid price.");
    return;
  }
  if (image && !/^https?:\/\//i.test(image)) {
    notify("Image URL must begin with http:// or https://.");
    return;
  }
  if (id) {
    const existing = products.find(p => p.id === id);
    if (existing) Object.assign(existing,{name,category,price,image,description});
    notify("Product updated.");
  } else {
    products.unshift({id:`p-${Date.now()}`,name,category,price,image,description,emoji:"鉁�"});
    notify("New product created.");
  }
  persistProducts(); renderCategories(); renderProducts(); productModal.close();
});

// Cart events
$("#cartButton").addEventListener("click", () => { renderCart(); cartModal.showModal(); });
$("#cartItems").addEventListener("click", event => {
  const button = event.target.closest("[data-quantity]");
  if (!button) return;
  const item = cart.find(line => line.id === button.dataset.quantity);
  if (!item) return;
  item.quantity += Number(button.dataset.change);
  if (item.quantity <= 0) cart = cart.filter(line => line !== item);
  persistCart(); renderCart();
});
$("#checkoutButton").addEventListener("click", () => {
  if (!cart.length) { notify("Your bag is empty."); return; }
  cart = []; persistCart(); renderCart(); cartModal.close();
  notify("Demo order placed! No payment was collected.");
});

// Simulated account flow 鈥� intentionally not real authentication.
$("#accountButton").addEventListener("click", () => {
  if (currentUser) {
    if (confirm(`Sign out ${currentUser.name}?`)) {
      currentUser = null; writeStore(KEYS.user,null); updateAccountButton(); notify("Signed out of demo account.");
    }
  } else accountModal.showModal();
});
$("#accountForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("#accountName").value.trim();
  const email = $("#accountEmail").value.trim();
  const passcode = $("#accountPassword").value;
  if (!name || !email || passcode.length < 4) return;
  currentUser = {name,email};
  writeStore(KEYS.user,currentUser);
  accountModal.close(); updateAccountButton(); notify(`Welcome, ${name}! Demo sign-in complete.`);
  $("#accountPassword").value = "";
});

// Close buttons and click-outside behavior
document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => button.closest("dialog").close());
});
[accountModal,cartModal,productModal].forEach(dialog => {
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
});

renderCategories();
renderProducts();
renderCartCount();
updateAccountButton();
