<script lang="ts">
	import { onMount } from 'svelte';
	import { getPrayerTimes, type PrayerTimes } from '@thani-sh/prayer-time-se';
	import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, Trash2Icon } from 'lucide-svelte';
	import { city } from '$lib/domain/PrayerTimeCity';
	import { method } from '$lib/domain/PrayerTimeMethod';
	import { t, type TranslationKey } from '$lib/i18n';
	import {
		PRAYERS,
		addDays,
		clearJournal,
		count,
		formatLongDate,
		formatWeekday,
		isMarked,
		journal,
		streak,
		today,
		toggle,
		week,
		type Prayer
	} from '$lib/journal/store';

	const prayerKeys: Record<Prayer, TranslationKey> = {
		fajr: 'prayers_type_fajr',
		dhuhr: 'prayers_type_dhohr',
		asr: 'prayers_type_asr',
		maghrib: 'prayers_type_maghrib',
		isha: 'prayers_type_isha'
	};

	const day = today();
	let times = $state<PrayerTimes | null>(null);
	let month = $state(day.slice(0, 7));

	const todayCount = $derived(count($journal, day));
	const currentStreak = $derived(streak($journal, day));
	const weekDays = $derived(week($journal, day));
	const weekCount = $derived(weekDays.reduce((total, item) => total + item.count, 0));

	const monthLabel = $derived(
		new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' }).format(
			new Date(`${month}-01T12:00:00Z`)
		)
	);
	const leading = $derived((new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7);
	const daysInMonth = $derived(
		new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()
	);
	const monthCells = $derived(
		Array.from(
			{ length: daysInMonth },
			(_, index) => `${month}-${String(index + 1).padStart(2, '0')}`
		)
	);

	function shade(value: number): string {
		if (value === 0) return 'bg-base-content/[0.04]';
		if (value <= 2) return 'bg-sky-500/25';
		if (value <= 4) return 'bg-sky-500/55';
		return 'bg-sky-500';
	}

	function shiftMonth(delta: number) {
		const date = new Date(`${month}-01T12:00:00Z`);
		date.setUTCMonth(date.getUTCMonth() + delta);
		month = date.toISOString().slice(0, 7);
	}

	function timeOf(prayer: Prayer): string {
		if (!times) {
			return '';
		}
		const value = times[prayer];
		return `${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}`;
	}

	function reset() {
		if (confirm(t('route_journal_clear_confirm'))) {
			clearJournal();
		}
	}

	onMount(() => {
		getPrayerTimes(new Date(), $method, $city)
			.then((value) => (times = value))
			.catch(() => (times = null));
	});
</script>

<svelte:head>
	<title>{t('route_journal_title')} — {t('route_home_title')}</title>
</svelte:head>

<div class="flex flex-col w-full max-w-md mx-auto px-4 pt-4 pb-32">
	<header class="mb-6">
		<h1 class="text-3xl font-light">{t('route_journal_title')}</h1>
		<p class="text-sm opacity-60 mt-1">{t('route_journal_today')} · {formatLongDate(day)}</p>
	</header>

	<section class="grid grid-cols-2 gap-3 mb-6">
		<div class="rounded-2xl bg-black/10 px-4 py-3">
			<p class="text-2xl font-light">{todayCount}/5</p>
			<p class="text-[11px] uppercase tracking-wide opacity-60 mt-1">
				{t('route_journal_today')}
			</p>
		</div>
		<div class="rounded-2xl bg-black/10 px-4 py-3">
			<p class="text-2xl font-light">{currentStreak}</p>
			<p class="text-[11px] uppercase tracking-wide opacity-60 mt-1">
				{t('route_journal_streak')}
			</p>
		</div>
	</section>

	<section class="rounded-2xl bg-black/10 overflow-hidden">
		{#each PRAYERS as prayer (prayer)}
			{@const marked = isMarked($journal, day, prayer)}
			<button
				class="w-full flex items-center gap-3 py-4 px-4 text-left"
				onclick={() => toggle(day, prayer)}
				aria-pressed={marked}
			>
				<span class="text-lg">{t(prayerKeys[prayer])}</span>
				<span class="ml-auto text-sm tabular-nums opacity-60">{timeOf(prayer)}</span>
				<span
					class="ml-2 w-7 h-7 rounded-full flex items-center justify-center transition {marked
						? 'bg-sky-500 text-black'
						: 'border border-base-content/35'}"
				>
					{#if marked}
						<CheckIcon class="w-4 h-4" />
					{/if}
				</span>
			</button>
		{/each}
	</section>

	<p class="text-xs opacity-60 mt-3">{t('route_journal_hint')}</p>

	<section class="mt-6 rounded-2xl bg-black/10 p-4">
		<div class="flex items-end justify-between gap-2">
			{#each weekDays as item (item.day)}
				{@const isToday = item.day === day}
				<div class="flex flex-col items-center gap-2 flex-1">
					<div class="w-full h-16 flex items-end">
						<div
							class="w-full rounded-sm transition-all {item.count > 0
								? 'bg-sky-400'
								: 'bg-base-content/10'} {isToday ? 'ring-1 ring-sky-300/60' : ''}"
							style="height: {Math.max((item.count / 5) * 100, item.count > 0 ? 12 : 6)}%"
							title="{item.count}/5"
						></div>
					</div>
					<span
						class="text-[10px] uppercase tracking-wide"
						class:opacity-90={isToday}
						class:opacity-50={!isToday}>{formatWeekday(item.day)}</span
					>
				</div>
			{/each}
		</div>
		<p class="text-sm opacity-60 mt-3">
			{weekCount}
			{t('route_journal_week', { total: 35 })}
		</p>
	</section>

	<section class="mt-6 rounded-2xl bg-black/10 p-4">
		<div class="flex items-center justify-between mb-4">
			<button
				class="btn btn-ghost btn-sm btn-circle"
				onclick={() => shiftMonth(-1)}
				aria-label={t('route_journal_previous_month')}
			>
				<ChevronLeftIcon class="w-4 h-4" />
			</button>
			<p class="text-sm">{monthLabel}</p>
			<button
				class="btn btn-ghost btn-sm btn-circle"
				disabled={month >= day.slice(0, 7)}
				onclick={() => shiftMonth(1)}
				aria-label={t('route_journal_next_month')}
			>
				<ChevronRightIcon class="w-4 h-4" />
			</button>
		</div>

		<div class="grid grid-cols-7 gap-1.5 mb-1">
			{#each ['mån', 'tis', 'ons', 'tor', 'fre', 'lör', 'sön'] as weekday}
				<span class="text-[10px] uppercase tracking-wide opacity-50 text-center">{weekday}</span>
			{/each}
		</div>

		<div class="grid grid-cols-7 gap-1.5">
			{#each Array(leading) as _}
				<span></span>
			{/each}
			{#each monthCells as cellDay (cellDay)}
				<div
					class="aspect-square rounded-md flex items-center justify-center text-[10px] {shade(
						count($journal, cellDay)
					)}"
					class:ring-1={cellDay === day}
					class:ring-sky-300={cellDay === day}
					class:opacity-60={cellDay > day}
					title="{cellDay}: {count($journal, cellDay)}/5"
				>
					<span class={count($journal, cellDay) === 5 ? 'text-black/70' : 'opacity-70'}>
						{Number(cellDay.slice(8))}
					</span>
				</div>
			{/each}
		</div>

		<p class="text-xs opacity-60 mt-3 leading-relaxed">{t('route_journal_history_hint')}</p>
	</section>

	<div class="flex items-center justify-between mt-6 px-1">
		<p class="text-[11px] opacity-50">{t('route_journal_local')}</p>
		<button class="btn btn-ghost btn-xs opacity-50 hover:opacity-80" onclick={reset}>
			<Trash2Icon class="w-3.5 h-3.5" />
			{t('route_journal_clear')}
		</button>
	</div>
</div>
