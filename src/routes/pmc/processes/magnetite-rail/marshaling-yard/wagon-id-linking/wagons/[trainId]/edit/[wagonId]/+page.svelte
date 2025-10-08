<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Wagon } from '$lib/types';
	import type { ShuntingTrain } from '$lib/types/shuntingTrain';
	import FormField from '$lib/components/FormField.svelte';

	let wagon: Wagon | null = null;
	let shuntingTrain: ShuntingTrain | null = null;
	let error = '';
	let success = '';
	let isLoading = true;
	let isSubmitting = false;
	let trainId: string;
	let wagonId: string;
	let wagonPosition: number = 0;

	// Editable fields
	let editableWagonId = '';
	let wagonValue = false;
	let editableTemporaryRfid = '';

	const steps = ['Select Shunting Train', 'Wagon ID/RFID Editing'];
	let currentStep = 2;

	// Wrap reactive statements in try-catch to prevent exceptions
	$: {
		try {
			trainId = $page.params.trainId;
		} catch (e) {
			console.error('Error getting trainId:', e);
			trainId = '';
		}
	}

	$: {
		try {
			wagonId = $page.params.wagonId;
		} catch (e) {
			console.error('Error getting wagonId:', e);
			wagonId = '';
		}
	}

	$: wagonValue = !!(wagon?.wagonIdSimple && String(wagon.wagonIdSimple).trim() !== '');

	async function loadWagonAndTrain() {
		try {
			// Load the shunting train first
			shuntingTrain = await indexedDBService.getRecord('shuntingTrains', trainId) ?? null;
			
			if (!shuntingTrain) {
				console.error('Shunting train not found');
				error = 'Shunting train not found';
				isLoading = false;
				return;
			}

			// Load the wagon
			wagon = await indexedDBService.getRecord('wagons', wagonId) ?? null;
			wagonPosition = wagon?.wagonPosition || 0;
			
			if (!wagon) {
				console.error('Wagon not found with ID:', wagonId);
				// If wagon not found, try to find it in the linked wagons list
				if (shuntingTrain.linkedWagons && shuntingTrain.linkedWagons.length > 0) {
					// Try to find the wagon by position if wagonId doesn't work
					const wagonIndex = wagonPosition - 1;
					if (wagonIndex >= 0 && wagonIndex < shuntingTrain.linkedWagons.length) {
						const linkedWagonId = shuntingTrain.linkedWagons[wagonIndex];
						wagon = await indexedDBService.getRecord('wagons', linkedWagonId) ?? null;
					}
				}
				
				if (!wagon) {
					error = `Wagon not found. Wagon ID: ${wagonId}, Position: ${wagonPosition}`;
					isLoading = false;
					return;
				}
			}

			// Initialize editable fields with current values
			editableWagonId = wagon.wagonIdSimple || '';
			editableTemporaryRfid = wagon.transcoreTag || '';
		} catch (e) {
			console.error('Error loading wagon and train:', e);
			error = `Failed to load wagon and train data: ${(e as Error).message || String(e)}`;
			// DO NOT navigate away on error - stay on this page
		} finally {
			isLoading = false;
		}
	}

	// Wrap onMount in try-catch to prevent any exceptions from causing redirects
	onMount(() => {
		try {
			loadWagonAndTrain();
		} catch (e) {
			console.error('Error in onMount:', e);
			error = 'Failed to initialize page';
			isLoading = false;
		}
	});

	async function handleSubmit() {
		try {
			isSubmitting = true;
			error = '';

			if (!wagon) {
				error = 'Wagon data not available';
				return;
			}
			
			// Update wagon with new values - use updateRecord to prevent duplicates
			await indexedDBService.updateRecord('wagons', wagon.id, {
				wagonIdSimple: editableWagonId,
				transcoreTag: editableTemporaryRfid,
				syncStatus: 'pending',
				updated: new Date().toISOString()
			});
			
			// Ensure IndexedDB transaction is fully committed
			await new Promise(resolve => setTimeout(resolve, 100));
			
			// Dispatch custom event to notify other components
			if (typeof window !== 'undefined') {
				const event = new CustomEvent('wagon-updated', { 
					detail: { 
						wagonId: wagon.id, 
						trainId: trainId 
					} 
				});
				window.dispatchEvent(event);
			}
			
			// Try to sync immediately instead of relying on background sync
			try {
				const { syncService } = await import('$lib/services/syncService');
				const updatedWagon = await indexedDBService.getRecord('wagons', wagon.id);
				if (updatedWagon) {
					await syncService.syncWagon(updatedWagon);
					success = 'Wagon details updated and synced successfully';
				} else {
					success = 'Wagon details updated successfully (sync pending)';
				}
			} catch (syncError) {
				console.warn('Sync failed, will retry in background:', syncError);
				success = 'Wagon details updated successfully (sync will retry)';
			}
			
			// Navigate back to wagon details page after a delay to ensure data is persisted
			setTimeout(() => {
				try {
					goto(`/pmc/processes/magnetite-rail/marshaling-yard/wagon-id-linking/wagons/${trainId}`, {
						// Force reload/invalidation of the page
						invalidateAll: true
					});
				} catch (e) {
					console.error('Error navigating back:', e);
				}
			}, 1500);
		} catch (e: any) {
			console.error('Error updating wagon:', e);
			error = `Failed to update wagon details: ${e.message || e}`;
		} finally {
			isSubmitting = false;
		}
	}

	function handleBackToWagonDetails() {
		try {
			goto(`/pmc/processes/magnetite-rail/marshaling-yard/wagon-id-linking/wagons/${trainId}`);
		} catch (e) {
			console.error('Error navigating back:', e);
			error = 'Failed to navigate back';
		}
	}

	function formatDate(date: Date | undefined): string {
		try {
			if (!date) return 'No date';
			return new Date(date).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch (e) {
			console.error('Error formatting date:', e);
			return 'Invalid date';
		}
	}

	// Add window error handler to catch any unhandled exceptions
	if (typeof window !== 'undefined') {
		window.addEventListener('error', (e) => {
			console.error('Unhandled error:', e);
			// Prevent default behavior that might cause navigation
			e.preventDefault();
		});

		window.addEventListener('unhandledrejection', (e) => {
			console.error('Unhandled promise rejection:', e);
			// Prevent default behavior that might cause navigation
			e.preventDefault();
		});
	}
</script>

<!-- Rest of the template remains the same -->
<div class="space-y-4 px-4 mb-4">
	<h1 class="text-gray text-center text-2xl font-semibold">Updating Wagon Details</h1>

	<!-- Progress Steps -->
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
				<span class="dark:text-gray mt-1 font-light">{step}</span>
			</div>
			{#if i < steps.length - 1}
				<div
					class="h-1 flex-1 self-center {currentStep > i + 1 ? 'bg-gray' : 'bg-slate-200'}"
				></div>
			{/if}
		{/each}
	</div>

	<div class="mt-6">
		<div>
			<h5 class="text-xl font-bold text-gray">Updating Wagon Details</h5>
		</div>

		{#if error}
			<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
				{error}
				<div class="text-xs mt-2">
					Debug info: Train ID: {trainId}, Wagon ID: {wagonId}, Position: {wagonPosition}
				</div>
			</div>
		{/if}

		{#if success}
			<div class="mb-4 rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
				{success}
			</div>
		{/if}

		{#if isLoading}
			<div class="flex justify-center items-center py-8">
				<div>Loading wagon details...</div>
			</div>
		{:else if wagon && shuntingTrain}
			<!-- Train Selection Display -->
			<div class="mb-6 p-4 bg-gray-50 rounded-lg">
				<h6 class="font-semibold text-gray-700 mb-2">Train Selection</h6>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						{formatDate(shuntingTrain.postDate).split(',')[0]}
					</div>
					<div>
						{formatDate(shuntingTrain.postDate).split(',')[1]?.trim() || ''}
					</div>
				</div>
				<p class="text-xs text-gray-500 mt-2">
					Manually type in the Wagon ID and scan the temporary RFID in using a reader.
				</p>
			</div>

			<!-- Wagon Details Form -->
			<div class="border border-gray-300 rounded-lg p-4 bg-white">
				<div class="mb-3">
					<h6 class="font-semibold text-center">Position {wagonPosition}</h6>
				</div>
				
				<div class="space-y-4">
					<!-- Wagon ID (Editable) -->
					<FormField
						label="Wagon ID:"
						id="wagonId"
						bind:value={editableWagonId}
						placeholder="Enter Wagon ID"
						required
					/>
					
					<!-- Temporary RFID (Editable) -->
					<FormField
						label="Temporary RFID:"
						style="background-color: {wagonValue ? '#d1d5db' : 'transparent'}; cursor: {wagonValue ? 'not-allowed' : 'text'};"
						id="temporaryRfid"
						bind:value={editableTemporaryRfid}
						placeholder="Scan or enter Temporary RFID"
						required
						disabled={wagonValue}
					/>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-4 mt-6">
				<button 
					type="button"
					class="cancel-button flex-1 border-2 rounded-lg py-3 border border-gray-800 text-sm  text-white transition hover:bg-red-700 active:bg-red-800 disabled:opacity-50"
					on:click={handleBackToWagonDetails}
					disabled={isSubmitting}
				>
					Cancel
				</button>
				
				<button 
					type="button"
					class="submit-button flex-1 items-center justify-center rounded-lg py-3 text-white transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
					on:click={handleSubmit}
					disabled={isSubmitting || !editableWagonId || !editableTemporaryRfid}
				>
					{isSubmitting ? 'Submitting...' : 'Submit'}
				</button>
			</div>
		{:else}
			<div class="text-center py-8 text-gray-500">
				<p>Wagon or train data not found.</p>
				<p class="text-sm mt-2">Wagon ID: {wagonId}</p>
				<p class="text-sm">Train ID: {trainId}</p>
				<p class="text-sm">Position: {wagonPosition}</p>
				<button 
					type="button"
					class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
					on:click={handleBackToWagonDetails}
				>
					Go Back
				</button>
			</div>
		{/if}
	</div>
</div>