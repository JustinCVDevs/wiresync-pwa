<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let value1: string = '';
    export let value2: string = '';
    export let label: string = '';
    export let error: string = '';

    let hideFirst = false;
    const dispatch = createEventDispatcher();

    function handleInput1(e: Event) {
        value1 = (e.target as HTMLInputElement).value;
        dispatch('update:value1', value1);
        hideFirst = false;
    }

    function handleInput2(e: Event) {
        value2 = (e.target as HTMLInputElement).value;
        dispatch('update:value2', value2);
    }

    function handleFocusField2() {
        hideFirst = true;
        dispatch('field2focus');
    }
</script>

<div class="flex flex-col gap-2">
    <div>
        <label for="field1" class="block font-medium text-gray text-sm">{label}</label>
        <input
            id="field1"
            type={hideFirst ? 'password' : 'text'}
            bind:value={value1}
            class="w-full rounded-lg border text-sm py-2 px-3 border-gray-300 text-gray focus:ring-2 focus:ring-gray-400 focus:outline-none {error ? 'border-red-500' : ''}"
            on:input={handleInput1}
        />
        {#if error}
            <p class="text-sm text-red-600">{error}</p>
        {/if}
    </div>

    <div>
        <label for="field2" class="block font-medium text-gray text-sm">Confirm {label}</label>
        <input
            id="field2"
            type="text"
            bind:value={value2}
            class="w-full rounded-lg border text-sm py-2 px-3 border-gray-300 text-gray focus:ring-2 focus:ring-gray-400 focus:outline-none {error ? 'border-red-500' : ''}"
            on:input={handleInput2}
            on:focus={handleFocusField2}
        />
    </div>
</div>
