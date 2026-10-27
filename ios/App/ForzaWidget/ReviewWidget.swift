import SwiftUI
import WidgetKit

/// Dónde está la revisión semanal en una fecha dada.
enum ReviewState {
    case locked
    case off
    case due
    case upcoming(days: Int, dayName: String)
    case done(nextName: String)
}

func reviewState(_ snap: Snapshot, on date: Date) -> ReviewState {
    let r = snap.review
    if r.status == "locked" { return .locked }
    if r.status == "off" { return .off }
    guard let today = Day.number(Day.iso(for: date)),
          let weekEnd = Day.number(r.weekEndISO),
          let thisDay = Day.number(r.dayISO),
          let nextDay = Day.number(r.nextDayISO) else {
        return .off
    }
    // La foto es de una semana que ya pasó: se asume la semana siguiente, todavía sin hacer.
    if today >= weekEnd {
        if today >= nextDay { return .due }
        return .upcoming(days: nextDay - today, dayName: r.nextDayName)
    }
    if r.done { return .done(nextName: r.nextDayName) }
    let dueFromServer = r.dueNow && Day.number(snap.todayISO) == today
    if today >= thisDay || dueFromServer { return .due }
    return .upcoming(days: thisDay - today, dayName: r.dayName)
}

extension ReviewState {
    var icon: String {
        switch self {
        case .locked: return "lock.fill"
        case .off: return "bell.slash.fill"
        case .due: return "exclamationmark.circle.fill"
        case .upcoming: return "calendar"
        case .done: return "checkmark.circle.fill"
        }
    }

    var tint: Color {
        switch self {
        case .due: return Theme.amber
        case .locked, .off: return .secondary
        default: return Theme.green
        }
    }

    func headline(_ snap: Snapshot) -> String {
        switch self {
        case .locked: return snap.s("review.locked")
        case .off: return snap.s("review.off")
        case .due: return snap.s("review.due")
        case .upcoming(_, let dayName): return snap.s("review.upcoming", ["day": dayName])
        case .done: return snap.s("review.done")
        }
    }

    func subline(_ snap: Snapshot) -> String? {
        switch self {
        case .locked: return snap.s("review.lockedBody")
        case .off: return nil
        case .due: return snap.s("review.shortDue")
        case .upcoming(let days, _):
            return days == 1 ? snap.s("review.inOneDay") : snap.s("review.inDays", ["n": String(days)])
        case .done(let next): return snap.s("review.doneNext", ["day": next])
        }
    }

    /// A dónde lleva tocar el widget.
    var link: URL {
        switch self {
        case .locked: return deepLink("/settings/plans")
        case .off: return deepLink("/settings")
        default: return deepLink("/checkin")
        }
    }
}

struct ReviewEntry: TimelineEntry {
    let date: Date
    let snapshot: Snapshot?
}

struct ReviewProvider: TimelineProvider {
    func placeholder(in context: Context) -> ReviewEntry {
        return ReviewEntry(date: Date(), snapshot: Snapshot.sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (ReviewEntry) -> Void) {
        let snap = context.isPreview ? Snapshot.sample : SnapshotStore.load()
        completion(ReviewEntry(date: Date(), snapshot: snap))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ReviewEntry>) -> Void) {
        let snap = SnapshotStore.load()
        let now = Date()
        var entries = [ReviewEntry(date: now, snapshot: snap)]
        // Una entrada por medianoche de la próxima semana: así el "faltan N días" se actualiza solo.
        let cal = Calendar.current
        let startOfToday = cal.startOfDay(for: now)
        for i in 1...7 {
            if let d = cal.date(byAdding: .day, value: i, to: startOfToday) {
                entries.append(ReviewEntry(date: d, snapshot: snap))
            }
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct ReviewWidget: Widget {
    let kind = "ForzaReviewWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ReviewProvider()) { entry in
            ReviewEntryView(entry: entry)
        }
        .configurationDisplayName(SnapshotStore.load()?.s("review.title") ?? Fallback.reviewTitle)
        .description(SnapshotStore.load()?.s("review.description") ?? Fallback.reviewDescription)
        .supportedFamilies(ReviewWidget.families)
    }

    static var families: [WidgetFamily] {
        if #available(iOS 16.0, *) {
            return [.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular]
        }
        return [.systemSmall, .systemMedium]
    }
}

