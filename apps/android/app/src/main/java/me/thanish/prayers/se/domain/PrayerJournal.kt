package me.thanish.prayers.se.domain

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import java.time.LocalDate

/**
 * PrayerJournal is the personal record of which prayers have been marked.
 *
 * It never leaves the device: the whole log is one string in the app's own
 * DataStore, shaped `2026-10-31=5,2026-10-30=3`, where the number is a bitmask
 * of [prayers]. Old days are dropped on save so the string stays small.
 */
object PrayerJournal {
    private val KEY = stringPreferencesKey("journal")
    private const val KEEP_DAYS = 730L

    /** A day counts toward a streak with at least this many prayers marked. */
    const val STREAK_MINIMUM = 4

    /** The five prayers a person can mark, in order. */
    val prayers = listOf(
        PrayerTimeType.fajr,
        PrayerTimeType.dhohr,
        PrayerTimeType.asr,
        PrayerTimeType.maghrib,
        PrayerTimeType.isha,
    )

    /**
     * key returns the storage key for a date.
     */
    fun key(date: LocalDate): String = date.toString()

    /**
     * load reads the journal from the device.
     */
    fun load(context: Context): Map<String, Int> {
        val raw = runBlocking {
            context.dataStore.data.map { it[KEY] }.firstOrNull()
        } ?: return emptyMap()

        return raw.split(',')
            .mapNotNull { entry ->
                val parts = entry.split('=')
                val day = parts.getOrNull(0)?.takeIf { it.isNotBlank() }
                val mask = parts.getOrNull(1)?.toIntOrNull()
                if (day != null && mask != null) day to mask else null
            }
            .toMap()
    }

    /**
     * save writes the journal to the device, dropping days older than two years.
     */
    fun save(context: Context, journal: Map<String, Int>) {
        val cutoff = key(LocalDate.now().minusDays(KEEP_DAYS))
        val payload = journal
            .filterKeys { it >= cutoff }
            .entries
            .joinToString(",") { "${it.key}=${it.value}" }

        runBlocking {
            context.dataStore.edit { it[KEY] = payload }
        }
    }

    /**
     * toggle marks or unmarks one prayer for a date and returns the new journal.
     */
    fun toggle(context: Context, date: LocalDate, prayer: PrayerTimeType): Map<String, Int> {
        val journal = load(context).toMutableMap()
        val day = key(date)
        val bit = 1 shl prayers.indexOf(prayer)
        val next = (journal[day] ?: 0) xor bit

        if (next == 0) {
            journal.remove(day)
        } else {
            journal[day] = next
        }

        save(context, journal)
        return journal
    }

    /**
     * clear removes the whole journal from the device.
     */
    fun clear(context: Context) {
        runBlocking {
            context.dataStore.edit { it.remove(KEY) }
        }
    }

    /**
     * isMarked returns whether a prayer is marked for a date.
     */
    fun isMarked(journal: Map<String, Int>, date: LocalDate, prayer: PrayerTimeType): Boolean {
        val mask = journal[key(date)] ?: 0
        return mask and (1 shl prayers.indexOf(prayer)) != 0
    }

    /**
     * count returns how many of the five prayers are marked for a date.
     */
    fun count(journal: Map<String, Int>, date: LocalDate): Int {
        val mask = journal[key(date)] ?: 0
        return prayers.count { mask and (1 shl prayers.indexOf(it)) != 0 }
    }

    /**
     * streak returns consecutive days that count, walking back from today.
     * Today is not over, so an unfinished today does not break the streak.
     */
    fun streak(journal: Map<String, Int>, today: LocalDate = LocalDate.now()): Int {
        var cursor = today
        if (count(journal, cursor) < STREAK_MINIMUM) {
            cursor = cursor.minusDays(1)
        }

        var total = 0
        while (total < 400 && count(journal, cursor) >= STREAK_MINIMUM) {
            total++
            cursor = cursor.minusDays(1)
        }
        return total
    }

    /**
     * week returns the last seven days, oldest first.
     */
    fun week(journal: Map<String, Int>, today: LocalDate = LocalDate.now()): List<Pair<LocalDate, Int>> {
        return (6 downTo 0).map { offset ->
            val date = today.minusDays(offset.toLong())
            date to count(journal, date)
        }
    }
}
