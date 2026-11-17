# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versiones según [SemVer](https://semver.org/lang/es/).

## [3.0.0] · 2026-11-17

### Eliminado (incompatible)

- **Radar (`.e-radar`), métrica (`.e-metric`) y consola (`.e-log`).** Eran componentes de panel de control que la web de Echorath no usa. Con ellos se van la animación `e-anim-sweep` y el atributo `data-state`. La hoja de estilos minificada pesa 1,2 KB menos.

### Cambiado

- Las pruebas encuentran Chromium por sí mismas (`CHROMIUM_PATH`, el navegador preinstalado o el Chromium completo que instala `npx playwright-core install --no-shell chromium`), así que también se ejecutan en una máquina limpia o en GitHub Actions.

## [2.0.0] · 2026-11-17

### Cambiado (incompatible)

- **Nombres definitivos.** El framework se llama Echorath UI: archivos `dist/echorath-ui.*` y `types/echorath-ui.d.ts`, objeto global `EchorathUI` y prefijo `e-` en clases (`.e-btn`), variables (`--e-color-green`), atributos (`data-e-manual`), capas (`e.components`) y filtros SVG (`#e-warp`). El aspecto y el comportamiento no cambian.
- Los ejemplos y la documentación usan contenido de Echorath.

## [1.9.3] · 2026-11-01

Sale de la revisión final del portafolio de Echorath.

### Corregido

- **El anillo de foco de los botones mide 2px.** Era de 1px. Casi siempre daba igual, porque un botón con el foco también se rellena y brilla; pero un botón que ya se ve activo (la sección actual en una barra, un interruptor pulsado) solo cambia por el anillo, y con 1px no alcanzaba el tamaño que pide WCAG 2.4.13 (AAA). Una prueba nueva lo comprueba.

## [1.9.2] · 2026-10-28

Sale de la decimoséptima revisión del portafolio de Echorath.

### Corregido

- **El anillo de foco del interruptor mide 2px.** Era de 1px y, a diferencia de un botón, el interruptor no tiene relleno ni brillo al recibir el foco: el anillo es lo único que lo marca. Con 2px alcanza el tamaño que pide WCAG 2.4.13 (AAA), como el resto de controles. Una prueba nueva lo comprueba.

## [1.9.1] · 2026-10-27

Sale de la decimosexta revisión del portafolio de Echorath.

### Corregido

- **Las esquinas de un panel ya no se quedan en rojo después de un clic o de tocarlo.** Se encendían con cualquier foco dentro (`:focus-within`), y un clic o un toque también lo deja dentro, por ejemplo cuando un diálogo devuelve el foco al botón que lo abrió. Ahora se encienden con el puntero encima o con el foco del teclado, que es el que se ve (`:has(:focus-visible)`). Igual el brillo del panel. Una prueba nueva lo comprueba.

## [1.9.0] · 2026-10-27

Sale del rojo de acento que pidió el portafolio de Echorath: el menos presente de la paleta, solo para resaltar.

### Añadido

- **Un color para los resaltados, `--e-color-highlight`**, que sigue al rojo. Es el color menos presente de la paleta y solo marca algo concreto: el texto seleccionado, el pasaje al que lleva un enlace (`#:~:text=`), `<mark>`, el cursor de los campos y las esquinas de un panel bajo el puntero o el teclado. El texto blanco sobre la selección se lee a 10:1. Dos pruebas nuevas lo comprueban.

## [1.8.4] · 2026-10-27

Sale del verde de terminal del portafolio de Echorath, que cambia `--e-color-green`.

### Corregido

- **Los brillos de la cabecera y de los diálogos siguen a `--e-color-green`.** Estaban escritos con el verde por defecto, así que una página que cambiaba ese token los dejaba de otro color. Con el verde por defecto se ven igual que antes. Una prueba nueva lo comprueba.

## [1.8.3] · 2026-10-27

Dos piezas que salen de la decimoquinta revisión del portafolio de Echorath.

