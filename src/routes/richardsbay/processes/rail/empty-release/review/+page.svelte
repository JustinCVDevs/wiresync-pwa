<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { indexedDBService } from '$lib/services/indexedDBService';
    import ProcessLayout from '$lib/components/ProcessLayout.svelte';
    import type { Wagon } from '$lib/types/wagon';
    import { Container, PlusCircle, CheckCircle } from 'lucide-svelte';

    let wagonId = '';
    $: wagonId = $page.url.searchParams.get('wagonId') || '';

    let wagon: Wagon | undefined;
    let releasedWagons: Wagon[] = [];
    let error = '';
    let isLoading = true;
    let isCompleting = false;

    const steps = [
        'Select',
        'Review & Release'
    ];
    let currentStep = 2;

    async function loadWagon() {
        isLoading = true;
        try {
            if (wagonId) {
                wagon = await indexedDBService.getRecord('wagons', wagonId);
                if (!wagon) {
                    error = 'Wagon not found';
                    return;
                }

                // Set release timestamp if not already set
                if (!wagon.releaseTimestamp) {
                    await indexedDBService.updateRecord('wagons', wagonId, {
                        ...wagon,
                        releaseTimestamp: new Date(),
                        updated: new Date().toISOString()
                    });
                    wagon.releaseTimestamp = new Date();
                }
            }

            // Load all released wagons for this session
            const allWagons = await indexedDBService.getAllRecords('wagons');
            releasedWagons = allWagons.filter(w => 
                w.process === 'Wagon_Release' && 
                w.releaseTimestamp &&
                new Date(w.releaseTimestamp).toDateString() === new Date().toDateString()
            );

        } catch (e) {
            console.error('Error loading wagon:', e);
            error = 'Failed to load wagon data';
        } finally {
            isLoading = false;
        }
    }

    onMount(() => {
        loadWagon();
    });

    $: if (wagonId) loadWagon();

    function handleCancel() {
        goto('/richardsbay/processes');
    }

    function handleNewWagon() {
        goto('/richardsbay/processes/rail/empty-release');
    }

    async function handleCompleteRelease() {
        isCompleting = true;
        try {
            // Mark all released wagons as completed
            for (const releasedWagon of releasedWagons) {
                await indexedDBService.updateRecord('wagons', releasedWagon.id!, {
                    ...releasedWagon,
                    process: 'Wagon_Release_Complete',
                    dispatchTimestamp: undefined,
                    updated: new Date().toISOString()
                });
            }
            setTimeout(() => {
                goto('/richardsbay/processes/complete');
            }, 2000);

        } catch (e) {
            console.error('Error completing release:', e);
            error = 'Failed to complete release';
        } finally {
            isCompleting = false;
        }
    }

    function formatDateTime(date: Date | string | undefined): string {
        if (!date) return 'Not set';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
</script>

<ProcessLayout
    title="Empty Wagon Release Review"
    steps={steps}
    currentStep={currentStep}
    cancelPath="/richardsbay/processes/rail"
    showSubmit={false}
    showCancel={false}
>
    {#if isLoading}
        <div class="flex justify-center items-center py-8">
            <div class="text-gray-600">Loading wagon data...</div>
        </div>
    {:else}
        <div class="space-y-6">
            <!-- Current Wagon Details -->
            {#if wagon}
                <div class="space-y-4">
                    <div class="flex items-center gap-2 text-gray-700">
                        <Container size={20} />
                        <h2 class="text-lg font-medium">Current Wagon</h2>
                    </div>

                    <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <span class="text-sm font-medium text-gray-600">Wagon ID:</span>
                                <p class="text-lg font-semibold">{wagon.wagonIdSimple}</p>
                            </div>
                        </div>
                        <div>
                            <span class="text-sm font-medium text-gray-600">Release Timestamp:</span>
                            <p class="text-lg font-semibold">{formatDateTime(wagon.releaseTimestamp)}</p>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Released Wagons List -->
            {#if releasedWagons.length > 0}
                <div class="space-y-4">
                    <div class="flex items-center gap-2 text-gray-700">
                        <CheckCircle size={20} />
                        <h2 class="text-lg font-medium">Released Wagons Today ({releasedWagons.length})</h2>
                    </div>

                    <div class="space-y-2">
                        {#each releasedWagons as releasedWagon}
                            <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <span class="font-medium">Wagon ID: {releasedWagon.wagonIdSimple}</span>
                                    </div>
                                    <span class="text-sm text-green-600">
                                        Released at: {formatDateTime(releasedWagon.releaseTimestamp)}
                                    </span>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Error/Success Messages -->
            {#if error}
                <div class="rounded-lg bg-red-100 p-4 text-red-700" role="alert">
                    {error}
                </div>
            {/if}
            <!-- Action Buttons -->
            <div class="space-y-4">
                <button
                    type="button"
                    on:click={handleNewWagon}
                    class="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
                >
                    <PlusCircle size={20} />
                    +New Wagon
                </button>

                <div class="flex justify-between items-center">
                    <button
                        type="button"
                        on:click={handleCancel}
                        class="w-36 text-sm rounded-lg bg-red-600 py-3 text-white transition hover:bg-red-700 active:bg-red-800 disabled:opacity-50 px-2"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        on:click={handleCompleteRelease}
                        disabled={isCompleting || releasedWagons.length === 0}
                        class="w-36 text-sm items-center justify-center rounded-lg bg-green-600 py-3 px-2 text-white transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
                    >
                        {#if isCompleting}
                            Completing...
                        {:else}
                            Complete Release
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    {/if}
</ProcessLayout>