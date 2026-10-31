<script lang="ts">
	import { ArrowLeftIcon, BellIcon } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	let {
		title,
		unread = 0,
		back = '',
		bell = true
	}: { title: string; unread?: number; back?: string; bell?: boolean } = $props();
</script>

<header class="flex items-center justify-between gap-3 mb-6">
	<div class="flex items-center gap-2 min-w-0">
		{#if back}
			<a href={back} class="btn btn-ghost btn-sm btn-circle" aria-label={t('route_tracker_title')}>
				<ArrowLeftIcon class="w-5 h-5" />
			</a>
		{/if}
		<h1 class="text-3xl font-light truncate">{title}</h1>
	</div>

	{#if bell}
		<a
			href="/tracker/notifications"
			class="btn btn-ghost btn-circle relative"
			aria-label={t('route_tracker_notifications')}
		>
			<BellIcon class="w-5 h-5" />
			{#if unread > 0}
				<span
					class="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-sky-500 text-[10px] leading-4 text-black font-semibold"
				>
					{unread > 9 ? '9+' : unread}
				</span>
			{/if}
		</a>
	{/if}
</header>
