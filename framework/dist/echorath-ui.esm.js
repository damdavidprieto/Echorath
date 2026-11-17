/*! Echorath UI v2.0.0 */

// src/js/core/constants.js
var VERSION = true ? "2.0.0" : "dev";
var VARIANTS = Object.freeze([
  "standard",
  "flicker",
  "glitch",
  "scan",
  "wave",
  "shatter",
  "warp",
  "static",
  "decode"
]);
var TEXT_VARIANTS = Object.freeze(["decode"]);
var NOISE_VARIANTS = Object.freeze(["warp", "static"]);
var TONES = Object.freeze({
  ok: "ok",
  success: "ok",
  info: "info",
  warn: "warn",
  warning: "warn",
  danger: "danger",
  error: "danger",
  sys: "sys",
  off: "off",
  offline: "off"
});
var ATTR = Object.freeze({
  // author-set
  distort: "data-distort",
  tone: "data-tone",
  focus: "data-focus",
  tabs: "data-tabs",
  tabTarget: "data-tab-target",
  manual: "data-e-manual",
  closeLabel: "data-close-label",
  interactive: "data-e-interactive",
  pauseOnHover: "data-e-pause-on-hover",
  // runtime-set (data-loading may also be authored for declarative start)
  loading: "data-loading",
  reveal: "data-reveal",
  decoding: "data-decoding",
  boxed: "data-boxed",
  offscreen: "data-e-offscreen"
});
var STATE_CLASS = Object.freeze({
  visible: "is-visible",
  open: "is-open",
  compact: "is-compact",
  entering: "is-entering",
  scrollLocked: "is-scroll-locked"
});
var SELECTOR = Object.freeze({
  header: ".e-header",
  headerToggle: ".e-header__toggle",
  headerNav: ".e-header__nav"
});
var MEDIA = Object.freeze({
  compactHeader: "(max-width: 640px)"
});
var CSS_VAR = Object.freeze({
  headerOffset: "--e-header-offset"
});
var IDS = Object.freeze({
  defs: "e-distort-defs",
  warp: "e-warp",
  warpMap: "e-warp-map",
  static: "e-static"
});

// src/js/core/config.js
var config = {
  defaultVariant: "standard",
  revealMs: 700,
  noiseIntervalMs: 80,
  decodeScrambleMs: 60,
  decodeRevealStepMs: 28,
  toastMs: 3e3
};
function configure(options = {}) {
  for (const [key, value] of Object.entries(options)) {
    if (!(key in config)) continue;
    if (key === "defaultVariant" && !VARIANTS.includes(value)) {
      throw new Error(`EchorathUI: unknown variant "${value}". Use one of: ${VARIANTS.join(", ")}`);
    }
    config[key] = value;
  }
  return { ...config };
}

// src/js/core/dom.js
function resolve(target) {
  if (!target) return null;
  if (typeof target === "string") return document.querySelector(target);
  return target;
}
function create(tag, attrs = {}, text = "") {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== void 0 && value !== null) node.setAttribute(key, value);
  }
  if (text) node.textContent = text;
  return node;
}

// src/js/core/tone.js
function tone(target, name) {
  const node = resolve(target);
  if (!node) return;
  node.setAttribute(ATTR.tone, TONES[name] || "info");
}

// src/js/effects/visibility.js
var listeners = /* @__PURE__ */ new Set();
var observer = null;
var mutations = null;
function getObserver() {
  if (!observer && typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.toggleAttribute(ATTR.offscreen, !entry.isIntersecting);
        if (entry.isIntersecting) listeners.forEach((fn) => fn(entry.target));
      }
    }, { rootMargin: "100px 0px" });
  }
  return observer;
}
function watch(node) {
  const io = getObserver();
  if (io) io.observe(node);
}
function unwatch(node) {
  if (observer) observer.unobserve(node);
  node.removeAttribute(ATTR.offscreen);
}
function watchAll() {
  if (mutations || typeof MutationObserver !== "function" || !getObserver()) return;
  const scan = (node) => {
    if (node.nodeType !== 1) return;
    if (node.hasAttribute(ATTR.loading)) watch(node);
    node.querySelectorAll(`[${ATTR.loading}]`).forEach(watch);
  };
  mutations = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "childList") record.addedNodes.forEach(scan);
      else if (record.target.hasAttribute(ATTR.loading)) watch(record.target);
      else unwatch(record.target);
    }
  });
  mutations.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: [ATTR.loading] });
  scan(document.documentElement);
}
function isOffscreen(node) {
  return node.hasAttribute(ATTR.offscreen);
}
function onVisible(fn) {
  listeners.add(fn);
}

