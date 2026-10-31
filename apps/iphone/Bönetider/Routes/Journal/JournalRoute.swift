//
//  JournalRoute.swift
//  Bönetider
//
//  Created by MiMi on 2026-10-31.
//

import SwiftUI

struct JournalRouteSpec: RouteSpec {
  let name: String      = "journal"
  let text: String      = String(localized: "route_journal_name")
  let icon: String      = "checklist"
  let content: any View = JournalRoute()
}

// JournalRoute is the personal prayer log. Everything on it comes from the
// device: no account, no network.
struct JournalRoute: View {
  @StateObject private var journal = PrayerJournalStore()

  @AppStorage(PrayerTimeMethod.key)
  private var method: PrayerTimeMethod = PrayerTimeMethod.standard

  @AppStorage(PrayerTimeCity.key)
  private var city: PrayerTimeCity = PrayerTimeCity.standard

  @State private var month: Date = Date()
  @State private var showClearConfirmation = false

  private let today = Date()
  private var calendar: Calendar { PrayerJournal.calendar }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        heading
        stats
        prayerList
        hint
        weekCard
        monthCard
        footer
      }
      .padding(.horizontal, 20)
      .padding(.vertical, 16)
    }
  }

  // MARK: - Sections

  private var heading: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("route_journal_title")
        .font(.largeTitle)
      Text("\(String(localized: "route_journal_today")) · \(longDate)")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
  }

  private var stats: some View {
    HStack(spacing: 12) {
      StatCard(value: "\(journal.count(on: today))/5", label: String(localized: "route_journal_today"))
      StatCard(value: "\(journal.streak(today: today))", label: String(localized: "route_journal_streak"))
    }
  }

  private var prayerList: some View {
    VStack(spacing: 0) {
      ForEach(Array(PrayerJournal.prayers.enumerated()), id: \.offset) { index, prayer in
        if index > 0 {
          Divider().padding(.horizontal, 20)
        }
        PrayerRow(
          name: prayer.label,
          time: time(for: prayer),
          marked: journal.isMarked(prayer, on: today),
          action: { journal.toggle(prayer, on: today) }
        )
      }
    }
    .background(surface)
  }

  private var hint: some View {
    Text("route_journal_hint")
      .font(.footnote)
      .foregroundStyle(.secondary)
      .padding(.horizontal, 4)
  }

  private var weekCard: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(alignment: .bottom, spacing: 8) {
        ForEach(Array(journal.week(today: today).enumerated()), id: \.offset) { _, item in
          VStack(spacing: 8) {
            VStack {
              Spacer(minLength: 0)
              RoundedRectangle(cornerRadius: 4)
                .fill(item.count > 0 ? Color.accentColor : Color.secondary.opacity(0.18))
                .frame(height: max(4, CGFloat(item.count) / 5 * 64))
            }
            .frame(height: 64)

            Text(weekdayLabel(item.date))
              .font(.caption2)
              .foregroundStyle(isSameDay(item.date, today) ? .primary : .secondary)
          }
          .frame(maxWidth: .infinity)
        }
      }

      Text("\(weekTotal) " + String(localized: "route_journal_week"))
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .padding(16)
    .background(surface)
  }

  private var monthCard: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Button { shiftMonth(-1) } label: { Image(systemName: "chevron.left") }
        Spacer()
        Text(monthLabel).font(.subheadline)
        Spacer()
        Button { shiftMonth(1) } label: { Image(systemName: "chevron.right") }
          .disabled(isCurrentMonth)
      }
      .buttonStyle(.plain)
      .foregroundStyle(.secondary)

      HStack(spacing: 0) {
        ForEach(["mån", "tis", "ons", "tor", "fre", "lör", "sön"], id: \.self) { label in
          Text(label)
            .font(.caption2)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity)
        }
      }

      LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 7), spacing: 6) {
        ForEach(Array(monthCells.enumerated()), id: \.offset) { _, cell in
          if let date = cell {
            dayCell(date)
          } else {
            Color.clear.aspectRatio(1, contentMode: .fit)
          }
        }
      }

      Text("route_journal_history_hint")
        .font(.footnote)
        .foregroundStyle(.secondary)
    }
    .padding(16)
    .background(surface)
  }

  private var footer: some View {
    HStack {
      Text("route_journal_local")
        .font(.caption2)
        .foregroundStyle(.secondary)
      Spacer()
      Button("route_journal_clear") { showClearConfirmation = true }
        .font(.caption)
        .foregroundStyle(.secondary)
        .confirmationDialog(
          "route_journal_clear_confirmation",
          isPresented: $showClearConfirmation,
          titleVisibility: .visible
        ) {
          Button("route_journal_clear", role: .destructive) { journal.clear() }
          Button("cancel", role: .cancel) {}
        }
    }
  }

  // MARK: - Rows

  private func dayCell(_ date: Date) -> some View {
    let count = journal.count(on: date)
    let isToday = isSameDay(date, today)

    return RoundedRectangle(cornerRadius: 8)
      .fill(shade(count: count, isToday: isToday))
      .aspectRatio(1, contentMode: .fit)
      .overlay(
        Text("\(calendar.component(.day, from: date))")
          .font(.caption2)
          .foregroundStyle(count >= 5 ? Color.white : Color.secondary)
      )
  }

  private struct PrayerRow: View {
    let name: String
    let time: String
    let marked: Bool
    let action: () -> Void

    var body: some View {
      Button(action: action) {
        HStack(spacing: 14) {
          Text(name)
            .font(.body)
          Spacer()
          Text(time)
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .monospacedDigit()
          Image(systemName: marked ? "checkmark.circle.fill" : "circle")
            .font(.title3)
            .foregroundStyle(marked ? Color.accentColor : Color.secondary.opacity(0.5))
            .frame(width: 26)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .contentShape(Rectangle())
      }
      .buttonStyle(.plain)
      .accessibilityValue(marked ? String(localized: "route_journal_marked") : "")
    }
  }

  private struct StatCard: View {
    let value: String
    let label: String

    var body: some View {
      VStack(alignment: .leading, spacing: 4) {
        Text(value).font(.title2)
        Text(label).font(.caption2).foregroundStyle(.secondary)
      }
      .padding(.horizontal, 18)
      .padding(.vertical, 14)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(
        RoundedRectangle(cornerRadius: 20).fill(Color(.secondarySystemBackground))
      )
    }
  }

  // MARK: - Helpers

  private var surface: some View {
    RoundedRectangle(cornerRadius: 24).fill(Color(.secondarySystemBackground))
  }

  private var longDate: String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "sv_SE")
    formatter.dateFormat = "EEEE d MMMM"
    return formatter.string(from: today).lowercased()
  }

  private var weekTotal: Int {
    journal.week(today: today).reduce(0) { $0 + $1.count }
  }

  private func time(for prayer: PrayerTimeType) -> String {
    let table = PrayerTimeTable.forDate(method: method, city: city, date: today)
    return table.data.first { $0.type == prayer }?.timeString ?? ""
  }

  private func weekdayLabel(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "sv_SE")
    formatter.dateFormat = "EE"
    return formatter.string(from: date).lowercased()
  }

  private func isSameDay(_ lhs: Date, _ rhs: Date) -> Bool {
    calendar.isDate(lhs, inSameDayAs: rhs)
  }

  private func shade(count: Int, isToday: Bool) -> Color {
    switch count {
    case 5...: return .accentColor
    case 3...4: return .accentColor.opacity(0.55)
    case 1...2: return .accentColor.opacity(0.28)
    default: return isToday ? Color.secondary.opacity(0.25) : Color.secondary.opacity(0.08)
    }
  }

  private var monthLabel: String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "sv_SE")
    formatter.dateFormat = "MMMM yyyy"
    return formatter.string(from: month)
  }

  private var isCurrentMonth: Bool {
    calendar.isDate(month, equalTo: today, toGranularity: .month)
  }

  private func shiftMonth(_ delta: Int) {
    guard let next = calendar.date(byAdding: .month, value: delta, to: month) else { return }
    month = next
  }

  /// The cells of the shown month, with nil before the 1st and after the last.
  private var monthCells: [Date?] {
    guard
      let interval = calendar.dateInterval(of: .month, for: month),
      let dayCount = calendar.range(of: .day, in: .month, for: month)?.count
    else {
      return []
    }

    let first = interval.start
    let leading = (calendar.component(.weekday, from: first) - calendar.firstWeekday + 7) % 7
    var cells: [Date?] = Array(repeating: nil, count: leading)
    for day in 0..<dayCount {
      cells.append(calendar.date(byAdding: .day, value: day, to: first))
    }
    while cells.count % 7 != 0 {
      cells.append(nil)
    }
    return cells
  }
}

#Preview {
  JournalRoute()
}
