# Convenciones de Echorath UI

Reglas para que todo el framework se escriba igual. Si una regla no encaja con un caso nuevo, cambia la regla aquí primero.

## Nombres

### Clases (BEM con prefijo `e-`)

| Tipo | Forma | Ejemplo |
|---|---|---|
| Bloque | `e-{bloque}` | `.e-panel` |
| Elemento | `e-{bloque}__{elemento}` | `.e-panel__title` |
| Modificador | `e-{bloque}--{modificador}` | `.e-btn--solid` |
| Utilidad | `e-{nombre}` | `.e-row`, `.e-span-4`, `.e-label` |
| Estado (runtime) | `is-{estado}` | `.is-open`, `.is-visible`, `.is-entering` |

- Un modificador nunca va solo: siempre junto a su bloque (`e-btn e-btn--solid`).
- Las clases `is-*` solo las pone el runtime. En el CSS van unidas a su bloque (`.e-toast.is-visible`), nunca sueltas. Excepción: los estados de página van en `<html>` (`html.is-scroll-locked`).

### Atributos

| Uso | Forma | Ejemplo |
|---|---|---|
| Configuración que escribe el autor | `data-{nombre}` | `data-tone`, `data-distort`, `data-focus` |
| Estado que pone el runtime | `data-{nombre}` sin valor | `data-loading`, `data-reveal`, `data-decoding` |
| Opciones globales | `data-e-{nombre}` | `data-e-manual` |
| Accesibilidad | ARIA estándar | `aria-busy`, `aria-selected`, `aria-invalid` |

Todos los nombres están en `src/js/core/constants.js` (`ATTR`, `STATE_CLASS`, `IDS`). El JS nunca escribe un nombre de atributo o clase a mano.

### Variables CSS

| Tipo | Forma | Ejemplo |
|---|---|---|
| Token global | `--e-{categoría}-{nombre}` | `--e-color-green`, `--e-space-4` |
| Variable por elemento | `--e-{nombre}` | `--e-tone` |
| Variable interna de un componente | `--e-{bloque}-{nombre}` | `--e-modal-tone` |

Ningún componente usa un color, tamaño o duración literal si existe un token para ello. Las excepciones (colores fijos del interruptor, sombras de profundidad) deben quedar en el archivo del componente, no repartidas.

### Keyframes

| Prefijo | Uso | Archivo |
|---|---|---|
| `e-anim-*` | movimiento general | `effects/keyframes.css` |
| `e-focus-*` | efectos de foco | `effects/focus.css` |
| `e-distort-*` | distorsiones de carga | `effects/distortions.css` |

## CSS

- Un archivo por componente en `src/css/components/`, con un comentario de cabecera que describe bloque, elementos, modificadores, estados y tono.
- Todo el contenido de un archivo va dentro de su `@layer` (`e.settings`, `e.base`, `e.layout`, `e.components`, `e.effects`, `e.tones`). Única excepción: `base/document.css`, sin capa, que contiene solo la fuente, su tamaño base, los colores y `color-scheme` de la página. No añadas nada más ahí.
- Los tamaños de letra van en `rem`, nunca en `px`, para que sigan el tamaño que el visitante elige en su navegador.
- Los colores de un componente salen de `var(--e-tone, <por defecto>)`, para que `data-tone` funcione siempre.
- Si un componente fija su propio tono (como `.e-btn`), lo hace con `--e-tone: …` en el bloque; `e.tones` lo sobrescribe.
- Cualquier animación nueva debe desactivarse en `effects/motion.css` con `prefers-reduced-motion`.
- Todo control interactivo mide al menos 44px de alto con `pointer: coarse`. Las versiones compactas se limitan a `pointer: fine`.
- Los estilos de `:hover` van dentro de `@media (hover: hover)`, para que en una pantalla táctil no se queden puestos después de tocar. `:focus-visible` va fuera.
- El borde que dice que algo es un control (un campo, un interruptor) usa `--e-color-line-strong`, que contrasta al menos 3:1 (WCAG 1.4.11). `--e-color-line` y `--e-color-line-soft` son para líneas decorativas.
- Ningún texto baja de `--e-font-size-xs` (11,25px); el que da información, mejor desde `--e-font-size-sm` (12px).
- Ninguna fuente ni recurso se pide a otro servidor: lo que use el CSS va en `src/` y el build lo copia a `dist/`.
- El texto cumple contraste WCAG AA: 4,5:1 para texto normal y 3:1 para texto grande. Si cambias un color de texto, compruébalo contra `--e-color-surface` y `--e-color-bg`; hay una prueba para `--e-color-text-faint`.
- Puntos de corte: **640px** (cabecera compacta, con o sin JavaScript; por encima, el runtime la pliega solo si la navegación no cabe en una fila) y **900px** (la rejilla pasa a una columna). Si el JavaScript necesita un punto de corte, va en `MEDIA` de `core/constants.js`. Las variables CSS no funcionan dentro de `@media`, así que un punto de corte nuevo se documenta aquí y en la cabecera del archivo que lo usa.
- Cuando un componente necesita anular una propiedad de otro con el que se combina (por ejemplo, `.e-header__toggle` sobre `.e-btn`), usa un selector con su bloque (`.e-header .e-header__toggle`) en lugar de depender del orden de importación.
- Si tu proyecto tiene un reset global sin capa (por ejemplo, `button { all: unset }`), ganará a los componentes. Ponlo en una capa anterior: `@layer reset { … }` declarada antes de importar Echorath UI.

