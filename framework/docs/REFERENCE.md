# Referencia de Echorath UI

Marcado de cada componente, catálogo de efectos y API del runtime. Para la estructura del código, ver [MAP.md](MAP.md).

## Instalación en una página

```html
<link rel="stylesheet" href="dist/echorath-ui.css">
<script src="dist/echorath-ui.js" defer></script>
```

Con módulos ES:

```js
import { load, ready, toast } from './dist/echorath-ui.esm.js';
```

Las fuentes van incluidas: `echorath-ui.css` las busca en `fonts/`, a su lado. Si copias el CSS a otra carpeta, copia también `dist/fonts`. La página no pide nada a otros servidores. Licencia de las fuentes: SIL Open Font License 1.1 (`fonts/OFL-*.txt`).

En pantallas táctiles, los componentes no toman el aspecto de "señalado" al tocarlos (`@media (hover: hover)`): ese aspecto se quedaba puesto hasta tocar otra cosa. El foco de teclado se ve igual.

Una palabra que no cabe en su línea, como una dirección web larga, se parte en vez de salirse (`overflow-wrap: break-word` en `body`).

Si el sistema pide más contraste (`prefers-contrast: more`), el texto tenue y el secundario pasan a 7:1 o más (WCAG AAA) y las líneas se aclaran.

El rojo es el color de los resaltados (`--e-color-highlight`, que sigue a `--e-color-red`) y el menos presente de la paleta: solo lo usan el texto seleccionado, el pasaje al que lleva un enlace (`#:~:text=`), `<mark>`, el cursor de los campos y las esquinas de un panel bajo el puntero o el teclado. El texto blanco sobre la selección se lee a 10:1.

Las barras de desplazamiento (Chrome, Edge y Safari) miden 10px y su guía destaca 4:1 sobre el fondo, con el color de los bordes (`--e-color-line-strong`). Firefox usa las suyas, oscuras por `color-scheme: dark`.

Fondos opcionales en `<body>`: `e-grid-bg` (rejilla) y `e-crt` (líneas de barrido).

Al imprimir, o al guardar en PDF, la página sale en negro sobre blanco, sin brillos ni distorsiones, y la barra superior una sola vez (`base/print.css`).

La fuente, los colores y `color-scheme: dark` de la página (`base/document.css`) están fuera de las capas, para que el reset de un host o de otra librería no los anule. Para cambiarlos, carga tu hoja de estilos después de Echorath UI.

La letra base es el 93,75 % del tamaño que el visitante elige en su navegador: 15px con el ajuste habitual (16px) y 22,5px si lo sube a 24px. La escala de letra (`--e-font-size-*`) va en `rem`, así que la sigue entera.

### Estructura recomendada

```html
<body>
  <header class="e-header e-header--sticky">…</header>   <!-- hijo directo de body: ocupa todo el ancho -->
  <main class="e-container">…</main>                     <!-- contenido centrado y alineado con la barra -->
  <footer class="e-container">…</footer>
</body>
```

No pongas relleno lateral en `<body>`: impediría que la barra y el fondo lleguen a los bordes. El margen lateral lo pone `.e-container` (`--e-gutter`, que respeta las zonas seguras del móvil).

---

## Componentes

### Panel

```html
<article class="e-panel" data-tone="danger">
  <div class="e-panel__head">
    <h3 class="e-panel__title">Borradores</h3>
    <span class="e-badge"><span class="e-dot"></span>En curso</span>
  </div>
  …
</article>
```

Bajo el puntero, o con el foco del teclado dentro, las esquinas crecen y toman el color de los resaltados (`--e-color-highlight`). Un clic o un toque no las enciende, aunque deje el foco dentro.

### Botón

```html
<button class="e-btn" type="button">Principal</button>
<button class="e-btn e-btn--solid" type="button">Sólido</button>
<button class="e-btn e-btn--danger" type="button">Peligro</button>
<button class="e-btn e-btn--sm e-btn--block" type="button">Compacto, ancho completo</button>
<button class="e-btn" type="button" disabled>Bloqueado</button>
```

`<a class="e-btn">` también funciona.

Con el foco del teclado, el botón se rellena, brilla y lleva un anillo de 2px; el anillo basta para verlo aunque el botón ya parezca activo.

### Badge y punto

```html
<span class="e-badge" data-tone="warn"><span class="e-dot"></span>Advertencia</span>
```

