export type VoucherBatchStatus = "PROCESSING" | "COMPLETED" | "FAILED";

export interface VoucherUploadColumnSpec {
  name: string;
  required: boolean;
  dataType: string;
  description: string;
  example: string;
}

export interface VoucherUploadSpecResponse {
  format: string;
  encoding: string;
  maxFileSizeMb: number;
  maxRows: number;
  standardHeaders: string[];
  columns: VoucherUploadColumnSpec[];
  exampleCsv: string;
  exampleFilename: string;
  notes: string[];
}

export interface VoucherBatchUploadResponse {
  batchUid?: string;
  status?: string;
  totalRowsUploaded?: number;
  importedCount?: number;
  duplicateCount?: number;
  errorCount?: number;
  expiredCount?: number;
  errorReport?: Array<{ row: number; code: string; reason: string }>;
  uploadedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface VoucherBatchListItem {
  batchUid: string;
  status: string;
  catalogRewardUid: string;
  importedCount: number;
  uploadedAt: string;
}

export interface VoucherBatchDetail extends VoucherBatchUploadResponse {
  uploadedBy?: string;
}

export interface VoucherStockResponse {
  catalogRewardUid: string;
  available: number;
  lowStockThreshold: number;
  lowStock: boolean;
}

export interface DenominationMappingItem {
  pointsRequired: number;
  faceValue: number;
  currency: string;
  description?: string;
  partnerSku?: string;
}

export interface DenominationMappingDto extends DenominationMappingItem {
  mappingUid: string;
  priority: number;
  available?: number;
}

export interface DenominationMappingsResponse {
  catalogRewardUid: string;
  mixedDenominationEnabled: boolean;
  mappings: DenominationMappingDto[];
}

export interface VoucherStockBreakdownResponse {
  catalogRewardUid: string;
  totalAvailable: number;
  stockByFaceValue: Record<string, number>;
}