// src/js/effects/filters.js
var nodes = {};
var users = /* @__PURE__ */ new Set();
var frame = 0;
var last = 0;
var DEFS_MARKUP = `
<svg id="${IDS.defs}" width="0" height="0" aria-hidden="true" focusable="false"
     style="position:absolute;width:0;height:0;overflow:hidden">
    <defs>
        <filter id="${IDS.warp}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="2" seed="1" result="noise"/>
            <feDisplacementMap id="${IDS.warpMap}" in="SourceGraphic" in2="noise" scale="14"
                               xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <filter id="${IDS.static}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
            <feTurbulence type="turbulence" baseFrequency="0.9" numOctaves="1" seed="3" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6"
                               xChannelSelector="R" yChannelSelector="B"/>
        </filter>
    </defs>
</svg>`;
function injectFilters() {
  if (!document.getElementById(IDS.defs)) {
    const holder = document.createElement("div");
    holder.innerHTML = DEFS_MARKUP;
    document.body.appendChild(holder.firstElementChild);
  }
  nodes.warpTurbulence = document.querySelector(`#${IDS.warp} feTurbulence`);
  nodes.warpMap = document.getElementById(IDS.warpMap);
  nodes.staticTurbulence = document.querySelector(`#${IDS.static} feTurbulence`);
}
function tick(now) {
  for (const node of users) if (!node.isConnected) users.delete(node);
  if (![...users].some((node) => !isOffscreen(node))) {
    frame = 0;
    return;
  }
  frame = requestAnimationFrame(tick);
  if (now - last < config.noiseIntervalMs) return;
  last = now;
  nodes.warpTurbulence.setAttribute("seed", String(1 + Math.floor(Math.random() * 97)));
  nodes.warpMap.setAttribute("scale", String(8 + Math.random() * 14));
  nodes.staticTurbulence.setAttribute("seed", String(1 + Math.floor(Math.random() * 89)));
}
onVisible((node) => {
  if (users.has(node) && !frame) frame = requestAnimationFrame(tick);
});
function startNoise(node) {
  if (!nodes.warpTurbulence) injectFilters();
  users.add(node);
  if (!frame) frame = requestAnimationFrame(tick);
}
function stopNoise(node) {
  users.delete(node);
  if (users.size === 0 && frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
}

// src/js/effects/decode.js
var GLYPHS = "!<>-_\\/[]{}=+*^?#%&$";
var active = /* @__PURE__ */ new Map();
function scramble(node, text, resolved) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    out += i < resolved || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }
  node.textContent = out;
}
function prefersReducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function lockSize(node) {
  const style = getComputedStyle(node);
  const lock = { width: node.style.width, height: node.style.height, hadStyle: node.hasAttribute("style") };
  if (style.width !== "auto" && style.height !== "auto") {
    node.style.width = style.width;
    node.style.height = style.height;
  }
  return lock;
}
function unlockSize(node, lock) {
  node.style.width = lock.width;
  node.style.height = lock.height;
  if (!lock.hadStyle && node.getAttribute("style") === "") node.removeAttribute("style");
}
function canDecode(node) {
  return node.children.length === 0;
}
function startDecode(node) {
  const current = active.get(node);
  if (current && !current.revealing) return;
  if (current) clearTimeout(current.timer);
  const state = current || { text: node.textContent, lock: lockSize(node) };
  state.revealing = false;
  state.timer = 0;
  active.set(node, state);
  node.setAttribute(ATTR.decoding, "");
  if (prefersReducedMotion()) return;
  state.timer = setInterval(() => {
    if (!isOffscreen(node)) scramble(node, state.text, 0);
  }, config.decodeScrambleMs);
}
function cancelDecode(node) {
  const state = active.get(node);
  if (!state) return;
  clearInterval(state.timer);
  clearTimeout(state.timer);
  active.delete(node);
  node.textContent = state.text;
  unlockSize(node, state.lock);
  node.removeAttribute(ATTR.decoding);
}
function stopDecode(node) {
  const state = active.get(node);
  if (!state || state.revealing) return;
  clearInterval(state.timer);
  const finish = () => {
    active.delete(node);
    node.textContent = state.text;
    unlockSize(node, state.lock);
    node.removeAttribute(ATTR.decoding);
  };
  if (prefersReducedMotion()) {
    finish();
    return;
  }
  state.revealing = true;
  let resolved = 0;
  const step = () => {
    resolved++;
    if (resolved >= state.text.length) {
      finish();
      return;
    }
    scramble(node, state.text, resolved);
    state.timer = setTimeout(step, config.decodeRevealStepMs);
  };
  step();
}

