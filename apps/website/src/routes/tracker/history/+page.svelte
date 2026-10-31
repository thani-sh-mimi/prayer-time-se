<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-svelte';
	import { t } from '$lib/i18n';
	import TrackerHeader from '$lib/tracker/TrackerHeader.svelte';
	import { api, ApiError, localDay, type TrackerDay } from '$lib/tracker/api';

	const WEEKDAYS = ['mån', 'tis', 'ons', 'tor', 'fre', 'lör', 'sön'];

	let loading = $state(true);
	let days = $state<TrackerDay[]>([]);
	let today = $state(localDay());
	let month = $state(localDay().slice(0, 7));

	const monthLabel = $derived(
		new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' }).format(
			new Date(`${month}-01T12:00:00Z`)
		)
	);

	/** Leading blank cells before the 1st, Monday-first. */
	const leading = $derived((new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7);

	const daysInMonth = $derived(
		new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()
	);

	const byDay = $derived(new Map(days.map((day) => [day.day, day])));

	const monthDays = $derived(
		Array.from({ length: daysInMonth }, (_, index) => {
			const day = `${month}-${String(index + 1).padStart(2, '0')}`;
			return { day, record: byDay.get(day) };
		})
	);

	const monthStats = $derived.by(() => {
		let count = 0;
		let full = 0;
		let group = 0;
		for (const entry of monthDays) {
			count += entry.record?.count ?? 0;
			group += entry.record?.jamaah ?? 0;
			if ((entry.record?.count ?? 0) === 5) {
				full++;
			}
		}
		return { count, full, group };
	});

	function shade(count: number): string {
		if (count === 0) return 'bg-base-content/[0.04]';
		if (count <= 2) return 'bg-sky-500/25';
		if (count <= 4) return 'bg-sky-500/55';
		return 'bg-sky-500';
	}

	function shiftMonth(delta: number) {
		const date = new Date(`${month}-01T12:00:00Z`);
		date.setUTCMonth(date.getUTCMonth() + delta);
		month = date.toISOString().slice(0, 7);
	}

	const canGoForward = $derived(month < localDay().slice(0, 7));

	onMount(async () => {
		try {
			const tracker = await api.tracker(120);
			days = tracker.days;
			today = tracker.summary.today;
			loading = false;
		} catch (caught) {
			if (caught instanceof ApiError && caught.status === 401) {
				await goto('/tracker/login', { replaceState: true });
				return;
			}
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{t('route_tracker_history')} — {t('route_home_title')}</title>
</svelte:head>

<div class="flex flex-col w-full max-w-md mx-auto px-4 pt-4 pb-32">
	<TrackerHeader title={t('route_tracker_history')} back="/tracker" />

	{#if loading}
		<div class="flex items-center justify-center py-24">
			<span class="loading loading-spinner loading-md opacity-40"></span>
		</div>
	{:else}
		<section class="grid grid-cols-3 gap-3 mb-6">
			<div class="rounded-2xl bg-black/10 px-4 py-3">
				<p class="text-2xl font-light">{monthStats.count}</p>
				<p class="text-[11px] uppercase tracking-wide opacity-60 mt-1">
					{t('route_tracker_history_month')}
				</p>
			</div>
			<div class="rounded-2xl bg-black/10 px-4 py-3">
				<p class="text-2xl font-light">{monthStats.full}</p>
				<p class="text-[11px] uppercase tracking-wide opacity-60 mt-1">
					{t('route_tracker_history_full_days')}
				</p>
			</div>
			<div class="rounded-2xl bg-black/10 px-4 py-3">
				<p class="text-2xl font-light">{monthStats.group}</p>
				<p class="text-[11px] uppercase tracking-wide opacity-60 mt-1">
					{t('route_tracker_history_group')}
				</p>
			</div>
		</section>

		<section class="rounded-2xl bg-black/10 p-4">
			<div class="flex items-center justify-between mb-4">
				<button
					class="btn btn-ghost btn-sm btn-circle"
					onclick={() => shiftMonth(-1)}
					aria-label="Föregående månad"
				>
					<ChevronLeftIcon class="w-4 h-4" />
				</button>
				<p class="text-sm">{monthLabel}</p>
				<button
					class="btn btn-ghost btn-sm btn-circle"
					disabled={!canGoForward}
					onclick={() => shiftMonth(1)}
					aria-label="Nästa månad"
				>
					<ChevronRightIcon class="w-4 h-4" />
				</button>
			</div>

			<div class="grid grid-cols-7 gap-1.5 mb-1">
				{#each WEEKDAYS as weekday}
					<span class="text-[10px] uppercase tracking-wide opacity-50 text-center">
						{weekday}
					</span>
				{/each}
			</div>

			<div class="grid grid-cols-7 gap-1.5">
				{#each Array(leading) as _}
					<span></span>
				{/each}
				{#each monthDays as { day, record } (day)}
					<div
						class="aspect-square rounded-md flex items-center justify-center text-[10px] {shade(
							record?.count ?? 0
						)}"
						class:ring-1={day === today}
						class:ring-sky-300={day === today}
						class:opacity-70={day > today}
						title="{day}: {record?.count ?? 0}/5"
					>
						<span class={record?.count === 5 ? 'text-black/70' : 'opacity-70'}>
							{Number(day.slice(8))}
						</span>
					</div>
				{/each}
			</div>

			<div class="flex items-center gap-3 mt-4">
				{#each [0, 2, 4, 5] as count}
					<span class="w-3 h-3 rounded-sm {shade(count)}" class:ring-1={count === 5}></span>
					<span class="text-[10px] opacity-50"
						>{count === 0 ? '0' : count === 2 ? '1–2' : count === 4 ? '3–4' : '5'}</span
					>
				{/each}
			</div>
			<p class="text-xs opacity-60 mt-2 leading-relaxed">
				{t('route_tracker_history_legend')}
				{t('route_tracker_history_today')}
			</p>
		</section>
	{/if}
</div>
