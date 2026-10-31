<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { HandHeartIcon, Trash2Icon, UserPlusIcon } from 'lucide-svelte';
	import { t } from '$lib/i18n';
	import TrackerHeader from '$lib/tracker/TrackerHeader.svelte';
	import { api, ApiError, type Friend, type FriendRequest } from '$lib/tracker/api';

	let loading = $state(true);
	let friends = $state<Friend[]>([]);
	let incoming = $state<FriendRequest[]>([]);
	let outgoing = $state<FriendRequest[]>([]);
	let unread = $state(0);

	let handle = $state('');
	let addError = $state('');
	let adding = $state(false);

	let dialog = $state<HTMLDialogElement | null>(null);
	let selected = $state<Friend | null>(null);
	let sending = $state(false);
	let sentTo = $state<string | null>(null);
	let nudgeError = $state('');

	const presets = $derived([
		t('route_tracker_nudge_default'),
		t('route_tracker_nudge_one'),
		t('route_tracker_nudge_two')
	]);

	async function load() {
		try {
			const [list, notifications] = await Promise.all([api.friends(), api.notifications()]);
			friends = list.friends;
			incoming = list.incoming;
			outgoing = list.outgoing;
			unread = notifications.unread;
			loading = false;
		} catch (caught) {
			if (caught instanceof ApiError && caught.status === 401) {
				await goto('/tracker/login', { replaceState: true });
				return;
			}
			loading = false;
		}
	}

	async function addFriend(event: SubmitEvent) {
		event.preventDefault();
		adding = true;
		addError = '';
		try {
			await api.requestFriend(handle);
			handle = '';
			await load();
		} catch (caught) {
			const code = caught instanceof ApiError ? caught.code : '';
			if (code === 'user_not_found') {
				addError = t('route_tracker_user_not_found');
			} else if (code === 'already_friends') {
				addError = t('route_tracker_pending');
			} else if (code === 'cannot_add_self') {
				addError = t('route_tracker_invalid_handle');
			} else {
				addError = t('route_tracker_generic_error');
			}
		} finally {
			adding = false;
		}
	}

	async function respond(id: string, accept: boolean) {
		try {
			if (accept) {
				await api.accept(id);
			} else {
				await api.decline(id);
			}
			await load();
		} catch {
			addError = t('route_tracker_generic_error');
		}
	}

	function openNudge(friend: Friend) {
		selected = friend;
		nudgeError = '';
		dialog?.showModal();
	}

	async function sendNudge(message: string) {
		if (!selected || sending) {
			return;
		}
		sending = true;
		nudgeError = '';
		try {
			await api.nudge(selected.id, message);
			sentTo = selected.id;
			dialog?.close();
		} catch (caught) {
			const code = caught instanceof ApiError ? caught.code : '';
			nudgeError =
				code === 'nudge_already_sent'
					? t('route_tracker_nudge_sent')
					: t('route_tracker_generic_error');
		} finally {
			sending = false;
		}
	}

	async function removeFriend(friend: Friend) {
		if (!confirm(`${t('route_tracker_remove_friend')}: ${friend.displayName}?`)) {
			return;
		}
		try {
			await api.removeFriend(friend.id);
			await load();
		} catch {
			addError = t('route_tracker_generic_error');
		}
	}

	onMount(load);
</script>

<svelte:head>
	<title>{t('route_tracker_friends')} — {t('route_home_title')}</title>
</svelte:head>

