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
  content/      el contenido: una obra por archivo
  template/     la página (index.html, site.css, site.js) y la de error (404.html)
  static/       iconos e imagen para compartir el enlace
  build.mjs     el generador: junta plantilla y contenido en dist/
  tests/        pruebas del generador
framework/      Echorath UI (tiene su propio README)
.github/        el flujo que publica la web en GitHub Pages
```

`dist/` es lo que se genera; no se guarda en el repositorio.

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

**Efectos, Sobre y contacto**: `site/content/efectos.json`, `site/content/sobre.json` y `site/content/site.json`. El correo y cada red llevan su propio `status`; en `site.json` están también las direcciones de las dos webs.

## Trabajar en local

Hace falta [Node.js](https://nodejs.org) 20 o posterior (`.nvmrc` indica la 22, la que usa GitHub). La web no tiene dependencias; el framework solo las necesita para construirse y probarse.

```sh
npm run build:dev       # la web de desarrollo, en dist/
npm run build:prod      # la de producción, en dist/
npm run build:pages     # las dos, como en GitHub Pages: dist/ y dist/dev/
npm test                # pruebas del generador

npm --prefix framework ci                          # una vez: dependencias del framework
npx --prefix framework playwright-core install --no-shell chromium   # una vez: navegador para sus pruebas
npm run test:framework  # pruebas de Echorath UI (construye dist/ antes)
npm run test:all        # todas
```

Para verla, abre `dist/index.html` en el navegador o sirve la carpeta con `npx serve dist`.

## Publicar en GitHub Pages

Se activa una vez, en GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Desde entonces, cada cambio que llega a `main` pasa las pruebas (las del generador y las del framework en un navegador), construye las dos webs y las publica. El progreso se ve en la pestaña **Actions**. Los cambios que llegan por pull request solo se prueban.

Las dos direcciones de `site/content/site.json` dan por hecho que el repositorio se llama `Echorath`. Si usas un dominio propio, cámbialas allí.

## El framework

Echorath UI vive en `framework/`. Después de cambiarlo, constrúyelo con `npm --prefix framework run build`: el generador de la web copia siempre su versión construida (`framework/dist/`).

## Licencia

El código (framework, generador, plantilla, pruebas y flujos) tiene licencia [MIT](../LICENSE). La obra (la música, los textos, las imágenes y los algoritmos de `site/content/`, y `site/static/`) es © Echorath, con todos los derechos reservados: consulta [site/content/LICENSE.md](../site/content/LICENSE.md).
