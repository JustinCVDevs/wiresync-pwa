<script lang="ts">
	import { goto } from '$app/navigation';
	import FormField from '$lib/components/FormField.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import YesNo from '$lib/components/YesNo.svelte';
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

		<YesNo selected={isDedicatedFleet} label="Dedicated Fleet" />
		<FormField
			label="Sample ID"
			id="sampleId"
			type="text"
			bind:value={sampleId}
			placeholder="Enter Sample ID"
			required
			/>
<FormField
    label="Sample Size"
    id="sampleSize"
    type="select" 
	isSelect={true}
    bind:value={sampleSize}
    options={sampleSizes.map((i)=>({value: i, label: i}))}
    placeholder="Select Sample Size"
    required
/>

<FormField
    label="Commodity"
    id="commodity"
    type="select"
    bind:value={commodity}
    options={commodities.map((i)=>({value: i, label: i}))}
	isSelect={true}
    placeholder="Select Commodity"
    required
/>
{#if commodity === 'Magnetite'}
<FormField
	id="productType"
	label="Product Type"
	isSelect={true}
	options={productTypes.map((type) => ({ value: type, label: type }))}
	bind:value={productType}
	placeholder="Enter Product Type"
	required={true}	
/>
{/if}
	
</ProcessLayout>