<div class="flex flex-col w-full max-w-md mx-auto px-4 pt-4 pb-32">
	<TrackerHeader title={t('route_tracker_friends')} {unread} back="/tracker" />

	{#if loading}
		<div class="flex items-center justify-center py-24">
			<span class="loading loading-spinner loading-md opacity-40"></span>
		</div>
	{:else}
		{#if incoming.length > 0}
			<section class="rounded-2xl bg-black/10 p-4 mb-6">
				<h2 class="text-xs uppercase tracking-wide opacity-60 mb-3">
					{t('route_tracker_requests')}
				</h2>
				{#each incoming as request (request.id)}
					<div class="flex items-center gap-3 py-2">
						<span
							class="w-9 h-9 rounded-full bg-sky-500/15 text-sky-300 flex items-center justify-center text-sm"
						>
							{request.user.displayName.slice(0, 1).toUpperCase()}
						</span>
						<div class="flex-1 min-w-0">
							<p class="truncate">{request.user.displayName}</p>
							<p class="text-xs opacity-40 truncate">@{request.user.handle}</p>
						</div>
						<button
							class="btn btn-sm bg-sky-500 hover:bg-sky-400 text-black border-0"
							onclick={() => respond(request.id, true)}
						>
							{t('route_tracker_accept')}
						</button>
						<button class="btn btn-sm btn-ghost" onclick={() => respond(request.id, false)}>
							{t('route_tracker_decline')}
						</button>
					</div>
				{/each}
			</section>
		{/if}

		{#if friends.length === 0}
			<p class="text-sm opacity-60 mb-6">{t('route_tracker_friends_empty')}</p>
		{:else}
			<section class="flex flex-col gap-2 mb-6">
				{#each friends as friend (friend.id)}
					<article class="rounded-2xl bg-black/10 p-4">
						<div class="flex items-center gap-3">
							<span
								class="w-10 h-10 rounded-full bg-sky-500/15 text-sky-300 flex items-center justify-center"
							>
								{friend.displayName.slice(0, 1).toUpperCase()}
							</span>
							<div class="flex-1 min-w-0">
								<p class="truncate">{friend.displayName}</p>
								<p class="text-xs opacity-60 truncate">@{friend.handle}</p>
							</div>
							<button
								class="btn btn-ghost btn-sm btn-circle opacity-50 hover:opacity-90"
								onclick={() => removeFriend(friend)}
								aria-label={t('route_tracker_remove_friend')}
							>
								<Trash2Icon class="w-4 h-4" />
							</button>
						</div>

						<div class="mt-3 h-1.5 rounded-full bg-base-content/10 overflow-hidden">
							<div
								class="h-full bg-sky-400/70"
								style="width: {(friend.weekCount / 35) * 100}%"
							></div>
						</div>

						<div class="flex items-center justify-between mt-2">
							<p class="text-xs opacity-60">
								{friend.weekCount}/35 {t('route_tracker_week_label')}
								{#if friend.weekJamaah > 0}
									· {friend.weekJamaah} {t('route_tracker_group_total')}
								{/if}
							</p>
							{#if sentTo === friend.id}
								<span class="text-xs text-sky-400">{t('route_tracker_nudge_sent')}</span>
							{:else if friend.quiet}
								<button
									class="btn btn-xs bg-sky-500 hover:bg-sky-400 text-black border-0"
									onclick={() => openNudge(friend)}
								>
									<HandHeartIcon class="w-3.5 h-3.5" />
									{t('route_tracker_support')}
								</button>
							{:else}
								<span class="text-xs opacity-50">{t('route_tracker_steady')}</span>
							{/if}
						</div>

						{#if friend.quiet}
							<p class="text-xs text-amber-700 dark:text-amber-300/80 mt-2">
								{t('route_tracker_quiet')}
							</p>
						{/if}
					</article>
				{/each}
			</section>
		{/if}

		{#if outgoing.length > 0}
			<p class="text-xs opacity-60 mb-6">
				{t('route_tracker_pending')}:
				{#each outgoing as request, index (request.id)}{index > 0 ? ', ' : ''}{request.user
						.displayName}{/each}
			</p>
		{/if}

		<form class="rounded-2xl bg-black/10 p-4" onsubmit={addFriend}>
			<h2 class="text-xs uppercase tracking-wide opacity-60 mb-3">
				{t('route_tracker_add_friend')}
			</h2>
			<div class="flex gap-2">
				<input
					class="input flex-1"
					bind:value={handle}
					autocapitalize="none"
					autocorrect="off"
					spellcheck="false"
					required
				/>
				<button
					class="btn bg-sky-500 hover:bg-sky-400 text-black border-0"
					type="submit"
					disabled={adding}
				>
					{#if adding}
						<span class="loading loading-spinner loading-xs"></span>
					{:else}
						<UserPlusIcon class="w-4 h-4" />
					{/if}
					{t('route_tracker_add')}
				</button>
			</div>
			<p class="text-xs opacity-60 mt-2">{t('route_tracker_add_friend_hint')}</p>
			{#if addError}
				<p class="text-xs text-red-400 mt-2">{addError}</p>
			{/if}
		</form>
	{/if}
</div>

<dialog bind:this={dialog} class="modal">
	<div class="modal-box">
		<h3 class="text-lg font-light mb-1">
			{t('route_tracker_support')}
			{selected?.displayName ?? ''}
		</h3>
		<p class="text-xs opacity-60 mb-4">{t('route_tracker_quiet')}</p>

		<div class="flex flex-col gap-2">
			{#each presets as preset}
				<button
					class="btn btn-ghost justify-start text-left h-auto py-3 bg-black/10 border-0"
					disabled={sending}
					onclick={() => sendNudge(preset)}
				>
					{preset}
				</button>
			{/each}
		</div>

		{#if nudgeError}
			<p class="text-xs text-red-400 mt-3">{nudgeError}</p>
		{/if}

		<div class="modal-action">
			<form method="dialog">
				<button class="btn btn-sm btn-ghost">{t('route_tracker_decline')}</button>
			</form>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
