<script lang="ts">
	import { onMount } from 'svelte';
	import { getPrayerTimes } from '@thani-sh/prayer-time-se';
	import { fly } from 'svelte/transition';
	import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-svelte';
	import { hijriCalendarOffset, clampHijriCalendarOffset } from '$lib/domain/HijriCalendarOffset';
	import { city } from '$lib/domain/PrayerTimeCity';
	import { method } from '$lib/domain/PrayerTimeMethod';
	import { t } from '$lib/i18n';
	import { isMarked, journal, keyFor, toggle, type Prayer } from '$lib/journal/store';

	const hijriDateFormatter = new Intl.DateTimeFormat('ar-TN-u-ca-islamic', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		era: 'short'
	});

	/** How far the day can be moved from today: a month back, a week ahead. */
	const MIN_OFFSET = -30;
	const MAX_OFFSET = 7;
	const SWIPE_DISTANCE = 56;

	const startOfToday = new Date();
	startOfToday.setHours(0, 0, 0, 0);

	let date = $state(new Date());
	let dragX = $state(0);
	let direction = $state(1);
	let startX = $state(0);
	let dragging = $state(false);
	let travelled = 0;
	/** A swipe must not leave a mark behind: taps are ignored right after one. */
	let lastSwipeAt = 0;
	/** The day transition is only worth animating once the page has settled. */
	let animated = $state(false);

	onMount(() => {
		animated = true;
	});

	const dayKey = $derived(keyFor(date));

	function offsetOf(value: Date): number {
		const start = new Date(value);
		start.setHours(0, 0, 0, 0);
		return Math.round((start.getTime() - startOfToday.getTime()) / 86_400_000);
	}

	const canGoBack = $derived(offsetOf(date) > MIN_OFFSET);
	const canGoForward = $derived(offsetOf(date) < MAX_OFFSET);

	function shift(delta: number) {
		const next = new Date(date);
		next.setDate(next.getDate() + delta);
		const offset = offsetOf(next);
		if (offset < MIN_OFFSET || offset > MAX_OFFSET) {
			return;
		}
		direction = delta;
		date = next;
	}

	function onPointerDown(event: PointerEvent) {
		if (event.pointerType === 'mouse' && event.button !== 0) {
			return;
		}
		dragging = true;
		startX = event.clientX;
		travelled = 0;
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) {
			return;
		}
		const distance = event.clientX - startX;
		travelled = Math.abs(distance);
		dragX = Math.max(-120, Math.min(120, distance));
	}

	function onPointerUp() {
		if (!dragging) {
			return;
		}
		const distance = dragX;
		dragging = false;
		dragX = 0;
		if (travelled > 8) {
			lastSwipeAt = performance.now();
		}
		if (Math.abs(distance) > SWIPE_DISTANCE) {
			shift(distance < 0 ? 1 : -1);
		}
	}

	function onKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') {
			shift(-1);
		} else if (event.key === 'ArrowRight') {
			shift(1);
		}
	}

	function getDateString() {
		return date.toLocaleDateString();
	}

	function getHijriDateString(offset: number) {
		const offsetDate = new Date(date);
		offsetDate.setDate(offsetDate.getDate() + clampHijriCalendarOffset(offset));
		return hijriDateFormatter.format(offsetDate);
	}

	function markPrayer(prayer: Prayer) {
		if (performance.now() - lastSwipeAt < 350) {
			return;
		}
		toggle(dayKey, prayer);
	}

	function timeString(hour: number, minute: number) {
		return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
	}
</script>

<svelte:window onkeydown={onKeyDown} />

