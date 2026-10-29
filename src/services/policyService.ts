import { api } from './api';
import type {
  CancellationPolicy,
  EarlyCheckoutPolicy,
  CancellationPreview,
  EarlyCheckoutPreview,
} from '../types/policy';

export const policyService = {
  getCancellationPolicies: () => {
    return api.get<CancellationPolicy[]>('/policies/cancellation');
  },

  createCancellationPolicy: (data: Partial<CancellationPolicy>) => {
    return api.post<CancellationPolicy>('/policies/cancellation', data);
  },

  updateCancellationPolicy: (id: number, data: Partial<CancellationPolicy>) => {
    return api.put<CancellationPolicy>(`/policies/cancellation/${id}`, data);
  },

  activateCancellationPolicy: (id: number) => {
    return api.put<CancellationPolicy>(`/policies/cancellation/${id}/activate`);
  },

  setDefaultCancellationPolicy: (id: number) => {
    return api.put<CancellationPolicy>(`/policies/cancellation/${id}/activate`);
  },

  deleteCancellationPolicy: (id: number) => {
    return api.delete<void>(`/policies/cancellation/${id}`);
  },

  getEarlyCheckoutPolicies: () => {
    return api.get<EarlyCheckoutPolicy[]>('/policies/early-checkout');
  },

  createEarlyCheckoutPolicy: (data: Partial<EarlyCheckoutPolicy>) => {
    return api.post<EarlyCheckoutPolicy>('/policies/early-checkout', data);
  },

  updateEarlyCheckoutPolicy: (id: number, data: Partial<EarlyCheckoutPolicy>) => {
    return api.put<EarlyCheckoutPolicy>(`/policies/early-checkout/${id}`, data);
  },

  activateEarlyCheckoutPolicy: (id: number) => {
    return api.put<EarlyCheckoutPolicy>(`/policies/early-checkout/${id}/activate`);
  },

  setDefaultEarlyCheckoutPolicy: (id: number) => {
    return api.put<EarlyCheckoutPolicy>(`/policies/early-checkout/${id}/activate`);
  },

  deleteEarlyCheckoutPolicy: (id: number) => {
    return api.delete<void>(`/policies/early-checkout/${id}`);
  },

  previewCancellation: (reservationId: number) => {
    return api.get<CancellationPreview>(`/reservations/${reservationId}/cancellation-preview`);
  },

  previewEarlyCheckout: (stayId: number) => {
    return api.get<EarlyCheckoutPreview>(`/frontdesk/stays/${stayId}/early-checkout-preview`);
  },
};
