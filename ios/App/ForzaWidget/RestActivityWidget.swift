import SwiftUI
import WidgetKit
import ActivityKit

/// Rango para los cronómetros del sistema: nunca invertido (si el descanso ya terminó queda en 0:00).
@available(iOS 16.1, *)
private func countdownRange(_ state: RestActivityAttributes.ContentState) -> ClosedRange<Date> {
    let end = state.endsAt
    return min(Date(), end)...end
}

/// Rango de toda la duración del descanso, para la barra.
@available(iOS 16.1, *)
private func fullRange(_ state: RestActivityAttributes.ContentState) -> ClosedRange<Date> {
    let end = state.endsAt
    let start = end.addingTimeInterval(-max(1, state.totalSeconds))
    return start...end
}

/// Descanso entre series en la pantalla de bloqueo y en la Dynamic Island.
@available(iOS 16.1, *)
struct RestActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RestActivityAttributes.self) { context in
            RestLockScreenView(context: context)
                .activityBackgroundTint(Color(UIColor.systemBackground))
                .activitySystemActionForegroundColor(Theme.green)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "timer")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(Theme.green)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timerInterval: countdownRange(context.state), countsDown: true, showsHours: false)
                        .font(.system(size: 28, weight: .heavy, design: .rounded))
                        .monospacedDigit()
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 96, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.title)
                        .font(.system(size: 15, weight: .semibold))
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ProgressView(
                        timerInterval: fullRange(context.state),
                        countsDown: true,
                        label: { EmptyView() },
                        currentValueLabel: { EmptyView() }
                    )
                    .tint(Theme.green)
                }
            } compactLeading: {
                Image(systemName: "timer")
                    .foregroundColor(Theme.green)
            } compactTrailing: {
                Text(timerInterval: countdownRange(context.state), countsDown: true, showsHours: false)
                    .monospacedDigit()
                    .multilineTextAlignment(.trailing)
                    .frame(width: 44)
            } minimal: {
                Image(systemName: "timer")
                    .foregroundColor(Theme.green)
            }
            .keylineTint(Theme.green)
        }
    }
}

@available(iOS 16.1, *)
struct RestLockScreenView: View {
    let context: ActivityViewContext<RestActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .center, spacing: 8) {
                Image(systemName: "timer")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Theme.green)
                Text(context.attributes.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
                Spacer(minLength: 8)
                Text(timerInterval: countdownRange(context.state), countsDown: true, showsHours: false)
                    .font(.system(size: 36, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 120, alignment: .trailing)
            }
            ProgressView(
                timerInterval: fullRange(context.state),
                countsDown: true,
                label: { EmptyView() },
                currentValueLabel: { EmptyView() }
            )
            .tint(Theme.green)
            if !context.attributes.subtitle.isEmpty {
                Text(context.attributes.subtitle)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(16)
    }
}
