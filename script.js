const root = document.documentElement;
const body = document.body;
const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector("#mobile-menu");

function updateScrollbarWidth() {
  const width = window.innerWidth - root.clientWidth;
  root.style.setProperty("--scrollbar-width", `${Math.max(width, 0)}px`);
}

function setMenu(open) {
  updateScrollbarWidth();
  root.classList.toggle("menu-open", open);
  body.classList.toggle("menu-open", open);
  menuToggle?.setAttribute("aria-expanded", String(open));
  menuToggle?.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
}

updateScrollbarWidth();
window.addEventListener("resize", () => {
  updateScrollbarWidth();
  if (window.innerWidth > 900) setMenu(false);
});

menuToggle?.addEventListener("click", () => {
  setMenu(!body.classList.contains("menu-open"));
});

mobileMenu?.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

document.querySelectorAll("[data-contract]").forEach((link) => {
  link.addEventListener("click", () => {
    link.setAttribute("aria-label", `Открыть PDF договор: ${link.dataset.contract}`);
  });
});
