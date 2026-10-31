package me.thanish.prayers.se.routes.journal

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import me.thanish.prayers.se.R
import me.thanish.prayers.se.domain.PrayerJournal
import me.thanish.prayers.se.domain.PrayerTimeCity
import me.thanish.prayers.se.domain.PrayerTimeMethod
import me.thanish.prayers.se.domain.PrayerTimeTable
import me.thanish.prayers.se.domain.PrayerTimeType
import me.thanish.prayers.se.domain.TimeFormat
import me.thanish.prayers.se.routes.RouteSpec
import me.thanish.prayers.se.routes.RouteType
import me.thanish.prayers.se.theme.PrayersTheme
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Describes the route to use with navigation.
 */
val JournalRouteSpec = RouteSpec(
    name = "journal",
    text = R.string.route_journal_name,
    type = RouteType.PRIMARY,
    icon = {
        val painter = painterResource(R.drawable.checklist)
        Pair(painter, painter)
    },
    content = { nav: NavController, modifier: Modifier -> JournalRoute(nav, modifier) }
)

/**
 * The journal route with all the states and event handlers.
 *
 * Everything it shows comes from the device: no account, no network.
 */
@Composable
fun JournalRoute(nav: NavController, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val method by remember { mutableStateOf(PrayerTimeMethod.get(context)) }
    val city by remember { mutableStateOf(PrayerTimeCity.get(context)) }
    val timeFormat by remember { mutableStateOf(TimeFormat.get(context)) }

    val today = remember { LocalDate.now() }
    var journal by remember { mutableStateOf(PrayerJournal.load(context)) }
    var month by remember { mutableStateOf(YearMonth.from(today)) }

    JournalRouteView(
        journal = journal,
        today = today,
        month = month,
        table = PrayerTimeTable.forDate(context, method, city, today),
        timeFormat = timeFormat,
        onToggle = { prayer ->
            journal = PrayerJournal.toggle(context, today, prayer)
        },
        onClear = {
            PrayerJournal.clear(context)
            journal = emptyMap()
        },
        onMonthChange = { month = it },
        modifier = modifier,
    )
}

/**
 * The journal view without any state of its own.
 */
@Composable
fun JournalRouteView(
    journal: Map<String, Int>,
    today: LocalDate,
    month: YearMonth,
    table: PrayerTimeTable,
    timeFormat: TimeFormat,
    onToggle: (PrayerTimeType) -> Unit = {},
    onClear: () -> Unit = {},
    onMonthChange: (YearMonth) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val todayCount = PrayerJournal.count(journal, today)
    val streak = PrayerJournal.streak(journal, today)
    val week = PrayerJournal.week(journal, today)
    val weekTotal = week.sumOf { it.second }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
    ) {
        Spacer(Modifier.height(24.dp))

        Text(
            text = stringResource(R.string.route_journal_title),
            style = MaterialTheme.typography.headlineMedium,
        )
        Text(
            text = today.format(
                DateTimeFormatter.ofPattern("EEEE d MMMM", Locale.forLanguageTag("sv-SE"))
            ),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp),
        )

        Spacer(Modifier.height(20.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatCard(
                value = "$todayCount/5",
                label = stringResource(R.string.route_journal_today),
                modifier = Modifier.weight(1f),
            )
            StatCard(
                value = "$streak",
                label = stringResource(R.string.route_journal_streak),
                modifier = Modifier.weight(1f),
            )
        }

        Spacer(Modifier.height(16.dp))

        Surface(
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column {
                PrayerJournal.prayers.forEachIndexed { index, prayer ->
                    if (index > 0) {
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 20.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                        )
                    }
                    PrayerRow(
                        prayer = prayer,
                        time = timeFormat.format(table.toList()[timeIndex(prayer)].time.toLocalTime()),
                        marked = PrayerJournal.isMarked(journal, today, prayer),
                        onClick = { onToggle(prayer) },
                    )
                }
            }
        }

        Text(
            text = stringResource(R.string.route_journal_hint),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 12.dp, start = 4.dp),
        )

        Spacer(Modifier.height(24.dp))

        WeekBars(week = week, today = today)

        Spacer(Modifier.height(16.dp))

        MonthGrid(
            journal = journal,
            today = today,
            month = month,
            onMonthChange = onMonthChange,
        )

        Spacer(Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = stringResource(R.string.route_journal_local),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            TextButton(onClick = onClear) {
                Text(stringResource(R.string.route_journal_clear))
            }
        }

        Spacer(Modifier.height(24.dp))
    }
}

/**
 * labelRes is the string resource for a prayer, resolved configuration-aware.
 */
private fun labelRes(prayer: PrayerTimeType): Int {
    return when (prayer) {
        PrayerTimeType.fajr -> R.string.prayers_type_fajr
        PrayerTimeType.dhohr -> R.string.prayers_type_dhohr
        PrayerTimeType.asr -> R.string.prayers_type_asr
        PrayerTimeType.maghrib -> R.string.prayers_type_maghrib
        PrayerTimeType.isha -> R.string.prayers_type_isha
        else -> R.string.prayers_type_fajr
    }
}

/**
 * timeIndex maps a tracked prayer to its row in the prayer time table.
 */
