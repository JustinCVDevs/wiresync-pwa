<script lang="ts">
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Assay } from '$lib/types';

	let isDedicatedFleet: 'Yes' | 'No' = 'No';
	let sampleId = '';
	let sampleSize = '';
	let commodity = '';
	let productType = '';
	let error = '';
	const sampleSizes = ['1', '5', '10'];
	const commodities = ['Magnetite', 'Mag-64%', 'Mag-65%', 'Iron Oxide'];
	const productTypes = ['Coarse', 'DMS'];
	const steps = [
		"Sample Details",
		"Truck Details",
		"Complete"
	]
	let currentStep = 1;
	async function handleSubmit() {
		try {
			const assay: Assay = {
				id: crypto.randomUUID(),
				name: sampleId,
				sampleSize,
				commodity,
				productType,
				dedicatedFleet: isDedicatedFleet === 'Yes', // Convert to boolean
				syncStatus: 'pending',
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
				process: 'Truck Loadout'
			};

			// Save assay to IndexedDB
			await indexedDBService.saveRecord('assays', assay);

			goto(`/pmc/processes/truck-loadout/add-trucks?assayId=${assay.id}`);
		} catch (err) {
			error = 'Failed to submit data';
			console.error(err);
		}
	}

	function handleCancel() {
		goto('/pmc/processes');
	}
	let processLayout: ProcessLayout;

</script>
<ProcessLayout
title="Truck Loadout"
{steps}
{currentStep}
isSubmitting={false}
bind:this={processLayout}
cancelPath="/processes"
on:cancel={() => goto('/pmc/processes')}
on:submit={handleSubmit}

>
<slot name="header" />
<div class="space-y-6">
	
	<h2 class="text-xl font-semibold">Sample Capturing</h2>
	<div class="space-y-4">
		<div class="space-y-2">
			<label class="block font-medium">Dedicated Fleet</label>
			<div class="flex space-x-4">
				<label class="flex items-center block  border border-1 p-4 px-5 rounded {isDedicatedFleet == "Yes"? "bg-gray text-white" : ""}">
					<input type="radio" hidden name="dedicatedFleet" value="Yes" bind:group={isDedicatedFleet} class="mr-2" />
					<span>Yes</span>
				</label>
				<label class="flex items-center border border-1 rounded p-4 px-5 {isDedicatedFleet == "No" ? "bg-gray text-white" : ""}">
					<input type="radio" name="dedicatedFleet" value="No" hidden bind:group={isDedicatedFleet} class="mr-2" />
					<span>No</span>
				</label>
			</div>
		</div>

			<div class="space-y-2">
				<label for="sampleId" class="block font-medium">Sample ID</label>
				<input
					id="sampleId"
					type="text"
					bind:value={sampleId}
					placeholder="Enter Sample ID"
					required
					class="w-full rounded border border-gray-300 px-3 py-2"
				/>
			</div>

			<div class="space-y-2">
				<label for="sampleSize" class="block font-medium">Sample Size</label>
				<select 
					id="sampleSize" 
					bind:value={sampleSize} 
					required
					class="w-full rounded border border-gray-300 px-3 py-2"
				>
					<option value="">Select Sample Size</option>
					{#each sampleSizes as size}
						<option value={size}>{size}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-2">
				<label for="commodity" class="block font-medium">Commodity</label>
				<select 
					id="commodity" 
					bind:value={commodity} 
					required
					class="w-full rounded border border-gray-300 px-3 py-2"
				>
					<option value="">Select Commodity</option>
					{#each commodities as item}
						<option value={item}>{item}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-2">
				<label for="productType" class="block font-medium">Product Type</label>
				<select 
					id="productType" 
					bind:value={productType} 
					required
					class="w-full rounded border border-gray-300 px-3 py-2"
				>
					<option value="">Select Product Type</option>
					{#each productTypes as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
			</div>
	
	</div>
</ProcessLayout>