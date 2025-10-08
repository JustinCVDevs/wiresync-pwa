<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { indexedDBService } from '$lib/services/indexedDBService';
	import WagonInput from '$lib/components/WagonInput.svelte';
	import ProcessLayout from '$lib/components/ProcessLayout.svelte';
	import type { TrainDispatch } from '$lib/types/trainDispatch';
	import type { Consignment, Train, Wagon } from '$lib';
	import { Container } from 'lucide-svelte';

	let dispatchId = '';
	$: dispatchId = $page.url.searchParams.get('dispatchId') || '';

	let trainDispatch: TrainDispatch | undefined;
	let showWagonInput = false;
	let error = '';
	let success = '';
	let isLoading = true;
	let processLayout: ProcessLayout;
	let tarpedStatus = false;

	const steps = ['Train & Consignment', 'Wagon Linkage'];
	let currentStep = 2;
	let train: Train | undefined;
	let consignment: Consignment | undefined;
	let wagons: Wagon[] | undefined;
	let showPopup = false;

	async function loadDispatch() {
		isLoading = true;
		try {
			const record = (await indexedDBService.getAllRecords('trainDispatches')).find(
				(d) => d.id === dispatchId || d.serverId === dispatchId
			);
			if (!record) {
				error = 'Train dispatch not found';
				isLoading = false;
				return;
			}
			trainDispatch = record;
			
			if (trainDispatch !== undefined && trainDispatch != null) {
				train = (await indexedDBService.getTrains()).find(
					(t) => trainDispatch?.linkedTrainId === t.id || trainDispatch?.linkedTrainId === t.serverId
				);
				consignment = (await indexedDBService.getAllRecords('consignments')).find(
					(t) => trainDispatch?.linkedConsignmentId === t.id || trainDispatch?.linkedConsignmentId === t.serverId
				);
				
				// Improved wagon matching - check both id and serverId
				const allWagons = await indexedDBService.getAllRecords('wagons');
				wagons = allWagons.filter(
					(w) => trainDispatch?.linkedWagonIds?.some(linkedId => 
						linkedId === w.id || linkedId === w.serverId
					)
				);
			}
		} catch (e) {
			console.error('Error loading dispatch:', e);
			error = `Failed to load dispatch data: ${e instanceof Error ? e.message : 'Unknown error'}`;
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		if (dispatchId) {
			loadDispatch();
		} else {
			error = 'No dispatch ID provided';
			isLoading = false;
		}
	});


	async function handleWagonSubmit(event: {
		preventDefault: () => void;
		detail: { wagonIdSimple: any; tarpedStatus: boolean };
	}) {
		event.preventDefault();
		if (!trainDispatch || !trainDispatch.linkedWagonIds) {
			console.error('Train dispatch not initialized:', trainDispatch);
			error = 'Train dispatch not initialized';
			return;
		}
		error = '';
		success = '';
		
		try {
			if (trainDispatch.linkedWagonIds.length >= 80) {
				error = 'Maximum of 80 wagons can be linked to a train dispatch';
				return;
			}
			
			// Find the existing wagon by wagonIdSimple
			const allWagons = await indexedDBService.getAllRecords('wagons');
			const wagon = allWagons.find((w) => w.wagonIdSimple === event.detail.wagonIdSimple);

			if (!wagon) {
				error = 'Wagon not found';
				return;
			}

			// Check if wagon is already linked (check both id and serverId)
			const wagonIdToUse = wagon.serverId || wagon.id;
			if (trainDispatch.linkedWagonIds.includes(wagonIdToUse)) {
				error = 'Wagon already linked to this dispatch';
				return;
			}

			// Use consistent ID (prefer serverId if available, otherwise use id)
			const updatedIds = [...trainDispatch.linkedWagonIds, wagonIdToUse];

			// Perform atomic update: both wagon and trainDispatch update in single transaction
			// If either fails, both are rolled back automatically by IndexedDB
			await indexedDBService.atomicUpdate(['wagons', 'trainDispatches'], async (tx) => {
				// Update wagon (without syncStatus - set after transaction succeeds)
				const existingWagon = await tx.objectStore('wagons').get(wagon.id);
				if (!existingWagon) {
					throw new Error('Wagon not found in transaction');
				}
				await tx.objectStore('wagons').put({
					...existingWagon,
					dispatchTimestamp: new Date(),
					tarpedStatus: event.detail.tarpedStatus,
					updated: new Date().toISOString()
				});

				// Update trainDispatch (without syncStatus - set after transaction succeeds)
				const existingDispatch = await tx.objectStore('trainDispatches').get(trainDispatch!.id);
				if (!existingDispatch) {
					throw new Error('Train dispatch not found in transaction');
				}
				await tx.objectStore('trainDispatches').put({
					...existingDispatch,
					linkedWagonIds: updatedIds,
					updated: new Date().toISOString()
				});
			});

			// Transaction completed successfully - now mark for sync
			await indexedDBService.updateRecord('wagons', wagon.id, { syncStatus: 'pending' });
			await indexedDBService.updateRecord('trainDispatches', trainDispatch.id, { syncStatus: 'pending' });

			// Update local trainDispatch object only after transaction succeeds
			trainDispatch = {
				...trainDispatch,
				linkedWagonIds: updatedIds
			};

			success = 'Wagon linked successfully';
			currentStep = 3;
			
			// Reload dispatch data to ensure UI is in sync
			await loadDispatch();
			
			// Close wagon input after successful update
			showWagonInput = false;
		} catch (e) {
			console.error('Error updating wagon:', e);
			error = `Failed to update wagon: ${e instanceof Error ? e.message : 'Unknown error'}`;
		}
	}

	async function confirmFinishDispatch(confirm: boolean) {
		if (confirm) {
			if (!trainDispatch) {
				error = 'Train dispatch not found';
				return;
			}

			// 1. Update trainDispatch with dispatchTimestamp
			await indexedDBService.updateRecord('trainDispatches', trainDispatch.id, {
				...trainDispatch,
				syncStatus: 'pending',
				dispatchTimestamp: new Date(),
				updated: new Date().toISOString()
			});

			// 2. Update each linked wagon's tarpedStatus and dispatchTimestamp
			if (trainDispatch.linkedWagonIds && trainDispatch.linkedWagonIds.length > 0) {
				const allWagons = await indexedDBService.getAllRecords('wagons');
				for (const wagonId of trainDispatch.linkedWagonIds) {
					const wagon = allWagons.find((w) => w.id === wagonId || w.serverId === wagonId);
					if (wagon) {
						await indexedDBService.updateRecord('wagons', wagon.id, {
							...wagon,
							syncStatus: 'pending',
							tarpedStatus: wagon.tarpedStatus,
							dispatchTimestamp: new Date(),
							updated: new Date().toISOString()
						});
					}
				}
			}

			processLayout.setSuccess('Wagon linkage completed');
			setTimeout(() => {
				goto(`/bosveld/processes/marshaling-yard/marshaling-dispatch`);
			}, 1000);
		}
		showPopup = false;
	}

	function handleWagonCancel() {
		showWagonInput = false;
	}

	function handleReview() {
		processLayout.setSuccess('Wagon linkage completed');
		setTimeout(() => {
			goto(`/bosveld/processes/marshaling-yard/marshaling-dispatch`);
		}, 1000);
	}
