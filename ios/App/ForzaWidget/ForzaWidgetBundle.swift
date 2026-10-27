import SwiftUI
import WidgetKit

@main
struct ForzaWidgetBundle: WidgetBundle {
    var body: some Widget {
        TodayWidget()
        ReviewWidget()
    }
}
