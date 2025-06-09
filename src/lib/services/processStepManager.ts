import { goto } from '$app/navigation';
import { writable, type Writable } from 'svelte/store';
import { processConfig, type Step } from '$lib/process-config';
import { formPersistenceService } from './formPersistenceService';

/**
 * Interface for form validation errors
 */
export interface FormErrors {
  [key: string]: string;
}

/**
 * Interface for step validation function
 */
export type StepValidator = (data: any) => FormErrors | null;

/**
 * Interface for process step data
 */
export interface ProcessStepData {
  [key: string]: any;
}

/**
 * ProcessStepManager class
 * 
 * Manages process steps, navigation, validation, and data persistence
 * for multi-step processes in the application.
 */
export class ProcessStepManager {
  private processName: string;
  private steps: Step[];
  private currentStepIndex: Writable<number>;
  private formData: Writable<ProcessStepData>;
  private formErrors: Writable<FormErrors>;
  private validators: Map<number, StepValidator>;
  private baseUrl: string;
  private isSubmitting: Writable<boolean>;
  
  /**
   * Creates a new ProcessStepManager instance
   * 
   * @param processName - The name of the process (must match a key in processConfig)
   * @param baseUrl - The base URL for the process (e.g., '/pmc/processes/gravelotte')
   * @param initialData - Optional initial data for the process
   */
  constructor(processName: string, baseUrl: string, initialData: ProcessStepData = {}) {
    if (!processConfig[processName]) {
      throw new Error(`Process '${processName}' not found in processConfig`);
    }
    
    this.processName = processName;
    this.steps = processConfig[processName];
    this.baseUrl = baseUrl;
    this.validators = new Map();
    
    // Load saved form data or use initial data
    const savedData = formPersistenceService.loadForm<ProcessStepData>(processName) || initialData;
    
    this.currentStepIndex = writable(0);
    this.formData = writable(savedData);
    this.formErrors = writable({});
    this.isSubmitting = writable(false);
    
    // Save form data when it changes
    this.formData.subscribe(data => {
      formPersistenceService.saveForm(processName, data);
    });
  }
  
  /**
   * Gets the current step index
   */
  get currentStep(): Writable<number> {
    return this.currentStepIndex;
  }
  
  /**
   * Gets the form data store
   */
  get data(): Writable<ProcessStepData> {
    return this.formData;
  }
  
  /**
   * Gets the form errors store
   */
  get errors(): Writable<FormErrors> {
    return this.formErrors;
  }
  
  /**
   * Gets the isSubmitting store
   */
  get submitting(): Writable<boolean> {
    return this.isSubmitting;
  }
  
  /**
   * Gets the step names for the process
   */
  get stepNames(): string[] {
    return this.steps.map(step => step.name);
  }
  
  /**
   * Registers a validator function for a specific step
   * 
   * @param stepIndex - The index of the step to validate
   * @param validator - The validation function
   */
  registerValidator(stepIndex: number, validator: StepValidator): void {
    this.validators.set(stepIndex, validator);
  }
  
  /**
   * Validates the current step
   * 
   * @returns true if valid, false otherwise
   */
  validateCurrentStep(): boolean {
    let currentIndex: number = 0;
    this.currentStepIndex.subscribe(value => { currentIndex = value; })();
    
    const validator = this.validators.get(currentIndex);
    if (!validator) return true; // No validator means valid
    
    let currentData: ProcessStepData = {};
    this.formData.subscribe(value => { currentData = value; })();
    
    const errors = validator(currentData);
    this.formErrors.set(errors || {});
    
    return errors === null || Object.keys(errors).length === 0;
  }
  
  /**
   * Updates the form data
   * 
   * @param newData - The new data to merge with existing data
   */
  updateData(newData: Partial<ProcessStepData>): void {
    this.formData.update(data => ({ ...data, ...newData }));
  }
  
  /**
   * Navigates to the next step if validation passes
   * 
   * @returns true if navigation was successful
   */
  async nextStep(): Promise<boolean> {
    if (!this.validateCurrentStep()) return false;
    
    let currentIndex: number = 0;
    this.currentStepIndex.subscribe(value => { currentIndex = value; })();
    
    if (currentIndex < this.steps.length - 1) {
      const nextIndex = currentIndex + 1;
      this.currentStepIndex.set(nextIndex);
      
      // Navigate to the next step URL
      const nextPath = this.steps[nextIndex].path;
      await goto(`${this.baseUrl}/${nextPath}`);
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Navigates to the previous step
   * 
   * @returns true if navigation was successful
   */
  async previousStep(): Promise<boolean> {
    let currentIndex: number = 0;
    this.currentStepIndex.subscribe(value => { currentIndex = value; })();
    
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      this.currentStepIndex.set(prevIndex);
      
      // Navigate to the previous step URL
      const prevPath = this.steps[prevIndex].path;
      await goto(`${this.baseUrl}/${prevPath}`);
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Navigates to a specific step
   * 
   * @param index - The index of the step to navigate to
   * @returns true if navigation was successful
   */
  async goToStep(index: number): Promise<boolean> {
    if (index < 0 || index >= this.steps.length) return false;
    
    this.currentStepIndex.set(index);
    
    // Navigate to the step URL
    const path = this.steps[index].path;
    await goto(`${this.baseUrl}/${path}`);
    
    return true;
  }
  
  /**
   * Completes the process and clears saved data
   */
  completeProcess(): void {
    formPersistenceService.clearForm(this.processName);
  }
  
  /**
   * Cancels the process and optionally clears saved data
   * 
   * @param clearData - Whether to clear saved data
   */
  cancelProcess(clearData: boolean = false): void {
    if (clearData) {
      formPersistenceService.clearForm(this.processName);
    }
  }
  
  /**
   * Sets the submitting state
   * 
   * @param isSubmitting - Whether the form is submitting
   */
  setSubmitting(isSubmitting: boolean): void {
    this.isSubmitting.set(isSubmitting);
  }
}