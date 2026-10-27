import Foundation

/// Grupo compartido entre la app y los widgets: ahí deja la app la foto de datos (ver WidgetBridgePlugin.swift).
enum Shared {
    static let group = "group.app.forzaai.mobile"
    static let key = "widgetSnapshot"
}

// Espeja src/features/widgets/types.ts: si cambia el formato allá, cambiarlo acá.

struct WorkoutInfo: Codable {
    let name: String
    /// planned · active · done
    let state: String
}

struct TodayInfo: Codable {
    let kcalTarget: Double?
    let kcalEaten: Double
    let proteinTarget: Double?
    let proteinEaten: Double
    let workout: WorkoutInfo?
    let streak: Int
}

struct WeekInfo: Codable {
    let workouts: Int
    let planned: Int
    let dietPct: Double?
    let weightChange: String?
}

struct ReviewInfo: Codable {
    /// locked · off · active
    let status: String
    let dayISO: String
    let dayName: String
    let nextDayISO: String
    let nextDayName: String
    let weekEndISO: String
    let done: Bool
    let dueNow: Bool
    let week: WeekInfo
}

struct Snapshot: Codable {
    let v: Int
    let updatedAt: String
    let todayISO: String
    let strings: [String: String]
    let today: TodayInfo
    let review: ReviewInfo
}

extension Snapshot {
    /// Texto traducido por clave (la app ya lo manda en el idioma de la persona).
    func s(_ key: String) -> String {
        return strings[key] ?? key
    }

    /// Texto traducido con huecos: `{n}`, `{day}`, `{name}`.
    func s(_ key: String, _ vars: [String: String]) -> String {
        var out = s(key)
        for (k, v) in vars {
            out = out.replacingOccurrences(of: "{" + k + "}", with: v)
        }
        return out
    }
}

enum SnapshotStore {
    static func load() -> Snapshot? {
        guard let defaults = UserDefaults(suiteName: Shared.group),
              let json = defaults.string(forKey: Shared.key),
              let data = json.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(Snapshot.self, from: data)
    }
}

/// Fechas como números de día para poder restar sin problemas de zona horaria.
enum Day {
    private static let utc: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private static let local: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone.current
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    /// Días desde 1970 de una fecha yyyy-mm-dd.
    static func number(_ iso: String) -> Int? {
        guard let d = utc.date(from: iso) else { return nil }
        return Int((d.timeIntervalSince1970 / 86400).rounded())
    }

    /// El día (yyyy-mm-dd) de un instante, en la zona del teléfono.
    static func iso(for date: Date) -> String {
        return local.string(from: date)
    }
}

func capitalized(_ text: String) -> String {
    return String(text.prefix(1)).uppercased() + String(text.dropFirst())
}

/// Textos de reserva para cuando todavía no hay datos (la persona no abrió la app o cerró sesión).
enum Fallback {
    static var isSpanish: Bool {
        return (Locale.preferredLanguages.first ?? "en").hasPrefix("es")
    }

    static var openApp: String {
        return isSpanish ? "Abrí Forza AI para empezar" : "Open Forza AI to get started"
    }

    static var todayTitle: String {
        return isSpanish ? "Hoy" : "Today"
    }

    static var reviewTitle: String {
        return isSpanish ? "Revisión semanal" : "Weekly review"
    }

    static var todayDescription: String {
        return isSpanish ? "Calorías, proteína y entrenamiento del día." : "Calories, protein and workout for the day."
    }

    static var reviewDescription: String {
        return isSpanish
            ? "Te avisa cuándo toca tu revisión y cómo va tu semana."
            : "Tells you when your review is due and how your week is going."
    }
}

extension Snapshot {
    /// Datos de ejemplo para la galería de widgets.
    static var sample: Snapshot {
        let es = Fallback.isSpanish
        let strings: [String: String] = es
            ? [
                "today.title": "Hoy", "review.shortDue": "Hacela hoy",
                "today.kcalLeft": "{n} kcal restantes", "today.kcalOver": "{n} kcal de más",
                "today.kcalGoal": "Objetivo: {n} kcal", "today.kcal": "kcal", "today.protein": "Proteína",
                "today.workoutPlanned": "Hoy: {name}", "today.workoutActive": "En curso: {name}",
                "today.workoutDone": "Entrenamiento hecho", "today.workoutRest": "Día de descanso",
                "today.streak": "Racha de {n} días",
                "review.title": "Revisión semanal", "review.due": "Te toca tu revisión",
                "review.dueCta": "Hacerla ahora", "review.upcoming": "Tu revisión es el {day}",
                "review.inDays": "Faltan {n} días", "review.inOneDay": "Falta 1 día",
                "review.done": "Revisión lista", "review.doneNext": "Próxima: {day}",
                "review.workouts": "Entrenos", "review.diet": "Dieta", "review.weight": "Peso",
            ]
            : [
                "today.title": "Today", "review.shortDue": "Do it today",
                "today.kcalLeft": "{n} kcal left", "today.kcalOver": "{n} kcal over",
                "today.kcalGoal": "Goal: {n} kcal", "today.kcal": "kcal", "today.protein": "Protein",
                "today.workoutPlanned": "Today: {name}", "today.workoutActive": "In progress: {name}",
                "today.workoutDone": "Workout done", "today.workoutRest": "Rest day",
                "today.streak": "{n}-day streak",
                "review.title": "Weekly review", "review.due": "Your review is due",
                "review.dueCta": "Do it now", "review.upcoming": "Your review is on {day}",
                "review.inDays": "{n} days to go", "review.inOneDay": "1 day to go",
                "review.done": "Review done", "review.doneNext": "Next: {day}",
                "review.workouts": "Workouts", "review.diet": "Diet", "review.weight": "Weight",
            ]
        let today = Day.iso(for: Date())
        return Snapshot(
            v: 1,
            updatedAt: "",
            todayISO: today,
            strings: strings,
            today: TodayInfo(
                kcalTarget: 2400, kcalEaten: 1450, proteinTarget: 150, proteinEaten: 96,
                workout: WorkoutInfo(name: es ? "Torso" : "Upper body", state: "planned"), streak: 4
            ),
            review: ReviewInfo(
                status: "active", dayISO: today, dayName: es ? "domingo" : "Sunday",
                nextDayISO: today, nextDayName: es ? "domingo" : "Sunday",
                weekEndISO: "2999-01-01", done: false, dueNow: true,
                week: WeekInfo(workouts: 2, planned: 3, dietPct: 86, weightChange: "-0.4 kg")
            )
        )
    }
}
