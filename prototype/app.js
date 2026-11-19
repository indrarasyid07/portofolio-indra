const views = [...document.querySelectorAll("[data-view]")];
const navLinks = [...document.querySelectorAll("[data-nav]")];
const nav = document.querySelector(".site-nav");
const menuToggle = document.querySelector(".menu-toggle");

function renderRoute() {
  const route = window.location.hash.slice(1) || "home";
  const activeView = views.find((view) => view.dataset.view === route) || views[0];
  views.forEach((view) => { view.hidden = view !== activeView; });
  navLinks.forEach((link) => {
    if (link.dataset.nav === activeView.dataset.view) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  nav?.classList.remove("is-open");
  menuToggle?.setAttribute("aria-expanded", "false");
  const menuLabel = menuToggle?.querySelector(".menu-toggle-label");
  const menuIcon = menuToggle?.querySelector(".menu-toggle-icon");
  if (menuLabel) menuLabel.textContent = "Menu";
  if (menuIcon) menuIcon.textContent = "+";
  if (activeView.dataset.view !== route && route) window.history.replaceState(null, "", "#home");
  document.title = `${activeView.querySelector("h1")?.textContent.replace(/\s+/g, " ").trim() || "Beranda"} — Indra Rasyid`;
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  window.scrollTo({ top: 0, behavior });
}

menuToggle?.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(open));
  nav?.classList.toggle("is-open", open);
  const menuLabel = menuToggle.querySelector(".menu-toggle-label");
  const menuIcon = menuToggle.querySelector(".menu-toggle-icon");
  if (menuLabel) menuLabel.textContent = open ? "Tutup" : "Menu";
  if (menuIcon) menuIcon.textContent = open ? "×" : "+";
});

window.addEventListener("hashchange", renderRoute);
renderRoute();

document.querySelector("#contact-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const status = document.querySelector("#form-status");
  if (status) status.textContent = "Formulir ini masih berupa pratinjau; pengiriman belum terhubung.";
});