### Campo de texto

```html
<div class="e-field">
  <label class="e-label" for="target">Objetivo</label>
  <input class="e-input" id="target" placeholder="10.0.0.0/24">
</div>
```

`aria-invalid="true"` pinta el borde en rojo. El cursor de escritura usa el color de los resaltados.

### Interruptor

```html
<label class="e-row">
  <span class="e-switch"><input type="checkbox"><span class="e-switch__track"></span></span>
  <span class="e-label">Simulación</span>
</label>
```

Con el foco del teclado, la pista del interruptor lleva un anillo ámbar de 2px.

En los temas de contraste (forced colors), el círculo usa los colores del sistema para que encendido y apagado se distingan.

### Métrica

```html
<div class="e-metric" data-tone="warn">
  <span class="e-metric__value">74</span>
  <span class="e-metric__foot">Marea baja · 24h</span>
</div>
```

### Tabla

```html
<table class="e-table">
  <thead><tr><th>Hora</th><th>Origen</th></tr></thead>
  <tbody>
    <tr data-tone="danger"><td>08:22:19</td><td>185.220.101.4</td></tr>
    <tr class="e-empty"><td colspan="2">Sin datos</td></tr>
  </tbody>
</table>
```

### Pestañas

```html
<div class="e-tabs" data-tabs role="tablist">
  <button class="e-tab" role="tab" data-tab-target="#p-events">Eventos</button>
  <button class="e-tab" role="tab" data-tab-target="#p-log">Consola</button>
</div>
<div class="e-tabpanel" id="p-events" role="tabpanel">…</div>
<div class="e-tabpanel" id="p-log" role="tabpanel" hidden>…</div>
```

El runtime gestiona el clic y las flechas izquierda/derecha. Si añades pestañas después de cargar la página, llama a `EchorathUI.initTabs(contenedor)`.

### Consola

```html
<div class="e-log" role="log">
  <span class="e-log__line">[ 08:22:19 ] Construcción iniciada</span>
  <span class="e-log__line" data-tone="danger">[ 08:22:40 ] Enlace roto</span>
</div>
```

### Radar

```html
<div class="e-radar" data-tone="ok"></div>
<div class="e-radar" data-state="offline"></div>
```

### Cabecera

```html
<header class="e-header">
  <div>
    <h1 class="e-h1">Echorath</h1>
    <div class="e-header__sub">MÚSICA · ESCRITURA · IMAGEN</div>
  </div>
  <button class="e-btn e-btn--sm e-header__toggle" type="button"
          aria-expanded="false" aria-controls="main-nav">Menú</button>
  <nav class="e-header__nav" id="main-nav" aria-label="Secciones">
    <a class="e-btn" href="#musica">Música</a>
    <a class="e-btn" href="#contacto">Contacto</a>
  </nav>
</header>
```

Por defecto es `position: fixed`: deja hueco arriba en el contenido de la página. Con `.e-header--sticky` ocupa su sitio en el flujo y se queda pegada arriba al desplazarse; así no hace falta ese hueco.

La barra siempre ocupa todo el ancho, y su contenido se alinea con `.e-container`. El runtime guarda su altura en `--e-header-offset`, y la página usa ese valor como `scroll-padding-top`: los enlaces `#seccion` dejan el destino justo debajo de la barra, sin ajustes manuales.

Por debajo de 640px la cabecera queda en una sola fila compacta: la marca y el botón `__toggle`. El subtítulo se oculta y `__nav` se despliega debajo al pulsar el botón. El runtime:

- alterna la clase `is-open` en el menú y actualiza `aria-expanded`;
- cambia el texto del botón a "Cerrar" mientras está abierto (otro texto con `data-close-label="…"`);
- cierra el menú al elegir un enlace o botón de dentro, o con Escape (el foco vuelve al botón).

Por encima de 640px, el runtime pliega la cabecera de la misma forma (clase `is-compact`) en cuanto la marca y la navegación dejan de caber en una fila. Así no se reparte en dos o tres filas en una tableta. Con el menú abierto, los enlaces se ordenan en una rejilla. Vuelve a comprobarlo al cambiar el tamaño de la ventana, al cargarse las fuentes y al añadir o quitar enlaces. Una cabecera sin `__toggle` nunca se pliega, porque no habría forma de abrir el menú.

