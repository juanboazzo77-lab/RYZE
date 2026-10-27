# Widgets de iPhone

Dos widgets (WidgetKit, extensión `ForzaWidget`): **Hoy** (calorías, proteína, entrenamiento) y
**Revisión semanal** (cuándo toca, cuánto falta y cómo viene la semana). Tamaños: chico, mediano y, desde
iOS 16, pantalla de bloqueo (circular y rectangular).

## Cómo les llegan los datos

1. La web (`src/features/widgets/`) arma una foto de datos ya traducida (`snapshot.ts`) y el componente
   `WidgetSync` (en el layout de la app) se la pasa al plugin nativo `WidgetBridge` cada vez que se abre la
   app, se cambia de pantalla o pasan 90 s.
2. `ios/App/App/WidgetBridgePlugin.swift` la guarda en el grupo compartido `group.app.forzaai.mobile` y
   recarga los widgets.
3. La extensión (`ios/App/ForzaWidget/`) la lee. Al cerrar sesión, `WidgetClear` (en las pantallas de acceso)
   la borra.

El formato está en `src/features/widgets/types.ts` y se espeja en `ForzaWidget/Snapshot.swift`.
Los textos van dentro de la foto, así que los widgets no tienen idiomas propios (`widgets.*` en los diccionarios).

Tocar un widget abre `forzaai://app/<ruta>` (esquema registrado en `App/Info.plist`); `AppBridgeViewController`
lo convierte en `https://www.forzaai.app/<ruta>` dentro de la app.

## Lo que hay que tener en Apple Developer (una sola vez)

| Qué | Valor |
| --- | --- |
| App Group | `group.app.forzaai.mobile` |
| App ID de la app | `app.forzaai.mobile` con la capacidad **App Groups** (ese grupo) |
| App ID de la extensión | `app.forzaai.mobile.widget` con **App Groups** (ese grupo) |
| Perfil de la app (App Store) | `Forza AI App Store` (hay que regenerarlo para que incluya el grupo) |
| Perfil de la extensión (App Store) | `Forza AI Widget App Store` |

Secretos de GitHub usados por `iOS Release`: `IOS_PROVISION_PROFILE_BASE64` (perfil de la app, regenerado) y
`IOS_WIDGET_PROVISION_PROFILE_BASE64` (perfil de la extensión).

`iOS Build Check` compila todo para el simulador sin firmar: sirve para detectar errores de Swift o del
proyecto sin necesitar certificados.
