<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Wagon } from '$lib/types';
    import type { ShuntingTrain } from '$lib/types/shuntingTrain';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { Pencil } from 'lucide-svelte';

	let shuntingTrain: ShuntingTrain | null = null;
	let linkedWagons: Wagon[] = [];
	let error = '';
	let success = '';
	let isLoading = true;
	let trainId = $page.params.trainId;
	let dataRefreshKey = 0;
	let isSubmitting = false;
	let disableSubmit = false;
	let filterMissing = false;

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

	$: disableSubmit = linkedWagons.length === 0;

	type FilterMode = 'all' | 'missing';
	let filterMode: FilterMode = 'all';
	$: missingWagons = linkedWagons.filter(w => !w.wagonIdSimple);
	$: if (missingWagons.length > 0) {
		filterMode = 'missing';
	}
	$: filteredWagons = filterMode === 'missing' ? missingWagons : linkedWagons;
	$: if (filterMode === 'missing' && missingWagons.length > 0) {
		filterMissing = true;
	} else {
		filterMissing = false;
	}

	// Load train and linked wagons from IndexedDB
	async function loadTrainAndWagons() {
		// Prevent concurrent reloads
		if (isReloading) {
			return;
		}
		
		// Store current wagons as backup
		const previousWagons = [...linkedWagons];
		const hadWagons = linkedWagons.length > 0;
		
		try {
			isReloading = true;
			isLoading = true;
			error = '';
			
			// Add timeout to prevent infinite loading on mobile
			const timeoutPromise = new Promise<null>((_, reject) => 
				setTimeout(() => reject(new Error('Load timeout - taking too long')), 15000)
			);
			
			const trainPromise = indexedDBService.getRecord('shuntingTrains', trainId);
			shuntingTrain = await Promise.race([trainPromise, timeoutPromise]) ?? null;

			if (!shuntingTrain) {
				error = 'Shunting train not found';
				return;
			}

			// Load linked wagons using the IDs from linkedWagons array
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

				// Fetch linked wagons using the map (instant lookups)
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
			
			// Restore previous wagons on error to prevent disappearing wagons
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
			isSubmitting = true;

			if (shuntingTrain) {
				// Update the shunting train with verification timestamp
				await indexedDBService.updateRecord('shuntingTrains', shuntingTrain.id, {
					verificationTimestamp: new Date(),
					isWireSynced: false,
					syncStatus: 'pending' as const
				});
				
				success = 'Process Complete';
				
				setTimeout(() => {
					goto('/pmc/processes/magnetite-rail/marshaling-yard/wagon-id-linking');
				}, 1500);
			}
		} catch (e: any) {
			console.error(e);
			error = 'Failed to complete process';
		} finally {
			isSubmitting = false;
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
	{isSubmitting}
	disableSubmit={disableSubmit}
	cancelPath="/pmc/processes/magnetite-rail/marshaling-yard/wagon-id-linking"
	on:cancel={() => goto('/pmc/processes/magnetite-rail/marshaling-yard/wagon-id-linking')}
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
		<div class="flex flex-col justify-center items-center py-8 space-y-4">
			<div class="text-lg">Loading wagons...</div>
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
				Wagons missing a Wagon ID are highlighted in red.
			</p>
		</div>

		<div class="flex items-center justify-between mb-2">
			<button
				type="button"
				class="mb-1 mr-1 w-full rounded-md py-3 text-sm font-medium transition-colors {filterMode === 'all' ? '' : '!bg-gray-200 !text-gray-700 !hover:bg-gray-300'}"
				on:click={() => { filterMode = 'all'; }}
			>All Wagons <span class="ml-2 bg-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">{linkedWagons.length}</span>
			</button>

			<button
				type="button"
				class="mb-1 ml-1 w-full rounded-md py-3 text-sm font-medium transition-colors {filterMode === 'missing' ? '' : '!bg-gray-200 !text-gray-700 !hover:bg-gray-300'}"
				on:click={() => { filterMode = 'missing'; }}
			>Missing IDs <span class="ml-2 bg-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">{missingWagons.length}</span>
			</button>
		</div>

		<!-- Wagons List -->
		{#key dataRefreshKey}
		<div class="space-y-2">
			{#each filteredWagons as wagon, index (wagon.id)}
				<div
					role="button"
					tabindex="0"
					class="flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer hover:brightness-95 active:brightness-90 {wagon.missingID ? 'bg-red-50 border-red-200' : 'bg-white border-gray-300'}"
					on:click={() => goto(`/pmc/processes/magnetite-rail/marshaling-yard/wagon-id-linking/wagons/${trainId}/edit/${wagon.id}?position=${index + 1}`)}
					on:keydown={(e) => e.key === 'Enter' && goto(`/pmc/processes/magnetite-rail/marshaling-yard/wagon-id-linking/wagons/${trainId}/edit/${wagon.id}?position=${index + 1}`)}
				>
					<span class="text-sm font-semibold text-gray-700 w-16 shrink-0">Pos {wagon.wagonPosition}</span>
					<div class="flex-1 min-w-0 text-center">
						{#if wagon.wagonIdSimple === '' && filterMode === 'all'}
							<span class="inline-block bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">MISSING</span>
						{:else}
							{#if filterMode === 'missing' && wagon.wagonIdSimple === ''}
								<span class="text-gray-500 text-sm italic">(blank)</span>
							{:else if wagon.missingID}
								<span class="inline-block bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">{wagon.wagonIdSimple}</span>
							{:else}
								<span class="text-sm text-gray-900">{wagon.wagonIdSimple || '-'}</span>
							{/if}
						{/if}
					</div>
					{#if filterMissing}
						<div class="text-right">							
							<Pencil size={16} class="shrink-0 text-sky-600" />							
						</div>
					{/if}
				</div>
			{/each}

			{#if filteredWagons.length === 0}
				<div class="text-center py-8 text-gray-500">
					{filterMode === 'missing' ? 'No wagons with missing IDs.' : 'No wagons linked to this shunting train.'}
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