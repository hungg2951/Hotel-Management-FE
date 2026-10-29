import { api } from './api';
import type { PageResponse } from '../types/billing';
import type {
  StayItem,
  StayStatus,
  FrontdeskSummary,
  CheckInRequest,
  CheckOutRequest,
  RoomChangeRequest,
  WalkInCheckInRequest,
  ExpectedArrivalItem,
} from '../types/frontdesk';

export const frontdeskService = {
  checkIn: async (data: CheckInRequest): Promise<StayItem> => {
    return api.post<StayItem>('/frontdesk/check-in', data);
  },

  previewEarlyCheckout: async (stayId: number) => {
    return api.get<import('../types/policy').EarlyCheckoutPreview>(`/frontdesk/stays/${stayId}/early-checkout-preview`);
  },

  checkOut: async (data: CheckOutRequest): Promise<StayItem> => {
    return api.post<StayItem>('/frontdesk/check-out', data);
  },

  changeRoom: async (data: RoomChangeRequest): Promise<StayItem> => {
    return api.post<StayItem>('/frontdesk/change-room', data);
  },

  walkIn: async (data: WalkInCheckInRequest): Promise<StayItem> => {
    return api.post<StayItem>('/frontdesk/walk-in', data);
  },

  getStays: async (params?: {
    status?: StayStatus;
    keyword?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<StayItem>> => {
    return api.get<PageResponse<StayItem>>('/frontdesk/stays', params);
  },

  getStayDetail: async (id: number): Promise<StayItem> => {
    return api.get<StayItem>(`/frontdesk/stays/${id}`);
  },

  getExpectedArrivals: async (date?: string): Promise<ExpectedArrivalItem[]> => {
    return api.get<ExpectedArrivalItem[]>('/frontdesk/expected-arrivals', { date });
  },

  getExpectedDepartures: async (date?: string): Promise<StayItem[]> => {
    return api.get<StayItem[]>('/frontdesk/expected-departures', { date });
  },

  getSummary: async (): Promise<FrontdeskSummary> => {
    return api.get<FrontdeskSummary>('/frontdesk/summary');
  },
};
