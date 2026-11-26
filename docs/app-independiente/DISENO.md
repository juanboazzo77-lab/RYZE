# Forza AI: app independiente que funciona sin internet

Pedido (25/11/2026): una app instalada en el teléfono, no una ventana a la web, que sin internet permita usar todo lo
que no lo necesita. La web sigue existiendo para quien usa la computadora.

## Cómo queda armado

| Parte | Dónde | Qué hace |
| --- | --- | --- |
| Web | `src/app` (Next.js, como hoy) | No cambia para quien la usa en el navegador |
| Servidor | el mismo proyecto de Next | Base de datos, IA, pagos, gimnasios y la puerta de entrada de la app |
| App | `mobile/` (React armado con Vite) | Las pantallas van dentro de la app; abre sin internet |
| Compartido | `src/lib`, estilos de `src/app/globals.css` | Cálculos, textos, diseño y reglas de sincronización |

Regla: `mobile/` y `src/lib` **no** pueden depender de Next ni de código de servidor.

La app que está hoy en las tiendas (la que carga `www.forzaai.app`) no se toca hasta que la nueva esté completa. El
trabajo vive en la rama `app-offline`.

## Guardado en el teléfono

- En la app: un archivo por cuenta en la carpeta privada de la app (`@capacitor/filesystem`). No se usa el
  almacenamiento del navegador, que el sistema puede borrar.
- Cada guardado escribe primero un archivo aparte y después reemplaza al anterior (`src/lib/sync/file-store.ts`). Si la
  app se cierra en cualquier momento queda la versión vieja o la nueva.
- Un archivo que existe y no se puede leer da error: nunca se toma como "vacío", porque el siguiente guardado lo pisaría.
- Un archivo dañado se aparta como copia antes de empezar de nuevo.

## Sincronización (`src/lib/sync`)

1. Cada cosa que hace la persona es una **operación** (`weight.log`, `workout.finish`…) con un identificador creado en el
   teléfono y la hora en que la hizo.
2. Se guarda en la cola **antes** de intentar subirla.
3. Se sube en orden, en tandas de hasta 50. Sale de la cola sólo cuando el servidor confirma esa operación.
4. Si el servidor la rechaza para siempre, no se borra: queda en "no se pudo subir" con el motivo, a la vista.
5. Recién con la cola vacía se bajan los datos nuevos.
6. La pantalla muestra lo último que bajó más lo pendiente encima.
7. Cada cuenta guarda lo suyo. No se puede cerrar sesión borrando cambios sin subir sin confirmarlo.

### Reglas del servidor (`src/server/mobile`, ruta `POST /api/mobile/v1/sync`)

Para sumar algo que la app pueda subir se agrega un manejador en `handlers.ts` con su validación y sus pruebas. Hoy
existe `weight.log`.

- Guardar el identificador de cada operación aplicada: si llega repetida, responder `duplicate` sin volver a aplicarla.
- Aplicar en orden y, ante una falla pasajera, cortar y devolver sólo lo procesado.
- Usar la hora del teléfono (`createdAt`) como la hora real del hecho. Un entrenamiento terminado sin señal el lunes
  sigue siendo del lunes aunque se suba el miércoles. Una hora en el futuro se recorta a la del servidor.
- Validar cada operación como si viniera de cualquiera, y siempre acotada al usuario de la sesión (`forUser`).

### Si lo mismo se cambió en la web y en el teléfono sin señal

Gana el cambio **hecho más tarde** (hora en que la persona lo hizo, no en que se subió). Los entrenamientos y los
registros nuevos no chocan porque cada uno tiene su identificador. Un entrenamiento terminado nunca vuelve a quedar
sin terminar.

Para comparar horas, cada tabla que se pueda editar desde los dos lados necesita una columna `edited_at` (cuándo la
persona hizo el cambio). `updated_at` no sirve: la base lo reemplaza por la hora del servidor en cada cambio. Un
disparador completa `edited_at` cuando quien actualiza no lo manda (la web), así la web no necesita cambios. Ver la
migración `20261125180000_mobile_sync` (hoy está en `weight_entry`).

## Inicio de sesión

La app inicia sesión con la misma cuenta (Supabase) y guarda la sesión en el teléfono. Para hablar con el servidor
manda esa sesión en cada pedido (`Authorization: Bearer`), no cookies. La primera vez hace falta internet; después se
puede abrir sin señal.

