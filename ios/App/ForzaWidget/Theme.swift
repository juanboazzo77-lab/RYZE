import SwiftUI
import WidgetKit

enum Theme {
    /// Verde de la marca (más claro en modo oscuro).
    static let green = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 34 / 255, green: 195 / 255, blue: 117 / 255, alpha: 1)
            : UIColor(red: 29 / 255, green: 144 / 255, blue: 89 / 255, alpha: 1)
    })

    static let amber = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 245 / 255, green: 176 / 255, blue: 65 / 255, alpha: 1)
            : UIColor(red: 217 / 255, green: 119 / 255, blue: 6 / 255, alpha: 1)
    })

    static let background = Color(UIColor.systemBackground)
    static let track = Color(UIColor.systemGray5)
}

/// Fondo del widget: desde iOS 17 va como fondo del contenedor; antes, con margen propio.
struct WidgetContainer<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        if #available(iOS 17.0, *) {
            content
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .containerBackground(Theme.background, for: .widget)
        } else {
            content
                .padding(14)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .background(Theme.background)
        }
    }
}

/// Aro de progreso con contenido en el centro.
struct Ring<Content: View>: View {
    let progress: Double
    let lineWidth: CGFloat
    let color: Color
    let content: Content

    init(progress: Double, lineWidth: CGFloat = 8, color: Color = Theme.green, @ViewBuilder content: () -> Content) {
        self.progress = progress
        self.lineWidth = lineWidth
        self.color = color
        self.content = content()
    }

    var body: some View {
        ZStack {
            Circle().stroke(Theme.track, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: CGFloat(max(0.001, min(progress, 1))))
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
            content
        }
    }
}

/// Barra de progreso finita.
struct Bar: View {
    let progress: Double
    let color: Color

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.track)
                Capsule()
                    .fill(color)
                    .frame(width: CGFloat(max(0, min(progress, 1))) * geo.size.width)
            }
        }
        .frame(height: 6)
    }
}

/// Botón-pastilla (sólo visual: el toque lo resuelve el widget completo).
struct Pill: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(.white)
            .lineLimit(1)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(Capsule().fill(Theme.green))
    }
}

/// Cabecera chica con ícono y título.
struct Header: View {
    let icon: String
    let text: String
    var tint: Color = Theme.green

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(tint)
            Text(text)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.secondary)
                .lineLimit(1)
        }
    }
}

func deepLink(_ path: String) -> URL {
    return URL(string: "forzaai://app" + path) ?? URL(string: "forzaai://app/")!
}

/// Pantalla cuando todavía no hay datos.
struct NoDataView: View {
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Header(icon: "flame.fill", text: title)
            Spacer(minLength: 0)
            Text(Fallback.openApp)
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.primary)
                .lineLimit(3)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}
