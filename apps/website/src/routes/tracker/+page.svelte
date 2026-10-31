<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getPrayerTimes, type PrayerTimes } from '@thani-sh/prayer-time-se';
	import { CheckIcon, ChevronRightIcon, UsersIcon } from 'lucide-svelte';
	import { city } from '$lib/domain/PrayerTimeCity';
	import { method } from '$lib/domain/PrayerTimeMethod';
	import { t, type TranslationKey } from '$lib/i18n';
	import TrackerHeader from '$lib/tracker/TrackerHeader.svelte';
	import {
		api,
		ApiError,
		PRAYERS,
		formatLongDate,
		formatWeekday,
		localDay,
		type Prayer,
		type Summary,
		type TrackerDay
	} from '$lib/tracker/api';

	const prayerKeys: Record<Prayer, TranslationKey> = {
		fajr: 'prayers_type_fajr',
		dhuhr: 'prayers_type_dhohr',
		asr: 'prayers_type_asr',
		maghrib: 'prayers_type_maghrib',
		isha: 'prayers_type_isha'
	};

	let loading = $state(true);
	let error = $state('');
	let summary = $state<Summary | null>(null);
	let days = $state<TrackerDay[]>([]);
	let unread = $state(0);
	let pending = $state<Prayer | null>(null);
	let times = $state<PrayerTimes | null>(null);

	const today = $derived(summary?.today ?? localDay());
	const todayRecord = $derived(days.find((day) => day.day === today));

	function isMarked(prayer: Prayer): boolean {
		return Boolean(todayRecord?.prayers[prayer]);
	}

	function isGroup(prayer: Prayer): boolean {
		return Boolean(todayRecord?.prayers[prayer]?.jamaah);
	}

	function timeOf(prayer: Prayer): string {
		if (!times) {
			return '';
		}
		const value = times[prayer];
		return `${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}`;
	}

	async function load() {
		try {
			const [me, tracker, notifications] = await Promise.all([
				api.me(),
				api.tracker(35),
				api.notifications()
			]);
			summary = tracker.summary;
			days = tracker.days;
			unread = notifications.unread;
			loading = false;
		} catch (caught) {
			if (caught instanceof ApiError && caught.status === 401) {
				await goto('/tracker/login', { replaceState: true });
				return;
			}
			error = caught instanceof Error ? caught.message : String(caught);
			loading = false;
		}
	}

	/** Mark or unmark one prayer. The row stays responsive: the summary is
	 * replaced by the server's own numbers once the call returns. */
	async function toggle(prayer: Prayer) {
		if (pending) {
			return;
		}
		pending = prayer;
		const marked = isMarked(prayer);
		try {
			const result = marked
				? await api.unmark(today, prayer)
				: await api.mark(today, prayer, false);
			summary = result.summary;
			await refreshDays();
		} catch (caught) {
			error = caught instanceof ApiError ? caught.code : String(caught);
		} finally {
			pending = null;
		}
	}

	/** Marking as a group also marks the prayer, and unmarking the row clears
	 * both — one tap should never leave a contradictory state. */
	async function toggleGroup(prayer: Prayer) {
		if (pending) {
			return;
		}
		pending = prayer;
		const marked = isMarked(prayer);
		const group = isGroup(prayer);
		try {
			const result =
				marked && group ? await api.unmark(today, prayer) : await api.mark(today, prayer, true);
			summary = result.summary;
			await refreshDays();
		} catch (caught) {
			error = caught instanceof ApiError ? caught.code : String(caught);
		} finally {
			pending = null;
		}
	}

	async function refreshDays() {
		const tracker = await api.tracker(35);
		days = tracker.days;
		summary = tracker.summary;
	}

	onMount(() => {
		load();
		getPrayerTimes(new Date(), $method, $city)
			.then((value) => (times = value))
			.catch(() => (times = null));
	});
</script>

<svelte:head>
	<title>{t('route_tracker_title')} — {t('route_home_title')}</title>
</svelte:head>

