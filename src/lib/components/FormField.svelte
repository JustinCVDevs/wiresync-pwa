<script lang="ts">
    export let label: string;
    export let id: string;
    export let value: string = '';
    export let placeholder: string = '';
    export let type: string = 'text';
    export let step: string | undefined = undefined;
    export let required: boolean = false;
    export let error: string = '';
    export let disabled: boolean = false;
    export let style: string = '';

    // For select inputs
    export let options: { value: string; label: string }[] = [];
    export let isSelect: boolean = false;
    export let search: boolean = false;

    let showDropdown: boolean = false;
    let searchQuery: string = '';
    let filteredOptions = options;

    // Reactive statement to filter options based on the search query
    $: if (search) {
        filteredOptions = options.filter(option =>
            option.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
    } else {
        filteredOptions = options;
    }

    // Reactive statement to hide dropdown if filteredOptions is empty
    $: if (filteredOptions.length === 0) {
        showDropdown = false;
    }

    $: {
		const perfectMatch = filteredOptions.some(option => option.label.toLowerCase() === searchQuery.toLowerCase());
        showDropdown = !perfectMatch && filteredOptions.length > 0 && searchQuery.length > 0;
	}

    function selectOption(optionValue: string) {
        const selectedOption = options.find(option => option.value === optionValue);
        if (selectedOption) {
            searchQuery = selectedOption.label;
        }
        value = optionValue;
        showDropdown = false;
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
            <!-- Search input -->
				<input
					id="truckRegistration-search"
                    class="w-full rounded-lg border text-sm py-2 px-3 border-gray-300 text-gray focus:ring-2 focus:ring-gray-400 focus:outline-none {error
                        ? 'border-red-500'
                        : ''}"
					type="text"
					placeholder={placeholder}
                    {required}
					bind:value={searchQuery}
                    on:input={() => {
                        value = searchQuery;
                    }}
					on:focus={() => {
                        if (filteredOptions.length > 0) {
                            showDropdown = true;
                        }
					}}
					on:blur={() => {
                        showDropdown = false;
					}}
				/>
				<!-- Dropdown arrow inside the search box -->
				<div class="dropdown-arrow absolute" style="display: {searchQuery ? 'none' : 'flex'};"></div>

        </div>	
			{#if showDropdown}
				<div class="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 shadow-lg">
					<ul class="suggestions-list">
						{#each filteredOptions as option}
							<li>
								<button
                                    type="button"
									on:mousedown={() => {
										selectOption(option.value);
									}}
									class="{value === option.value ? 'selected' : ''}"
								>
									{option.label}
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
	{:else}
		<input
			{id}
			{type}
            {style}
            {step}
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
    .dropdown-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.25rem;
        height: 1.25rem;
        border-radius: 0.25rem;
        transition: background-color 0.2s;
        background-image: url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="%237A7A7A"%3E%3Cpath fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /%3E%3C/svg%3E');
        background-repeat: no-repeat;
        background-position: center;
        top: 25%;
        left: 93%;
        background-size: 1rem;
    }

    .dropdown-arrow:hover {
        background-color: #e5e7eb;
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
