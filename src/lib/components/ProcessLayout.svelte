<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import { CheckCircle, AlertCircle, Loader2 } from 'lucide-svelte';

	// Props for the component
	export let title: string;
	export let showSubmit: boolean = true;
	export let steps: string[] = [];
	export let currentStep: number = 1;
	export let isSubmitting: boolean = false;
	export let cancelPath: string = '/pmc/processes';

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
		showSubmit: boolean;
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
		goto('/pmc/processes');
		// history.back();
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
<section class="space-y-4 px-4 mb-4">
	<h1 class="text-gray text-center text-2xl font-semibold">{title}</h1>

	<!-- Progress Steps -->
	{#if steps.length > 0}
		<div class="grid auto-cols-fr grid-flow-col text-center text-[10px]">
			{#each steps as step, i}
				<div class="flex flex-col items-center">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full {currentStep >= i + 1
							? 'bg-gray text-white'
							: 'bg-gray-300'}"
					>
						{i + 1}
					</div>
					<span class="dark:text-gray mt-1  font-light">{step}</span>
				</div>
				{#if i < steps.length - 1}
					<div
						class="h-1 flex-1 self-center {currentStep > i + 1 ? 'bg-gray' : 'bg-slate-200'}"
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
			class="mt-4 flex items-center gap-2 rounded-lg bg-green-100 p-4 text-green-700"
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

			<div class="flex space-x-4 pt-4 button-group">
				<button
					class="cancel-button flex-1 border-2 rounded-lg py-3 border border-gray-800 text-sm  text-white transition hover:bg-red-700 active:bg-red-800 disabled:opacity-50"
					on:click={handleCancel}
					type="button"
					disabled={isSubmitting}
				>
					Cancel
				</button>
				{#if showSubmit}
				<button
					class="submit-button flex-1 items-center justify-center rounded-lg py-3 text-white transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
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
				{:else}
				<div class="w-full"></div>
				{/if}
			</div>
		</form>
	</div>
</section>
