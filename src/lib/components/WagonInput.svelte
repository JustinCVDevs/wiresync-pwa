<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import FormField from './FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';

	export let wagonId = '';
	export let tarpedStatus = false;

	let availableWagons: any[] = [];

	const dispatch = createEventDispatcher<{
		submit: { wagonId: string; tarpedStatus: boolean };
		cancel: void;
	}>();

	function handleSubmit(e?: Event) {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}

		if (!wagonId || wagonId.trim() === '') {
			return;
		}

		dispatch('submit', { wagonId, tarpedStatus });
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
			.sort((a, b) => a.wagonIdSimple.localeCompare(b.wagonIdSimple))
			.map((w) => ({ value: w.wagonId, label: w.wagonIdSimple }));
	});
</script>

<div class="flex items-end gap-4">
	<div class="form">
		<FormField
			label="Wagon ID"
			id="wagonIdSimple"
			search={true}
			placeholder="Select Wagon ID"
			bind:value={wagonId}
			options={availableWagons}
			required={true}
		/>
	</div>
	<div class="mb-2 flex flex-col items-center">
		<label for="tarpedCheckbox" class="mb-1 text-xs">Tarped</label>
		<input id="tarpedCheckbox" type="checkbox" bind:checked={tarpedStatus} class="h-5 w-5" />
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
		disabled={!wagonId || wagonId.trim() === ''}
	>
		Submit Wagon
	</button>
</div>

<style>
	.form {
		margin-top: 1rem;
		position: relative;
		flex: 1;
	}
</style>