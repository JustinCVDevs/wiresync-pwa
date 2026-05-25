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

	function handleWagonCheck(wagonId: string, checked: boolean) {
		if (checked) {
			if (!selectedWagonIds.includes(wagonId)) selectedWagonIds = [...selectedWagonIds, wagonId];
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

<div class="wagon-list-popup">
	<div class="form">
		<label for="wagonSearch" class="block font-medium text-gray text-sm mb-1">Search Wagon ID</label>
		<input
			id="wagonSearch"
			type="text"
			bind:value={wagonSearch}
			placeholder="Search Wagon ID"
			class="w-full rounded-lg text-sm border px-3 py-2 text-gray border-gray-300 focus:ring-2 focus:ring-gray-400 focus:outline-none"
		/>
	</div>
	<div class="wagon-list mt-4">
		{#if filteredWagons.length === 0}
			<p class="text-gray-400 italic">No wagons found.</p>
		{:else}
			<div class="wagon-list-scroll">
				<ul>
					{#each filteredWagons as wagon}
						<li class="flex items-center justify-between border-b py-2">
							<span class="text-gray-800">{wagon.wagonIdSimple}</span>
							<input
								type="checkbox"
								class="w-5 h-5"
								checked={selectedWagonIds.includes(wagon.id)}
								on:change={(e) => {
									const target = e.target as HTMLInputElement | null;
									if (target) {
										handleWagonCheck(wagon.id, target.checked);
									}
								}}
							/>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
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

<style>
	.form {
		position: relative;
		flex: 1;
	}
	.wagon-list-popup {
		max-width: 420px;
		width: 100%;
		margin: 0 auto;
		background: #fff;
		border-radius: 12px;
		box-shadow: 0 4px 24px rgba(0,0,0,0.12);
		padding: 1.5rem 1rem 1rem 1rem;
		display: flex;
		flex-direction: column;
		max-height: 80vh;
		overflow: hidden;
	}
	.wagon-list-scroll {
		max-height: 45vh;
		overflow-y: auto;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
		background: #f9f9f9;
		margin-top: 0.5rem;
	}
</style>