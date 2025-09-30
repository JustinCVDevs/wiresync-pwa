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
				return;
			}
			trainDispatch = record;
			if (trainDispatch !== undefined && trainDispatch != null) {
				train = (await indexedDBService.getTrains()).find(
					(t) => trainDispatch?.linkedTrainId === t.id
				);
				consignment = (await indexedDBService.getAllRecords('consignments')).find(
					(t) => trainDispatch?.linkedConsignmentId === t.id
				);
				wagons = (await indexedDBService.getAllRecords('wagons')).filter(
					(t) =>
						trainDispatch?.linkedWagonIds?.includes(t?.id ?? '') ||
						trainDispatch?.linkedWagonIds?.includes(t?.serverId ?? '')
				);
			}
		} catch (e) {
			console.error(e);
			error = 'Failed to load dispatch data';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		if (dispatchId) loadDispatch();
	});


	async function handleWagonSubmit(event: {
		preventDefault: () => void;
		detail: { wagonIdSimple: any; tarpedStatus: boolean };
	}) {
		event.preventDefault();
		if (!trainDispatch || !trainDispatch.linkedWagonIds) {
			return;
		}
		error = '';
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

			await indexedDBService.updateRecord('wagons', wagon.id, {
				syncStatus: 'pending',
				dispatchTimestamp: new Date(),
				tarpedStatus: event.detail.tarpedStatus,
				updated: new Date().toISOString()
			});

			const updatedIds = [...trainDispatch.linkedWagonIds, wagon.id];

			await indexedDBService.updateRecord('trainDispatches', dispatchId, {
				...trainDispatch,
				linkedWagonIds: updatedIds,
				syncStatus: 'pending',
				updated: new Date().toISOString()
			});

			success = 'Wagon linked';
			currentStep = 3;
			await loadDispatch();
			showWagonInput = false;
		} catch (e) {
			console.error(e);
			error = 'Failed to update wagon';
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
			{#if trainDispatch?.linkedWagonIds?.length}
				<ul class="space-y-1">
					{#each trainDispatch.linkedWagonIds as id, i}
						<li class="flex items-center gap-3 rounded bg-white px-3 py-2 align-middle shadow-sm">
							<Container size={16} class="inline text-xs" />
							<div>
								<div class="text-gray font-medium">
									<span class="text-sm font-light">Wagon ID</span>: {wagons?.find((w) => w.id == id)
										?.wagonIdSimple}
								</div>
								<div class="text-left text-xs text-gray-400">
									Date linked: {wagons?.find((w) => w.id == id)?.created
										? new Date(wagons.find((w) => w.id == id)?.created!).toLocaleString('en-GB', {
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
										checked={wagons?.find((w) => w.id == id)?.tarpedStatus === true}
										on:change={async (e) => {
											const target = e.target as HTMLInputElement | null;
											const wagon = wagons?.find((w) => w.id == id);
											if (target && wagon) {
												const isChecked = target.checked;
												await indexedDBService.updateRecord('wagons', wagon.id, {
													...wagon,
													tarpedStatus: isChecked,
													updated: new Date().toISOString(),
													syncStatus: 'pending'
												});
												await loadDispatch();
											}
										}}
									/>
								</div>
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
			>
				<div class="m-6 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
					<form on:submit|preventDefault>
						<WagonInput
							linkedIds={trainDispatch?.linkedWagonIds || []}
							on:submit={handleWagonSubmit}
							on:cancel={handleWagonCancel}
						/>
					</form>
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