- Quién tiene la sesión abierta se guarda aparte (`mobile/src/account.ts`): abrir la app no depende de renovar nada.
- Si la sesión venció y no hay señal para renovarla, la persona sigue adentro (`src/lib/sync/session-token.ts`). Sólo se
  le pide entrar de nuevo si el servidor dice que ya no vale, y nunca se borra lo pendiente.
- Lo pendiente de una cuenta jamás se sube con la sesión de otra.
- Cerrar sesión borra del teléfono los datos y la sesión; si queda algo sin subir, avisa antes.

## Descarga de datos

`GET /api/mobile/v1/snapshot` devuelve lo que la app muestra sin conexión (hoy: perfil y pesos). Su forma está en
`src/lib/sync/data.ts`, compartida por el servidor y la app, junto con cómo se ve cada cambio todavía sin subir
(`reducers`). Para sumar datos: ampliar el esquema, `src/server/mobile/snapshot.ts` y los `reducers`.

La app toma del `.env` sólo las dos claves públicas de Supabase al armarse (`mobile/vite.config.ts`). Se puede apuntar
a otro servidor con `FORZA_API_URL`.

## Etapas

| Etapa | Contenido |
| --- | --- |
| 0. La base | 0.1 diseño · 0.2 guardado y sincronización · 0.3 app que abre sin internet · 0.4 puerta de entrada en el servidor · 0.5 inicio de sesión y descarga de datos · 0.6 iPhone en TestFlight y Android, prueba en modo avión |
| 1. Entrenar | Rutina de la semana, entrenamiento completo, descanso, terminar y ver historial |
| 2. Nutrición y peso | Alimentos recientes y frecuentes, macros del día, peso |
| 3. Resto sin conexión | Progreso, constancia, ajustes |
| 4. Lo que usa internet | Coach, fotos, escáner, pagos, gimnasio; sin señal avisan que necesitan conexión |

Se publica cuando está completa.

## Comandos

- `pnpm app:dev` — la app en la computadora (puerto 5175)
- `pnpm app:typecheck` y `pnpm app:build` — revisar y armar los archivos que van dentro de la app (`mobile/dist`)
- `pnpm test` — incluye las pruebas de sincronización

## Entrenar sin conexión

- Mientras se entrena, el entrenamiento es un **borrador** que vive sólo en el teléfono y se guarda con cada cambio
  (`src/lib/sync/draft-store.ts`). Si la app se cierra, al abrirla se continúa.
- Al terminar se sube **entero, en una sola operación** (`workout.complete`, `src/lib/sync/workout.ts`): el servidor
  nunca tiene un entrenamiento a medias. Primero entra en la cola y recién después se borra el borrador; si la app se
  cierra justo ahí, el borrador se descarta porque ya está en la cola, y el servidor además ignora un entrenamiento con
  un identificador que ya tiene.
- La pantalla muestra enseguida el día como hecho y la nueva "última vez", aunque falte subirlo.
- Un tipo de operación que el servidor todavía no conoce no se rechaza: queda en la cola hasta que lo conozca. Aun así,
  **el servidor se publica antes** que la versión de la app que manda algo nuevo.
- Piezas de pantalla compartidas con la web: `week-layout.tsx`, `session-parts.tsx`, `rest-timer.tsx`.
- Todavía no está en la app: agregar ejercicios que no son de la rutina, entrenamiento libre, cambiar un ejercicio por
  una variante y las fotos de los ejercicios.

## Comer sin conexión

- Se bajan las comidas de los últimos 60 días, el objetivo, las comidas guardadas y **la biblioteca de alimentos entera**
  (hoy son 275; tope 4000), así se puede buscar sin señal (`src/lib/nutrition/food-search.ts`; a diferencia de la web no
  corrige errores de tipeo). Los "recientes" salen de las comidas guardadas en el teléfono.
- Tres operaciones (`src/lib/sync/nutrition.ts`): `food.add` (uno o varios, con identificador creado en el teléfono),
  `food.update` y `food.delete`. Manejadores en `src/server/mobile/food-handlers.ts`.
- `food_entry` tiene `edited_at` (migración `20261125230000_food_entry_edited_at`): un cambio o borrado hecho en el teléfono
  no pisa uno posterior hecho en la web.
- Igual que en la web, al cambiar la cantidad sólo se recalculan los valores de lo que viene de la biblioteca.
- Piezas de pantalla compartidas con la web: `day-totals-card.tsx`, `day-nav-bar.tsx`, `meal-card.tsx`, `entry-item.tsx` y
  `food-pick.tsx`.
- Todavía no está en la app: crear un alimento nuevo para la biblioteca (a mano se cargan sólo los totales), guardar una
  comida como frecuente, el historial y el plan con IA. El escáner, la foto y "describir" necesitan internet (etapa 4).