// src/js/effects/loading.js
var generations = /* @__PURE__ */ new WeakMap();
var revealTimers = /* @__PURE__ */ new WeakMap();
function clearReveal(node) {
  clearTimeout(revealTimers.get(node));
  revealTimers.delete(node);
  node.removeAttribute(ATTR.reveal);
}
function load(target, opts = {}) {
  const node = resolve(target);
  if (!node) return null;
  let variant = opts.variant || node.getAttribute(ATTR.distort) || config.defaultVariant;
  if (!VARIANTS.includes(variant)) {
    throw new Error(`EchorathUI: unknown variant "${variant}". Use one of: ${VARIANTS.join(", ")}`);
  }
  if (variant === "decode" && !canDecode(node)) {
    console.warn('EchorathUI: "decode" only works on text-only elements; using "standard" instead.', node);
    variant = "standard";
  }
  clearReveal(node);
  if (getComputedStyle(node).display === "inline") node.setAttribute(ATTR.boxed, "");
  node.setAttribute(ATTR.distort, variant);
  node.setAttribute(ATTR.loading, "");
  node.setAttribute("aria-busy", "true");
  watch(node);
  if (NOISE_VARIANTS.includes(variant)) startNoise(node);
  else stopNoise(node);
  if (variant === "decode") startDecode(node);
  else cancelDecode(node);
  generations.set(node, (generations.get(node) || 0) + 1);
  return node;
}
function ready(target, opts = {}) {
  const node = resolve(target);
  if (!node) return;
  generations.set(node, (generations.get(node) || 0) + 1);
  node.removeAttribute(ATTR.loading);
  node.removeAttribute(ATTR.boxed);
  node.removeAttribute("aria-busy");
  unwatch(node);
  stopNoise(node);
  stopDecode(node);
  if (opts.tone) tone(node, opts.tone);
  clearReveal(node);
  if (opts.reveal !== false) {
    node.setAttribute(ATTR.reveal, "");
    revealTimers.set(node, setTimeout(() => {
      revealTimers.delete(node);
      node.removeAttribute(ATTR.reveal);
    }, config.revealMs));
  }
}
function wait(target, promise, opts = {}) {
  const node = load(target, opts);
  const generation = node && generations.get(node);
  const isLatest = () => node && generations.get(node) === generation;
  return Promise.resolve(promise).then(
    (value) => {
      if (isLatest()) ready(node, opts);
      return value;
    },
    (error) => {
      if (isLatest()) ready(node, { ...opts, tone: "danger" });
      throw error;
    }
  );
}
function loadFor(target, ms = 2e3, opts = {}) {
  return wait(target, new Promise((done) => setTimeout(done, ms)), opts);
}

