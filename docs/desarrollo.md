# Cómo se construye y se publica la web

[![Publicar la web](https://github.com/damdavidprieto/Echorath/actions/workflows/pages.yml/badge.svg)](https://github.com/damdavidprieto/Echorath/actions/workflows/pages.yml)

La guía técnica del portafolio de Echorath: cómo se añade una obra, cómo se prueba la web y cómo se publica. La web está hecha con Echorath UI, el framework de la carpeta [`framework/`](../framework/).

Hay dos webs, construidas desde el mismo código:

| Web | Dirección | Qué muestra |
|---|---|---|
| Producción | https://damdavidprieto.github.io/Echorath/ | Solo lo publicado. Es la web pública. |
| Desarrollo | https://damdavidprieto.github.io/Echorath/dev/ | Todo, con cada obra marcada según su estado. Los buscadores no la indexan. |

## Qué hay en el repositorio

```
site/
  content/        el contenido: una obra por archivo
    schemas/      qué campos lleva cada tipo de archivo (el editor los usa)
  template/
    index.html    la página, con las marcas de lo que se muestra en cada web
    css/          sus estilos, un archivo por parte de la página (index.css fija el orden)
    js/           su código, un archivo por parte, en el orden de su número
    404.html      la página de error
  static/         iconos e imagen para compartir el enlace
  build.mjs       el generador: junta plantilla y contenido en dist/
  dev.mjs         el servidor de trabajo (npm run dev)
  tests/          pruebas del generador
framework/        Echorath UI (tiene su propio README)
.github/          las pruebas y la publicación en GitHub Pages
.vscode/          une cada archivo de contenido con su esquema
```

`dist/` es lo que se genera; no se guarda en el repositorio.

### Los estilos y el código de la página

- **Estilos** (`site/template/css/`): `tokens.css` tiene los colores propios, las variables y los puntos de corte (560 y 900 px de ancho, y 500 px de alto para un móvil tumbado). Cada parte de la página tiene su archivo, con sus versiones para móvil al lado. Un archivo nuevo se añade a `index.css`; si se olvida, la construcción se detiene y lo dice.
- **Código** (`site/template/js/`): un archivo por parte, numerado (`10-musica.js`, `11-visor.js`…). El generador los une en ese orden en un solo ámbito, así que una parte puede usar lo que define otra anterior.
- La web publicada recibe un solo `site.css` minificado y un solo `site.js`, cada uno con la huella de su contenido en la dirección.

## El estado de cada obra

Cada obra lleva un `status`:

| Estado | Significa | Desarrollo | Producción |
|---|---|---|---|
| `sample` | Muestra de cómo se verá | Sí, con la etiqueta «Muestra» | No |
| `draft` | Borrador | Sí, con la etiqueta «Borrador» | No |
| `review` | En revisión | Sí, con la etiqueta «En revisión» | No |
| `published` | Revisada y lista | Sí | Sí |

En producción, una sección sin nada publicado no aparece: ni la sección, ni su enlace en la barra, ni su tarjeta en «Por dónde empezar». El contacto aparece cuando el correo está publicado.

Un estado mal escrito (por ejemplo `publicado`) detiene la construcción con un mensaje que dice en qué archivo está, así que nunca se publica nada por error.

### Llevar una obra a producción

1. Revísala en la web de desarrollo.
2. Cambia su `status` a `published`.
3. Sube el cambio a `main`. En un par de minutos está en producción.

## Añadir contenido

El orden de cada sección lo da el número con que empieza el nombre del archivo: `01-…`, `02-…`, … `10-…`.

Al construir, el generador comprueba cada obra: si falta un campo o tiene un valor que no sirve (una duración como `3.42`, un tipo de imagen que no existe, un enlace que no es `https://` ni `mailto:`), se detiene y dice en qué archivo y qué campo.

**Música** · `site/content/musica/02-titulo.json`

```json
{
  "status": "draft",
  "title": "Título de la pista",
  "release": "Nombre del disco",
  "album": "EP Nombre del disco · 2026",
  "dur": "3:42",
  "notes": [220, 277, 330, 277, 247, 330, 370, 330]
}
```

`notes` son las ocho notas (en hercios) de la muestra que suena en el navegador.

**Escritura** · `site/content/escritura/02-titulo.md`

```
---
status: draft
kind: Cuento
year: 2026
title: Título del texto
summary: Una o dos frases que lo presenten.
---

Primer párrafo.

Segundo párrafo: los párrafos se separan con una línea en blanco.
```

**Imágenes** · `site/content/imagenes/02-titulo.json`: `status`, `title`, `seed`, `kind` y `year`. `kind` es uno de Círculos, Arcos, Retícula, Líneas, Bloques u Ondas.

**Algoritmos** · una carpeta por algoritmo, por ejemplo `site/content/algoritmos/02-espiral/`:

- `meta.json`: `{ "status": "draft" }`
- `pseudo.txt`: el pseudocódigo, tal como se verá.
- `algorithm.js`: las funciones del algoritmo y su ficha.

```js
function espiral(ctx, width, height, { seed, time, pointer }) {
    // dibuja en el lienzo
}

export default {
    title: 'Espiral', year: 2026,
    mode: 'seed',            // 'seed', 'animation' o 'interactive'
    summary: 'Una frase que diga qué hace.',
    alt: input => 'Qué se ve, para quien no puede verlo.',
    input: { seed: 7 },      // solo en modo 'seed'
    draw: espiral,
    code: { espiral },       // lo que muestra la ventana «Ver código», tal como se ejecuta
};
```

Cada algoritmo se ejecuta en su propio ámbito: sus funciones pueden llamarse igual que las de otro algoritmo. Desde él se pueden usar las ayudas de la página, como `PALETTES` y `rng`.

Los tres modos:

- `seed`: una imagen fija que sale de un número. «Otra variación» elige otro.
- `animation`: `draw` se llama en cada fotograma, con el tiempo en `time`.
- `interactive`: `draw` se llama cuando se mueve el puntero, con su posición en `pointer` (de 0 a 1). También responde a las flechas del teclado.

**Efectos, Sobre y contacto**: `site/content/efectos.json`, `site/content/sobre.json` y `site/content/site.json`. El correo y cada red llevan su propio `status`; en `site.json` están también las direcciones de las dos webs y la descripción de la web (la que sale en buscadores y al compartir la portada).

## Trabajar en local

Hace falta [Node.js](https://nodejs.org) 20 o posterior (`.nvmrc` indica la 22, la que usa GitHub). La web no tiene dependencias; el framework solo las necesita para construirse y probarse.

```sh
npm run dev             # para trabajar: http://localhost:4000/Echorath/dev/, se recarga sola
npm run build:dev       # la web de desarrollo, en dist/
npm run build:prod      # la de producción, en dist/
npm run build:pages     # las dos, como en GitHub Pages: dist/ y dist/dev/
npm test                # pruebas del generador

npm --prefix framework ci                          # una vez: dependencias del framework
npx --prefix framework playwright-core install --no-shell chromium   # una vez: navegador para sus pruebas
npm run test:framework  # pruebas de Echorath UI (construye dist/ antes)
npm run test:all        # todas
```

Con `npm run dev`, cada vez que guardas un archivo de `site/` la web se reconstruye y el navegador se recarga. Si el contenido tiene un error, aparece en la terminal y en una franja roja en la página, y sigue a la vista la última versión buena.

**En VS Code**, los archivos de contenido se comprueban mientras escribes: al abrir una pista, una imagen o `site.json`, el editor propone los campos, explica cada uno y subraya lo que falta o está mal (una duración como `3.42`, un tipo de imagen que no existe…).

## Publicar en GitHub Pages

Se activa una vez, en GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Desde entonces, cada cambio que llega a `main` pasa las pruebas (las del generador y las del framework en un navegador), construye las dos webs y las publica. El progreso se ve en la pestaña **Actions**. Los cambios que llegan por pull request solo se prueban.

Las dos direcciones de `site/content/site.json` dan por hecho que el repositorio se llama `Echorath`. Si usas un dominio propio, cámbialas allí.

### Una página por obra, y los buscadores

Cada obra que se muestra tiene su propia dirección: `…/Echorath/musica/marea-baja/`, `…/escritura/ciudades-que-se-repiten/`, `…/imagenes/repeticion-01/` y `…/algoritmos/repeticion/`. Es la misma web con esa obra abierta, pero con su título, su descripción y sus datos para buscadores, así que al compartirla en redes sale la obra y no la portada. El botón «Compartir / Copiar enlace» da siempre esa dirección.

La dirección sale del título (sin tildes ni signos). Si cambias el título de una obra, añade el anterior en `aka` y los enlaces antiguos seguirán llegando a ella: `"aka": ["Título anterior"]` en un `.json`, o `aka: ["Título anterior"]` en la cabecera de un texto. Dos obras de la misma sección no pueden dar la misma dirección: la construcción se detiene y dice cuáles son.

La web de producción lleva `sitemap.xml` con la portada y las obras publicadas. Para que Google las encuentre antes, da de alta la web en [Google Search Console](https://search.google.com/search-console) (tipo «Prefijo de la URL», `https://damdavidprieto.github.io/Echorath/`) y envía `https://damdavidprieto.github.io/Echorath/sitemap.xml`. La web de desarrollo no se indexa.

## El framework

Echorath UI vive en `framework/`. Después de cambiarlo, constrúyelo con `npm --prefix framework run build`: el generador de la web copia siempre su versión construida (`framework/dist/`).

## Licencia

El código (framework, generador, plantilla, pruebas y flujos) tiene licencia [MIT](../LICENSE). La obra (la música, los textos, las imágenes y los algoritmos de `site/content/`, y `site/static/`) es © Echorath, con todos los derechos reservados: consulta [site/content/LICENSE.md](../site/content/LICENSE.md).
