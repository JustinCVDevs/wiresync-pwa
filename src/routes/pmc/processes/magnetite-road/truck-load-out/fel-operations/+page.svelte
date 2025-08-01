<script lang="ts">
	import YesNo from '$lib/components/YesNo.svelte';
	import { goto } from '$app/navigation';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import { onMount } from 'svelte';
	import { formPersistenceService } from '$lib/services/formPersistenceService';
  
	let dedicatedFleet = '';
	let isDedicatedFleet = false;

	let felWeight = '';
	let loadingLocation = 'Truck Load Out';
	let error = '';
	let processLayout: ProcessLayout;

	let availableTrucks: any[] = [];
	let selectedTruck: any = '';

	const steps = ["FEL Details", "Complete"]

	onMount(async () => {
		availableTrucks = await getTrucks();
	});

	async function getTrucks() {
		try {
			let filteredTrucks: any[] = [];

			if (dedicatedFleet === 'Yes') {
				const allDedicatedFleetTrucks = (await indexedDBService.getAllRecords('dedicatedFleetTrucks'));
				// Filter trucks where dedicatedFleet is true and loadingLocation is "West Load Out"
				const fleet = (await indexedDBService.getAllRecords('fleet')).filter(
					(f) => f.felMassKg === 0 && f.loadingLocation === loadingLocation
				);

				// Map fleet to get linkedFleetIds
				const linkedFleetIds = fleet.map(f => f.serverId);

				// Find matching assays
				const matchingAssays = (await indexedDBService.getAllRecords('assays')).filter(
					assay => assay.linkedFleetIds?.some(id => linkedFleetIds.includes(id))
				);

				// Map truck to get linkedTruckIds
				const linkedDedicatedFleetTruckIds = matchingAssays.flatMap(assay => assay.linkedDedicatedFleetTruckIds ?? []);

				filteredTrucks = allDedicatedFleetTrucks.filter(trucks =>
					linkedDedicatedFleetTruckIds.some(truck => truck === trucks.serverId)
				);
			} else {
				const allTrucks = (await indexedDBService.getAllRecords('trucks'));
				// Filter assays where dedicatedFleet is false and location is "West Load Out"
				const filteredAssays = (await indexedDBService.getAllRecords('assays')).filter(
					assay => assay.dedicatedFleet === false && assay.location === loadingLocation
				);

				// Collect all linkedTruckIds from the filtered assays
				const linkedTruckIds = filteredAssays.flatMap(assay => assay.linkedTruckIds ?? []);

				// Filter truckLoads where truckLoadId matches any linkedTruckId
				const matchingTruckLoads = await indexedDBService.getAllRecords('truckLoads').then(loads =>
					loads.filter(truckLoad => (truckLoad.felWeight === '') && (truckLoad.loadingLocation === loadingLocation) && (linkedTruckIds.includes(truckLoad.truckId ?? '')))
				);

				filteredTrucks = allTrucks.filter(truck =>
					matchingTruckLoads.some(truckLoad => truckLoad.truckId === truck.serverId)
				);
			}

			// Sort the filtered trucks alphabetically by registration
			return filteredTrucks.sort((a, b) => a.registration.localeCompare(b.registration));
		} catch (error) {
			console.error('No trucks available', error);
			return [];
		}
	}
	
	async function handleSubmit() {
    try {
        processLayout.setError('');
        processLayout.setSuccess('');

        if (dedicatedFleet === 'Yes') {
            isDedicatedFleet = true;

            if (selectedTruck) {
                const fleet = (await indexedDBService.getAllRecords('fleet')).filter(
                    (f) => f.registration === selectedTruck
                )[0];

                const truck = availableTrucks.find(truck => truck.registration === selectedTruck);

                if (!truck) {
                    throw new Error(`Truck with registration "${selectedTruck}" not found.`);
                }

                truck.dedicatedFleet = true;
                truck.loadingLocation = loadingLocation;
                truck.felWeight = Number(felWeight);
                truck.updated = new Date().toISOString();
                truck.syncStatus = 'pending';

                await indexedDBService.updateRecord('trucks', truck.id, truck);

                await indexedDBService.updateRecord('fleet', fleet?.id ?? '', {
                    loadingLocation: loadingLocation,
                    syncStatus: 'pending',
                    felMassKg: Number(felWeight),
                });

                formPersistenceService.clearForm('fel-operations-truck-load-out');

                goto(`/pmc/processes/magnetite-road/truck-load-out/fel-operations/verification?truckRegistration=${encodeURIComponent(selectedTruck || '')}&sampleId=${encodeURIComponent(fleet?.sampleId || '')}`);
            }
        } else {
            isDedicatedFleet = false;

            if (selectedTruck) {
                const truck = availableTrucks.find(truck => truck.registration === selectedTruck);

                if (!truck) {
                    throw new Error(`Truck with registration "${selectedTruck}" not found.`);
                }

				const truckLoad = await indexedDBService.getAllRecords('truckLoads').then(loads =>
					loads.find(load => load.truckId === truck.serverId)
				);

                await indexedDBService.updateRecord('truckLoads', truckLoad?.id ?? '', {
                    loadingLocation: loadingLocation,
                    syncStatus: 'pending',
                    felWeight: felWeight,
                });
				goto(`/pmc/processes/magnetite-road/truck-load-out/fel-operations/verification?truckRegistration=${encodeURIComponent(selectedTruck || '')}&sampleId=${encodeURIComponent(truckLoad?.sampleId || '')}`);
            }
            formPersistenceService.clearForm('fel-operations-truck-load-out');
        }
    } catch (err) {
        error = 'Failed to submit data';
        console.error(err);
    }
}
	  let currentStep = 1;
	  function handleCancel() {
		  goto('/pmc/processes/magnetite-road/truck-load-out');
	  }

	$: if (dedicatedFleet !== '') {
		(async () => {
			availableTrucks = await getTrucks();
		})();
	}