// src/js/components/header.js
var bound = /* @__PURE__ */ new WeakSet();
var DEFAULT_CLOSE_LABEL = "Cerrar";
function visibleRects(parent) {
  return [...parent.children].map((child) => child.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
}
function inOneRow(rects) {
  return rects.length === 0 || rects.every((rect) => rect.top < rects[0].bottom);
}
function initHeaders(root = document) {
  root.querySelectorAll(SELECTOR.header).forEach((header) => {
    if (bound.has(header)) return;
    bound.add(header);
    const updateOffset = () => {
      if (!header.isConnected) return;
      const height = Math.round(header.getBoundingClientRect().height);
      document.documentElement.style.setProperty(CSS_VAR.headerOffset, `${height}px`);
    };
    updateOffset();
    if (typeof ResizeObserver === "function") new ResizeObserver(updateOffset).observe(header);
    const toggle = header.querySelector(SELECTOR.headerToggle);
    if (!toggle) return;
    const controls = toggle.getAttribute("aria-controls");
    const nav = controls && document.getElementById(controls) || header.querySelector(SELECTOR.headerNav);
    if (!nav) return;
    const openLabel = toggle.textContent;
    const closeLabel = toggle.getAttribute(ATTR.closeLabel) || DEFAULT_CLOSE_LABEL;
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? closeLabel : openLabel;
      nav.classList.toggle(STATE_CLASS.open, open);
      updateOffset();
    };
    setOpen(false);
    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a, button")) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains(STATE_CLASS.open)) {
        setOpen(false);
        toggle.focus();
      }
    });
    const phone = typeof matchMedia === "function" ? matchMedia(MEDIA.compactHeader) : null;
    const fit = () => {
      const wasCompact = header.classList.contains(STATE_CLASS.compact);
      header.classList.remove(STATE_CLASS.compact);
      if (phone && phone.matches) return;
      const fits = inOneRow(visibleRects(header)) && inOneRow(visibleRects(nav));
      header.classList.toggle(STATE_CLASS.compact, !fits);
      if (wasCompact && fits && nav.classList.contains(STATE_CLASS.open)) setOpen(false);
      updateOffset();
    };
    let queued = false;
    const queueFit = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        fit();
      });
    };
    fit();
    addEventListener("resize", queueFit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueFit);
    if (typeof MutationObserver === "function") new MutationObserver(queueFit).observe(nav, { childList: true, subtree: true });
  });
}

// src/js/components/tabs.js
var bound2 = /* @__PURE__ */ new WeakSet();
function initTabs(root = document) {
  root.querySelectorAll(`[${ATTR.tabs}]`).forEach((group) => {
    if (bound2.has(group)) return;
    bound2.add(group);
    const tabs = [...group.querySelectorAll('[role="tab"]')];
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const selected = t === tab;
        t.setAttribute("aria-selected", String(selected));
        t.tabIndex = selected ? 0 : -1;
        const panel = resolve(t.getAttribute(ATTR.tabTarget));
        if (!panel) return;
        panel.hidden = !selected;
        if (selected) {
          panel.classList.remove(STATE_CLASS.entering);
          void panel.offsetWidth;
          panel.classList.add(STATE_CLASS.entering);
        }
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab, false));
      tab.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
        select(tabs[next], true);
      });
    });
    const initial = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
    if (initial) select(initial, false);
  });
}

// src/js/components/toast.js
var stack = null;
var NOTICE_MS = 1500;
var READ_MS_PER_WORD = 300;
function ensureStack() {
  if (stack && stack.isConnected) return stack;
  stack = create("div", { class: "e-toasts", "aria-live": "polite" });
  document.body.appendChild(stack);
  return stack;
}
function toast(title, message = "", toneName = "info", ms = config.toastMs) {
  const node = create("div", { class: "e-toast", role: "status" });
  tone(node, toneName);
  const body = create("div");
  body.appendChild(create("span", { class: "e-toast__title" }, title));
  if (message) body.appendChild(create("span", { class: "e-toast__msg" }, message));
  node.appendChild(body);
  ensureStack().appendChild(node);
  requestAnimationFrame(() => node.classList.add(STATE_CLASS.visible));
  const words = `${title} ${message}`.trim().split(/\s+/).length;
  let left = Math.max(ms, NOTICE_MS + words * READ_MS_PER_WORD);
  let timer = 0;
  let since = 0;
  const leave = () => {
    node.classList.remove(STATE_CLASS.visible);
    setTimeout(() => node.remove(), 350);
  };
  const resume = () => {
    if (timer) return;
    since = Date.now();
    timer = setTimeout(leave, Math.max(left, 1e3));
  };
  const pause = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = 0;
    left -= Date.now() - since;
  };
  node.addEventListener("pointerenter", pause);
  node.addEventListener("pointerleave", resume);
  node.addEventListener("focusin", pause);
  node.addEventListener("focusout", resume);
  resume();
  return node;
}