### Cambiado

- **Cada botón «Efectos» dice de qué es.** Con `name`, el botón que despliega el selector se llama «Efectos de …» para un lector de pantalla, igual que su grupo; antes, una lista de botones leía «Efectos» tantas veces como selectores hubiera. El texto visible no cambia y el nombre empieza por él (WCAG 2.5.3). Una prueba nueva lo comprueba.
- **«Efectos del panel», no «de el panel».** Un `name` que empieza por «el» se contrae en las etiquetas accesibles. Otra prueba nueva lo comprueba.

## [1.8.2] · 2026-10-27

Una pieza que sale de la decimocuarta revisión del portafolio de Echorath.

### Cambiado

- **La barra de desplazamiento se ve y se agarra.** La guía pasa de `#222` sobre `#020202` (1,3:1) al color de los bordes, `--e-color-line-strong` (4:1, y 6,5:1 si el sistema pide más contraste), y la barra de 6 a 10px de ancho. La guía se ve igual de fina: un borde transparente la estrecha. Una prueba nueva lo comprueba.

## [1.8.1] · 2026-10-25

Una pieza que sale de la duodécima revisión del portafolio de Echorath.

### Añadido

- **Más contraste cuando el sistema lo pide** (`prefers-contrast: more`): el texto tenue pasa de 4,8:1 a 7,6:1 y el secundario a 11:1 (WCAG AAA), y las líneas y los bordes se aclaran. Sin esa preferencia no cambia nada. Una prueba nueva lo comprueba.

## [1.8.0] · 2026-10-25

Dos piezas que salen de la undécima revisión del portafolio de Echorath.

### Cambiado

- **Las etiquetas son algo más grandes.** `--e-font-size-xs` pasa de 0,7rem (10,5px) a 0,75rem (11,25px), el mínimo que usan iOS y Android para etiquetas, y `--e-font-size-2xs` de 0,65rem a 0,7rem. Afecta a `.e-label`, `.e-btn--sm`, la línea de datos de `.e-prose`, el subtítulo de la cabecera y las cabeceras de tabla.
- **Un toast dura lo que se tarda en leerlo**: 1,5 s para verlo y unos 300 ms por palabra, y nunca menos que `ms` (por defecto, 3 s). La cuenta atrás se detiene mientras el puntero o el foco están encima, y sigue al salir. Antes, uno de 12 palabras se iba a los 3 s, antes de poder leerlo.

## [1.7.1] · 2026-10-25

### Corregido