</script>

<ProcessLayout
	title="Wagon Linkage"
	{steps}
	{currentStep}
	bind:this={processLayout}
	isSubmitting={isLoading}
	cancelPath="/bosveld/processes/marshaling-yard/marshaling-dispatch"
	on:cancel={() => goto('/bosveld/processes/marshaling-yard/marshaling-dispatch')}
	on:submit={handleReview}
>
	{#if error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{error}
		</div>
	{/if}

	{#if isLoading}
		<div class="text-center">Loading...</div>
	{:else}
		<!-- Train Dispatch Info -->
		<div class="mb-6 rounded-lg border bg-gray-50 p-4">
			<h2 class="dark:text-gray mb-2 text-base font-semibold">Train Details</h2>
			<p class="dark:text-gray text-sm">
				Train Ref: <span class="font-bold">{train?.refNr || '-'}</span>
			</p>
			<p class="dark:text-gray text-sm">
				Consignment: <span class="font-bold">{consignment?.name || '-'}</span>
			</p>
		</div>

		<!-- Linked Wagons -->
		<div class="mb-6">
			<p class="text-gray mb-2 text-sm">
				Linked Wagons: <span class="font-bold">{trainDispatch?.linkedWagonIds?.length || 0}</span>
			</p>
			{#if trainDispatch?.linkedWagonIds?.length && wagons}
				<ul class="space-y-1">
					{#each trainDispatch.linkedWagonIds as id, i}
						{@const wagon = wagons?.find((w) => w.id === id || w.serverId === id)}
						<li class="flex items-center gap-3 rounded bg-white px-3 py-2 align-middle shadow-sm">
							<Container size={16} class="inline text-xs" />
							<div class="flex-1">
								<div class="text-gray font-medium">
									<span class="text-sm font-light">Wagon ID</span>: {wagon?.wagonIdSimple || 'Unknown'}
								</div>
								<div class="text-left text-xs text-gray-400">
									Date linked: {wagon?.created
										? new Date(wagon.created).toLocaleString('en-GB', {
												day: '2-digit',
												month: '2-digit',
												year: 'numeric',
												hour: '2-digit',
												minute: '2-digit',
												hour12: false
											})
										: '–'}
								</div>
								<!-- Label and checkbox inline -->
								{#if wagon}
									<div class="mt-1 flex items-center gap-2">
										<label
											for={'tarped-' + id}
											class="mt-2 text-xs text-gray-400"
											style="font-weight: semi-bold;"
										>
											Check box if wagon is tarped:
										</label>
										<input
											id={'tarped-' + id}
											type="checkbox"
											class="mt-2 ml-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
											checked={wagon.tarpedStatus === true}
											on:change={async (e) => {
												const target = e.target as HTMLInputElement | null;
												if (target && wagon) {
													const isChecked = target.checked;
													try {
														await indexedDBService.updateRecord('wagons', wagon.id, {
															...wagon,
															tarpedStatus: isChecked,
															updated: new Date().toISOString(),
															syncStatus: 'pending'
														});
														await loadDispatch();
													} catch (err) {
														console.error('Failed to update tarped status:', err);
														error = 'Failed to update tarped status';
													}
												}
											}}
										/>
									</div>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-gray-400 italic">No wagons linked yet.</p>
			{/if}
		</div>

		<!-- Add Wagon -->
		{#if showWagonInput}
			<div
				class="bg-opacity-40 fixed inset-0 z-10 flex items-center justify-center backdrop-blur-sm"
				role="button"
				tabindex="0"
				on:click|self={() => showWagonInput = false}
				on:keydown={(e) => e.key === 'Escape' && (showWagonInput = false)}
			>
				<div class="m-6 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
					<WagonInput 
						linkedIds={trainDispatch?.linkedWagonIds || []} 
						on:submit={handleWagonSubmit} 
						on:cancel={handleWagonCancel} 
					/>
				</div>
			</div>
		{:else}
			<button
				class="bg-gray mb-4 w-full rounded-md py-3 text-sm text-white hover:bg-blue-700"
				on:click={() => {
					currentStep = 2;
					showWagonInput = true;
				}}
				>+ Add Wagon
			</button>
		{/if}
	{/if}
</ProcessLayout>
<div class="button-group flex space-x-4">
	<button
		type="button"
		class="submit-button flex-1 items-center justify-center rounded-lg py-3 text-white transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
		on:click={() => (showPopup = true)}
	>
		Finalize Consignment
	</button>
</div>
<!-- Custom Popup -->
{#if showPopup}
	<div class="popup-overlay">
		<div class="popup-content">
			<p class="popup-message">Are you sure you are done sampling train {train?.refNr}?</p>
			<div class="popup-buttons">
				<button
					type="button"
					class="popup-button confirm-button"
					on:click={() => confirmFinishDispatch(true)}
				>
					Yes
				</button>
				<button
					type="button"
					class="popup-button cancel-button"
					on:click={() => confirmFinishDispatch(false)}
				>
					No
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.flex.space-x-4.button-group {
		margin-left: 1rem;
		margin-right: 1rem;
	}

	.popup-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.popup-content {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		text-align: center;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.popup-message {
		font-size: 1.2rem;
		margin-bottom: 1rem;
	}

	.popup-buttons {
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.popup-button {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
	}

	.confirm-button {
		background: #4caf50;
		color: white;
	}

	.cancel-button {
		background: #f44336;
		color: white;
	}
</style>
