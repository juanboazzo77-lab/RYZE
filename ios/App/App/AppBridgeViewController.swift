import UIKit
import WebKit
import Capacitor

/// Pantalla principal de la app: igual a la de Capacitor, más los plugins propios y los accesos
/// directos desde los widgets (forzaai://app/<ruta>).
class AppBridgeViewController: CAPBridgeViewController {
    private static let webOrigin = "https://www.forzaai.app"

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }

    /// Abre en la web la ruta de un enlace forzaai://app/<ruta> (por ejemplo, el toque a un widget).
    func open(url: URL) {
        guard url.scheme == "forzaai" else { return }
        var path = url.path
        if path.isEmpty { path = "/" }
        // Sólo rutas internas: empiezan con una sola "/".
        guard path.hasPrefix("/"), !path.hasPrefix("//") else { return }
        if let query = url.query { path += "?" + query }
        guard let target = URL(string: AppBridgeViewController.webOrigin + path) else { return }
        webView?.load(URLRequest(url: target))
    }
}
