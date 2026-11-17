# Echorath UI

Framework HTML/CSS/JS con la estética de Echorath: neón sobre negro, paneles con esquinas de mira, tipografía Orbitron y JetBrains Mono, y distorsiones como estado de carga de cualquier componente.

No tiene dependencias en tiempo de ejecución y no requiere build para usarlo: basta con enlazar los archivos de `dist/`.

## Uso rápido

```html
<link rel="stylesheet" href="dist/echorath-ui.css">
<script src="dist/echorath-ui.js" defer></script>

<header class="e-header e-header--sticky">…</header>
<main class="e-container">
  <article class="e-panel" data-loading>
    <div class="e-panel__head"><h3 class="e-panel__title">Borradores</h3></div>
    <p>Doce textos esperan su revisión.</p>
  </article>
</main>

<script>
  // echorath-ui.js se carga con defer: está listo en DOMContentLoaded.
  // Mientras llega la respuesta, el panel muestra la distorsión estándar.
  document.addEventListener('DOMContentLoaded', () => {
    EchorathUI.wait('.e-panel', fetch('/api/feed'));
  });
</script>
```

Abre `examples/index.html` para ver todos los componentes, las nueve distorsiones y los efectos de foco.

## Distorsiones

`standard` (por defecto, desdoblamiento rojo/cian) · `flicker` · `glitch` · `scan` · `wave` · `shatter` · `warp` · `static` · `decode`

```html
<div class="e-panel" data-loading data-distort="scan">…</div>
```

```js
EchorathUI.load('#panel', { variant: 'warp' });
EchorathUI.ready('#panel');

// Un botón por efecto, junto al panel
const panel = document.querySelector('#panel');
panel.after(EchorathUI.fxPicker(panel, { name: 'el panel' }));
```

## Archivos de `dist/`

| Archivo | Para |
|---|---|
| `echorath-ui.css` · `echorath-ui.min.css` | Estilos (legible · minificado) |
| `echorath-ui.js` · `echorath-ui.min.js` | Script clásico, expone `window.EchorathUI` |
| `echorath-ui.esm.js` | Módulo ES con exportaciones con nombre |
| `*.map` | Source maps: en las herramientas del navegador verás `src/` |
| `fonts/` | Las tres fuentes (Orbitron, JetBrains Mono, Literata) y sus licencias. Cópiala junto a `echorath-ui.css`: la página no pide nada a otros servidores |

## Desarrollo

```bash
npm ci           # esbuild y playwright-core, versiones fijas
npx playwright-core install --no-shell chromium   # una vez: el navegador de las pruebas
npm run build    # genera dist/ con source maps
npm run watch    # recompila al guardar cualquier archivo de src/
npm test         # build + pruebas en Chromium
```

Las pruebas usan el Chromium de `CHROMIUM_PATH` si está definido; si no, el que instala `playwright-core` (ver `tests/helpers/browser.mjs`).

Se trabaja en `src/`; `dist/` se genera y no se edita a mano, pero se guarda en el repositorio porque la web lo copia tal cual. Después de cambiar `src/`, ejecuta `npm run build` y sube también `dist/`: las pruebas de GitHub fallan si no coincide.

## Documentación

- [docs/MAP.md](docs/MAP.md): mapas del repositorio, del build, de las capas CSS, de los módulos JS, del ciclo de carga, de atributos, tokens y componentes.
- [docs/REFERENCE.md](docs/REFERENCE.md): marcado de cada componente y API completa.
- [docs/CONVENTIONS.md](docs/CONVENTIONS.md): reglas de nombres y pasos para añadir componentes o distorsiones.
- [CHANGELOG.md](CHANGELOG.md): cambios por versión.

## Compatibilidad

Navegadores con soporte de `@layer`, `color-mix()` y `:focus-visible`: Chrome/Edge 111+, Firefox 113+, Safari 16.2+.

Con el sistema en "reducir movimiento", las distorsiones y animaciones se detienen y los elementos en carga quedan atenuados.

Accesibilidad: texto con contraste WCAG AA, foco visible en todos los controles, controles de al menos 44px en pantallas táctiles y modal con el foco atrapado.