</script>
	<ProcessLayout
  	title="Truck Load Out"
	{steps}
	{currentStep}
	isSubmitting={false}
	bind:this={processLayout}
	cancelPath="/pmc/processes/magnetite-road/truck-load-out"
	on:cancel={handleCancel}
	on:submit={handleSubmit}
	on:error={({ detail }) => (error = detail)}
	>
	<slot name="header" />
	
		{#if error}
			<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
				{error}
			</div>
		{/if}
			<h2 class="">Material Data Capturing</h2>
				<YesNo 
					bind:selected={dedicatedFleet} 
					label={"Dedicated Fleet"} 
					description={"Please specify wether the truck is part of a fleet."}
				/>

				{#if dedicatedFleet}
					{#if dedicatedFleet === 'No'}
						<div class="form-field">
							<FormField
								id="truckRegistration"
								label="Truck Registration"
								search={true}
								options={availableTrucks.map(truck => ({
									value: truck.registration,
									label: truck.registration
								}))}
								bind:value={selectedTruck}
								placeholder="Select Truck Registration"
								required
							/>
						</div>
						<FormField
							id="felWeight"
							label="FEL Weight (Tons)"
							type="number"
							bind:value={felWeight}
							placeholder="Enter FEL Weight"
							required
						/>

						<FormField
							id="loadingLocation"
							label="Loading Location"
							isSelect={true}
							options={[
								{ value: 'West Load Out', label: 'West Load Out' },
								{ value: 'Gravelotte', label: 'Gravelotte' },
								{ value: 'Truck Load Out', label: 'Truck Load Out' }
							]}
							bind:value={loadingLocation}
							required
						/>
					{:else}
						<div class="form-field">
							<FormField
								id="truckRegistration"
								label="Truck Registration"
								search={true}
								options={availableTrucks.map(truck => ({
									value: truck.registration,
									label: truck.registration
								}))}
								bind:value={selectedTruck}
								placeholder="Select Truck Registration"
								required
							/>
						</div>
						<FormField
							id="felWeight"
							label="FEL Weight (Tons)"
							type="number"
							bind:value={felWeight}
							placeholder="Enter FEL Weight"
							required
						/>

						<FormField
							id="loadingLocation"
							label="Loading Location"
							isSelect={true}
							options={[
								{ value: 'West Load Out', label: 'West Load Out' },
								{ value: 'Gravelotte', label: 'Gravelotte' },
								{ value: 'Truck Load Out', label: 'Truck Load Out' }
							]}
							bind:value={loadingLocation}
							required
						/>
					{/if}
				{/if}
			
	</ProcessLayout>
<style>
	.form-field {
		margin-top: 1rem;
		position: relative;
	}
</style>