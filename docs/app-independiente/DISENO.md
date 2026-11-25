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

### Reglas que tiene que cumplir el servidor (próximo paso)

- Guardar el identificador de cada operación aplicada: si llega repetida, responder `duplicate` sin volver a aplicarla.
- Aplicar en orden y, ante una falla pasajera, cortar y devolver sólo lo procesado.
- Usar la hora del teléfono (`createdAt`) como la hora real del hecho. Un entrenamiento terminado sin señal el lunes
  sigue siendo del lunes aunque se suba el miércoles. Una hora en el futuro se recorta a la del servidor.
- Validar cada operación como si viniera de cualquiera, y siempre acotada al usuario de la sesión (`forUser`).

### Si lo mismo se cambió en la web y en el teléfono sin señal

Gana el cambio **hecho más tarde** (hora en que la persona lo hizo, no en que se subió). Los entrenamientos y los
registros nuevos no chocan porque cada uno tiene su identificador. Un entrenamiento terminado nunca vuelve a quedar
sin terminar.

## Inicio de sesión

La app inicia sesión con la misma cuenta (Supabase) y guarda la sesión en el teléfono. Para hablar con el servidor
manda esa sesión en cada pedido (`Authorization: Bearer`), no cookies. La primera vez hace falta internet; después se
puede abrir sin señal.

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

## A decidir más adelante

- Cómo actualizar pantallas sin pasar por las tiendas (si se quiere), respetando sus reglas.
- Cómo mantener igual la web y la app cuando se agrega algo nuevo.