Si caben, el botón no se muestra y `__nav` está siempre visible. Si añades una cabecera después de cargar la página, llama a `EchorathUI.initHeaders(contenedor)`.

### Lectura

```html
<article class="e-prose">
  <p class="e-prose__meta">Ensayo · 2025 · 4 min de lectura</p>
  <p>Hay barrios que parecen copias de otros barrios…</p>
  <blockquote>La repetición no vacía un lugar.</blockquote>
</article>
```

Para textos largos: Literata (`--e-font-text`) a 18px, interlineado 1,7 y unas 66 letras por línea, centrado en su contenedor. Da estilo a párrafos, `h2`, `h3`, listas, citas y enlaces; `__meta` es una línea de datos en la fuente de la interfaz. Se ajusta con `--e-prose-size` y `--e-prose-measure` sobre el propio `.e-prose`. Por debajo de 640px la letra baja a 17px. Dentro de un modal `lg`, el texto queda a la medida de lectura.

### Contenedor

```html
<main class="e-container">…</main>
```

Centra el contenido a `--e-container-max` (1200px) con un margen lateral `--e-gutter` (16–32px según el ancho) que respeta las zonas seguras del móvil.

### Rejilla y flujo

```html
<div class="e-grid">
  <div class="e-span-6">…</div>
  <div class="e-span-6">…</div>  <!-- columnas: e-span-3, -4, -6 y -12 -->
</div>
<div class="e-stack">…</div>   <!-- columna con separación -->
<div class="e-row">…</div>     <!-- fila que se ajusta -->
```

Por debajo de 900px, todas las columnas ocupan el ancho completo.

---

## Tonos

`data-tone` vale en cualquier elemento y lo heredan sus hijos (salvo los componentes que fijan su propio tono, como `.e-btn`).

| Valor | Color | Uso |
|---|---|---|
| `ok` | verde | correcto, integridad |
| `info` | azul | información |
| `warn` | ámbar | advertencia, simulación |
| `danger` | rojo | error, peligro |
| `sys` | cian | sistema, modo técnico |
| `off` | gris | desconectado |

`data-tone` siempre gana a los modificadores: `<button class="e-btn e-btn--danger" data-tone="ok">` es verde.

---

## Distorsiones de carga

| Variante | Efecto | Requiere JS |
|---|---|---|
| `standard` | Desdoblamiento rojo/cian con temblor leve. **Por defecto** | No |
| `flicker` | Parpadeo y pulso de tono | No |
| `glitch` | Separación fuerte, temblor y cortes | No |
| `scan` | Franjas horizontales desplazadas | No |
| `wave` | Inclinación oscilante | No |
| `shatter` | Recorte poligonal que se rompe | No |
| `warp` | Desplazamiento líquido (filtro SVG) | Sí |
| `static` | Grano de alta frecuencia (filtro SVG) | Sí |
| `decode` | El texto se cifra y se revela. Solo elementos de texto | Sí |

En HTML, sin JavaScript propio:

```html
<div class="e-panel" data-loading>…</div>                     <!-- standard -->
<div class="e-panel" data-loading data-distort="scan">…</div>
```

Ajustes del desdoblamiento (en `:root` o en un contenedor):

```css
:root {
  --e-distort-split: 3px;
  --e-distort-a: var(--e-color-red);
  --e-distort-b: var(--e-color-cyan);
}
```

Con el sistema en "reducir movimiento", ninguna distorsión se anima: el elemento queda atenuado al 55 %, y `decode` no cifra el texto.

### Garantías de acabado

Las pruebas de `tests/effects.test.mjs` comprueban cada variante sobre panel, botón, badge, métrica, título, texto en línea, tabla, lienzo y panel a todo el ancho:

- **Se ve:** los fotogramas durante el efecto difieren de la imagen en reposo.
- **No mueve nada:** ni el componente ni lo que tiene al lado cambian de posición o tamaño. `decode` fija el ancho y el alto mientras cifra, porque los glifos de Orbitron no miden lo mismo.
- **Termina limpio:** al acabar, el componente es idéntico píxel a píxel a como estaba, con su texto intacto y sin atributos ni estilos sobrantes.
- **Sin desplazamiento horizontal** en móvil.
- **Sin destellos peligrosos:** ninguna variante baja y sube el brillo más de 3 veces por segundo (WCAG 2.3.1).
- **Comportamiento:** cambiar de variante a mitad libera lo que tenía la anterior (texto de `decode`, bucle de ruido); relanzar `decode` mientras se revela conserva el texto real; cada elemento tiene un único temporizador de revelado; el bucle de ruido se detiene al terminar o si el elemento desaparece de la página.

