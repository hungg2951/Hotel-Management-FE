import type { CancellationPolicySnapshot, EarlyCheckoutPolicySnapshot } from './policy';

export type BookingSource = 'WALK_IN' | 'PHONE' | 'WEBSITE' | 'OTA' | 'OTHER';

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW';

export type ReservationRoomStatus = 'BOOKED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'EWALLET';

export type PaymentStatus = 'SUCCESS' | 'REFUNDED' | 'FAILED';

export interface ReservationRoomItemRequest {
  roomTypeId: number;
  specificRoomId?: number;
}

export interface ReservationCreateRequest {
  guestId: number;
  bookingSource?: BookingSource;
  checkInDate: string;
  checkOutDate: string;
  adults?: number;
  children?: number;
  rooms: ReservationRoomItemRequest[];
  note?: string;
  cancellationPolicyId?: number;
  earlyCheckoutPolicyId?: number;
}

export interface ReservationDepositRequest {
  amount: number;
  method: PaymentMethod;
  referenceCode?: string;
}

export interface ReservationCancelRequest {
  reason?: string;
  customFee?: number;
  overrideReason?: string;
}

export interface ReservationRoomResponse {
  reservationRoomId: number;
  reservationId: number;
  roomTypeId: number;
  roomTypeName: string;
  roomId: number | null;
  roomNumber: string;
  pricePerNight: number;
  status: ReservationRoomStatus;
}

export interface ReservationResponse {
  reservationId: number;
  reservationCode: string;
  guestId: number;
  guestName: string;
  guestPhone: string;
  guestIdNumber?: string | null;
  bookingSource: BookingSource;
  status: ReservationStatus;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  roomCount: number;
  totalAmount: number;
  depositAmount: number;
  note: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface PaymentInfoDto {
  paymentId: number;
  folioId: number | null;
  reservationId: number | null;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  referenceCode: string | null;
  paidAt: string;
  receivedBy: number | null;
}

export interface GuestBriefInfo {
  guestId: number;
  fullName: string;
  phone: string;
  email: string;
  gender: string;
  dateOfBirth?: string;
  nationality?: string;
  idType?: string;
  idNumber?: string;
  address?: string;
  loyaltyTier?: string;
  loyaltyPoints?: number;
}

export interface ReservationDetailResponse {
  reservationId: number;
  reservationCode: string;
  guest: GuestBriefInfo;
  bookingSource: BookingSource;
  status: ReservationStatus;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  totalAmount: number;
  depositAmount: number;
  requiredDepositAmount: number;
  isDepositMet: boolean;
  note: string | null;
  createdBy: number | null;
  createdAt: string;
  rooms: ReservationRoomResponse[];
  payments: PaymentInfoDto[];
  cancellationPolicy?: CancellationPolicySnapshot;
  earlyCheckoutPolicy?: EarlyCheckoutPolicySnapshot;
  cancellationFee?: number;
  refundAmount?: number;
  overrideReason?: string;
}

export interface RoomTypeAvailabilityResponse {
  roomTypeId: number;
  name: string;
  description: string;
  maxAdults: number;
  maxChildren: number;
  bedType: string;
  areaSqm: number;
  basePrice: number;
  nights: number;
  totalPrice: number;
  totalRooms: number;
  availableRoomsCount: number;
  isAvailable: boolean;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
