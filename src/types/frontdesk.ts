import type { PaymentMethod } from './booking';

export type StayStatus = 'IN_HOUSE' | 'CHECKED_OUT' | 'CANCELLED';

export interface StayItem {
  stayId: number;
  reservationRoomId: number;
  reservationId: number;
  reservationCode: string;
  guestId: number;
  guestName: string;
  guestPhone: string;
  roomId: number;
  roomNumber: string;
  floorNo: number;
  roomTypeId: number;
  roomTypeName: string;
  actualCheckIn: string;
  actualCheckOut: string | null;
  expectedCheckIn: string;
  expectedCheckOut: string;
  status: StayStatus;
  folioId: number | null;
  folioTotalAmount: number;
  folioPaidAmount: number;
  folioBalance: number;
  isFolioSettled: boolean;
  checkedInBy: number | null;
  checkedOutBy: number | null;
}

export interface FrontdeskSummary {
  inHouseCount: number;
  expectedArrivalsToday: number;
  expectedDeparturesToday: number;
  cleanAvailableRooms: number;
}

export interface CheckInRequest {
  reservationRoomId: number;
  specificRoomId?: number;
  note?: string;
}

export interface CheckOutRequest {
  stayId: number;
  isEarlyCheckOut?: boolean;
  autoSettle?: boolean;
  settleMethod?: PaymentMethod;
  settleRef?: string;
  note?: string;
  customPenalty?: number;
  overrideReason?: string;
}

export interface RoomChangeRequest {
  stayId: number;
  newRoomId: number;
  reason?: string;
}

export interface WalkInCheckInRequest {
  guestId: number;
  roomTypeId: number;
  roomId?: number;
  checkOutDate: string;
  adults?: number;
  children?: number;
  depositAmount?: number;
  depositMethod?: PaymentMethod;
  depositRef?: string;
  note?: string;
}

export interface ExpectedArrivalItem {
  reservationId: number;
  reservationCode: string;
  guestId: number;
  bookingSource: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  totalAmount: number;
  depositAmount: number;
}
