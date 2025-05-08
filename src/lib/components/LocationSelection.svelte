<script>
	import { goto } from '$app/navigation';
	import Header from './Header.svelte';
	import Button from './ui/button/button.svelte';

	function selectLocation() {
		goto('/processes');
	}
</script>

<main class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
	<section class="w-full max-w-sm rounded-xl border-2 bg-white p-6 shadow-lg">
		<h2 class="mb-6 text-2xl font-semibold text-gray-900 sm:text-3xl">Select Location</h2>
		<div class="space-y-4">
			<Button
				on:click={selectLocation}
				class="group relative block w-full overflow-hidden rounded-lg bg-gray-800 px-8 py-3 text-center font-medium text-white transition-transform hover:translate-x-0.5 hover:translate-y-0.5 focus:outline-none active:translate-x-0 active:translate-y-0"
			>
				<span
					class="absolute inset-0 bg-gray-600 mix-blend-multiply transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5"
				></span>
				<span class="relative">PMC</span>
			</Button>
		</div>
	</section>
</main>
