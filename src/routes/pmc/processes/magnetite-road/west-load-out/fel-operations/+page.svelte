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
	let currentStep = 1;

	let felWeight = '';
	let loadingLocation = 'West Load Out';
	let error = '';
	let processLayout: ProcessLayout;

	let availableTrucks: any[] = [];
	let filteredTrucks: any[] = [];
	let selectedTruck: any = '';
	let searchQuery = ''; // Search query for filtering trucks
	let showSearch = false; // Control the visibility of the search box
	let showDropdown = false; // Control the visibility of the custom dropdown

	const steps = ["FEL Details", "Complete"];

	onMount(async () => {
		availableTrucks = await getTrucks();
		filteredTrucks = availableTrucks; // Initialize filtered trucks
	});

	async function getTrucks() {
		try {
			const allTrucks = (await indexedDBService.getAllRecords('trucks')).filter(
				truck => truck.loadingLocation === 'West Load Out'
			);
			
			let filteredTrucks: any[] = [];

			if (dedicatedFleet === 'Yes') {
				// Fetch all assays where dedicatedFleet is true
				const allAssays = (await indexedDBService.getAllRecords('assays')).filter(
					(a) => a.location === 'West Load Out' && a.dedicatedFleet === true
				);

				// Collect all linkedTruckIds from relevant assays
				const linkedTruckIds = allAssays.flatMap(a => a.linkedTruckIds ?? []);

				// Filter trucks whose serverId matches any linkedTruckId
				filteredTrucks = allTrucks.filter(
					truck => linkedTruckIds.includes(truck.serverId ?? '')
				);
			} else {
				// Fetch all assays where dedicatedFleet is false
				const allAssays = (await indexedDBService.getAllRecords('assays')).filter(
					(a) => a.location === 'West Load Out' && a.dedicatedFleet === false
				);

				// Collect all linkedTruckIds from relevant assays
				const linkedTruckIds = allAssays.flatMap(a => a.linkedTruckIds ?? []);

				// Filter trucks whose serverId matches any linkedTruckId
				filteredTrucks = allTrucks.filter(
					truck => linkedTruckIds.includes(truck.serverId ?? '')
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

                await indexedDBService.updateRecord('fleet', fleet?.id ?? '', {
                    loadingLocation: loadingLocation,
                    syncStatus: 'pending',
                    felMassKg: Number(felWeight),
                });

                formPersistenceService.clearForm('fel-operations-west-load-out');

                goto(`/pmc/processes/magnetite-road/west-load-out/fel-operations/verification?truckRegistration=${encodeURIComponent(selectedTruck || '')}&fleetServerId=${encodeURIComponent(fleet?.serverId || '')}`);
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
            }

            formPersistenceService.clearForm('fel-operations-west-load-out');

            goto(`/pmc/processes/magnetite-road/west-load-out/fel-operations/verification?truckRegistration=${encodeURIComponent(selectedTruck || '')}`);
        }
    } catch (err) {
        error = 'Failed to submit data';
        console.error(err);
    }
}
	  
	  function handleCancel() {
		  goto('/pmc/processes');
	  }

	$: if (dedicatedFleet !== '') {
		(async () => {
			availableTrucks = await getTrucks();
		})();
	}

	// Reactive statement to filter trucks based on the search query
	$: {
		filteredTrucks = availableTrucks.filter(truck =>
			truck.registration.toLowerCase().includes(searchQuery.toLowerCase())
		);
	}
</script>
	<ProcessLayout
  	title="West Load Out"
	{steps}
	{currentStep}
	isSubmitting={false}
	bind:this={processLayout}
	cancelPath="/pmc/processes"
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
						<FormField
							id="truckRegistration"
							label="Truck Registration"
							search={true}
							options={filteredTrucks.map(truck => ({ value: truck.registration, label: truck.registration }))}
							bind:value={selectedTruck}
							placeholder="Select Truck Registration"
							required
							on:focus={() => showSearch = true}
							on:blur={() => setTimeout(() => (showSearch = false), 200)}
						/>

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
						<FormField
							id="truckRegistration"
							label="Truck Registration"
							search={true}
							options={availableTrucks.map(truck => ({value: truck.registration, label: truck.registration}))}
							bind:value={selectedTruck}
							placeholder="Select Truck Registration"
							required
						/>

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
    
</style>