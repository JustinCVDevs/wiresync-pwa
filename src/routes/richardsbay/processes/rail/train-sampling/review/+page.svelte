<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import type { Wagon } from '$lib/types/wagon';
	import { Container, PlusCircle, CheckCircle } from 'lucide-svelte';

	let wagonId = '';
	$: wagonId = $page.url.searchParams.get('wagonId') || '';

	let wagon: Wagon | undefined;
	let dispatchedWagons: Wagon[] = [];
	let error = '';
	let success = '';
	let isLoading = true;
	let isCompleting = false;

	const steps = [
		'Enter Wagon ID',
		'Review & Dispatch'
	];
	let currentStep = 2;

	async function loadWagon() {
		isLoading = true;
		try {
			if (wagonId) {
				wagon = await indexedDBService.getRecord('wagons', wagonId);
				if (!wagon) {
					error = 'Wagon not found';
					return;
				}

				// Set dispatch timestamp if not already set
				if (!wagon.dispatchTimestamp) {
					await indexedDBService.updateRecord('wagons', wagonId, {
						...wagon,
						dispatchTimestamp: new Date(),
						updated: new Date().toISOString()
					});
					wagon.dispatchTimestamp = new Date();
				}
			}

			// Load all dispatched wagons for this session
			const allWagons = await indexedDBService.getAllRecords('wagons');
			dispatchedWagons = allWagons.filter(w => 
				w.process === 'Wagon_Dispatch' && 
				w.dispatchTimestamp &&
				new Date(w.dispatchTimestamp).toDateString() === new Date().toDateString()
			);

		} catch (e) {
			console.error('Error loading wagon:', e);
			error = 'Failed to load wagon data';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadWagon();
	});

	$: if (wagonId) loadWagon();

	function handleCancel() {
		goto('/richardsbay/processes');
	}

	function handleNewWagon() {
		goto('/richardsbay/processes/wagon-dispatch');
	}

	async function handleCompleteDispatch() {
		isCompleting = true;
		try {
			// Mark all dispatched wagons as completed
			for (const dispatchedWagon of dispatchedWagons) {
				await indexedDBService.updateRecord('wagons', dispatchedWagon.id!, {
					...dispatchedWagon,
					process: 'Wagon_Dispatch_Complete',
					updated: new Date().toISOString()
				});
			}

			success = 'Wagon dispatch completed successfully';
			setTimeout(() => {
				goto('/richardsbay/processes');
			}, 2000);

		} catch (e) {
			console.error('Error completing dispatch:', e);
			error = 'Failed to complete dispatch';
		} finally {
			isCompleting = false;
		}
	}

	function formatDateTime(date: Date | string | undefined): string {
		if (!date) return 'Not set';
		const d = new Date(date);
		return d.toLocaleString();
	}
</script>

<ProcessLayout
	title="Wagon Dispatch Review"
	steps={steps}
	currentStep={currentStep}
	cancelPath="/richardsbay/processes"
	showSubmit={false}
	showCancel={false}
>
	{#if isLoading}
		<div class="flex justify-center items-center py-8">
			<div class="text-gray-600">Loading wagon data...</div>
		</div>
	{:else}
		<div class="space-y-6">
			<!-- Current Wagon Details -->
			{#if wagon}
				<div class="space-y-4">
					<div class="flex items-center gap-2 text-gray-700">
						<Container size={20} />
						<h2 class="text-lg font-medium">Current Wagon</h2>
					</div>

					<div class="bg-gray-50 rounded-lg p-4 space-y-3">
						<div class="grid grid-cols-2 gap-4">
							<div>
								<span class="text-sm font-medium text-gray-600">Wagon ID:</span>
								<p class="text-lg font-semibold">{wagon.wagonIdSimple}</p>
							</div>
							<div>
								<span class="text-sm font-medium text-gray-600">Verification Date:</span>
								<p class="text-lg font-semibold">{wagon.verificationTs || 'Not set'}</p>
							</div>
						</div>
						<div>
							<span class="text-sm font-medium text-gray-600">Dispatch Timestamp:</span>
							<p class="text-lg font-semibold">{formatDateTime(wagon.dispatchTimestamp)}</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Dispatched Wagons List -->
			{#if dispatchedWagons.length > 0}
				<div class="space-y-4">
					<div class="flex items-center gap-2 text-gray-700">
						<CheckCircle size={20} />
						<h2 class="text-lg font-medium">Dispatched Wagons Today ({dispatchedWagons.length})</h2>
					</div>

					<div class="space-y-2">
						{#each dispatchedWagons as dispatchedWagon}
							<div class="bg-green-50 border border-green-200 rounded-lg p-3">
								<div class="flex justify-between items-center">
									<div>
										<span class="font-medium">Wagon ID: {dispatchedWagon.wagonIdSimple}</span>
										<span class="text-sm text-gray-600 ml-2">Verified at: {dispatchedWagon.verificationTs}</span>
									</div>
									<span class="text-sm text-green-600">
										Dispatched at: {formatDateTime(dispatchedWagon.dispatchTimestamp)}
									</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Error/Success Messages -->
			{#if error}
				<div class="rounded-lg bg-red-100 p-4 text-red-700" role="alert">
					{error}
				</div>
			{/if}

			{#if success}
				<div class="rounded-lg bg-green-100 p-4 text-green-700" role="alert">
					{success}
				</div>
			{/if}

			<!-- Action Buttons -->
			<div class="space-y-4">
				<button
					type="button"
					on:click={handleNewWagon}
					class="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
				>
					<PlusCircle size={20} />
					+New Wagon
				</button>

				<div class="flex justify-between items-center">
					<button
						type="button"
						on:click={handleCancel}
						class="w-36 text-sm rounded-lg bg-red-600 py-3 text-white transition hover:bg-red-700 active:bg-red-800 disabled:opacity-50 px-2"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleCompleteDispatch}
						disabled={isCompleting || dispatchedWagons.length === 0}
						class="w-36 text-sm items-center justify-center rounded-lg bg-green-600 py-3 px-2 text-white transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
					>
						{#if isCompleting}
							Completing...
						{:else}
							Complete Dispatch
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}
</ProcessLayout>