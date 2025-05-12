<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { pocketbaseService } from '$lib/services/pocketbaseService';

	let pageLoading = true;
	let isLoggingIn = false;
	let email = '';
	let password = '';
	let error = '';

	onMount(() => {
		if (pocketbaseService.isAuthenticated) {
			goto('/processes');
		}
		pageLoading = false;
	});

	async function handleLogin() {
		try {
			error = '';
			isLoggingIn = true;
			const success = await pocketbaseService.login(email, password);
			if (success) {
				goto('/processes');
			}
		} catch (e: Error | any) {
			error = e?.message;
		} finally {
			isLoggingIn = false;
		}
	}
</script>

{#if pageLoading}
	<div class="flex items-center justify-center">
		<div class="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
	</div>
{:else}
	<div class="flex flex-col items-center justify-center">
		<img src="./wire sync.png" alt="Wire Sync Logo" class="mb-6 inline-block h-32" />
		<div class="mb-4 text-center text-3xl font-bold text-gray-800">Welcome back</div>

		<div class="w-96 rounded-lg bg-white p-8 shadow-md">
			<h1 class="mb-6 text-center text-2xl font-bold">Login to your account</h1>

			{#if error}
				<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
					{error}
				</div>
			{/if}

			<form on:submit|preventDefault={handleLogin} class="space-y-4">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">Email</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						class="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						required
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700">Password</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						class="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						required
					/>
				</div>

				<button
					class="flex w-full items-center justify-center rounded-lg bg-gray-800 py-3 font-medium text-white transition hover:bg-gray-700 active:bg-gray-900"
					type="submit"
					disabled={isLoggingIn}
				>
					{#if isLoggingIn}
						<div
							class="mr-2 h-5 w-5 animate-spin rounded-full border-t-2 border-b-2 border-white"
						></div>
					{/if}
					{isLoggingIn ? 'Logging in...' : 'Login'}
				</button>
			</form>
		</div>
	</div>
{/if}