## JavaScript

- Módulos ES en `src/js/`. `core/` no depende de `effects/` ni de `components/`; los componentes no se importan entre sí.
- Solo `index.js` define la API pública. Lo que no se exporta ahí es interno.
- El texto que venga de datos se inserta con `textContent` (función `create()` de `core/dom.js`), nunca con `innerHTML`.
- Los errores de uso (variante desconocida) lanzan `Error` con el prefijo `EchorathUI:`. Los usos degradables (decode sobre un elemento con hijos) avisan con `console.warn` y siguen.
- Los tiempos configurables viven en `core/config.js`; no se escriben milisegundos sueltos en los módulos.

## Añadir un componente

1. Crear `src/css/components/{nombre}.css` con su cabecera y dentro de `@layer e.components`.
2. Importarlo en `src/css/index.css`, en el bloque de componentes.
3. Si tiene comportamiento, crear `src/js/components/{nombre}.js` y exportarlo en `index.js`. Añadir su firma a `types/echorath-ui.d.ts`.
4. Añadir un ejemplo en `examples/index.html`.
5. Añadir una fila en el mapa de componentes de `docs/MAP.md` y su marcado en `docs/REFERENCE.md`.
6. Si tiene animación, desactivarla en `effects/motion.css`.
7. `npm test`, y anotar el cambio en `CHANGELOG.md`.

## Añadir una distorsión

1. Añadir keyframes `e-distort-{nombre}` y la regla `[data-loading][data-distort="{nombre}"]` en `effects/distortions.css`, y documentarla en su cabecera.
2. Añadir el nombre a `VARIANTS` en `core/constants.js` (y a `NOISE_VARIANTS` o `TEXT_VARIANTS` si aplica).
3. Añadirla al tipo `Variant` de `types/echorath-ui.d.ts`.
4. Añadir su animación esperada en `EXPECTED_ANIMATION` de `tests/smoke.test.mjs`, y el nombre a `VARIANTS` de `tests/effects.test.mjs` y `ALL` de `tests/fxpicker.test.mjs`. Las pruebas de efectos comprobarán solas que se ve, que no mueve nada y que termina limpia en cada tipo de componente.
5. Añadir su descripción a `DESCRIPTIONS` en `src/js/components/fxpicker.js`.
6. Añadir una tarjeta en `examples/index.html` y una fila en `docs/REFERENCE.md`.
7. `npm test`, y anotar el cambio en `CHANGELOG.md`.

Una distorsión solo puede usar `transform`, `clip-path`, `filter`, `opacity`, `text-shadow` o `box-shadow`. Así nunca mueve la maquetación, y todas esas propiedades vuelven a su valor al terminar la animación.

## Versiones

Echorath UI sigue [SemVer](https://semver.org/lang/es/):

- **Mayor:** se renombra o elimina una clase, atributo, token, variante o función pública, o cambia el aspecto por defecto de forma visible.
- **Menor:** se añade un componente, variante, token u opción.
- **Parche:** correcciones sin cambio de API.

La versión se cambia solo en `package.json`; el build la lleva al banner y a `EchorathUI.version`. `dist/` se versiona junto al código para que el framework pueda usarse sin instalar nada.
