<script lang='ts'>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { pocketbaseService } from '$lib/services/pocketbaseService';

  let loading = true;
  let email = '';
  let password = '';
  let error = '';

  onMount(() => {
    if (pocketbaseService.isAuthenticated) {
      goto('/processes');
    }
    loading = false;
  });

  async function handleLogin() {
    try {
      error = '';
      const success = await pocketbaseService.login(email, password);
      if (success) {
        goto('/processes');
      }
    } catch (e: Error | any){
      error = e?.message;
    }
  }
</script>



{#if loading}
  <div class="flex justify-center items-center h-screen">
    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
{:else}


  <div class="flex flex-col justify-center items-center h-screen bg-gray-100">

		<img src="./wire sync.png" alt="Wire Sync Logo" class="inline-block mb-6 h-32" />	
		<div class="text-3xl font-bold text-gray-800 mb-4 text-center">Welcome back</div>
		
    <div class="bg-white p-8 rounded-lg shadow-md w-96">
      <h1 class="text-2xl font-bold mb-6 text-center">Login to your account</h1>
      
      {#if error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      {/if}

      <form on:submit|preventDefault={handleLogin} class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            id="email"
            bind:value={email}
            class="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            id="password"
            bind:value={password}
            class="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <button
          class="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-700 active:bg-gray-900 transition"
         type="submit"		
        >
          Login
        </button>
      </form>
    </div>
  </div>
{/if}
