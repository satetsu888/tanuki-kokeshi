export type OperationType = 'remove' | 'replace';

export type HintGroup = 'A' | 'B' | 'C' | 'D';

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
  group: HintGroup;
}

export interface CipherResult {
  success: boolean;
  result?: string;
  error?: string;
}