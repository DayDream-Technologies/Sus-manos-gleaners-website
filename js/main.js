document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktopNav = window.matchMedia("(min-width: 960px)");

function initHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  const backdrop = document.querySelector(".nav-backdrop");
  if (!toggle || !nav) return;

  let open = false;
  let lockedScroll = 0;

  const focusable = () =>
    [toggle, ...nav.querySelectorAll("a[href], button:not([disabled])")].filter((el) => {
      if (el.closest("[hidden]")) return false;
      return el.getClientRects().length > 0;
    });

  const setInert = () => {
    if (!desktopNav.matches && !open) nav.setAttribute("inert", "");
    else nav.removeAttribute("inert");
  };

  const setOpen = (next, options = {}) => {
    open = next;
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (backdrop) backdrop.hidden = !open;
    document.body.classList.toggle("nav-open", open);
    if (open) {
      lockedScroll = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${lockedScroll}px`;
      document.body.style.width = "100%";
      setInert();
      nav.querySelector("a[href]")?.focus();
    } else {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, lockedScroll);
      nav.querySelectorAll(".has-sub.is-open").forEach((item) => {
        item.classList.remove("is-open");
        item.querySelector(".sub-toggle")?.setAttribute("aria-expanded", "false");
      });
      setInert();
      if (options.returnFocus !== false && !desktopNav.matches) toggle.focus();
    }
  };

  setInert();

  toggle.addEventListener("click", () => setOpen(!open));

  backdrop?.addEventListener("click", () => setOpen(false));

  document.addEventListener("keydown", (event) => {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusable();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a[href]")) setOpen(false, { returnFocus: false });
  });

  document.querySelectorAll(".sub-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".has-sub");
      const willOpen = !item.classList.contains("is-open");
      document.querySelectorAll(".has-sub.is-open").forEach((other) => {
        if (other !== item) {
          other.classList.remove("is-open");
          other.querySelector(".sub-toggle")?.setAttribute("aria-expanded", "false");
        }
      });
      item.classList.toggle("is-open", willOpen);
      btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
  });

  desktopNav.addEventListener("change", (event) => {
    if (event.matches && open) setOpen(false);
    else setInert();
  });
}

function initReveal() {
  const nodes = [...document.querySelectorAll(".reveal")];
  if (!nodes.length || reduceMotion) {
    nodes.forEach((node) => node.classList.add("is-in"));
    return;
  }
  if (window.CSS?.supports?.("animation-timeline: view()")) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16 }
  );
  nodes.forEach((node) => observer.observe(node));
}

function initCounts() {
  const nodes = [...document.querySelectorAll("[data-count]")];
  if (!nodes.length) return;

  const paint = (el, value) => {
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    el.textContent = `${prefix}${value}${suffix}`;
  };

  const run = (el) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target) || reduceMotion) return;
    const start = performance.now();
    const duration = 900;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      paint(el, Math.round(target * eased).toLocaleString("en-US"));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );
  nodes.forEach((node) => observer.observe(node));
}

function initVideo() {
  document.querySelectorAll("[data-video-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.videoId;
      const frame = document.createElement("iframe");
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1`;
      frame.title = button.getAttribute("aria-label") || "Video";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      frame.className = "video-frame";
      const wrap = document.createElement("div");
      wrap.className = "video-frame-wrap";
      wrap.append(frame);
      button.replaceWith(wrap);
    });
  });
}

function initMap() {
  document.querySelectorAll("[data-map]").forEach((button) => {
    button.addEventListener("click", () => {
      const frame = document.createElement("iframe");
      frame.src = button.dataset.map;
      frame.title = "Map showing 2464 Wilshere Dr, Jenison, Michigan";
      frame.loading = "lazy";
      frame.referrerPolicy = "no-referrer-when-downgrade";
      const wrap = document.createElement("div");
      wrap.className = "map-frame";
      wrap.append(frame);
      button.replaceWith(wrap);
    });
  });
}

function initCopy() {
  document.querySelectorAll("[data-copy]").forEach((button) => {
    const original = button.textContent;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = "Address copied";
      } catch {
        button.textContent = "Copy unavailable";
      }
      window.setTimeout(() => {
        button.textContent = original;
      }, 2000);
    });
  });
}

function initYear() {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
}

function initSticky() {
  const bar = document.querySelector("[data-sticky-actions]");
  const hero = document.querySelector(".hero, .page-hero");
  const footer = document.querySelector(".site-footer");
  if (!bar || !hero || !footer) return;

  let pastHero = false;
  let atFooter = false;
  const sync = () => {
    const show = desktopNav.matches ? false : pastHero && !atFooter;
    bar.classList.toggle("is-visible", show);
    document.body.classList.toggle("has-sticky", show);
  };

  const heroWatch = new IntersectionObserver(([entry]) => {
    pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    sync();
  });
  const footerWatch = new IntersectionObserver(
    ([entry]) => {
      atFooter = entry.isIntersecting;
      sync();
    },
    { rootMargin: "80px 0px 0px 0px" }
  );
  heroWatch.observe(hero);
  footerWatch.observe(footer);
  desktopNav.addEventListener("change", sync);
}

function initGallery() {
  const gallery = document.querySelector("[data-gallery]");
  if (!gallery) return;

  const slides = [...gallery.querySelectorAll("[data-slide]")];
  const thumbs = [...gallery.querySelectorAll("[data-thumb]")];
  const caption = gallery.querySelector("[data-caption]");
  const counter = gallery.querySelector("[data-counter]");
  const prev = gallery.querySelector("[data-prev]");
  const next = gallery.querySelector("[data-next]");
  if (!slides.length) return;

  if (!gallery.hasAttribute("tabindex")) gallery.tabIndex = 0;
  let index = 0;
  let startX = 0;

  const show = (i) => {
    index = (i + slides.length) % slides.length;
    slides.forEach((slide, n) => slide.classList.toggle("is-active", n === index));
    thumbs.forEach((thumb, n) => {
      thumb.classList.toggle("is-active", n === index);
      thumb.setAttribute("aria-current", n === index ? "true" : "false");
    });
    if (caption) caption.textContent = slides[index].dataset.alt || "";
    if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
  };

  prev?.addEventListener("click", () => show(index - 1));
  next?.addEventListener("click", () => show(index + 1));
  thumbs.forEach((thumb, n) => thumb.addEventListener("click", () => show(n)));

  gallery.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      show(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(index - 1);
    }
  });

  gallery.addEventListener(
    "touchstart",
    (event) => {
      startX = event.changedTouches[0].clientX;
    },
    { passive: true }
  );
  gallery.addEventListener(
    "touchend",
    (event) => {
      const delta = event.changedTouches[0].clientX - startX;
      if (Math.abs(delta) < 40) return;
      show(delta < 0 ? index + 1 : index - 1);
    },
    { passive: true }
  );

  show(0);
}

function initEmbedTitles() {
  const container = document.querySelector(".qgiv-embed-container");
  if (!container) return;
  const label = "Donate to Sus Manos Gleaners";
  const labelFrame = (frame) => {
    if (frame && !frame.title) frame.title = label;
  };
  container.querySelectorAll("iframe").forEach(labelFrame);
  const observer = new MutationObserver(() => {
    container.querySelectorAll("iframe").forEach(labelFrame);
  });
  observer.observe(container, { childList: true, subtree: true });
}

initEmbedTitles();
initHeader();
initNav();
initReveal();
initCounts();
initVideo();
initMap();
initCopy();
initYear();
initSticky();
initGallery();