// src/js/components/modal.js
var BUTTON_VARIANTS = ["ghost", "solid", "danger", "warn", "info"];
var SIZES = ["md", "lg"];
var FADE_MS = 300;
var openCount = 0;
function lockScroll() {
  openCount++;
  document.documentElement.classList.add(STATE_CLASS.scrollLocked);
}
function unlockScroll() {
  openCount = Math.max(0, openCount - 1);
  if (openCount === 0) document.documentElement.classList.remove(STATE_CLASS.scrollLocked);
}
function fill(content, body) {
  if (body instanceof Node) content.replaceChildren(body);
  else content.textContent = body;
}
function modal({
  title = "",
  body = "",
  tone: toneName = "ok",
  size = "md",
  actions = [{ label: "Aceptar", value: true, variant: "solid" }]
} = {}) {
  let handle;
  const done = new Promise((resolveModal) => {
    const previous = document.activeElement;
    const overlay = create("div", { class: "e-modal-overlay" });
    const sizeClass = SIZES.includes(size) && size !== "md" ? ` e-modal--${size}` : "";
    const dialog = create("div", { class: `e-modal${sizeClass}`, role: "dialog", "aria-modal": "true", "aria-label": title });
    tone(dialog, toneName);
    const head = create("div", { class: "e-modal__head" });
    const heading = create("span", {}, title);
    head.appendChild(heading);
    const closeButton = create("button", { class: "e-btn e-modal__close", type: "button", "aria-label": "Cerrar" }, "\xD7");
    head.appendChild(closeButton);
    const content = create("div", { class: "e-modal__body" });
    fill(content, body);
    const foot = create("div", { class: "e-modal__foot" });
    const buttons = actions.map((action) => {
      const variant = BUTTON_VARIANTS.includes(action.variant) ? action.variant : "ghost";
      const button = create("button", { class: `e-btn e-btn--${variant}`, type: "button" }, action.label);
      button.addEventListener("click", () => close(action.value));
      foot.appendChild(button);
      return button;
    });
    dialog.append(head, content, foot);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    const focusable = [closeButton, ...buttons];
    const trapFocus = (e) => {
      const first = focusable[0];
      const last2 = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last2.focus();
      } else if (!e.shiftKey && document.activeElement === last2) {
        e.preventDefault();
        first.focus();
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") close(void 0);
      if (e.key === "Tab") trapFocus(e);
    };
    let closed = false;
    function close(value) {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", onKey);
      unlockScroll();
      overlay.classList.remove(STATE_CLASS.open);
      setTimeout(() => overlay.remove(), FADE_MS);
      if (previous && typeof previous.focus === "function") previous.focus();
      resolveModal(value);
    }
    closeButton.addEventListener("click", () => close(void 0));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(void 0);
    });
    document.addEventListener("keydown", onKey);
    lockScroll();
    requestAnimationFrame(() => {
      overlay.classList.add(STATE_CLASS.open);
      (buttons[0] || closeButton).focus();
    });
    handle = {
      element: dialog,
      setTitle(text) {
        heading.textContent = text;
        dialog.setAttribute("aria-label", text);
      },
      setBody(next) {
        fill(content, next);
        content.scrollTop = 0;
      },
      close
    };
  });
  return Object.assign(done, handle);
}