Un elemento `display: inline` ignora `transform`. Mientras se distorsiona, el runtime lo convierte en caja (`data-boxed`, `inline-block`), así que `wave` o `glitch` también se ven sobre texto en línea. Un texto en línea que ocupe varias líneas se distorsiona como un bloque.

Un elemento en carga no acepta clics, y sus hijos tampoco. Para que un control siga funcionando dentro de un componente que se distorsiona (por ejemplo, el botón "Detener" de una pista), márcalo con `data-e-interactive`:

```html
<div class="e-panel" data-loading>
  <button class="e-btn" data-e-interactive>Detener</button>
</div>
```

Si un contenido debe verse siempre distorsionado pero tiene que poder leerse, añade `data-e-pause-on-hover`. El elemento sigue aceptando el puntero, y la distorsión se detiene del todo mientras el puntero está encima o el foco de teclado está en él o dentro (por ejemplo, al tabular hasta un botón suyo). El foco que deja un clic con el ratón no cuenta:

```html
<article class="e-panel" data-loading data-e-pause-on-hover>…</article>
```

Fuera de la pantalla, cualquier distorsión se detiene: el runtime marca el elemento con `data-e-offscreen` mientras no se ve, y eso pausa su animación y su parte de los bucles de ruido (`warp`, `static`) y de `decode`. Vuelve a moverse 100px antes de entrar en pantalla. Vale tanto para lo que arranca `load()` como para cualquier elemento que reciba `data-loading` después de `init()`, aunque lo ponga la página por su cuenta.

---

## Efectos de foco

| `data-focus` | Efecto |
|---|---|
| (ninguno) | Brillo y contorno del tono |
| `glitch` | Sacudida breve con cortes |
| `sweep` | Banda de luz que recorre el elemento |

## Pantallas táctiles

Con puntero táctil (`pointer: coarse`), botones, pestañas y el cierre del modal miden al menos 44px de alto, incluido `.e-btn--sm`. Si en tu página reduces la altura de un botón, hazlo dentro de `@media (pointer: fine)` para no perder esa medida en móvil.

---

## API del runtime

Disponible como `window.EchorathUI` (build IIFE) o como exportaciones con nombre (build ESM). Tipos en `types/echorath-ui.d.ts`.

### `load(target, { variant }?)`

Pone el elemento en carga. `target` es un elemento o un selector. Devuelve el elemento o `null`. Lanza un error si la variante no existe. `decode` sobre un elemento con hijos se sustituye por `standard` y muestra un aviso en consola.

### `ready(target, { reveal = true, tone }?)`

Termina la carga y, si `reveal` no es `false`, reproduce la animación de salida.

### `wait(target, promise, opts?)`

```js
const data = await EchorathUI.wait('#panel', fetch('/api/feed').then(r => r.json()));
```

Si la promesa se rechaza, el elemento recibe el tono `danger` y el error se relanza.

Si llamas otra vez a `load`, `wait` o `loadFor` sobre el mismo elemento antes de que termine, la llamada más reciente manda: la anterior ya no termina la carga antes de tiempo.

### `loadFor(target, ms = 2000, opts?)`

```js
await EchorathUI.loadFor('#panel', 1200, { variant: 'glitch' });
```

### `configure(options?)`

```js
EchorathUI.configure({ defaultVariant: 'flicker', revealMs: 500 });
const current = EchorathUI.configure(); // sin argumentos: devuelve una copia
```

| Opción | Por defecto | Significado |
|---|---|---|
| `defaultVariant` | `'standard'` | Variante cuando no hay `variant` ni `data-distort` |
| `revealMs` | `700` | Duración del estado de revelado |
| `noiseIntervalMs` | `80` | Cada cuánto cambia el ruido de `warp`/`static` |
| `decodeScrambleMs` | `60` | Ritmo del cifrado en `decode` |
| `decodeRevealStepMs` | `28` | Ritmo de la revelación en `decode` |
| `toastMs` | `3000` | Tiempo mínimo en pantalla de un toast; uno largo dura lo que se tarda en leer |

