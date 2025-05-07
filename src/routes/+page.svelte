<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	let isOnline = navigator.onLine;

	onMount(() => {
		window.addEventListener('online', () => (isOnline = true));
		window.addEventListener('offline', () => (isOnline = false));

		return () => {
			window.removeEventListener('online', () => (isOnline = true));
			window.removeEventListener('offline', () => (isOnline = false));
		};
	});

	function selectLocation() {
		goto('/processes');
	}
</script>
  <main class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
	
	<section
	  class="w-full max-w-sm bg-white rounded-xl shadow-lg p-6 border-2"
	  class:border-green-500={isOnline}
	  class:border-red-500={!isOnline}
	>
	  <h2 class="text-2xl font-semibold text-gray-900 mb-6 sm:text-3xl">
		Select Location
	  </h2>
	  <div class="space-y-4">
		<a
		  on:click={selectLocation}
		  class="group relative block w-full text-center font-medium text-white bg-gray-800 rounded-lg px-8 py-3 overflow-hidden transition-transform hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-0 active:translate-y-0 focus:outline-none"
		>
		  <span class="absolute inset-0 bg-gray-600 mix-blend-multiply transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5"></span>
		  <span class="relative">PMC</span>
		</a>
	  </div>
	</section>
  </main>
  