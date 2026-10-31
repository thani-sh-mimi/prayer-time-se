<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';
	import TrackerHeader from '$lib/tracker/TrackerHeader.svelte';
	import { api, ApiError } from '$lib/tracker/api';

	let mode = $state<'login' | 'register'>('login');
	let handle = $state('');
	let displayName = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);

	function messageFor(caught: unknown): string {
		if (!(caught instanceof ApiError)) {
			return t('route_tracker_generic_error');
		}
		switch (caught.code) {
			case 'INVALID_USERNAME_OR_PASSWORD':
			case 'INVALID_EMAIL_OR_PASSWORD':
			case 'INVALID_PASSWORD':
				return t('route_tracker_login_invalid');
			case 'USERNAME_IS_ALREADY_TAKEN':
			case 'EMAIL_ALREADY_EXISTS':
				return t('route_tracker_handle_taken');
			case 'INVALID_USERNAME':
			case 'USERNAME_TOO_SHORT':
			case 'USERNAME_TOO_LONG':
				return t('route_tracker_invalid_handle');
			case 'PASSWORD_TOO_SHORT':
			case 'PASSWORD_TOO_LONG':
				return t('route_tracker_invalid_password');
			default:
				return t('route_tracker_generic_error');
		}
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (busy) {
			return;
		}
		busy = true;
		error = '';
		try {
			if (mode === 'register') {
				await api.register(handle.trim().toLowerCase(), displayName.trim(), password);
			} else {
				await api.login(handle.trim().toLowerCase(), password);
			}
			await goto('/tracker', { replaceState: true });
		} catch (caught) {
			error = messageFor(caught);
		} finally {
			busy = false;
		}
	}

	function switchMode(next: 'login' | 'register') {
		mode = next;
		error = '';
	}

	onMount(() => {
		api
			.me()
			.then(() => goto('/tracker', { replaceState: true }))
			.catch(() => undefined);
	});
</script>

<svelte:head>
	<title>{t('route_tracker_sign_in')} — {t('route_home_title')}</title>
</svelte:head>

<div class="flex flex-col w-full max-w-md mx-auto px-4 pt-4 pb-32">
	<TrackerHeader title={t('route_tracker_title')} back="/tracker" bell={false} />

	<div class="tabs tabs-box bg-black/10 mb-6">
		<button
			class="tab flex-1"
			class:tab-active={mode === 'login'}
			onclick={() => switchMode('login')}>{t('route_tracker_sign_in')}</button
		>
		<button
			class="tab flex-1"
			class:tab-active={mode === 'register'}
			onclick={() => switchMode('register')}>{t('route_tracker_sign_up')}</button
		>
	</div>

	<form class="flex flex-col gap-4" onsubmit={submit}>
		{#if mode === 'register'}
			<fieldset class="fieldset">
				<legend class="fieldset-legend">{t('route_tracker_display_name')}</legend>
				<input
					class="input input-lg w-full"
					bind:value={displayName}
					maxlength="40"
					autocomplete="name"
					required
				/>
			</fieldset>
		{/if}

		<fieldset class="fieldset">
			<legend class="fieldset-legend">{t('route_tracker_handle')}</legend>
			<input
				class="input input-lg w-full"
				bind:value={handle}
				autocapitalize="none"
				autocorrect="off"
				spellcheck="false"
				maxlength="20"
				autocomplete="username"
				required
			/>
			{#if mode === 'register'}
				<p class="text-xs opacity-40 mt-1">{t('route_tracker_login_hint')}</p>
			{/if}
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">{t('route_tracker_password')}</legend>
			<input
				class="input input-lg w-full"
				type="password"
				bind:value={password}
				minlength="8"
				autocomplete={mode === 'register' ? 'new-password' : 'current-password'}
				required
			/>
		</fieldset>

		{#if error}
			<p class="text-sm text-red-400">{error}</p>
		{/if}

		<button
			class="btn btn-lg mt-2 bg-sky-500 hover:bg-sky-400 text-black border-0"
			type="submit"
			disabled={busy}
		>
			{#if busy}
				<span class="loading loading-spinner loading-sm"></span>
			{:else if mode === 'register'}
				{t('route_tracker_sign_up')}
			{:else}
				{t('route_tracker_sign_in')}
			{/if}
		</button>
	</form>
</div>
