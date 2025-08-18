<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import FormField from './FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';

	export let wagonId = '';
	export let tarpedStatus = false; // Add this line

	let availableWagons: any[] = [];

	const dispatch = createEventDispatcher<{
		submit: { wagonId: string; tarpedStatus: boolean }; // Add tarpedStatus to event
		cancel: void;
	}>();

	function handleSubmit() {
		dispatch('submit', { wagonId, tarpedStatus }); // Include tarpedStatus
	}

	function handleCancel() {
		dispatch('cancel');
	}

	onMount(async () => {
		const allWagons = (await indexedDBService.getAllRecords('wagons')).filter(
			w => !w.dispatchTimestamp
		);
		availableWagons = allWagons.map((w) => ({ value: w.wagonId, label: w.wagonId }));
	});
</script>

<div class="flex items-end gap-4">
	<div class="flex-1">
		<FormField
			label="Wagon ID"
			id="wagonId"
			isSelect={true}
			placeholder="Select Wagon ID"
			bind:value={wagonId}
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
	<button class="w-36 text-sm rounded-lg bg-red py-3 text-white transition hover:bg-red-700 active:bg-red-800 disabled:opacity-50 px-2" on:click={handleCancel}>Cancel</button>
	<button
		on:click={handleSubmit}
		class="w-36 text-sm items-center justify-center rounded-lg bg-gray py-3 px-2  text-white transition hover:bg-green-700 active:bg-black disabled:opacity-50"
		type="submit"
	>
			Submit Wagon</button>
</div>