`configure` cambia lo que usa `load()`. Un elemento escrito en HTML con `data-loading` y sin `data-distort` usa `standard` desde el CSS hasta que `init()` lo registra.

### `tone(target, name)`

Pone `data-tone`. Acepta alias: `success`, `warning`, `error`, `offline`.

### `toast(title, message?, tone = 'info', ms?)`

Título y mensaje se insertan como texto, nunca como HTML.

Un toast nunca dura menos de lo que se tarda en leer: 1,5 s para verlo y unos 300 ms por palabra (200 palabras por minuto), aunque `ms` sea menor. La cuenta atrás se detiene mientras el puntero o el foco están encima, y sigue al salir.

### `modal({ title, body, tone, size, actions })`

```js
const ok = await EchorathUI.modal({
  title: 'Confirmar',
  body: '¿Publicar la obra?',
  tone: 'warn',
  actions: [
    { label: 'Cancelar', value: false },
    { label: 'Publicar', value: true, variant: 'solid' },
  ],
});
```

Devuelve el `value` de la acción pulsada, o `undefined` al cerrar con Escape, con el botón × o al pulsar fuera. `body` puede ser texto o un nodo DOM. El foco queda atrapado dentro del modal y vuelve al elemento anterior al cerrarlo. Mientras está abierto, la página de fondo no se desplaza.

`size`: `'md'` (420px, por defecto) o `'lg'` (720px, para leer textos o ver imágenes).

La promesa que devuelve es también un control del modal abierto, para contenido que cambia sin cerrarlo, como un lector o una galería con anterior y siguiente:

```js
const reader = EchorathUI.modal({ title: textos[0].titulo, body: pagina(0), size: 'lg' });
siguiente.addEventListener('click', () => {
  reader.setTitle(textos[1].titulo);   // también el nombre accesible del diálogo
  reader.setBody(pagina(1));           // texto o nodo; el cuerpo vuelve arriba
});
reader.element.classList.add('mi-visor');   // el diálogo (.e-modal), para estilos propios
reader.close('listo');                      // cierra y resuelve la promesa con 'listo'
```

`close()` se puede llamar más de una vez: las siguientes no hacen nada.

Al imprimir con un modal abierto, solo sale su contenido: entero, sin el marco y sin botones. Así, un texto abierto en un lector se imprime como ese texto.

### `init(root = document)` · `initHeaders(root = document)` · `initTabs(root = document)`

`init` inyecta los filtros SVG, conecta las cabeceras y las pestañas, y arranca los elementos con `data-loading`. Se ejecuta solo al cargar la página, salvo que `<html>` tenga `data-e-manual`. Repetirlo es seguro.

### `fxPicker(target, { name, variants, duration, open, label })`

Selector de efectos: un botón "Efectos" que despliega un botón por variante. Cada botón reproduce su efecto sobre `target` durante `duration` ms (1600 por defecto), con una barra que marca el tiempo restante. Pulsarlo otra vez lo detiene, y pulsar otro cambia de efecto al momento. `decode` solo aparece si el objetivo contiene únicamente texto. Devuelve el elemento: insértalo **junto al objetivo, no dentro**, porque `glitch`, `scan` y `shatter` recortarían el selector mientras se reproducen.

```js
const panel = document.querySelector('#panel');
panel.after(EchorathUI.fxPicker(panel, { name: 'el panel' }));
```

Si el objetivo ya estaba distorsionado a propósito (`data-loading`, con o sin `data-e-pause-on-hover`), al terminar recupera su variante, su pausa y su `aria-busy`. Mientras el efecto se reproduce, la pausa al pasar el puntero se desactiva: si no, pulsar el botón pausaría el efecto que se quiere ver.

| Opción | Por defecto | Significado |
|---|---|---|
| `name` | `''` | Nombre del objetivo, para la etiqueta accesible del grupo y del botón ("Efectos de …"): con muchos selectores en la página, un lector de pantalla los distingue. «el panel» da «Efectos del panel» |
| `variants` | todas | Variantes ofrecidas, en orden |
| `duration` | `1600` | Duración de cada efecto en ms |
| `open` | `false` | Mostrar los botones desde el principio |
| `label` | `'Efectos'` | Texto del botón que despliega |

Escape cierra los botones y devuelve el foco al botón "Efectos". Cada botón lleva una descripción del efecto como `title`.

### `version` · `variants`

Versión del paquete y lista de variantes en orden.
