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
	let dataRefreshKey = 0;
	let isSubmitting = false;

	const steps = ['Select Shunting Train', 'Wagon Linking'];
	let currentStep = 2;

	let wagonUpdateListener: ((event: CustomEvent) => void) | null = null;
	let isInitialLoad = true;
	let isReloading = false;
	let reloadDebounceTimer: ReturnType<typeof setTimeout> | undefined;

	// Debounce reload to prevent multiple simultaneous fetches
	function scheduleReload(source: string, delay: number = 100) {
		if (reloadDebounceTimer) {
			clearTimeout(reloadDebounceTimer);
		}
		
		reloadDebounceTimer = setTimeout(async () => {
			await loadTrainAndWagons();
			reloadDebounceTimer = undefined;
		}, delay);
	}

	// Load train and linked wagons from IndexedDB
	async function loadTrainAndWagons() {
		if (isReloading) {
			return;
		}
		
		const previousWagons = [...linkedWagons];
		const hadWagons = linkedWagons.length > 0;
		
		try {
			isReloading = true;
			isLoading = true;
			error = '';
			
			const timeoutPromise = new Promise<null>((_, reject) => 
				setTimeout(() => reject(new Error('Load timeout - taking too long')), 15000)
			);
			
			const trainPromise = indexedDBService.getRecord('shuntingTrains', trainId);
			shuntingTrain = await Promise.race([trainPromise, timeoutPromise]) ?? null;

			if (!shuntingTrain) {
				error = 'Shunting train not found';
				return;
			}

			if (shuntingTrain.linkedWagons && shuntingTrain.linkedWagons.length > 0) {
				const allWagons = await indexedDBService.getWagons();
				
				if (allWagons.length === 0) {
					error = 'No wagon data found. Please sync data first.';
					linkedWagons = [];
					return;
				}
				
				const wagonMap = new Map<string, Wagon>();
				
				allWagons.forEach(w => {
					wagonMap.set(w.id, w);
					if (w.serverId) {
						wagonMap.set(w.serverId, w);
					}
				});
				
				const foundWagons: Wagon[] = [];
				const missingWagons: string[] = [];
				
				for (const wagonId of shuntingTrain.linkedWagons) {
					const wagon = wagonMap.get(wagonId);
					if (wagon) {
						foundWagons.push(wagon);
					} else {
						missingWagons.push(wagonId);
					}
				}
				
				linkedWagons = foundWagons.sort((a, b) => (a.wagonPosition ?? 0) - (b.wagonPosition ?? 0));
			} else {
				linkedWagons = [];
			}
			
			dataRefreshKey++;
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : 'Unknown error';
			console.error('Error loading:', e);
			
			if (hadWagons && previousWagons.length > 0) {
				linkedWagons = previousWagons;
			}
			
			if (e instanceof Error && e.message.includes('timeout')) {
				error = 'Loading is taking too long. Please check your connection and try again.';
			} else {
				error = 'Failed to load train and wagon data';
			}
		} finally {
			isLoading = false;
			isSubmitting = false;
			isReloading = false;
		}
	}

	// Reload wagons when navigating back from edit page
	afterNavigate(async (navigation) => {
		if (isInitialLoad) {
			isInitialLoad = false;
			return;
		}
		
		const fromPath = navigation.from?.url.pathname;
		if (fromPath && /(^|\/)edit(\/|$)/.test(fromPath)) {
			scheduleReload('afterNavigate', 50);
		}
	});

	onMount(() => {
		setTimeout(() => {
			loadTrainAndWagons();
		}, 100);
		
		wagonUpdateListener = async (event: CustomEvent) => {
			scheduleReload('wagon-updated', 0);
		};
		
		if (typeof window !== 'undefined') {
			window.addEventListener('wagon-updated', wagonUpdateListener as EventListener);
		}
	});

	onDestroy(() => {
		if (reloadDebounceTimer) {
			clearTimeout(reloadDebounceTimer);
			reloadDebounceTimer = undefined;
		}
		
		if (typeof window !== 'undefined' && wagonUpdateListener) {
			window.removeEventListener('wagon-updated', wagonUpdateListener as EventListener);
		}
	});

	// Complete verification and navigate back to processes

	async function handleSubmit() {
		try {
			if (shuntingTrain) {
				await indexedDBService.updateRecord('shuntingTrains', shuntingTrain.id, {
					verificationTimestamp: new Date(),
					syncStatus: 'pending' as const
				});
				
				success = 'Process Complete';
				
				setTimeout(() => {
					goto('/bosveld/processes/marshaling-yard');
				}, 1500);
			}
		} catch (e: any) {
			console.error(e);
			error = 'Failed to complete process';
		}
	}

	// Format date for display
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
	{isSubmitting}
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