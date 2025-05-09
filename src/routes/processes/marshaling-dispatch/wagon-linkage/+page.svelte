<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { indexedDBService } from '$lib/services/indexedDBService';
    import WagonInput from '$lib/components/WagonInput.svelte';
	import type { TrainDispatch } from '$lib/types/trainDispatch';

    let dispatchId = $page.url.searchParams.get('dispatchId') || '';
    let trainDispatch: TrainDispatch | undefined;
    let showWagonInput = false;
    let error = '';
    let isLoading = true;

    async function loadDispatch() {
        try {
            const dispatch = await indexedDBService.getRecord('trainDispatches', dispatchId);
            if (!dispatch) {
                error = 'Train dispatch not found';
                return;
            }
            trainDispatch = dispatch;
        } catch (err) {
            error = 'Failed to load dispatch data';
            console.error(err);
        } finally {
            isLoading = false;
        }
    }

    async function handleWagonSubmit(event: CustomEvent<{ wagonId: string; rfidTag: string; image: string | null }>) {
        try {
            if (!trainDispatch) return;

            const updatedWagonIds = [...(trainDispatch.linkedWagonIds || []), event.detail.wagonId];
            
            // Update train dispatch with new wagon
            await indexedDBService.updateRecord('trainDispatches', dispatchId, {
                ...trainDispatch,
                linkedWagonIds: updatedWagonIds,
                updated: new Date().toISOString()
            });

            // Reload dispatch data
            await loadDispatch();
            showWagonInput = false;
        } catch (err) {
            error = 'Failed to add wagon';
            console.error(err);
        }
    }

    function handleWagonCancel() {
        showWagonInput = false;
    }

    function handleReview() {
        goto(`/processes/marshaling-dispatch/review?dispatchId=${dispatchId}`);
    }

    $: if (dispatchId) {
        loadDispatch();
    }
</script>

<div class="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
    <h1 class="text-2xl font-bold mb-6 text-center">Link Wagons</h1>

    {#if error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
        </div>
    {/if}

    {#if isLoading}
        <div class="text-center">Loading...</div>
    {:else}
        <div class="space-y-6">
            {#if trainDispatch?.linkedWagonIds?.length}
                <div class="border rounded-lg p-4">
                    <h2 class="text-lg font-semibold mb-2">Linked Wagons</h2>
                    <ul class="list-disc pl-5">
                        {#each trainDispatch.linkedWagonIds as wagonId}
                            <li>{wagonId}</li>
                        {/each}
                    </ul>
                </div>
            {/if}

            {#if showWagonInput}
                <WagonInput 
                    on:submit={handleWagonSubmit}
                    on:cancel={handleWagonCancel}
                />
            {:else}
                <button
                    class="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700"
                    on:click={() => (showWagonInput = true)}
                >
                    Add Wagon
                </button>
            {/if}

            <button
                class="w-full bg-gray-600 text-white py-3 rounded-md hover:bg-gray-700"
                on:click={handleReview}
            >
                Back to Review
            </button>
        </div>
    {/if}
</div>
