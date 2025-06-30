import { writable, derived, type Writable, type Readable } from 'svelte/store';
import { ProcessStepManager, type ProcessStepData, type FormErrors } from '$lib/services/processStepManager';

export interface ProcessStepStore {
  subscribe: (run: (value: {
    currentStep: number;
    stepNames: string[];
    data: ProcessStepData;
    errors: FormErrors;
    isSubmitting: boolean;
  }) => void) => () => void;
  manager: ProcessStepManager;
}

export function createProcessStepStore(
  processName: string,
  baseUrl: string,
  initialData: ProcessStepData = {}
): ProcessStepStore {
  const manager = new ProcessStepManager(processName, baseUrl, initialData);
  
  // Create derived stores for read-only values
  const currentStep = derived(manager.currentStep, $step => $step);
  const stepNames = writable(manager.stepNames);
  const errors = derived(manager.errors, $errors => $errors);
  const isSubmitting = derived(manager.submitting, $submitting => $submitting);
  
  // Create a readable store that combines all the values
  const store = derived(
    [currentStep, stepNames, manager.data, errors, isSubmitting],
    ([$currentStep, $stepNames, $data, $errors, $isSubmitting]) => ({
      currentStep: $currentStep,
      stepNames: $stepNames,
      data: $data,
      errors: $errors,
      isSubmitting: $isSubmitting
    })
  );

  return {
    subscribe: store.subscribe,
    manager
  };
}

/**
 * Creates a store for a specific process step
 * 
 * @param store - The ProcessStepStore to use
 * @param stepIndex - The index of the step
 * @param validator - Optional validation function for the step
 * @returns An object with step-specific stores and methods
 */
export function createStepStore(
  store: ProcessStepStore,
  stepIndex: number,
  validator?: (data: ProcessStepData) => FormErrors | null
) {
  // Register validator if provided
  if (validator) {
    store.manager.registerValidator(stepIndex, validator);
  }
  
  // Create derived stores from the main store
  const derivedStore = derived(store, $store => ({
    isActive: $store.currentStep === stepIndex,
    data: $store.data,
    errors: $store.errors
  }));
  
  return {
    subscribe: derivedStore.subscribe,
    nextStep: () => store.manager.nextStep(),
    previousStep: () => store.manager.previousStep(),
    updateData: (newData: Partial<ProcessStepData>) => store.manager.updateData(newData),
    validate: () => store.manager.validateCurrentStep()
  };
}