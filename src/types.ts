export type OperationType = 'remove' | 'replace';

export interface HintOperation {
  type: OperationType;
  target: string;
  replacement?: string;
}

export interface Hint {
  name: string;
  reading: string;
  operation: HintOperation;
  description: string;
}

export interface CipherResult {
  success: boolean;
  result?: string;
  error?: string;
}