struct ReviewEntryView: View {
    let entry: ReviewEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        if let snap = entry.snapshot {
            let state = reviewState(snap, on: entry.date)
            content(snap: snap, state: state)
                .widgetURL(state.link)
        } else {
            WidgetContainer {
                NoDataView(title: Fallback.reviewTitle)
            }
            .widgetURL(deepLink("/checkin"))
        }
    }

    @ViewBuilder
    private func content(snap: Snapshot, state: ReviewState) -> some View {
        switch family {
        case .systemMedium:
            WidgetContainer {
                ReviewMedium(snap: snap, state: state)
            }
        case .systemSmall:
            WidgetContainer {
                ReviewSmall(snap: snap, state: state)
            }
        default:
            if #available(iOS 16.0, *) {
                ReviewLockScreen(snap: snap, state: state)
            } else {
                WidgetContainer {
                    ReviewSmall(snap: snap, state: state)
                }
            }
        }
    }
}

struct ReviewSmall: View {
    let snap: Snapshot
    let state: ReviewState

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Header(icon: state.icon, text: snap.s("review.title"), tint: state.tint)
            Spacer(minLength: 0)
            Text(state.headline(snap))
                .font(.system(size: 18, weight: .heavy, design: .rounded))
                .foregroundColor(.primary)
                .lineLimit(3)
                .minimumScaleFactor(0.75)
            if let sub = state.subline(snap) {
                Text(sub)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            if case .due = state {
                Pill(text: snap.s("review.dueCta"))
                    .padding(.top, 2)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct ReviewMedium: View {
    let snap: Snapshot
    let state: ReviewState

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            ReviewSmall(snap: snap, state: state)
            Rectangle()
                .fill(Theme.track)
                .frame(width: 1)
            WeekColumn(snap: snap)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

/// Cómo viene la semana: entrenos, dieta y peso.
struct WeekColumn: View {
    let snap: Snapshot

    var body: some View {
        let w = snap.review.week
        let ratio = w.planned > 0 ? Double(w.workouts) / Double(w.planned) : 0
        VStack(alignment: .leading, spacing: 9) {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(snap.s("review.workouts"))
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.secondary)
                    Spacer(minLength: 4)
                    Text("\(w.workouts)/\(max(w.planned, w.workouts))")
                        .font(.system(size: 14, weight: .heavy, design: .rounded))
                        .foregroundColor(.primary)
                }
                Bar(progress: ratio, color: Theme.green)
            }
            if let diet = w.dietPct {
                StatRow(label: snap.s("review.diet"), value: "\(Int(diet.rounded()))%")
            }
            if let weight = w.weightChange {
                StatRow(label: snap.s("review.weight"), value: weight)
            }
        }
    }
}

struct StatRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.secondary)
            Spacer(minLength: 4)
            Text(value)
                .font(.system(size: 14, weight: .heavy, design: .rounded))
                .foregroundColor(.primary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
    }
}

@available(iOS 16.0, *)
struct ReviewLockScreen: View {
    let snap: Snapshot
    let state: ReviewState
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
        let w = snap.review.week
        let ratio = w.planned > 0 ? Double(w.workouts) / Double(w.planned) : 0
        return Gauge(value: min(max(ratio, 0), 1)) {
            Image(systemName: "calendar")
        } currentValueLabel: {
            Text(centerText)
        }
        .gaugeStyle(.accessoryCircularCapacity)
    }

    private var centerText: String {
        switch state {
        case .due: return "!"
        case .upcoming(let days, _): return String(days)
        case .done: return "✓"
        default: return "–"
        }
    }

    private var rectangular: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(snap.s("review.title"))
                .font(.system(size: 12, weight: .semibold))
                .lineLimit(1)
            Text(state.headline(snap))
                .font(.system(size: 14, weight: .bold))
                .lineLimit(2)
            if let sub = state.subline(snap) {
                Text(sub)
                    .font(.system(size: 12))
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
