const CART_KEY = "apple-store-cart";
const PROFILE_KEY = "apple-store-profile";
const SESSION_KEY = "apple-store-session";
const products = {
  iphone18: { price: 1199, finish: "Silver" },
  watch12: { price: 399, finish: "Jet Black" },
  macmini: { price: 699, finish: "Silver" },
  airpods5: { price: 129, finish: "White" }
};
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const searchPanel = document.querySelector(".search-panel");
document.querySelector(".search-toggle")?.addEventListener("click", () => {
  searchPanel?.classList.toggle("open");
  if (searchPanel?.classList.contains("open")) searchPanel.querySelector("input")?.focus();
});
document.querySelector(".close-search")?.addEventListener("click", () => {
  searchPanel?.classList.remove("open");
  document.querySelector(".search-toggle")?.focus();
});

document.querySelectorAll(".carousel-arrow").forEach((button) => {
  button.addEventListener("click", () => {
    const rail = document.querySelector(".product-rail");
    const card = rail?.querySelector(".product-card");
    if (rail && card) rail.scrollBy({ left: (button.dataset.scroll === "next" ? 1 : -1) * (card.offsetWidth + 22), behavior: "smooth" });
  });
});

const readCart = () => JSON.parse(localStorage.getItem(CART_KEY) || "{}");
const writeCart = (cart) => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCart();
};

function updateCart() {
  let cart = {};
  try {
    cart = readCart();
  } catch (error) {
    console.error("Could not read the saved shopping bag.", error);
  }

  const entries = Object.entries(cart).filter(([id, item]) =>
    products[id] && Number.isInteger(item?.quantity) && item.quantity > 0
  );
  document.querySelectorAll(".cart-count").forEach((badge) => {
    badge.textContent = String(entries.reduce((count, [, item]) => count + item.quantity, 0));
  });

  const rows = document.querySelectorAll("[data-cart-item]");
  let subtotal = 0;
  rows.forEach((row) => {
    const id = row.dataset.cartItem;
    const item = cart[id];
    const quantity = item?.quantity || 0;
    row.hidden = quantity === 0;
    const input = row.querySelector("[data-cart-quantity]");
    const finish = row.querySelector("[data-cart-finish]");
    if (input) input.value = String(quantity || 1);
    if (finish && item?.finish) finish.textContent = item.finish;
    subtotal += (products[id]?.price || 0) * quantity;
  });

  const empty = document.querySelector("[data-cart-empty]");
  if (empty) empty.hidden = entries.length !== 0;
  const summary = document.querySelector("[data-cart-summary]");
  if (summary) summary.hidden = entries.length === 0;
  document.querySelectorAll("[data-cart-subtotal], [data-cart-total]").forEach((total) => {
    total.textContent = money.format(subtotal);
  });
}

function showProfile() {
  const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
  const signedIn = localStorage.getItem(SESSION_KEY) === "true" && profile;
  const loggedInPanel = document.querySelector("[data-signed-in]");
  const loggedOutPanel = document.querySelector("[data-signed-out]");
  if (!loggedInPanel || !loggedOutPanel) return;
  loggedInPanel.hidden = !signedIn;
  loggedOutPanel.hidden = Boolean(signedIn);
  if (signedIn) {
    document.querySelectorAll("[data-profile-name]").forEach((field) => { field.textContent = profile.name; });
    const email = document.querySelector("[data-profile-email]");
    if (email) email.textContent = profile.email;
  }
}

async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: Uint8Array.from(atob(salt), (char) => char.charCodeAt(0)), iterations: 100000 },
    key,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

document.addEventListener("input", (event) => {
  if (event.target.id !== "catalog-search") return;
  const query = event.target.value.trim().toLowerCase();
  let visible = 0;
  document.querySelectorAll("[data-product-card]").forEach((card) => {
    card.hidden = !card.dataset.name.includes(query);
    if (!card.hidden) visible += 1;
  });
  document.querySelector("[data-product-count]").textContent = `${visible} ${visible === 1 ? "product" : "products"}`;
  document.querySelector("[data-empty-state]").hidden = visible !== 0;
});

const catalogSearch = document.querySelector("#catalog-search");
const initialQuery = new URLSearchParams(window.location.search).get("q");
if (catalogSearch && initialQuery) {
  catalogSearch.value = initialQuery;
  catalogSearch.dispatchEvent(new Event("input", { bubbles: true }));
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.hasAttribute("data-add-to-cart")) {
    const id = button.dataset.addToCart;
    const cart = readCart();
    const detail = document.querySelector(".detail-product:target") ||
      document.querySelector(".detail-product:first-of-type");
    const finish = detail?.querySelector("select")?.value || products[id]?.finish;
    if (!products[id]) return;
    cart[id] = { quantity: (cart[id]?.quantity || 0) + 1, finish };
    writeCart(cart);
    button.textContent = "Added";
    window.setTimeout(() => { button.textContent = "Add to Bag"; }, 1000);
  }

  if (button.hasAttribute("data-quantity") || button.hasAttribute("data-remove")) {
    const cart = readCart();
    const id = button.dataset.id || button.dataset.remove;
    if (!cart[id]) return;
    cart[id].quantity = button.hasAttribute("data-remove")
      ? 0
      : cart[id].quantity + Number(button.dataset.quantity);
    if (cart[id].quantity <= 0) delete cart[id];
    writeCart(cart);
  }

  if (button.hasAttribute("data-checkout")) {
    document.querySelector("[data-cart-notice]").textContent = "Checkout is a demo and does not process payments.";
  }
  if (button.hasAttribute("data-sign-out")) {
    localStorage.removeItem(SESSION_KEY);
    showProfile();
  }
});

document.addEventListener("change", (event) => {
  const input = event.target.closest("[data-cart-quantity]");
  if (!input) return;
  const cart = readCart();
  const item = cart[input.dataset.cartQuantity];
  const quantity = Number(input.value);
  if (!item) return;
  if (!Number.isInteger(quantity) || quantity < 1) {
    input.value = String(item.quantity);
    return;
  }
  item.quantity = quantity;
  writeCart(cart);
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-account-form]");
  if (!form) return;
  event.preventDefault();
  const data = new FormData(form);
  const mode = form.dataset.accountForm;
  const email = data.get("email").trim().toLowerCase();
  const password = data.get("password");
  const notice = document.querySelector(`[data-${mode}-notice]`);

  try {
    if (mode === "register") {
      const saltBytes = crypto.getRandomValues(new Uint8Array(16));
      const salt = btoa(String.fromCharCode(...saltBytes));
      const profile = { name: data.get("name").trim(), email, salt, hash: await passwordHash(password, salt) };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } else {
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      if (!profile || profile.email !== email || profile.hash !== await passwordHash(password, profile.salt)) {
        notice.textContent = "Email or password is incorrect.";
        return;
      }
    }
    localStorage.setItem(SESSION_KEY, "true");
    window.location.href = "profile.html";
  } catch (error) {
    console.error("Could not save or verify the demo account.", error);
    notice.textContent = "Account actions require a local web server or HTTPS. Please try again.";
  }
});

window.addEventListener("storage", updateCart);
window.addEventListener("storage", showProfile);
updateCart();
showProfile();
