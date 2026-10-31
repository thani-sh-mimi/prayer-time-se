<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { BellIcon, HandHeartIcon, UserPlusIcon, UsersIcon } from 'lucide-svelte';
	import { t } from '$lib/i18n';
	import TrackerHeader from '$lib/tracker/TrackerHeader.svelte';
	import { api, ApiError, type TrackerNotification } from '$lib/tracker/api';

	let loading = $state(true);
	let items = $state<TrackerNotification[]>([]);

	const iconFor = {
		friend_quiet: UsersIcon,
		nudge: HandHeartIcon,
		friend_request: UserPlusIcon,
		friend_accepted: UsersIcon
	} as const;

	function textFor(item: TrackerNotification): string {
		const name = item.subject?.displayName ?? '';
		switch (item.type) {
			case 'friend_quiet':
				return t('route_tracker_notification_quiet', { name });
			case 'nudge':
				return `${t('route_tracker_notification_nudge', { name })}: "${String(
					item.context?.message ?? ''
				)}"`;
			case 'friend_request':
				return t('route_tracker_notification_request', { name });
			case 'friend_accepted':
				return t('route_tracker_notification_accepted', { name });
			default:
				return '';
		}
	}

	function relative(timestamp: number): string {
		const minutes = Math.round((Date.now() - timestamp) / 60_000);
		if (minutes < 1) return 'nu';
		if (minutes < 60) return `${minutes} min`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `${hours} tim`;
		const days = Math.round(hours / 24);
		return `${days} d`;
	}

	onMount(async () => {
		try {
			const result = await api.notifications();
			items = result.items;
			loading = false;
			if (result.unread > 0) {
				await api.readNotifications();
				items = items.map((item) => ({ ...item, readAt: item.readAt ?? Date.now() }));
			}
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
	<title>{t('route_tracker_notifications')} — {t('route_home_title')}</title>
</svelte:head>

<div class="flex flex-col w-full max-w-md mx-auto px-4 pt-4 pb-32">
	<TrackerHeader title={t('route_tracker_notifications')} back="/tracker" />

	{#if loading}
		<div class="flex items-center justify-center py-24">
			<span class="loading loading-spinner loading-md opacity-40"></span>
		</div>
	{:else if items.length === 0}
		<div class="flex flex-col items-center py-24 gap-3 opacity-50">
			<BellIcon class="w-8 h-8" />
			<p class="text-sm">{t('route_tracker_notifications_empty')}</p>
		</div>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each items as item (item.id)}
				{@const Icon = iconFor[item.type] ?? BellIcon}
				<li class="rounded-2xl bg-black/10 p-4 flex gap-3">
					<span
						class="w-9 h-9 shrink-0 rounded-full flex items-center justify-center {item.type ===
						'friend_quiet'
							? 'bg-amber-500/15 text-amber-300'
							: 'bg-sky-500/15 text-sky-300'}"
					>
						<Icon class="w-4 h-4" />
					</span>
					<div class="min-w-0">
						<p class="text-sm leading-relaxed">{textFor(item)}</p>
						<p class="text-[11px] opacity-60 mt-1">{relative(item.createdAt)}</p>
					</div>
				</li>
			{/each}
		</ul>

		<a href="/tracker/friends" class="btn btn-ghost w-full mt-6 bg-black/10 border-0">
			{t('route_tracker_friends')}
		</a>
	{/if}
</div>
