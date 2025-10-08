<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Wagon } from '$lib/types';
    import type { ShuntingTrain } from '$lib/types/shuntingTrain';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';

	let shuntingTrain: ShuntingTrain | null = null;
	let linkedWagons: Wagon[] = [];
	let error = '';
	let success = '';
	let isLoading = true;
	let trainId = $page.params.trainId;
	let dataRefreshKey = 0; // Force reactive updates

	const steps = ['Select Shunting Train', 'Wagon Linking'];
	let currentStep = 2;

	// Custom event listener for wagon updates
	let wagonUpdateListener: ((event: CustomEvent) => void) | null = null;
	let isInitialLoad = true;

	async function loadTrainAndWagons() {
		try {
			isLoading = true;
			error = '';
			
			// Load the shunting train
			shuntingTrain = await indexedDBService.getRecord('shuntingTrains', trainId) ?? null;

			if (!shuntingTrain) {
				error = 'Shunting train not found';
				return;
			}

			// Load linked wagons using the IDs from linkedWagons array
			if (shuntingTrain.linkedWagons && shuntingTrain.linkedWagons.length > 0) {
				// Clear the array first to ensure reactivity
				linkedWagons = [];
				
				// Fetch all wagons once to minimize DB reads
				const allWagons: Wagon[] = await indexedDBService.getAllRecords('wagons');
				
				// Create a fresh array to trigger reactivity
				const wagonPromises = shuntingTrain.linkedWagons.map(async (wagonId) => {
					try {
						// Try to get by serverId first (as that's what's stored in linkedWagons)
						let wagon = allWagons.find(w => w.serverId === wagonId);
						
						// If not found by serverId, try by id
						if (!wagon) {
							wagon = allWagons.find(w => w.id === wagonId);
						}
						
						// Last resort: try direct lookup
						if (!wagon) {
							wagon = await indexedDBService.getRecord('wagons', wagonId);
						}
						
						return wagon || null;
					} catch (e) {
						console.error(`Failed to load wagon ${wagonId}:`, e);
						return null;
					}
				});

				const wagonResults = await Promise.all(wagonPromises);
				
				// Filter out null results and ensure we have valid wagon objects
				const validWagons = wagonResults
					.filter(wagon => wagon !== null && wagon !== undefined) as Wagon[];
				
				// Sort by position
				linkedWagons = validWagons.sort((a, b) => (a.wagonPosition ?? 0) - (b.wagonPosition ?? 0));
			} else {
				linkedWagons = [];
			}
			
			// Increment refresh key to force reactive updates
			dataRefreshKey++;
		} catch (e) {
			console.error('Error loading train and wagons:', e);
			error = 'Failed to load train and wagon data';
		} finally {
			isLoading = false;
		}
	}

	// Listen for navigation events to reload data when returning from edit page
	afterNavigate(async (navigation) => {
		// Skip reload on initial load
		if (isInitialLoad) {
			isInitialLoad = false;
			return;
		}
		
		// Only reload if coming from the edit page
		if (navigation.from?.url.pathname.includes('/edit/')) {
			// Add longer delay to ensure IndexedDB transaction is complete
			await new Promise(resolve => setTimeout(resolve, 400));
			await loadTrainAndWagons();
		}
	});

	onMount(() => {
		loadTrainAndWagons();
		
		// Listen for custom wagon update events
		wagonUpdateListener = async (event: CustomEvent) => {
			// Add longer delay to ensure database write is complete
			// This is critical because IndexedDB writes may not be immediately visible
			await new Promise(resolve => setTimeout(resolve, 500));
			await loadTrainAndWagons();
		};
		
		if (typeof window !== 'undefined') {
			window.addEventListener('wagon-updated', wagonUpdateListener as EventListener);
			
			// Also listen for page visibility changes
			const visibilityHandler = async () => {
				if (document.visibilityState === 'visible') {
					await new Promise(resolve => setTimeout(resolve, 200));
					await loadTrainAndWagons();
				}
			};
			document.addEventListener('visibilitychange', visibilityHandler);
		}
	});

	onDestroy(() => {
		// Clean up event listener
		if (typeof window !== 'undefined' && wagonUpdateListener) {
			window.removeEventListener('wagon-updated', wagonUpdateListener as EventListener);
		}
	});

	async function handleSubmit() {
		try {
			// Set the verification timestamp to current time
			if (shuntingTrain) {
				// Update the shunting train with verification timestamp
				await indexedDBService.updateRecord('shuntingTrains', shuntingTrain.id, {
					verificationTimestamp: new Date(),
					syncStatus: 'pending' as const
				});
				
				// Update each linked wagon's dispatch timestamp and set sync status to pending
				for (const wagon of linkedWagons) {
					await indexedDBService.updateRecord('wagons', wagon.id, {
						dispatchTimestamp: new Date(),
						syncStatus: 'pending' as const
					});
				}
				
				// Show success message
				success = 'Process Complete';
				
				// Navigate back to processes screen after 1 seconds
				setTimeout(() => {
					goto('/bosveld/processes/marshaling-yard');
				}, 1500);
			}
		} catch (e: any) {
			console.error(e);
			error = 'Failed to complete process';
		}
	}

	function formatDate(date: Date | undefined): string {
		if (!date) return 'No date';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<ProcessLayout
	title="Wagon Details"
	{steps}
	{currentStep}
	isSubmitting={isLoading}
	cancelPath="/bosveld/processes/marshaling-yard"
	on:cancel={() => goto('/bosveld/processes/marshaling-yard')}
	on:submit={handleSubmit}
	on:error={({ detail }) => (error = detail)}
	on:success={({ detail }) => (success = detail)}
>
    {#if error}
        <div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
            {error}
        </div>
    {/if}

    {#if success}
        <div class="mb-4 rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
            {success}
        </div>
    {/if}

    {#if isLoading}
        <div class="flex justify-center items-center py-8">
            <div>Loading…</div>
        </div>
    {:else if shuntingTrain}
        <!-- Train Selection Display -->
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <h6 class="font-semibold text-gray-700 mb-2">Train Selection</h6>
            <div class="grid grid-cols-1 gap-4 text-sm">
                <div>
                    {formatDate(shuntingTrain.postDate)}
                </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">
                For the Blank Wagon IDs, please click on "Change" to update details.
            </p>
        </div>

        <!-- Wagons List -->
        <!-- Use key block to force re-render when data changes -->
        {#key dataRefreshKey}
        <div class="space-y-4">
            {#each linkedWagons as wagon, index (wagon.id)}
                <div class="border border-gray-300 rounded-lg p-4 bg-white">
                    <div class="mb-3">
                        <h6 class="font-semibold text-center">Position {wagon.wagonPosition}</h6>
                    </div>
					
                    <div class="space-y-3">
                        <FormField
							label="Wagon (ID):"
							id="wagonName_{index}"
							value={wagon.wagonIdSimple || ''}
							disabled={true}
						/>
						
						<FormField
							label="Temporary RFID:"
							id="wagonId_{index}"
							value={wagon.transcoreTag || ''}
							disabled={true}
						/>
						
						<div class="flex justify-center">
							<button 
								type="button"
								class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-medium"
								on:click={() => {
									// Navigate to wagon edit page
									goto(`/bosveld/processes/marshaling-yard/wagon-id-linking/wagons/${trainId}/edit/${wagon.id}?position=${index + 1}`);
								}}
							>
								Change
							</button>
						</div>
					</div>
				</div>
            {/each}
			
            {#if linkedWagons.length === 0}
                <div class="text-center py-8 text-gray-500">
                    No wagons linked to this shunting train.
                </div>
            {/if}
        </div>
        {/key}
    {:else}
        <div class="text-center py-8 text-gray-500">
            Shunting train not found.
        </div>
    {/if}
</ProcessLayout>