{#snippet TableRow(name: string, hour: number, minute: number)}
	<div class="flex flex-row py-4 space-x-6 items-center justify-center">
		<div class="text-lg w-1/2 text-right text-gray-500 dark:text-gray-300">{name}</div>
		<div class="text-lg w-1/2 text-gray-500 dark:text-gray-300">
			{timeString(hour, minute)}
		</div>
	</div>
{/snippet}

{#snippet PrayerRow(prayer: Prayer, name: string, hour: number, minute: number)}
	{@const marked = isMarked($journal, dayKey, prayer)}
	<button
		class="group/row flex flex-row py-4 space-x-6 items-center justify-center w-full cursor-pointer"
		onclick={() => markPrayer(prayer)}
		aria-pressed={marked}
		aria-label={marked
			? t('route_home_unmark_prayer', { name })
			: t('route_home_mark_prayer', { name })}
	>
		<span class="text-lg w-1/2 text-right text-gray-500 dark:text-gray-300">{name}</span>
		<span class="text-lg w-1/2 text-gray-500 dark:text-gray-300 flex items-center gap-3">
			{timeString(hour, minute)}
			<span
				class="w-3 h-3 rounded-full border transition {marked
					? 'bg-sky-400 border-sky-400'
					: 'border-gray-400/40 group-hover/row:border-gray-400'}"
			></span>
		</span>
	</button>
{/snippet}

<div
	class="relative flex flex-col items-center justify-center h-screen w-full overflow-hidden select-none"
	role="region"
	aria-label={t('route_home_title')}
	style:touch-action="pan-y"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
>
	<button
		class="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 btn btn-ghost btn-circle opacity-0 hover:opacity-40 transition-opacity"
		disabled={!canGoBack}
		onclick={() => shift(-1)}
		aria-label={t('route_home_previous_day')}
	>
		<ChevronLeftIcon class="w-6 h-6" />
	</button>

	<button
		class="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 btn btn-ghost btn-circle opacity-0 hover:opacity-40 transition-opacity"
		disabled={!canGoForward}
		onclick={() => shift(1)}
		aria-label={t('route_home_next_day')}
	>
		<ChevronRightIcon class="w-6 h-6" />
	</button>

	{#key dayKey}
		<div
			class="flex flex-col items-center w-full"
			style:transform={dragX ? `translateX(${dragX}px)` : 'none'}
			style:transition={dragging ? 'none' : 'transform 160ms ease'}
			in:fly={animated ? { x: direction * 24, duration: 180 } : { duration: 0 }}
			out:fly={animated ? { x: direction * -24, duration: 120 } : { duration: 0 }}
		>
			<div class="flex flex-col items-center mb-16">
				<h1 class="text-5xl font-bold mb-2">{t('route_home_title')}</h1>
				<p class="text-md text-gray-500">
					{getDateString()} - {getHijriDateString($hijriCalendarOffset)}
				</p>
			</div>

			{#await getPrayerTimes(date, $method, $city) then prayerTimes}
				<div class="w-3xs divide-y divide-gray-100 dark:divide-gray-800 mb-16">
					{@render PrayerRow(
						'fajr',
						t('prayers_type_fajr'),
						prayerTimes.fajr.hour,
						prayerTimes.fajr.minute
					)}
					{@render TableRow(
						t('prayers_type_shuruk'),
						prayerTimes.sunrise.hour,
						prayerTimes.sunrise.minute
					)}
					{@render PrayerRow(
						'dhuhr',
						t('prayers_type_dhohr'),
						prayerTimes.dhuhr.hour,
						prayerTimes.dhuhr.minute
					)}
					{@render PrayerRow(
						'asr',
						t('prayers_type_asr'),
						prayerTimes.asr.hour,
						prayerTimes.asr.minute
					)}
					{@render PrayerRow(
						'maghrib',
						t('prayers_type_maghrib'),
						prayerTimes.maghrib.hour,
						prayerTimes.maghrib.minute
					)}
					{@render PrayerRow(
						'isha',
						t('prayers_type_isha'),
						prayerTimes.isha.hour,
						prayerTimes.isha.minute
					)}
				</div>
			{:catch error}
				<p>{t('route_home_error', { message: error.message })}</p>
			{/await}
		</div>
	{/key}
</div>
