export type CancellationPenaltyType =
  | 'NONE'
  | 'ONE_NIGHT'
  | 'PERCENT_TOTAL'
  | 'PERCENT_DEPOSIT'
  | 'FIXED_AMOUNT'
  | 'FULL_DEPOSIT';

export type EarlyCheckoutPenaltyType =
  | 'NONE'
  | 'ONE_NIGHT'
  | 'PERCENT_REMAINING'
  | 'FULL_REMAINING';

export interface CancellationPolicy {
  policyId: number;
  policyCode: string;
  name: string;
  description?: string;
  freeCancelHours: number;
  penaltyType: CancellationPenaltyType;
  penaltyValue: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface EarlyCheckoutPolicy {
  policyId: number;
  policyCode: string;
  name: string;
  description?: string;
  penaltyType: EarlyCheckoutPenaltyType;
  penaltyValue: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CancellationPolicySnapshot {
  policyId: number;
  policyCode: string;
  name: string;
  freeCancelHours: number;
  penaltyType: CancellationPenaltyType;
  penaltyValue: number;
}

export interface EarlyCheckoutPolicySnapshot {
  policyId: number;
  policyCode: string;
  name: string;
  penaltyType: EarlyCheckoutPenaltyType;
  penaltyValue: number;
}

export interface CancellationPreview {
  reservationId: number;
  reservationCode: string;
  totalAmount: number;
  totalDeposit: number;
  cancellationFee: number;
  refundAmount: number;
  shortfallAmount: number;
  isFreeCancel: boolean;
  policyCode: string;
  policyName: string;
  explanation: string;
}

export interface EarlyCheckoutPreview {
  stayId: number;
  originalNights: number;
  actualNights: number;
  unusedNights: number;
  pricePerNight: number;
  unusedRoomAmount: number;
  earlyCheckoutPenalty: number;
  netAdjustment: number;
  policyCode: string;
  policyName: string;
  explanation: string;
  currentFolioBalance: number;
  estimatedFinalBalance: number;
}

