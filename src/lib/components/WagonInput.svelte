<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Wagon } from '$lib/types/wagon';
	import { indexedDBService } from '$lib/services/indexedDBService';

	export let swapping: boolean = false;
	export let siteLocation: string = '';

	let wagonSearch = '';
	let availableWagons: Wagon[] = [];
	let filteredWagons: Wagon[] = [];
	let selectedWagonIds: string[] = [];

	const dispatch = createEventDispatcher<{ submit: { wagonIds: string[] }; cancel: void }>();

	$: filteredWagons = availableWagons.filter(wagon =>
		wagon.wagonId?.toLowerCase().includes(wagonSearch.toLowerCase())
	);

	$: allSelected = filteredWagons.length > 0 && filteredWagons.every(w => selectedWagonIds.includes(w.id));

	function toggleSelectAll() {
		if (swapping) return;

		if (allSelected) {
			selectedWagonIds = selectedWagonIds.filter(id => !filteredWagons.some(w => w.id === id));
		} else {
			const toAdd = filteredWagons.map(w => w.id).filter(id => !selectedWagonIds.includes(id));
			selectedWagonIds = [...selectedWagonIds, ...toAdd];
		}
	}

	function handleWagonCheck(wagonId: string, checked: boolean) {
		if (checked) {
			if (swapping) {
				selectedWagonIds = [wagonId];
			} else if (!selectedWagonIds.includes(wagonId)) {
				selectedWagonIds = [...selectedWagonIds, wagonId];
			}
		} else {
			selectedWagonIds = selectedWagonIds.filter(id => id !== wagonId);
		}
	}

	function handleSubmit(e?: Event) {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		if (selectedWagonIds.length === 0) return;
		dispatch('submit', { wagonIds: selectedWagonIds });
	}

	function handleCancel(e?: Event) {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		dispatch('cancel');
	}

	onMount(async () => {
		// Fetch all dispatches to get all linked wagon IDs
		const allDispatches = await indexedDBService.getAllRecords('trainDispatches');
		const allLinkedWagonIds = new Set(
			allDispatches.flatMap((d) => d.linkedWagonIds || []).filter((id) => !!id)
		);

		const allWagons = (await indexedDBService.getAllRecords('wagons')).filter(
			(w) =>
				!w.dispatchTimestamp &&
				w.wagonIdSimple !== '' &&
				w.siteLocation === siteLocation &&
				// Exclude wagons whose id or serverId are present in any dispatch's linkedWagonIds
				!allLinkedWagonIds.has(w.id) &&
				!(w.serverId ? allLinkedWagonIds.has(w.serverId) : false)
		);

		// Deduplicate by wagonIdSimple so we don't show multiple options with same display label
		const dedupMap = new Map<string, any>();
		for (const w of allWagons) {
			const key = w.wagonIdSimple ?? '';
			const existing = dedupMap.get(key);
			if (!existing || (w.created && existing.created && w.created > existing.created)) {
				dedupMap.set(key, w);
			}
		}

		availableWagons = Array.from(dedupMap.values())
			.sort((a, b) => a.wagonIdSimple.localeCompare(b.wagonIdSimple));
	});
</script>

{#if !swapping}
	<div>
		<h5 class="text-xl font-bold text-gray">Wagon Details</h5>
		<p class="text-gray-500">Search and select wagons to release.</p>
	</div>	
{/if}

<div class="space-y-4 mt-4">
	<div>
		<label for="wagonSearch" class="block text-sm font-medium text-gray mb-1">Search by wagon ID</label>
		<input
			id="wagonSearch"
			type="text"
			bind:value={wagonSearch}
			placeholder="Search Wagon ID"
			class="w-full rounded-lg text-sm border px-3 py-2 text-gray border-gray-300 focus:ring-2 focus:ring-gray-400 focus:outline-none"
		/>
	</div>

	<div class="flex items-center justify-between">
		{#if !swapping && filteredWagons.length > 0}
			<span
				role="button"
				tabindex="0"
				class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium cursor-pointer select-none transition-all
					{allSelected ? 'border-gray-700 bg-gray-700 text-white' : 'border-gray-300 text-gray-600 hover:border-gray-500 hover:text-gray-900'}"
				on:click={toggleSelectAll}
				on:keydown={(e) => e.key === 'Enter' && toggleSelectAll()}
			>
				<div class="flex-shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center
					{allSelected ? 'border-white' : 'border-current'}">
					{#if allSelected}
						<svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
						</svg>
					{/if}
				</div>
				{allSelected ? 'Deselect all' : 'Select all'}
			</span>
		{:else}
			<div></div>
		{/if}
		<div>
			{#if !swapping && selectedWagonIds.length > 0}
				<span class="inline-flex items-center rounded-full bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-white">
					{selectedWagonIds.length} selected
				</span>
			{/if}
		</div>
	</div>

	{#if filteredWagons.length === 0}
		<p class="text-sm italic text-gray-400 text-center py-4">No wagons found.</p>
	{:else}
		<div class="relative max-h-56 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-2">
			{#each filteredWagons as wagon}
				{@const isSelected = selectedWagonIds.includes(wagon.id)}
				<label
					class="flex items-center gap-3 rounded-lg border-2 px-4 py-3 cursor-pointer transition-all select-none
						{isSelected
							? 'border-gray-700 bg-gray-50 shadow-sm'
							: 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}"
				>
					<input
						type="checkbox"
						class="sr-only"
						checked={isSelected}
						on:change={(e) => {
							const target = e.target as HTMLInputElement | null;
							if (target) handleWagonCheck(wagon.id, target.checked);
						}}
					/>
					<div class="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
						{isSelected ? 'bg-gray-700 border-gray-700' : 'border-gray-300 bg-white'}">
						{#if isSelected}
							<svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
								<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
							</svg>
						{/if}
					</div>
					<span class="text-sm font-medium {isSelected ? 'text-gray-900' : 'text-gray-700'}">
						{wagon.wagonIdSimple}
					</span>
				</label>
			{/each}
		</div>
	{/if}
</div>

<div class="flex items-center justify-between pt-8">
	<button
		type="button"
		class="bg-red w-36 rounded-lg px-2 py-3 text-sm text-white transition hover:bg-red-700 active:bg-red-800 disabled:opacity-50"
		on:click={handleCancel}
	>
		Cancel
	</button>
	<button
		type="button"
		on:click={handleSubmit}
		class="bg-gray w-36 items-center justify-center rounded-lg px-2 py-3 text-sm text-white transition hover:bg-green-700 active:bg-black disabled:opacity-50"
		disabled={selectedWagonIds.length === 0}
	>
		{#if swapping}
			Swap Wagon
		{:else}
			Link Wagons
		{/if}
	</button>
</div>

