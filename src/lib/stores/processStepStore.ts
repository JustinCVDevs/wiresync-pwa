import { writable, derived, type Writable, type Readable } from 'svelte/store';
import { ProcessStepManager, type ProcessStepData, type FormErrors } from '$lib/services/processStepManager';

/**
 * Interface for the process step store
 */
export interface ProcessStepStore {
  currentStep: Readable<number>;
  stepNames: Readable<string[]>;
  data: Writable<ProcessStepData>;
  errors: Readable<FormErrors>;
  isSubmitting: Readable<boolean>;
  manager: ProcessStepManager;
}

/**
 * Creates a process step store for a specific process
 * 
 * @param processName - The name of the process (must match a key in processConfig)
 * @param baseUrl - The base URL for the process (e.g., '/pmc/processes/gravelotte')
 * @param initialData - Optional initial data for the process
 * @returns A ProcessStepStore object
 */
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
  
  return {
    currentStep,
    stepNames,
    data: manager.data,
    errors,
    isSubmitting,
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
  
  // Create a derived store that is true when this is the current step
  const isActive = derived(store.currentStep, $currentStep => $currentStep === stepIndex);
  
  return {
    isActive,
    data: store.data,
    errors: store.errors,
    nextStep: () => store.manager.nextStep(),
    previousStep: () => store.manager.previousStep(),
    updateData: (newData: Partial<ProcessStepData>) => store.manager.updateData(newData),
    validate: () => store.manager.validateCurrentStep()
  };
}