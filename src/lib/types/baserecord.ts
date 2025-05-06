export type ID = string

export interface BaseRecord {
    id: ID
    created: string    // ISO 8601 timestamp
    updated: string    // ISO 8601 timestamp
  }