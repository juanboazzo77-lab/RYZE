import Foundation
import Capacitor
import WidgetKit
import ActivityKit

/// Puente entre la web y lo que el teléfono muestra fuera de la app:
/// - los widgets: la web le pasa una foto de datos (JSON) y el plugin la deja en el grupo compartido,
///   donde la lee la extensión de widgets, y pide recargarlos;
/// - el descanso entre series: lo muestra como Live Activity en la pantalla de bloqueo.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startRest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endRest", returnType: CAPPluginReturnPromise)
    ]

    private static let group = "group.app.forzaai.mobile"
    private static let key = "widgetSnapshot"

    @objc func setSnapshot(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("Falta json")
            return
        }
        guard let defaults = UserDefaults(suiteName: WidgetBridgePlugin.group) else {
            call.reject("El grupo compartido no está disponible")
            return
        }
        defaults.set(json, forKey: WidgetBridgePlugin.key)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func clear(_ call: CAPPluginCall) {
        UserDefaults(suiteName: WidgetBridgePlugin.group)?.removeObject(forKey: WidgetBridgePlugin.key)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    /// Empieza (o actualiza) la cuenta regresiva del descanso en la pantalla de bloqueo.
    @objc func startRest(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.resolve(["started": false])
            return
        }
        guard let endsAtMs = call.getDouble("endsAt") else {
            call.reject("Falta endsAt")
            return
        }
        let end = Date(timeIntervalSince1970: endsAtMs / 1000)
        let total = call.getDouble("totalSeconds") ?? max(1, end.timeIntervalSinceNow)
        let started = RestActivityController.start(
            end: end,
            total: total,
            title: call.getString("title") ?? "",
            subtitle: call.getString("subtitle") ?? ""
        )
        call.resolve(["started": started])
    }

    /// Cierra la cuenta regresiva (terminó el descanso o se salió del entrenamiento).
    @objc func endRest(_ call: CAPPluginCall) {
        if #available(iOS 16.1, *) {
            RestActivityController.end()
        }
        call.resolve()
    }
}

@available(iOS 16.1, *)
enum RestActivityController {
    /// Devuelve si hay una actividad mostrándose (nueva o actualizada).
    static func start(end: Date, total: Double, title: String, subtitle: String) -> Bool {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }
        let state = RestActivityAttributes.ContentState(endsAt: end, totalSeconds: total)
        if let current = Activity<RestActivityAttributes>.activities.first {
            Task { await current.update(using: state) }
            return true
        }
        let attributes = RestActivityAttributes(title: title, subtitle: subtitle)
        do {
            _ = try Activity<RestActivityAttributes>.request(attributes: attributes, contentState: state, pushType: nil)
            return true
        } catch {
            return false
        }
    }

    static func end() {
        for activity in Activity<RestActivityAttributes>.activities {
            Task { await activity.end(using: nil, dismissalPolicy: .immediate) }
        }
    }
}