## Progreso y ajustes sin conexión

- Operaciones: `weight.delete`, `activity.log`, `activity.delete` (`src/lib/sync/progress.ts`) y `prefs.update`
  (idioma y unidades). Para el "gana el cambio más tardío": `daily_activity.edited_at` y `profile.prefs_edited_at`
  (la web lo marca en `updateAppearance`).
- Se bajan además: objetivo de peso, 30 días de pasos, los entrenamientos de las últimas semanas resumidos, los 10
  récords recientes, todos los días entrenados (constancia) y los logros. Los logros y récords los calcula el servidor:
  sin señal se ven como quedaron. Un entrenamiento terminado sin señal sí cuenta enseguida en estadísticas y constancia.
- **Plan:** qué se puede ver lo decide el servidor (`access` en la descarga, `src/server/mobile/access.ts`) con la misma
  regla que la web (`src/server/effective-entitlement.ts`). Hoy sólo Estadísticas depende del plan. Si viene de la prueba
  gratis, sin señal también se termina a su hora.
- Cuentas compartidas con la web: `src/lib/progress/summary.ts`, `src/lib/stats/compute.ts`, `src/lib/activity/view.ts`,
  `src/features/consistency/view.ts`.
- Textos: lo que existe en la web sale de `src/i18n`; lo propio de la app está en `mobile/src/strings.ts` (6 idiomas;
  un texto nuevo no compila si falta en alguno).
- Con internet (etapa 4): chequeo semanal, fotos, amigos, reporte, perfil, objetivos, notificaciones, plan, gimnasio y
  cuenta. Ojo para publicar en las tiendas: hace falta poder **eliminar la cuenta desde la app**.

## Lo que necesita internet (etapa 4)

No se encola: si no hay señal se avisa en el momento.

- La app usa **las mismas pantallas de la web**. Al armarla, `mobile/online-plugin.ts` cambia cada archivo de acciones de
  la lista `REMOTE` por su reemplazo en `mobile/src/online/`, y **corta la compilación** si se cuela código del servidor.
- `POST /api/mobile/v1/rpc` corre la función de la web como la persona de la sesión (`runAsMobileUser`), así que valen las
  mismas validaciones y límites del plan. Sólo se puede llamar lo escrito en `src/server/mobile/rpc-table.ts`.
- Para sumar una pantalla: agregar sus funciones a `rpc-table.ts` (revisando que no usen cookies ni redirijan), crear el
  reemplazo con los mismos nombres, anotarlo en `REMOTE` y sumar su archivo a `styles.css`.
- Hecho: **coach** (chat y conversaciones). Falta: memoria y plan nuevo con IA, foto/escáner/describir, chequeo, fotos,
  amigos, reporte, registro de cuenta, perfil y objetivos, planes y pagos, gimnasio, notificaciones, eliminar cuenta.
- Apple y Google: dentro de la app no puede haber enlaces para pagar por fuera de la tienda.

## Armar las versiones de prueba (paso 0.6)

`capacitor.config.ts` arma la app independiente sólo con `FORZA_APP=nueva`; sin eso arma la actual.

- **iPhone:** en Codemagic, flujo "App nueva (sin internet) — TestFlight" (`ios-app-nueva`). Sale como versión 2.0 y sólo
  a TestFlight. Usa el mismo identificador que la app actual: en el teléfono donde se instale, la reemplaza (se vuelve a
  la actual reinstalándola desde el App Store; los datos de la cuenta están en el servidor).
- **Android:** `FORZA_APP=nueva pnpm app:build && FORZA_APP=nueva npx cap sync android`, y en `android/`
  `./gradlew assembleDebug` con Java 21. Después correr `npx cap sync android` **sin** la variable, para que el próximo
  armado no salga con la app nueva por error.
- Pendiente para más adelante: los widgets de iPhone todavía no reciben datos de la app nueva.

### Prueba en modo avión

1. Con internet: abrir, iniciar sesión y esperar "Todo está subido". Revisar que estén los pesos.
2. Activar el modo avión, cerrar la app del todo y abrirla: tiene que abrir con los datos.
3. Cargar un peso: queda "sin subir". Cerrar la app del todo y abrirla: sigue ahí.
4. Sacar el modo avión: pasa a "Todo está subido" solo, y el peso aparece en la web.

## A decidir más adelante

- Cómo actualizar pantallas sin pasar por las tiendas (si se quiere), respetando sus reglas.
- Cómo mantener igual la web y la app cuando se agrega algo nuevo.