<div class="flex flex-col w-full max-w-md mx-auto px-4 pt-4 pb-32">
	<TrackerHeader title={t('route_tracker_title')} {unread} />

	{#if loading}
		<div class="flex items-center justify-center py-24">
			<span class="loading loading-spinner loading-md opacity-40"></span>
		</div>
	{:else if error}
		<p class="text-sm text-red-400">{t('route_tracker_generic_error')}</p>
	{:else if summary}
		<p class="text-sm opacity-60 mb-6 -mt-2">
			{t('route_tracker_today')} · {formatLongDate(today)}
		</p>

		<section class="grid grid-cols-3 gap-3 mb-6">
			<div class="rounded-2xl bg-black/10 px-4 py-3">
				<p class="text-2xl font-light">{summary.todayCount}/5</p>
				<p class="text-[11px] uppercase tracking-wide opacity-60 mt-1">
					{t('route_tracker_today')}
				</p>
			</div>
			<div class="rounded-2xl bg-black/10 px-4 py-3">
				<p class="text-2xl font-light">{summary.streak}</p>
				<p class="text-[11px] uppercase tracking-wide opacity-60 mt-1">
					{t('route_tracker_streak')}
				</p>
			</div>
			<div class="rounded-2xl bg-black/10 px-4 py-3">
				<p class="text-2xl font-light">{summary.weekJamaah}</p>
				<p class="text-[11px] uppercase tracking-wide opacity-60 mt-1">
					{t('route_tracker_group_total')}
				</p>
			</div>
		</section>

		<section class="rounded-2xl bg-black/10 overflow-hidden">
			{#each PRAYERS as prayer (prayer)}
				<div class="flex items-center gap-2 px-2">
					<button
						class="flex-1 flex items-center gap-3 py-4 px-2 text-left disabled:opacity-50"
						disabled={pending !== null}
						onclick={() => toggle(prayer)}
						aria-pressed={isMarked(prayer)}
					>
						<span
							class="w-2.5 h-2.5 rounded-full transition {isMarked(prayer)
								? 'bg-sky-400'
								: 'bg-base-content/20'}"
						></span>
						<span class="text-lg" class:opacity-40={!isMarked(prayer)}>
							{t(prayerKeys[prayer])}
						</span>
						<span class="ml-auto text-sm tabular-nums opacity-60">{timeOf(prayer)}</span>
						{#if pending === prayer}
							<span class="loading loading-spinner loading-xs opacity-40 ml-auto"></span>
						{/if}
					</button>

					<button
						class="btn btn-ghost btn-sm btn-circle"
						class:text-sky-400={isGroup(prayer)}
						class:opacity-40={!isGroup(prayer)}
						disabled={pending !== null}
						onclick={() => toggleGroup(prayer)}
						aria-label={t('route_tracker_group_label')}
						aria-pressed={isGroup(prayer)}
					>
						<UsersIcon class="w-4 h-4" />
					</button>

					<span class="w-6 flex justify-center">
						{#if isMarked(prayer)}
							<CheckIcon class="w-4 h-4 text-sky-400" />
						{/if}
					</span>
				</div>
			{/each}
		</section>

		<p class="text-xs opacity-60 mt-3 leading-relaxed">
			{t('route_tracker_mark_hint')}
			{t('route_tracker_group_hint')}
		</p>

		<section class="mt-6 rounded-2xl bg-black/10 p-4">
			<div class="flex items-end justify-between gap-2">
				{#each summary.week as day (day.day)}
					{@const isToday = day.day === today}
					<div class="flex flex-col items-center gap-2 flex-1">
						<div class="w-full h-16 flex items-end">
							<div
								class="w-full rounded-sm transition-all {day.count > 0
									? 'bg-sky-400'
									: 'bg-base-content/10'}"
								style="height: {Math.max((day.count / 5) * 100, day.count > 0 ? 12 : 6)}%"
								title="{day.count}/5"
							></div>
						</div>
						<span
							class="text-[10px] uppercase tracking-wide"
							class:opacity-90={isToday}
							class:opacity-50={!isToday}>{formatWeekday(day.day)}</span
						>
					</div>
				{/each}
			</div>
			<p class="text-sm opacity-60 mt-3">
				{summary.weekCount}
				{t('route_tracker_week_total', { total: 35 })}
			</p>
		</section>

		<nav class="mt-6 grid grid-cols-2 gap-3">
			<a href="/tracker/history" class="btn btn-ghost justify-between bg-black/10 border-0">
				{t('route_tracker_history')}
				<ChevronRightIcon class="w-4 h-4 opacity-40" />
			</a>
			<a href="/tracker/friends" class="btn btn-ghost justify-between bg-black/10 border-0">
				{t('route_tracker_friends')}
				<ChevronRightIcon class="w-4 h-4 opacity-40" />
			</a>
		</nav>
	{/if}
</div>
