<script>
	import { goto } from '$app/navigation';
	import { pocketbaseService } from '$lib/services/pocketbaseService';
	import { Button } from '$lib/components/ui/button';

	let email = '';
	let password = '';
	let isLoading = false;
	let errorMessage = '';
	let successMessage = '';

	async function handleLogin() {
		isLoading = true;
		errorMessage = '';
		try {
			await pocketbaseService.login(email, password);
			successMessage = 'Login successful! Redirecting...';
			// Add redirect logic here
			goto('/');
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Login failed';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="mx-auto max-w-md rounded-lg bg-white p-6 shadow-md">
	<h2 class="mb-6 text-center text-4xl font-bold text-gray-600">WIRE SYNC</h2>
	<h2 class="mb-6 text-center text-xl font-bold text-gray-800">Sign In</h2>

	{#if errorMessage}
		<div class="mb-4 rounded-md bg-red-100 p-3 text-red-700">{errorMessage}</div>
	{/if}

	{#if successMessage}
		<div class="mb-4 rounded-md bg-green-100 p-3 text-green-700">{successMessage}</div>
	{/if}

	<form on:submit|preventDefault={handleLogin}>
		<div class="mb-4">
			<label class="mb-2 block text-gray-700" for="email">Email</label>
			<input
				type="email"
				id="email"
				bind:value={email}
				class="w-full rounded-md border px-3 py-2"
				required
			/>
		</div>

		<div class="mb-6">
			<label class="mb-2 block text-gray-700" for="password">Password</label>
			<input
				type="password"
				id="password"
				bind:value={password}
				class="w-full rounded-md border px-3 py-2"
				required
			/>
		</div>

		<Button disabled={isLoading}>
			{#if isLoading}
				Processing...
			{:else}
				Sign In
			{/if}
		</Button>
	</form>
</div>
