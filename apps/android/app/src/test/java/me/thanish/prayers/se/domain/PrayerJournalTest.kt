package me.thanish.prayers.se.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/**
 * Tests for the parts of the journal that do not touch the device.
 */
class PrayerJournalTest {
    private val today: LocalDate = LocalDate.of(2026, 10, 31)

    private fun day(offset: Long): LocalDate = today.minusDays(offset)

    /** Builds a journal entry with the prayers at the given indexes marked. */
    private fun entry(offset: Long, vararg indexes: Int): Pair<String, Int> {
        val mask = indexes.fold(0) { acc, index -> acc or (1 shl index) }
        return PrayerJournal.key(day(offset)) to mask
    }

    @Test
    fun `counts only the marked prayers`() {
        val journal = mapOf(entry(0, 0, 2, 4))

        assertEquals(3, PrayerJournal.count(journal, today))
    }

    @Test
    fun `reports a mark per prayer`() {
        val journal = mapOf(entry(0, 0, 2))

        assertTrue(PrayerJournal.isMarked(journal, today, PrayerTimeType.fajr))
        assertTrue(PrayerJournal.isMarked(journal, today, PrayerTimeType.asr))
        assertFalse(PrayerJournal.isMarked(journal, today, PrayerTimeType.maghrib))
    }

    @Test
    fun `counts a day with nothing marked as zero`() {
        assertEquals(0, PrayerJournal.count(emptyMap(), today))
    }

    @Test
    fun `streak counts back over full days`() {
        val journal = mapOf(
            entry(0, 0, 1, 2, 3, 4),
            entry(1, 0, 1, 2, 3),
            entry(2, 0, 1, 2, 3, 4),
        )

        assertEquals(3, PrayerJournal.streak(journal, today))
    }

    @Test
    fun `an unfinished today does not break the streak`() {
        val journal = mapOf(
            entry(0, 0),
            entry(1, 0, 1, 2, 3),
            entry(2, 0, 1, 2, 3, 4),
        )

        assertEquals(2, PrayerJournal.streak(journal, today))
    }

    @Test
    fun `a day with fewer than four prayers ends the streak`() {
        val journal = mapOf(
            entry(0, 0, 1, 2, 3, 4),
            entry(1, 0, 1, 2, 3, 4),
            entry(2, 0, 1, 2),
            entry(3, 0, 1, 2, 3, 4),
        )

        assertEquals(2, PrayerJournal.streak(journal, today))
    }

    @Test
    fun `week returns seven days ending today`() {
        val journal = mapOf(entry(0, 0, 1), entry(3, 0, 1, 2, 3, 4))
        val week = PrayerJournal.week(journal, today)

        assertEquals(7, week.size)
        assertEquals(today, week.last().first)
        assertEquals(day(6), week.first().first)
        assertEquals(2, week.last().second)
        assertEquals(5, week[3].second)
    }
}
