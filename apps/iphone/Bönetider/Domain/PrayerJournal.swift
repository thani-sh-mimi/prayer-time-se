//
//  PrayerJournal.swift
//  Bönetider
//
//  Created by MiMi on 2026-10-31.
//

import Foundation

/// PrayerJournal is the personal record of which prayers have been marked.
///
/// It lives in `UserDefaults` on this device and is never uploaded. Each day
/// is stored as a bitmask of `prayers`, keyed by `yyyy-MM-dd`, and days older
/// than two years are dropped on save.
enum PrayerJournal {
  /// The five prayers a person can mark, in order.
  static let prayers: [PrayerTimeType] = [.fajr, .dhohr, .asr, .maghrib, .isha]

  /// A day counts toward a streak with at least this many prayers marked.
  static let streakMinimum = 4

  private static let storageKey = "journal.v1"
  private static let keepDays = 730

  // MARK: - Days

  /// A calendar that starts the week on Monday, like the rest of the app.
  static var calendar: Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.firstWeekday = 2
    calendar.locale = Locale(identifier: "sv_SE")
    return calendar
  }

  private static var keyFormatter: DateFormatter {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = .current
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
  }

  /// The storage key for a date, e.g. "2026-10-31".
  static func key(for date: Date) -> String {
    keyFormatter.string(from: date)
  }

  // MARK: - Storage

  /// Load the journal from this device.
  static func load() -> [String: Int] {
    guard let data = UserDefaults.standard.data(forKey: storageKey),
          let decoded = try? JSONDecoder().decode([String: Int].self, from: data) else {
      return [:]
    }
    return decoded
  }

  /// Save the journal to this device, dropping days older than two years.
  static func save(_ days: [String: Int]) {
    let cutoff = key(for: calendar.date(byAdding: .day, value: -keepDays, to: Date()) ?? Date())
    let pruned = days.filter { $0.key >= cutoff }
    guard let data = try? JSONEncoder().encode(pruned) else { return }
    UserDefaults.standard.set(data, forKey: storageKey)
  }

  /// Remove the whole journal from this device.
  static func clear() {
    UserDefaults.standard.removeObject(forKey: storageKey)
  }

  // MARK: - Marks

  private static func bit(for prayer: PrayerTimeType) -> Int {
    guard let index = prayers.firstIndex(of: prayer) else { return 0 }
    return 1 << index
  }

  /// Whether a prayer is marked for a date.
  static func isMarked(_ days: [String: Int], on date: Date, prayer: PrayerTimeType) -> Bool {
    let mask = days[key(for: date)] ?? 0
    return mask & bit(for: prayer) != 0
  }

  /// How many of the five prayers are marked for a date.
  static func count(_ days: [String: Int], on date: Date) -> Int {
    let mask = days[key(for: date)] ?? 0
    return prayers.filter { mask & bit(for: $0) != 0 }.count
  }

  /// Mark or unmark one prayer, returning the updated journal.
  static func toggled(_ days: [String: Int], on date: Date, prayer: PrayerTimeType) -> [String: Int] {
    var next = days
    let day = key(for: date)
    let mask = (next[day] ?? 0) ^ bit(for: prayer)
    if mask == 0 {
      next.removeValue(forKey: day)
    } else {
      next[day] = mask
    }
    return next
  }

  // MARK: - Summaries

  /// Consecutive days that count, walking back from today. Today is not over,
  /// so an unfinished today does not break the streak.
  static func streak(_ days: [String: Int], today: Date = Date()) -> Int {
    var cursor = today
    if count(days, on: cursor) < streakMinimum {
      cursor = calendar.date(byAdding: .day, value: -1, to: cursor) ?? cursor
    }

    var total = 0
    while total < 400 && count(days, on: cursor) >= streakMinimum {
      total += 1
      cursor = calendar.date(byAdding: .day, value: -1, to: cursor) ?? cursor
    }
    return total
  }

  /// The last seven days, oldest first.
  static func week(_ days: [String: Int], today: Date = Date()) -> [(date: Date, count: Int)] {
    var result: [(date: Date, count: Int)] = []
    for offset in stride(from: 6, through: 0, by: -1) {
      guard let date = calendar.date(byAdding: .day, value: -offset, to: today) else { continue }
      result.append((date, count(days, on: date)))
    }
    return result
  }
}

/// PrayerJournalStore publishes the journal to SwiftUI and writes every change
/// straight back to the device.
@MainActor
final class PrayerJournalStore: ObservableObject {
  @Published private(set) var days: [String: Int] = PrayerJournal.load()

  func toggle(_ prayer: PrayerTimeType, on date: Date = Date()) {
    days = PrayerJournal.toggled(days, on: date, prayer: prayer)
    PrayerJournal.save(days)
  }

  func clear() {
    days = [:]
    PrayerJournal.clear()
  }

  func count(on date: Date) -> Int {
    PrayerJournal.count(days, on: date)
  }

  func isMarked(_ prayer: PrayerTimeType, on date: Date) -> Bool {
    PrayerJournal.isMarked(days, on: date, prayer: prayer)
  }

  func streak(today: Date = Date()) -> Int {
    PrayerJournal.streak(days, today: today)
  }

  func week(today: Date = Date()) -> [(date: Date, count: Int)] {
    PrayerJournal.week(days, today: today)
  }
}
