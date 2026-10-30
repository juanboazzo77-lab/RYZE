import Foundation
import ActivityKit

/// Datos de la Live Activity del descanso entre series. Lo comparten la app (que la inicia) y la
/// extensión (que la dibuja en la pantalla de bloqueo y en la Dynamic Island).
@available(iOS 16.1, *)
struct RestActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        /// Momento en que termina el descanso.
        var endsAt: Date
        /// Duración total del descanso (para la barra de progreso).
        var totalSeconds: Double
    }

    /// Título fijo ("Descanso"), ya traducido por la web.
    var title: String
    /// Nombre del entrenamiento.
    var subtitle: String
}
