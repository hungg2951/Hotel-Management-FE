export type ServiceCategory = 'FOOD' | 'LAUNDRY' | 'MINIBAR' | 'SPA' | 'TRANSPORT' | 'OTHER';

export interface HotelService {
  serviceId: number;
  name: string;
  category: ServiceCategory;
  unit: string;
  unitPrice: number;
  isActive: boolean;
}

export interface HotelServiceRequest {
  name: string;
  category: ServiceCategory;
  unit: string;
  unitPrice: number;
  isActive?: boolean;
}

export type FolioItemType = 'ROOM' | 'SERVICE' | 'PENALTY' | 'DISCOUNT' | 'TAX';

export interface FolioItem {
  itemId: number;
  folioId: number;
  itemType: FolioItemType;
  serviceId?: number;
  serviceName?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  postedAt: string;
  postedBy?: number;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'EWALLET';
export type PaymentStatus = 'SUCCESS' | 'REFUNDED' | 'FAILED';

export interface Payment {
  paymentId: number;
  folioId?: number;
  reservationId?: number;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  referenceCode?: string;
  paidAt: string;
  receivedBy?: number;
}

export interface Invoice {
  invoiceId: number;
  folioId: number;
  invoiceNo: string;
  buyerName?: string;
  buyerTaxCode?: string;
  buyerAddress?: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  issuedAt: string;
  issuedBy?: number;
}

export type FolioStatus = 'OPEN' | 'CLOSED';

export interface FolioSummary {
  folioId: number;
  stayId: number;
  status: FolioStatus;
  totalAmount: number;
  paidAmount: number;
  balance: number;
}

export interface FolioDetail {
  folioId: number;
  stayId: number;
  status: FolioStatus;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  createdAt: string;
  closedAt?: string;
  items: FolioItem[];
  payments: Payment[];
  invoice?: Invoice | null;
}

export interface FolioItemRequest {
  itemType: FolioItemType;
  serviceId?: number;
  description?: string;
  quantity: number;
  unitPrice?: number;
}

export interface PaymentRequest {
  method: PaymentMethod;
  amount: number;
  status?: PaymentStatus;
  referenceCode?: string;
  reservationId?: number;
}

export interface InvoiceRequest {
  buyerName?: string;
  buyerTaxCode?: string;
  buyerAddress?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
