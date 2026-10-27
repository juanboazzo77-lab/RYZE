import SwiftUI
import WidgetKit

/// Lo de hoy, ya resuelto para una fecha (si la foto es de otro día, se muestra el día en blanco).
struct TodayModel {
    let snap: Snapshot
    let kcalTarget: Double?
    let kcalEaten: Double
    let proteinTarget: Double?
    let proteinEaten: Double
    let workout: WorkoutInfo?
    let streak: Int

    init(snap: Snapshot, date: Date) {
        let fresh = snap.todayISO == Day.iso(for: date)
        self.snap = snap
        kcalTarget = snap.today.kcalTarget
        kcalEaten = fresh ? snap.today.kcalEaten : 0
        proteinTarget = snap.today.proteinTarget
        proteinEaten = fresh ? snap.today.proteinEaten : 0
        workout = fresh ? snap.today.workout : nil
        streak = snap.today.streak
    }

    var kcalProgress: Double {
        guard let t = kcalTarget, t > 0 else { return 0 }
        return kcalEaten / t
    }

    var proteinProgress: Double {
        guard let t = proteinTarget, t > 0 else { return 0 }
        return proteinEaten / t
    }

    /// Calorías que faltan (negativo si se pasó).
    var remaining: Int? {
        guard let t = kcalTarget else { return nil }
        return Int((t - kcalEaten).rounded())
    }

    var overTarget: Bool {
        return (remaining ?? 0) < 0
    }

    /// Número grande del centro del aro.
    var centerNumber: String {
        if let r = remaining { return String(abs(r)) }
        return String(Int(kcalEaten.rounded()))
    }

    var kcalLine: String {
        guard let r = remaining else { return snap.s("today.kcalGoal", ["n": String(Int(kcalEaten.rounded()))]) }
        return r >= 0
            ? snap.s("today.kcalLeft", ["n": String(r)])
            : snap.s("today.kcalOver", ["n": String(abs(r))])
    }

    var workoutLine: String {
        guard let w = workout else { return snap.s("today.workoutRest") }
        switch w.state {
        case "done": return snap.s("today.workoutDone")
        case "active": return snap.s("today.workoutActive", ["name": w.name])
        default: return snap.s("today.workoutPlanned", ["name": w.name])
        }
    }

    var workoutIcon: String {
        guard let w = workout else { return "moon.zzz.fill" }
        return w.state == "done" ? "checkmark.circle.fill" : "bolt.fill"
    }

    var workoutDone: Bool {
        return workout?.state == "done"
    }
}

struct TodayEntry: TimelineEntry {
    let date: Date
    let snapshot: Snapshot?
}

struct TodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry {
        return TodayEntry(date: Date(), snapshot: Snapshot.sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        let snap = context.isPreview ? Snapshot.sample : SnapshotStore.load()
        completion(TodayEntry(date: Date(), snapshot: snap))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        let snap = SnapshotStore.load()
        let now = Date()
        var entries = [TodayEntry(date: now, snapshot: snap)]
        // Una entrada por medianoche: si la app no se abre, el día nuevo arranca en blanco.
        let cal = Calendar.current
        let startOfToday = cal.startOfDay(for: now)
        for i in 1...3 {
            if let d = cal.date(byAdding: .day, value: i, to: startOfToday) {
                entries.append(TodayEntry(date: d, snapshot: snap))
            }
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct TodayWidget: Widget {
    let kind = "ForzaTodayWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            TodayEntryView(entry: entry)
        }
        .configurationDisplayName(SnapshotStore.load()?.s("today.title") ?? Fallback.todayTitle)
        .description(SnapshotStore.load()?.s("today.description") ?? Fallback.todayDescription)
        .supportedFamilies(TodayWidget.families)
    }

    static var families: [WidgetFamily] {
        if #available(iOS 16.0, *) {
            return [.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular]
        }
        return [.systemSmall, .systemMedium]
    }
}

struct TodayEntryView: View {
    let entry: TodayEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        if let snap = entry.snapshot {
            content(model: TodayModel(snap: snap, date: entry.date))
                .widgetURL(deepLink("/dashboard"))
        } else {
            WidgetContainer {
                NoDataView(title: Fallback.todayTitle)
            }
            .widgetURL(deepLink("/dashboard"))
        }
    }

    @ViewBuilder
    private func content(model: TodayModel) -> some View {
        switch family {
        case .systemMedium:
            WidgetContainer {
                TodayMedium(m: model)
            }
        case .systemSmall:
            WidgetContainer {
                TodaySmall(m: model)
            }
        default:
            if #available(iOS 16.0, *) {
                TodayLockScreen(m: model)
            } else {
                WidgetContainer {
                    TodaySmall(m: model)
                }
            }
        }
    }
}

struct TodaySmall: View {
    let m: TodayModel

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Header(icon: "flame.fill", text: m.snap.s("today.title"))
            Ring(progress: m.kcalProgress, lineWidth: 9, color: m.overTarget ? Theme.amber : Theme.green) {
                VStack(spacing: 0) {
                    Text(m.centerNumber)
                        .font(.system(size: 24, weight: .heavy, design: .rounded))
                        .foregroundColor(.primary)
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)
                    Text(m.snap.s("today.kcal"))
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 8)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.vertical, 2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct TodayMedium: View {
    let m: TodayModel

    var body: some View {
        HStack(spacing: 16) {
            Ring(progress: m.kcalProgress, lineWidth: 11, color: m.overTarget ? Theme.amber : Theme.green) {
                VStack(spacing: 0) {
                    Text(m.centerNumber)
                        .font(.system(size: 26, weight: .heavy, design: .rounded))
                        .foregroundColor(.primary)
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)
                    Text(m.snap.s("today.kcal"))
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 10)
            }
            .frame(width: 104, height: 104)

            VStack(alignment: .leading, spacing: 9) {
                Header(icon: "flame.fill", text: m.snap.s("today.title"))
                Text(m.kcalLine)
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                    .foregroundColor(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                if let pt = m.proteinTarget {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack {
                            Text(m.snap.s("today.protein"))
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.secondary)
                            Spacer(minLength: 4)
                            Text("\(Int(m.proteinEaten.rounded()))/\(Int(pt.rounded())) g")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.primary)
                        }
                        Bar(progress: m.proteinProgress, color: Theme.green)
                    }
                }

                HStack(spacing: 5) {
                    Image(systemName: m.workoutIcon)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(m.workoutDone ? Theme.green : .secondary)
                    Text(m.workoutLine)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

@available(iOS 16.0, *)
struct TodayLockScreen: View {
    let m: TodayModel
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            circular
        default:
            rectangular
        }
    }

    private var circular: some View {
        return Gauge(value: min(max(m.kcalProgress, 0), 1)) {
            Image(systemName: "flame.fill")
        } currentValueLabel: {
            Text(m.centerNumber)
        }
        .gaugeStyle(.accessoryCircularCapacity)
    }

    private var rectangular: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(m.kcalLine)
                .font(.system(size: 14, weight: .bold))
                .lineLimit(1)
            if let pt = m.proteinTarget {
                Text("\(m.snap.s("today.protein")) \(Int(m.proteinEaten.rounded()))/\(Int(pt.rounded())) g")
                    .font(.system(size: 12))
                    .lineLimit(1)
            }
            Text(m.workoutLine)
                .font(.system(size: 12))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
