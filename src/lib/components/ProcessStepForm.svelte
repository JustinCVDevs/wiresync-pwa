<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ProcessStepStore } from '$lib/stores/processStepStore';
  import type { FormErrors, ProcessStepData } from '$lib/services/processStepManager';
  import { AlertCircle } from 'lucide-svelte';
  
  /**
   * The process step store to use
   */
  export let store: ProcessStepStore;
  
  /**
   * The step index
   */
  export let stepIndex: number;
  
  /**
   * Whether to show the next button
   */
  export let showNext: boolean = true;
  
  /**
   * Whether to show the previous button
   */
  export let showPrevious: boolean = true;
  
  /**
   * Whether to show the submit button
   */
  export let showSubmit: boolean = false;
  
  /**
   * The label for the next button
   */
  export let nextLabel: string = 'Next';
  
  /**
   * The label for the previous button
   */
  export let previousLabel: string = 'Previous';
  
  /**
   * The label for the submit button
   */
  export let submitLabel: string = 'Submit';
  
  /**
   * Whether the form is active (current step)
   */
  export let isActive: boolean = true;
  
  /**
   * Custom validation function
   */
  export let validator: ((data: ProcessStepData) => FormErrors | null) | undefined = undefined;
  
  // Register validator if provided
  if (validator) {
    store.manager.registerValidator(stepIndex, validator);
  }
  
  // Event dispatcher
  const dispatch = createEventDispatcher<{
    next: { data: ProcessStepData };
    previous: { data: ProcessStepData };
    submit: { data: ProcessStepData };
    validate: { isValid: boolean; errors: FormErrors };
  }>();
  
  // Handle next button click
  async function handleNext() {
    const isValid = store.manager.validateCurrentStep();
    
    if (isValid) {
      let currentData: ProcessStepData = {};
      store.data.subscribe(value => { currentData = value; })();
      
      dispatch('next', { data: currentData });
      await store.manager.nextStep();
    } else {
      let currentErrors: FormErrors = {};
      store.errors.subscribe(value => { currentErrors = value; })();
      
      dispatch('validate', { isValid, errors: currentErrors });
    }
  }
  
  // Handle previous button click
  async function handlePrevious() {
    let currentData: ProcessStepData = {};
    store.data.subscribe(value => { currentData = value; })();
    
    dispatch('previous', { data: currentData });
    await store.manager.previousStep();
  }
  
  // Handle submit button click
  function handleSubmit() {
    const isValid = store.manager.validateCurrentStep();
    
    if (isValid) {
      let currentData: ProcessStepData = {};
      store.data.subscribe(value => { currentData = value; })();
      
      dispatch('submit', { data: currentData });
    } else {
      let currentErrors: FormErrors = {};
      store.errors.subscribe(value => { currentErrors = value; })();
      
      dispatch('validate', { isValid, errors: currentErrors });
    }
  }
  
  // Update data
  export function updateData(newData: Partial<ProcessStepData>) {
    store.manager.updateData(newData);
  }
  
  // Get current errors
  let errors: FormErrors = {};
  store.errors.subscribe(value => { errors = value; });
</script>

{#if isActive}
  <form on:submit|preventDefault={showSubmit ? handleSubmit : handleNext} class="space-y-6">
    <div class="space-y-4">
      <slot />
      
      {#if Object.keys(errors).length > 0}
        <div class="mt-4 flex items-center gap-2 rounded-lg bg-red-100 p-4 text-red-700" role="alert">
          <AlertCircle size={20} />
          <div>
            <p class="font-bold">Please fix the following errors:</p>
            <ul class="list-disc pl-5">
              {#each Object.entries(errors) as [field, message]}
                <li>{message}</li>
              {/each}
            </ul>
          </div>
        </div>
      {/if}
    </div>
    
    <div class="flex space-x-4 pt-4">
      {#if showPrevious}
        <button
          type="button"
          class="flex-1 rounded-lg border border-gray-800 py-3 text-sm transition hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50"
          on:click={handlePrevious}
          disabled={$store.isSubmitting}
        >
          {previousLabel}
        </button>
      {/if}
      
      {#if showNext}
        <button
          type="submit"
          class="flex-1 rounded-lg bg-gray-800 py-3 text-sm text-white transition hover:bg-gray-700 active:bg-gray-600 disabled:opacity-50"
          disabled={$store.isSubmitting}
        >
          {nextLabel}
        </button>
      {/if}
      
      {#if showSubmit}
        <button
          type="submit"
          class="flex-1 rounded-lg bg-green-600 py-3 text-sm text-white transition hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
          disabled={$store.isSubmitting}
        >
          {submitLabel}
        </button>
      {/if}
    </div>
  </form>
{/if}