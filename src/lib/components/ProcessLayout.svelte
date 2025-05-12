<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import { CheckCircle, AlertCircle, Loader2 } from 'lucide-svelte';

	// Props for the component
	export let title: string;
	export let processKey: string;
	export let steps: string[] = [];
	export let currentStep: number = 1;
	export let isSubmitting: boolean = false;
	export let cancelPath: string = '/processes';

	// State variables
	let isOnline = navigator.onLine;
	let error = '';
	let success = '';

	// Event dispatcher for component events
	const dispatch = createEventDispatcher<{
		submit: void;
		cancel: void;
		error: string;
		success: string;
	}>();

	// Handle online/offline status
	onMount(() => {
		window.addEventListener('online', () => {
			isOnline = true;
			error = '';
			dispatch('error', '');
		});
		window.addEventListener('offline', () => {
			isOnline = false;
			error = 'Application is offline - data will be submitted when connection is restored';
			dispatch('error', error);
		});
		return () => {
			window.removeEventListener('online', () => (isOnline = true));
			window.removeEventListener('offline', () => (isOnline = false));
		};
	});

	// Handle cancel button click
	function handleCancel() {
		dispatch('cancel');
		goto(cancelPath);
	}

	// Handle submit button click
	function handleSubmit() {
		dispatch('submit');
	}

	// Expose methods to set error and success messages
	export function setError(message: string) {
		error = message;
	}

	export function setSuccess(message: string) {
		success = message;
	}
</script>

<section class="container mx-auto px-4 py-6 bg-white rounded-xl">
	<h1 class="text-center text-2xl font-semibold text-gray-900">{title}</h1>

	<!-- Progress Steps -->
	{#if steps.length > 0}
		<div class="flex justify-between px-6 pt-4">
			{#each steps as step, i}
				<div class="flex flex-col items-center">
					<div
						class="flex h-8 w-8 items-center justify-center  rounded-full {currentStep >= i + 1
							? 'bg-green-500 text-white'
							: 'bg-gray-300'}"
					>
						{i + 1}
					</div>
					<span class="mt-1 text-xs  dark:text-gray-800">{step}</span>
				</div>
				{#if i < steps.length - 1}
					<div
						class="h-1 flex-1 self-center {currentStep > i + 1 ? 'bg-green-500' : 'bg-gray-300'}"
					></div>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- Status Messages -->
	{#if error}
		<div class="mt-4 flex items-center gap-2 rounded-lg bg-red-100 p-4 text-red-700" role="alert">
			<AlertCircle size={20} />
			<p>{error}</p>
		</div>
	{/if}

	{#if success}
		<div
			class="mt-4 flex items-center gap-2 rounded-lg bg-green-100 p-4 text-green-700 "
			role="alert"
		>
			<CheckCircle size={20} />
			<p>{success}</p>
		</div>
	{/if}

	<div class="mt-6">
		<slot name="header" />

		<form on:submit|preventDefault={handleSubmit} class="mt-6 space-y-6">
			<div class="space-y-4">
				<slot />
			</div>

			<div class="flex space-x-4 pt-4">
				<button
					class="flex-1 rounded-lg bg-red-600 py-3 font-medium text-white transition hover:bg-red-700 active:bg-red-800 disabled:opacity-50"
					on:click={handleCancel}
					type="button"
					disabled={isSubmitting}
				>
					Cancel
				</button>
				<button
					class="flex-1 items-center justify-center rounded-lg bg-green-600 py-3 font-medium text-white transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
					type="submit"
					disabled={isSubmitting}
				>
					{#if isSubmitting}
						<div class="flex items-center justify-center gap-2">
							<Loader2 class="animate-spin" size={20} />
							Submitting...
						</div>
					{:else}
						Submit
					{/if}
				</button>
			</div>
		</form>
	</div>
</section>
