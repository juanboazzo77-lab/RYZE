import Foundation
import Capacitor
import WidgetKit

/// Puente entre la web y los widgets: la web le pasa una foto de datos (JSON) y el plugin la deja en el
/// grupo compartido, donde la lee la extensión de widgets, y pide recargarlos.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise)
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
}
