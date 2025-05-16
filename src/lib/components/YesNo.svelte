<script lang="ts">
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay } from '$lib/types';

	let { selected, label, description } = $props();
	// TODO:
	// The dedicatedFleet switch merely dictates what the resulting component type will be.
	// If dedicatedFleet is true, the resulting component type will be Fleet.
	// If dedicatedFleet is false, the resulting component type will be Truck.
</script>

<div class="space-y-4">
	<div>
		<h4 class="text-sm font-medium text-gray block">Dedicated Fleet</h4>
		<small>Please specify wether the truck is part of a fleet.</small>
	</div>

	<div class="flex space-x-4">
		<label
			class="block flex w-full items-center justify-center rounded border border-1 p-4 px-5 {selected == 'Yes' ? 'bg-gray text-white': ''}">
			<input
				type="radio"
				hidden
				name="dedicatedFleet"
				value="Yes"
				bind:group={selected}
				class="mr-2"
			/>
			<span>Yes</span>
		</label>
		<label
			class="flex w-full items-center justify-center rounded border border-1 p-4 px-5 {selected == 'No' ? 'bg-gray text-white' : ''}">
			<input
				type="radio"
				name="dedicatedFleet"
				value="No"
				hidden
				bind:group={selected}
				class="mr-2"
			/>
			<span>No</span>
		</label>
	</div>
</div>
