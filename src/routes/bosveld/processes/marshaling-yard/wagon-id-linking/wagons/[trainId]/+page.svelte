<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import type { Wagon } from '$lib/types';
    import type { ShuntingTrain } from '$lib/types/shuntingTrain';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import FormField from '$lib/components/FormField.svelte';

	let shuntingTrain: ShuntingTrain | null = null;
	let linkedWagons: Wagon[] = [];
	let error = '';
	let success = '';
	let isLoading = true;
	let trainId: string;

	const steps = ['Select Shunting Train', 'Wagon Linking'];
	let currentStep = 2;

	$: trainId = $page.params.trainId;

	async function loadTrainAndWagons() {
		try {
			// Load the shunting train
			shuntingTrain = await indexedDBService.getRecord('shuntingTrains', trainId) ?? null;

			if (!shuntingTrain) {
				error = 'Shunting train not found';
				return;
			}

			// Load linked wagons using the IDs from linkedWagons array
			if (shuntingTrain.linkedWagons && shuntingTrain.linkedWagons.length > 0) {
				//Fetch all wagons
				const allWagons: Wagon[] = await indexedDBService.getAllRecords('wagons');
				// Fetch each wagon by ID from the wagons collection
				const wagonPromises = shuntingTrain.linkedWagons.map(wagonId => {
					const wagon = allWagons.find(w => w.serverId === wagonId);
					try {
						return wagon;
					} catch (e) {
						console.warn(`Failed to load wagon ${wagonId}:`, e);
						return null;
					}
				});
				
				const wagonResults = await Promise.all(wagonPromises);
				// Filter out null results and ensure we have valid wagon objects
				linkedWagons = wagonResults.filter(wagon => wagon !== null && wagon !== undefined) as Wagon[];
			} else {
				linkedWagons = [];
			}
		} catch (e) {
			console.error('Error loading train and wagons:', e);
			error = 'Failed to load train and wagon data';
		} finally {
			isLoading = false;
		}
	}

	onMount(loadTrainAndWagons);

	async function handleSubmit() {
		try {
			// Set the verification timestamp to current time
			if (shuntingTrain) {
				const updatedShuntingTrain = {
					...shuntingTrain,
					verificationTimestamp: new Date(),
					syncStatus: 'pending' as const
				};
				
				// Save the updated shunting train with verification timestamp
				await indexedDBService.saveRecord('shuntingTrains', updatedShuntingTrain);
				
				// Show success message
				success = 'Process Complete';
				
				// Navigate back to processes screen after 1 seconds
				setTimeout(() => {
					goto('/bosveld/processes/marshaling-yard');
				}, 1000);
			}
		} catch (e: any) {
			console.error(e);
			error = 'Failed to complete process';
		}
	}

	function formatDate(date: Date | undefined): string {
		if (!date) return 'No date';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<ProcessLayout
	title="Wagon Details"
	{steps}
	{currentStep}
	isSubmitting={isLoading}
	cancelPath="/bosveld/processes/marshaling-yard"
	on:cancel={() => goto('/bosveld/processes/marshaling-yard')}
	on:submit={handleSubmit}
	on:error={({ detail }) => (error = detail)}
	on:success={({ detail }) => (success = detail)}
>
    {#if error}
        <div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
            {error}
        </div>
    {/if}

    {#if success}
        <div class="mb-4 rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
            {success}
        </div>
    {/if}

    {#if isLoading}
        <div class="flex justify-center items-center py-8">
            <div>Loading…</div>
        </div>
    {:else if shuntingTrain}
        <!-- Train Selection Display -->
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <h6 class="font-semibold text-gray-700 mb-2">Train Selection</h6>
            <div class="grid grid-cols-1 gap-4 text-sm">
                <div>
                    {formatDate(shuntingTrain.postDate)}
                </div>
            </div>
            <p class="text-xs text-gray-500 mt-2">
                For the Blank Wagon IDs, please click on "Change" to update details.
            </p>
        </div>

        <!-- Wagons List -->
        <div class="space-y-4">
            {#each linkedWagons as wagon, index}
                <div class="border border-gray-300 rounded-lg p-4 bg-white">
                    <div class="mb-3">
                        <h6 class="font-semibold text-center">Number {index + 1}</h6>
                    </div>
					
                    <div class="space-y-3">
                        <FormField
							label="Wagon (ID):"
							id="wagonName_{index}"
							value={wagon.wagonId || ''}
							disabled={true}
						/>
						
						<FormField
							label="Temporary RFID:"
							id="wagonId_{index}"
							value={wagon.transcoreTag || ''}
							disabled={true}
						/>
						
						<div class="flex justify-center">
							<button 
								type="button"
								class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-medium"
								on:click={() => {
									// Navigate to wagon edit page
									goto(`/bosveld/processes/marshaling-yard/wagon-id-linking/wagons/${trainId}/edit/${wagon.id}?position=${index + 1}`);
								}}
							>
								Change
							</button>
						</div>
					</div>
				</div>
            {/each}
			
            {#if linkedWagons.length === 0}
                <div class="text-center py-8 text-gray-500">
                    No wagons linked to this shunting train.
                </div>
            {/if}
        </div>
    {:else}
        <div class="text-center py-8 text-gray-500">
            Shunting train not found.
        </div>
    {/if}
</ProcessLayout>