private fun timeIndex(prayer: PrayerTimeType): Int {
    return when (prayer) {
        PrayerTimeType.fajr -> 0
        PrayerTimeType.dhohr -> 2
        PrayerTimeType.asr -> 3
        PrayerTimeType.maghrib -> 4
        PrayerTimeType.isha -> 5
        else -> 0
    }
}

@Composable
private fun StatCard(value: String, label: String, modifier: Modifier = Modifier) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
        modifier = modifier,
    ) {
        Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 14.dp)) {
            Text(value, style = MaterialTheme.typography.headlineSmall)
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

@Composable
private fun PrayerRow(
    prayer: PrayerTimeType,
    time: String,
    marked: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 18.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = stringResource(labelRes(prayer)),
            style = MaterialTheme.typography.bodyLarge,
        )
        Spacer(Modifier.weight(1f))
        Text(
            text = time,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.width(14.dp))
        Box(
            modifier = Modifier
                .size(26.dp)
                .clip(CircleShape)
                .background(
                    if (marked) MaterialTheme.colorScheme.primary else Color.Transparent
                )
                .border(
                    width = 1.dp,
                    color = if (marked) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.outlineVariant,
                    shape = CircleShape,
                ),
            contentAlignment = Alignment.Center,
        ) {
            if (marked) {
                Icon(
                    painter = painterResource(R.drawable.check),
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}

@Composable
private fun WeekBars(week: List<Pair<LocalDate, Int>>, today: LocalDate) {
    Surface(
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                week.forEach { (date, count) ->
                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(64.dp),
                            contentAlignment = Alignment.BottomCenter,
                        ) {
                            val fraction = if (count > 0) maxOf(count / 5f, 0.12f) else 0.06f
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height((64f * fraction).dp)
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(
                                        if (count > 0) MaterialTheme.colorScheme.primary
                                        else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                                    )
                            )
                        }
                        Text(
                            text = date.format(
                                DateTimeFormatter.ofPattern("EE", Locale.forLanguageTag("sv-SE"))
                            ).lowercase(),
                            style = MaterialTheme.typography.labelSmall,
                            color = if (date == today) MaterialTheme.colorScheme.onSurface
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MonthGrid(
    journal: Map<String, Int>,
    today: LocalDate,
    month: YearMonth,
    onMonthChange: (YearMonth) -> Unit,
) {
    val first = month.atDay(1)
    val offset = (first.dayOfWeek.value - 1 + 7) % 7
    val days = month.lengthOfMonth()
    val cells = offset + days
    val rows = (cells + 6) / 7

    Surface(
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                IconButton(onClick = { onMonthChange(month.minusMonths(1)) }) {
                    Text("‹", style = MaterialTheme.typography.titleLarge)
                }
                Text(
                    text = month.format(
                        DateTimeFormatter.ofPattern("MMMM yyyy", Locale.forLanguageTag("sv-SE"))
                    ),
                    style = MaterialTheme.typography.bodyMedium,
                )
                IconButton(
                    onClick = { onMonthChange(month.plusMonths(1)) },
                    enabled = month < YearMonth.from(today),
                ) {
                    Text("›", style = MaterialTheme.typography.titleLarge)
                }
            }

            Row(modifier = Modifier.fillMaxWidth()) {
                listOf("mån", "tis", "ons", "tor", "fre", "lör", "sön").forEach { label ->
                    Text(
                        text = label,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            repeat(rows) { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    repeat(7) { column ->
                        val index = row * 7 + column - offset
                        if (index < 0 || index >= days) {
                            Spacer(Modifier.weight(1f))
                        } else {
                            val date = month.atDay(index + 1)
                            val count = PrayerJournal.count(journal, date)
                            val isToday = date == today

                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .aspectRatio(1f)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(dayColor(count, isToday)),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    text = "${index + 1}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (count >= 5) MaterialTheme.colorScheme.onPrimary
                                    else MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
                Spacer(Modifier.height(6.dp))
            }

            Text(
                text = stringResource(R.string.route_journal_history_hint),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

@Composable
private fun dayColor(count: Int, isToday: Boolean): androidx.compose.ui.graphics.Color {
    val primary = MaterialTheme.colorScheme.primary
    return when {
        count >= 5 -> primary
        count >= 3 -> primary.copy(alpha = 0.55f)
        count >= 1 -> primary.copy(alpha = 0.28f)
        isToday -> MaterialTheme.colorScheme.outline.copy(alpha = 0.35f)
        else -> MaterialTheme.colorScheme.surface.copy(alpha = 0.6f)
    }
}

@Preview
@Composable
fun JournalRoutePreview() {
    val context = androidx.compose.ui.platform.LocalContext.current
    val today = LocalDate.now()

    PrayersTheme {
        JournalRouteView(
            journal = mapOf(
                today.toString() to 0b00101,
                today.minusDays(1).toString() to 0b11111,
            ),
            today = today,
            month = YearMonth.from(today),
            table = PrayerTimeTable.forDate(
                context,
                PrayerTimeMethod.islamiskaforbundet,
                PrayerTimeCity.stockholm,
                today,
            ),
            timeFormat = TimeFormat.h24,
        )
    }
}
