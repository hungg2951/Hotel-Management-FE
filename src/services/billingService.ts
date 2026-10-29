import { api } from './api';
import type {
  HotelService,
  HotelServiceRequest,
  FolioDetail,
  FolioSummary,
  FolioStatus,
  FolioItem,
  FolioItemRequest,
  Payment,
  PaymentRequest,
  Invoice,
  InvoiceRequest,
  PageResponse,
  ServiceCategory,
} from '../types/billing';

export const billingService = {
  // Quản lý Dịch vụ khách sạn (HotelService)
  getHotelServices: async (params?: {
    category?: ServiceCategory;
    search?: string;
    activeOnly?: boolean;
    page?: number;
    size?: number;
  }): Promise<PageResponse<HotelService>> => {
    return api.get<PageResponse<HotelService>>('/hotel-services', params);
  },

  getHotelServiceById: async (id: number): Promise<HotelService> => {
    return api.get<HotelService>(`/hotel-services/${id}`);
  },

  createHotelService: async (data: HotelServiceRequest): Promise<HotelService> => {
    return api.post<HotelService>('/hotel-services', data);
  },

  updateHotelService: async (id: number, data: HotelServiceRequest): Promise<HotelService> => {
    return api.put<HotelService>(`/hotel-services/${id}`, data);
  },

  deleteHotelService: async (id: number): Promise<void> => {
    return api.delete<void>(`/hotel-services/${id}`);
  },

  // Quản lý Folio (Thu ngân & Chi tiết tài khoản phòng)
  getFolios: async (params?: {
    status?: FolioStatus;
    page?: number;
    size?: number;
  }): Promise<PageResponse<FolioSummary>> => {
    return api.get<PageResponse<FolioSummary>>('/folios', params);
  },

  openFolio: async (stayId: number): Promise<number> => {
    return api.post<number>(`/folios?stayId=${stayId}`);
  },

  getFolioById: async (id: number): Promise<FolioDetail> => {
    return api.get<FolioDetail>(`/folios/${id}`);
  },

  getFolioByStayId: async (stayId: number): Promise<FolioDetail> => {
    return api.get<FolioDetail>(`/folios/by-stay/${stayId}`);
  },

  addFolioItem: async (folioId: number, data: FolioItemRequest): Promise<FolioItem> => {
    return api.post<FolioItem>(`/folios/${folioId}/items`, data);
  },

  removeFolioItem: async (folioId: number, itemId: number): Promise<void> => {
    return api.delete<void>(`/folios/${folioId}/items/${itemId}`);
  },

  recordPayment: async (folioId: number, data: PaymentRequest): Promise<Payment> => {
    return api.post<Payment>(`/folios/${folioId}/payments`, data);
  },

  createInvoice: async (folioId: number, data: InvoiceRequest): Promise<Invoice> => {
    return api.post<Invoice>(`/folios/${folioId}/invoice`, data);
  },

  getInvoiceById: async (id: number): Promise<Invoice> => {
    return api.get<Invoice>(`/invoices/${id}`);
  },

  getInvoiceByFolioId: async (folioId: number): Promise<Invoice> => {
    return api.get<Invoice>(`/invoices/by-folio/${folioId}`);
  },
};
