<script lang="ts">
    export let label: string;
    export let id: string;
    export let value: string = '';
    export let placeholder: string = '';
    export let type: string = 'text';
    export let required: boolean = false;
    export let error: string = '';
    export let disabled: boolean = false;

    // For select inputs
    export let options: { value: string; label: string }[] = [];
    export let isSelect: boolean = false;
    export let search: boolean = false; // Ensure this is properly typed if using TypeScript

    // Declare the missing variables
    let showDropdown: boolean = false; // Controls the visibility of the dropdown
    let searchQuery: string = ''; // For filtering options
    let filteredOptions = options; // To store filtered options

    // Reactive statement to filter options based on the search query
    $: if (search) {
        filteredOptions = options.filter(option =>
            option.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
    } else {
        filteredOptions = options; // Show all options if search is disabled
    }

    function selectOption(optionValue: string) {
        value = optionValue;
        showDropdown = false; // Close dropdown after selection
    }
</script>

<div class="space-y-1">
	<label for={id} class="block font-medium text-gray text-sm">{label}{required ? ' *' : ''}</label>

	{#if isSelect}
		<select
			{id}
			bind:value
			class="w-full rounded-lg border text-sm py-2 px-3 border-gray-300 text-gray focus:ring-2 focus:ring-gray-400 focus:outline-none {error
				? 'border-red-500'
				: ''}"
			{disabled}
			{required}
		>
			<option value="">{placeholder || 'Select an option'}</option>
			{#each options as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	{:else if search}
		<div class="relative">
            <div
                class="dropdown-display flex items-center justify-between w-full rounded-lg border text-sm py-2 px-3 border-gray-300 text-gray focus:ring-2 focus:ring-gray-400 focus:outline-none cursor-pointer hover:bg-gray-100"
                on:click={() => (showDropdown = !showDropdown)}
            >
                <span>{value ? options.find(option => option.value === value)?.label : placeholder || 'Select an option'}</span>
                <div class="dropdown-arrow"></div>
            </div>

            {#if showDropdown}
                <div class="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 shadow-lg">
                    {#if search}
                        <input
                            type="text"
                            placeholder="Search..."
                            bind:value={searchQuery}
                            class="w-full border-b border-gray-300 text-sm py-2 px-3 focus:outline-none"
                        />
                    {/if}

                    <ul class="suggestions-list">
                        {#each filteredOptions as option}
                            <li>
                                <button
                                    on:click={() => selectOption(option.value)}
                                    class="{value === option.value ? 'selected' : ''}"
                                >
                                    {option.label}
                                </button>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
        </div>
	{:else}
		<input
			{id}
			{type}
			bind:value
			{placeholder}
			class="w-full rounded-lg text-sm border px-3 py-2 text-gray border-gray-300 focus:ring-2 focus:ring-gray-400 focus:outline-none {error
				? 'border-red-500'
				: ''}"
			{disabled}
			{required}
		/>
	{/if}

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}
</div>

<style>
    .dropdown-display {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background-color: white;
        border: 1px solid #ccc;
        border-radius: 0.375rem; /* Matches the rounded corners of the native dropdown */
        padding: 0.5rem 0.75rem; /* Matches the padding of the native dropdown */
        font-size: 0.875rem; /* Matches the font size of the native dropdown */
        color: #374151; /* Matches the text color of the native dropdown */
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .dropdown-display:hover {
        background-color: #f3f4f6; /* Light gray background on hover */
    }

    .dropdown-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.25rem; /* Matches the size of the native dropdown arrow */
        height: 1.25rem;
        border-radius: 0.25rem;
        color: #6b7280; /* Matches the arrow color of the native dropdown */
        transition: background-color 0.2s;
        background-image: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"%3E%3Cpath fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /%3E%3C/svg%3E');
        background-repeat: no-repeat;
        background-position: center;
        background-size: 1rem;
    }

    .dropdown-arrow:hover {
        background-color: #e5e7eb; /* Slightly darker gray background on hover */
    }

    .suggestions-list {
        border: 1px solid #ccc;
        background: #fff;
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 150px;
        overflow-y: auto;
        position: absolute;
        z-index: 10;
        width: 100%;
    }

    .suggestions-list li:nth-child(even) {
        background: #f6f8fa;
    }

    .suggestions-list li:nth-child(odd) {
        background: #fff;
    }

    .suggestions-list button {
        width: 100%;
        text-align: left;
        padding: 0.5rem;
        background: transparent;
        border: none;
        cursor: pointer;
        color: #222;
        transition: background 0.2s;
    }

    .suggestions-list button.selected,
    .suggestions-list button:hover {
        background: #2563eb;
        color: #fff;
    }

    .suggestions-list li {
        padding: 0;
    }
</style>