// src/js/components/fxpicker.js
var DEFAULT_DURATION = 1600;
var uid = 0;
var DESCRIPTIONS = Object.freeze({
  standard: "Desdoblamiento rojo/cian con temblor leve",
  flicker: "Parpadeo y pulso del tono",
  glitch: "Separaci\xF3n fuerte, temblor y cortes",
  scan: "Franjas horizontales desplazadas",
  wave: "Inclinaci\xF3n oscilante",
  shatter: "Recorte poligonal que se rompe",
  warp: "Desplazamiento l\xEDquido",
  static: "Grano de alta frecuencia",
  decode: "El texto se cifra y se revela"
});
function fxPicker(target, opts = {}) {
  const node = resolve(target);
  if (!node) throw new Error("EchorathUI: fxPicker target not found");
  const name = opts.name || "";
  const duration = opts.duration ?? DEFAULT_DURATION;
  const variants2 = (opts.variants || VARIANTS).filter((v) => VARIANTS.includes(v) && (v !== "decode" || canDecode(node)));
  const listId = `e-fx-${++uid}`;
  const whose = name && (/^el /.test(name) ? `del ${name.slice(3)}` : `de ${name}`);
  const root = create("div", { class: "e-fx", role: "group", "aria-label": whose ? `Efectos ${whose}` : "Efectos" });
  root.style.setProperty("--e-fx-duration", `${duration}ms`);
  const label = opts.label || "Efectos";
  const toggle = create("button", {
    class: "e-btn e-btn--sm e-fx__toggle",
    type: "button",
    "aria-expanded": "false",
    "aria-controls": listId,
    ...whose && { "aria-label": `${label} ${whose}` },
    [ATTR.interactive]: ""
  }, label);
  const list = create("div", { class: "e-fx__list", id: listId });
  const buttons = variants2.map((variant) => {
    const button = create("button", {
      class: "e-btn e-btn--sm e-fx__option",
      type: "button",
      "aria-pressed": "false",
      title: DESCRIPTIONS[variant],
      "data-variant": variant,
      [ATTR.interactive]: ""
    }, variant);
    button.addEventListener("click", () => button === active2 ? stop() : play(variant, button));
    list.appendChild(button);
    return button;
  });
  root.append(toggle, list);
  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    list.hidden = !open;
  };
  setOpen(Boolean(opts.open));
  toggle.addEventListener("click", () => setOpen(list.hidden));
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !list.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
  let runs = 0;
  let active2 = null;
  let base = null;
  const setActive = (button) => {
    active2 = button;
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
  };
  function captureBase() {
    if (base) return;
    base = node.hasAttribute(ATTR.loading) ? {
      variant: node.getAttribute(ATTR.distort),
      busy: node.getAttribute("aria-busy"),
      pause: node.hasAttribute(ATTR.pauseOnHover)
    } : { variant: null };
    if (base.pause) node.removeAttribute(ATTR.pauseOnHover);
  }
  function finish() {
    setActive(null);
    if (base && base.variant) {
      load(node, { variant: base.variant });
      if (base.busy === null) node.removeAttribute("aria-busy");
      else node.setAttribute("aria-busy", base.busy);
      if (base.pause) node.setAttribute(ATTR.pauseOnHover, "");
    }
    base = null;
  }
  async function play(variant, button) {
    const run = ++runs;
    captureBase();
    setActive(button);
    await loadFor(node, duration, { variant, reveal: !base.variant });
    if (run === runs) finish();
  }
  function stop() {
    runs++;
    if (!base.variant) ready(node);
    finish();
  }
  return root;
}

// src/js/index.js
var variants = VARIANTS.slice();
function init(root = document) {
  injectFilters();
  watchAll();
  initHeaders(root);
  initTabs(root);
  root.querySelectorAll(`[${ATTR.loading}]`).forEach((node) => load(node));
}
function autoInit() {
  if (document.documentElement.hasAttribute(ATTR.manual)) return;
  init();
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
}
export {
  configure,
  fxPicker,
  init,
  initHeaders,
  initTabs,
  load,
  loadFor,
  modal,
  ready,
  toast,
  tone,
  variants,
  VERSION as version,
  wait
};
//# sourceMappingURL=echorath-ui.esm.js.map
