import { api } from './api';
import type {
  ReservationCreateRequest,
  ReservationDepositRequest,
  ReservationCancelRequest,
  ReservationResponse,
  ReservationDetailResponse,
  RoomTypeAvailabilityResponse,
  ReservationStatus,
  PageResponse,
} from '../types/booking';

export const bookingService = {
  // Tra cứu phòng trống
  searchAvailability: async (params: {
    checkIn: string;
    checkOut: string;
    adults?: number;
    children?: number;
  }): Promise<RoomTypeAvailabilityResponse[]> => {
    return api.get<RoomTypeAvailabilityResponse[]>('/availability', params);
  },

  // Quản lý Đặt phòng
  createReservation: async (data: ReservationCreateRequest): Promise<ReservationDetailResponse> => {
    return api.post<ReservationDetailResponse>('/reservations', data);
  },

  getReservations: async (params?: {
    status?: ReservationStatus;
    guestId?: number;
    checkInDate?: string;
    checkOutDate?: string;
    code?: string;
    keyword?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<ReservationResponse>> => {
    return api.get<PageResponse<ReservationResponse>>('/reservations', params);
  },

  getReservationById: async (id: number): Promise<ReservationDetailResponse> => {
    return api.get<ReservationDetailResponse>(`/reservations/${id}`);
  },

  recordDeposit: async (id: number, data: ReservationDepositRequest): Promise<ReservationDetailResponse> => {
    return api.post<ReservationDetailResponse>(`/reservations/${id}/deposits`, data);
  },

  confirmReservation: async (id: number): Promise<ReservationDetailResponse> => {
    return api.post<ReservationDetailResponse>(`/reservations/${id}/confirm`);
  },

  previewCancellation: async (id: number) => {
    return api.get<import('../types/policy').CancellationPreview>(`/reservations/${id}/cancellation-preview`);
  },

  cancelReservation: async (id: number, data?: ReservationCancelRequest): Promise<ReservationDetailResponse> => {
    return api.post<ReservationDetailResponse>(`/reservations/${id}/cancel`, data);
  },

  markNoShow: async (id: number): Promise<ReservationDetailResponse> => {
    return api.post<ReservationDetailResponse>(`/reservations/${id}/no-show`);
  },
};
