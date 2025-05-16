<script lang="ts">
	import { goto } from '$app/navigation';
	import { pocketbaseService } from '$lib/services/pocketbaseService';
	import { Button } from '$lib/components/ui/button';
	import FormField from './FormField.svelte';
	import { createEventDispatcher } from 'svelte';
	import type { AuthRecord } from 'pocketbase';
  
	// Define a strongly-typed dispatcher for login events
	const dispatch = createEventDispatcher<{
	  submit: void;
	  success: AuthRecord;
	  error: { message: string };
	}>();
  
	let email = '';
	let password = '';
	$: isLoading = false;
	let errorMessage = '';
	let successMessage = '';
  
	/**
	 * Attempt to sign in via PocketBase, handle loading state,
	 * errors, and navigate on success.
	 */
	async function handleLogin() {
	  dispatch('submit');
	  isLoading = true;
	  errorMessage = '';
	  successMessage = '';
  
	  try {
		const user = await pocketbaseService.login(email, password);
		successMessage = 'Login successful! Redirecting...';
		dispatch('success', user);
		// Give user a moment to see the success message
	  } catch (err: any) {
		errorMessage = err?.message ?? 'Login failed. Please try again.';
		dispatch('error', { message: errorMessage });
	  } finally {
		isLoading = false;
	  }
	}
  </script>
  
  <div class=" mx-auto">
	<img src="/icons/logo-512.png" alt="Wire Sync Logo" class="mb-6 h-32 mx-auto" />
	<h1 class="mb-6 text-center text-2xl font-bold">User Login</h1>
  
	{#if errorMessage}
	  <div class="mb-4 rounded-md bg-red-100 p-3 text-red-700">
		{errorMessage}
	  </div>
	{/if}
  
	{#if successMessage}
	  <div class="mb-4 rounded-md bg-green-100 p-3 text-green-700">
		{successMessage}
	  </div>
	{/if}
  
	<form on:submit|preventDefault={handleLogin} class="space-y-4">
	  <FormField
		id="email"
		label="Email"
		type="email"
		bind:value={email}
		placeholder="Enter your email"
		required={true}
		
	  />
  
	  <FormField
		id="password"
		label="Password"
		type="password"
		bind:value={password}
		placeholder="Enter your password"
		required={true}
		
	  />
  
	  <Button class="w-full" type="submit" disabled={isLoading} >
		{#if isLoading}
		  Processing...
		{:else}
		  Sign In
		{/if}
	  </Button>
	</form>
  </div>
  