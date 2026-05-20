export interface ProcessDueResult {
  recurringProcessed: number;
  scheduledProcessed: number;
  transactionsCreated: number;
  skippedDuplicates: number;
  errors: number;
}

export interface ProcessDueOptions {
  now?: Date;
}