- **Los campos y el interruptor se distinguen del fondo.** Su borde usaba el color de las líneas decorativas y contrastaba 1,38:1 (el campo) y 2,73:1 (el interruptor), por debajo del 3:1 que pide WCAG 1.4.11 para lo que identifica un control. Nuevo token `--e-color-line-strong` (#6e6e6e, 3,9:1 sobre la superficie), que usan `.e-input` y `.e-switch`. Una prueba nueva lo comprueba.

## [1.7.0] · 2026-10-25

Tres piezas que salen de la novena revisión del portafolio de Echorath.

### Cambiado

- **Las fuentes vienen incluidas.** Orbitron, JetBrains Mono y Literata están en `dist/fonts` (woff2, alfabetos latino y latino extendido, con sus licencias SIL Open Font License), y el CSS ya no las pide a Google Fonts. La página no hace ninguna petición a otros servidores, así que la dirección del visitante no llega a Google, y la cadena «hoja de Echorath UI → hoja de Google → fuentes» desaparece. En el portafolio, con un móvil y red lenta, la primera pantalla pasó de 2,4 a 1,6 s con el mismo peso. Quien copie `echorath-ui.css` a otra carpeta tiene que copiar también `fonts/`.

### Corregido

- En pantallas táctiles, un botón, un panel, una pestaña o una fila de tabla se quedaban con el aspecto de "señalado" después de tocarlos, hasta tocar otra cosa: un botón apagado parecía encendido. Ahora ese aspecto solo se aplica con un puntero que señala (`@media (hover: hover)`).
- Una palabra que no cabía en su línea, como una dirección web larga, se salía de su caja y podía hacer que la página se desplazara de lado. Ahora se parte (`overflow-wrap: break-word`).

## [1.6.1] · 2026-10-24

### Corregido

- **«static» parpadeaba demasiado.** Bajaba y subía el brillo 11 veces por segundo (5,5 destellos). Sobre una imagen grande y luminosa, más de 3 destellos por segundo ocupaban el 33,6 % de un campo visual de 10°, por encima del 25 % que permite WCAG 2.3.1. Ahora lo hace 2,5 veces por segundo; el grano rápido se queda. Una prueba nueva comprueba que ninguna variante pasa de 3 destellos por segundo.

## [1.6.0] · 2026-10-24

Tres piezas que salen de la séptima revisión del portafolio de Echorath.

### Añadido

- **Las distorsiones se detienen fuera de la pantalla.** Mientras un elemento en carga no se ve, el runtime lo marca con `data-e-offscreen`: su animación se pausa y deja de contar para los bucles de ruido (`warp`, `static`) y de `decode`. Vuelve a moverse 100px antes de entrar en pantalla. Incluye los elementos que reciben `data-loading` después de `init()`. En el portafolio, tres tarjetas distorsionadas a propósito ocupaban entre el 61 y el 77 % del procesador de un móvil de gama media emulado aunque estuvieran fuera de la pantalla; ahora, nada.
- **Estilo de impresión** (`base/print.css`): negro sobre blanco, sin brillos ni distorsiones, y la barra superior una sola vez. Con un modal abierto se imprime solo su contenido, entero, sin marco ni botones. En el portafolio, un texto de 78 palabras pasaba de 9 hojas repetidas a 1.

### Corregido

- En los temas de contraste (forced colors), el círculo de `.e-switch` desaparecía y el interruptor se veía igual encendido que apagado.

## [1.5.1] · 2026-10-24

### Corregido

- **La letra respeta el tamaño que el visitante elige en su navegador.** La base estaba fijada en 15px, así que subir el tamaño de letra en el navegador no cambiaba nada. Ahora es el 93,75 % de ese ajuste: con el habitual (16px) sigue siendo 15px y la página se ve igual; con 24px, el texto pasa a 22,5px. El zoom ya funcionaba y sigue igual.

## [1.5.0] · 2026-10-23

Tres piezas que salen del portafolio de Echorath, donde resolvían problemas que tendría cualquier página.

### Añadido

- **La cabecera se pliega cuando no cabe.** Por encima de 640px, el runtime pone `.e-header.is-compact` en cuanto la marca y la navegación dejan de caber en una fila, y la barra pasa al mismo menú que en el móvil. Con el menú abierto, los enlaces se ordenan en una rejilla. Se vuelve a comprobar al cambiar el tamaño de la ventana, al cargar las fuentes y al añadir o quitar enlaces. Solo afecta a cabeceras con `.e-header__toggle`.
- **`modal()` devuelve un control del modal abierto**, sin dejar de ser la promesa de siempre: `element` (el diálogo), `setTitle()`, `setBody()` y `close(valor)`. Sirve para lectores y galerías que cambian de contenido sin cerrarse. Tipo `ModalHandle` en `types/echorath-ui.d.ts`.
- **`.e-prose`**, para leer textos largos: Literata a 18px, interlineado 1,7 y unas 66 letras por línea, con `__meta` para la línea de datos. Nuevo token `--e-font-text`, y variables `--e-prose-size` y `--e-prose-measure`. Literata se añade a la importación de Google Fonts; el navegador solo la descarga si la página la usa.
- Sección «Lectura» en `examples/index.html`, con un lector que usa `setTitle()`.

### Cambiado

- Entre 640px y el ancho en que cabe toda la navegación, una cabecera con botón de menú ya no se reparte en varias filas: se pliega en el menú. En el portafolio, la barra pasaba de 162px (tres filas) a 52px a 768px.

### Corregido

- Llamar dos veces al cierre de un modal descontaba dos veces el bloqueo del desplazamiento, y podía desbloquear el fondo con otro modal todavía abierto.
- Una cabecera quitada de la página dejaba `--e-header-offset` en 0px.

## [1.4.0] · 2026-10-23

Revisión del acabado de cada distorsión con un banco de pruebas: 9 variantes × 9 tipos de componente, más pruebas de comportamiento.

### Corregido

- `decode` ya no mueve lo que hay alrededor: fija el ancho y el alto del elemento mientras cifra (Orbitron no es monoespaciada, y una métrica pasaba de 80 a 84px).
- Relanzar `decode` mientras se revelaba dejaba el texto corrupto para siempre (por ejemplo, "Esc<+#{^*"). Ahora conserva el texto real.
- Cambiar de `decode` a otra variante a mitad restaura el texto al momento, y cambiar desde `warp` o `static` suelta el bucle de ruido.
- Con movimiento reducido, `decode` ya no cifra el texto.
- El temporizador de un revelado anterior ya no corta el siguiente.
- El bucle de ruido de `warp` y `static` se detiene si el elemento desaparece de la página sin `ready()`.
- `wave` (y el temblor de las demás) no se veía sobre texto `inline`: el runtime lo convierte en caja mientras se distorsiona (`data-boxed`).
- Un `ready()` manual retira los `wait()`/`loadFor()` pendientes, que ya no vuelven a revelar el elemento cuando vence su temporizador.

### Añadido

- `fxPicker(target, opciones)`: selector de efectos con un botón por variante, barra de tiempo restante, parada y cambio al momento, y restauración de la distorsión permanente del objetivo.
- Laboratorio de efectos en `examples/index.html`.
- `tests/effects.test.mjs` (89 pruebas), `tests/fxpicker.test.mjs` (10) y el banco `tests/fixtures/effects.html`.

## [1.3.0] · 2026-10-23

### Añadido

- `data-e-pause-on-hover`: para contenido que se muestra siempre distorsionado. El elemento sigue aceptando el puntero, y la distorsión se detiene del todo mientras el puntero está encima o el foco de teclado está dentro, para poder leerlo. El foco que deja un clic con el ratón no mantiene la pausa.

## [1.2.0] · 2026-10-23

Repaso de UX: problemas encontrados probando todos los controles de una página real (el portafolio de Echorath) dentro del esqueleto de su host.

### Corregido

- **La fuente y `color-scheme` de la página ya no se pierden con resets externos.** Un reset sin capa (como el del host de los artefactos) ganaba a la base del framework: la página salía con la fuente del sistema a 14px y con controles nativos claros. `base/document.css` va ahora sin capa.
- **Contraste:** `--e-color-text-faint` pasa de `#5a5a5a` (2,9:1) a `#7d7d7d` (4,8:1), que cumple WCAG AA sobre las superficies del framework.
- **Cargas solapadas:** si se lanzaba `wait`/`loadFor` sobre un elemento que ya estaba cargando, la primera llamada terminaba la segunda antes de tiempo. Ahora manda la más reciente.
- **Botón de cerrar del modal:** con puntero táctil mide 44px; antes su `min-height: 0` anulaba el tamaño táctil.

### Añadido

- `.e-container`: contenido centrado (`--e-container-max`) con margen lateral `--e-gutter` que respeta las zonas seguras.
- `.e-header--sticky`: la barra ocupa su sitio en la página y se queda arriba al desplazarse. La barra siempre ocupa todo el ancho y alinea su contenido con `.e-container`.
- `--e-header-offset`: el runtime guarda ahí la altura de la barra y la página la usa como `scroll-padding-top`. Los enlaces a secciones ya no dejan el título debajo de la barra.
- `data-e-interactive`: un control dentro de un elemento en carga sigue aceptando clics.
- `modal({ size: 'lg' })` y `.e-modal--lg` (720px) para leer o ver imágenes.
- Bloqueo del desplazamiento de fondo mientras hay un modal abierto (`html.is-scroll-locked`), con `scrollbar-gutter: stable` para que la página no salte.
- Botones, pestañas y botones compactos miden 44px de alto con puntero táctil.
- Desplazamiento suave hacia las secciones, salvo con movimiento reducido.

### Cambiado

- En pantallas de más de 1200px, el contenido de `.e-header` se alinea con `.e-container`. Su margen interior lateral crece y deja de ser de 32px fijos.

## [1.1.0] · 2026-10-23

### Añadido

- Cabecera compacta en móvil: por debajo de 640px, `.e-header` queda en una fila con la marca y un botón de menú (`.e-header__toggle`), y la navegación (`.e-header__nav`) se despliega debajo.
- `initHeaders()`, que `init()` llama solo: abre y cierra el menú, actualiza `aria-expanded`, lo cierra al elegir una opción o con Escape. `data-close-label` cambia el texto del botón con el menú abierto.
- La cabecera respeta las zonas seguras de pantalla (`safe-area-inset`).

## [1.0.0] · 2026-10-23

Reorganización profesional del framework: código fuente modular, build con source maps, pruebas y documentación.

### Cambiado (incompatible con 0.1.0)

- **`standard` es ahora el desdoblamiento cromático rojo/cian con temblor leve**, y sigue siendo la variante por defecto.
- `glitch` es más agresivo: separación mayor, temblor y cortes horizontales.
- Los archivos para usar el framework están en `dist/` (`dist/echorath-ui.css`, `dist/echorath-ui.js`). Ya no existen `echorath-ui.css` ni `echorath-ui.js` en la raíz.
- La variable de tono se llama `--e-tone` (antes `--tone`).
- Los tokens tienen categoría en el nombre: `--e-green` → `--e-color-green` (igual para `blue`, `red`, `amber`, `cyan` y `grid`), `--e-bg` → `--e-color-bg`, `--e-surface` → `--e-color-surface`, `--e-line` → `--e-color-line`, `--e-text` → `--e-color-text`, `--e-text-dim` → `--e-color-text-dim`, `--e-text-faint` → `--e-color-text-faint`, `--e-spring` → `--e-ease-spring`, `--e-dur` → `--e-duration-base`.
- El toast visible usa la clase `is-visible` (antes `is-show`).
- El CSS se organiza en capas de cascada (`@layer`). Los estilos de tu proyecto escritos fuera de una capa ganan siempre a los del framework.

### Añadido

- Variante `flicker` (el parpadeo que antes era `standard`).
- Tokens de espaciado, tamaños de texto, brillo, duraciones, capas z y ajuste de la distorsión (`--e-distort-split`, `--e-distort-a`, `--e-distort-b`).
- `configure()` para cambiar la variante por defecto y los tiempos.
- `EchorathUI.version`, `EchorathUI.initTabs()` y la opción `data-e-manual` para desactivar el auto-init.
- Build ESM (`dist/echorath-ui.esm.js`), versiones minificadas y source maps de todos los archivos.
- Tipos de TypeScript en `types/echorath-ui.d.ts`.
- Modificadores `.e-btn--ghost` y `.e-btn--sm`; elemento `.e-modal__close`.
- Pruebas automáticas en Chromium (`npm test`).
- Documentación: `docs/MAP.md`, `docs/REFERENCE.md` y `docs/CONVENTIONS.md`.

### Corregido

- `decode` sobre un elemento con hijos ya no borra su marcado: usa `standard` y avisa en consola.
- `init()` se puede llamar varias veces sin duplicar los eventos de las pestañas ni los filtros SVG.
- Con movimiento reducido también se quita el desdoblamiento de color, no solo la animación.

## [0.1.0] · 2026-10-21

- Primera versión: componentes, efectos de foco y ocho distorsiones de carga en `echorath-ui.css` y `echorath-ui.js`.
