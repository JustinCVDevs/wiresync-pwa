<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import FormField from './FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';

	export let wagonIdSimple = '';
	export let tarpedStatus = false;
	export let linkedIds: string[] = [];

	let availableWagons: any[] = [];

	const dispatch = createEventDispatcher<{
		submit: { wagonIdSimple: string; tarpedStatus: boolean };
		cancel: void;
	}>();

	function handleSubmit(e?: Event) {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		
		if (!wagonIdSimple || wagonIdSimple.trim() === '') {
			return;
		}

		dispatch('submit', { wagonIdSimple, tarpedStatus });
	}

	function handleCancel(e?: Event) {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		dispatch('cancel');
	}

	onMount(async () => {
		const allWagons = (await indexedDBService.getAllRecords('wagons')).filter(
			w =>
				!w.dispatchTimestamp &&
				w.wagonIdSimple !== '' &&
				// Exclude wagons whose id or serverId are present in linkedIds
				!linkedIds.includes(w.id) &&
				!(w.serverId ? linkedIds.includes(w.serverId) : false)
		);
		availableWagons = allWagons.map((w) => ({ value: w.wagonIdSimple, label: w.wagonIdSimple }));
	});
</script>

<div class="flex items-end gap-4">
	<div class="form">
		<FormField
			label="Wagon ID"
			id="wagonIdSimple"
			search={true}
			placeholder="Select Wagon ID"
			bind:value={wagonIdSimple}
			options={availableWagons}
		/>
	</div>
	<div class="flex flex-col items-center mb-2">
		<label for="tarpedCheckbox" class="text-xs mb-1">Tarped</label>
		<input
			id="tarpedCheckbox"
			type="checkbox"
			bind:checked={tarpedStatus}
			class="w-5 h-5"
		/>
	</div>
</div>

<div class="flex justify-between items-center pt-8">
	<button 
		type="button"
		class="w-36 text-sm rounded-lg bg-red py-3 text-white transition hover:bg-red-700 active:bg-red-800 disabled:opacity-50 px-2" 
		on:click={handleCancel}
	>
		Cancel
	</button>
	<button
		type="button"
		on:click={handleSubmit}
		class="w-36 text-sm items-center justify-center rounded-lg bg-gray py-3 px-2 text-white transition hover:bg-green-700 active:bg-black disabled:opacity-50"
		disabled={!wagonIdSimple || wagonIdSimple.trim() === ''}
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