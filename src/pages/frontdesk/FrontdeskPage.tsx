import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { ActionDropdown } from '../../components/common/ActionDropdown';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { api } from '../../services/api';
import { frontdeskService } from '../../services/frontdeskService';
import { bookingService } from '../../services/bookingService';
import { policyService } from '../../services/policyService';
import type { EarlyCheckoutPreview } from '../../types/policy';
import type {
  StayItem,
  StayStatus,
  FrontdeskSummary,
  ExpectedArrivalItem,
} from '../../types/frontdesk';
import type { PaymentMethod, ReservationDetailResponse } from '../../types/booking';
import {
  DoorOpen,
  LogIn,
  LogOut,
  Building,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Search,
  RefreshCw,
  Plus,
  Receipt,
  Calendar,
  User,
  Phone,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';

interface RoomTypeItem {
  roomTypeId: number;
  name: string;
  basePrice: number;
  maxAdults: number;
  maxChildren: number;
}

interface RoomItem {
  roomId: number;
  roomNumber: string;
  floorNo: number;
  roomTypeId: number;
  roomTypeName?: string;
  status: string;
  housekeepingStatus: string;
}

interface GuestItem {
  guestId: number;
  fullName: string;
  phone: string;
  email?: string;
  idNumber?: string;
}

export const FrontdeskPage: React.FC = () => {
  const { showToast } = useToast();
  const { hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const canManage = hasAnyRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']);

  // Active Tab: 'IN_HOUSE' | 'ARRIVALS' | 'DEPARTURES' | 'HISTORY'
  const [activeTab, setActiveTab] = useState<'IN_HOUSE' | 'ARRIVALS' | 'DEPARTURES' | 'HISTORY'>('IN_HOUSE');

  // Summary Metrics
  const [summary, setSummary] = useState<FrontdeskSummary>({
    inHouseCount: 0,
    expectedArrivalsToday: 0,
    expectedDeparturesToday: 0,
    cleanAvailableRooms: 0,
  });
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  // In-House List State
  const [inHouseStays, setInHouseStays] = useState<StayItem[]>([]);
  const [loadingInHouse, setLoadingInHouse] = useState<boolean>(false);
  const [inHouseSearch, setInHouseSearch] = useState<string>('');

  // Expected Arrivals List State
  const [arrivals, setArrivals] = useState<ExpectedArrivalItem[]>([]);
  const [loadingArrivals, setLoadingArrivals] = useState<boolean>(false);

  // Expected Departures List State
  const [departures, setDepartures] = useState<StayItem[]>([]);
  const [loadingDepartures, setLoadingDepartures] = useState<boolean>(false);

  // Stay History State
  const [historyStays, setHistoryStays] = useState<StayItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyStatus, setHistoryStatus] = useState<StayStatus | 'ALL'>('ALL');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyPage, setHistoryPage] = useState<number>(0);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);
  const [historyTotalElements, setHistoryTotalElements] = useState<number>(0);

  // Master Data: Room types and Clean Rooms
  const [roomTypes, setRoomTypes] = useState<RoomTypeItem[]>([]);
  const [cleanRooms, setCleanRooms] = useState<RoomItem[]>([]);

  // ================= MODAL STATES =================
  // 1. Check-Out Modal
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState<boolean>(false);
  const [selectedStayForCheckOut, setSelectedStayForCheckOut] = useState<StayItem | null>(null);
  const [checkOutAutoSettle, setCheckOutAutoSettle] = useState<boolean>(true);
  const [checkOutSettleMethod, setCheckOutSettleMethod] = useState<PaymentMethod>('CASH');
  const [checkOutSettleRef, setCheckOutSettleRef] = useState<string>('');
  const [checkOutNote, setCheckOutNote] = useState<string>('');
  const [submittingCheckOut, setSubmittingCheckOut] = useState<boolean>(false);
  const [earlyPreview, setEarlyPreview] = useState<EarlyCheckoutPreview | null>(null);
  const [loadingEarlyPreview, setLoadingEarlyPreview] = useState<boolean>(false);
  const [isOverridePenalty, setIsOverridePenalty] = useState<boolean>(false);
  const [overridePenalty, setOverridePenalty] = useState<number>(0);
  const [overridePenaltyReason, setOverridePenaltyReason] = useState<string>('');

  // 2. Change Room Modal
  const [isChangeRoomModalOpen, setIsChangeRoomModalOpen] = useState<boolean>(false);
  const [selectedStayForChangeRoom, setSelectedStayForChangeRoom] = useState<StayItem | null>(null);
  const [newRoomId, setNewRoomId] = useState<number | ''>('');
  const [changeRoomReason, setChangeRoomReason] = useState<string>('');
  const [submittingChangeRoom, setSubmittingChangeRoom] = useState<boolean>(false);

  // 3. Check-In Modal (From Reservation)
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState<boolean>(false);
  const [checkInReservation, setCheckInReservation] = useState<ReservationDetailResponse | null>(null);
  const [checkInReservationRoomId, setCheckInReservationRoomId] = useState<number | ''>('');
  const [checkInSpecificRoomId, setCheckInSpecificRoomId] = useState<number | ''>('');
  const [checkInNote, setCheckInNote] = useState<string>('');
  const [submittingCheckIn, setSubmittingCheckIn] = useState<boolean>(false);
  const [loadingCheckInRes, setLoadingCheckInRes] = useState<boolean>(false);

  // 4. Walk-In Check-In Modal
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState<boolean>(false);
  const [walkInGuestMode, setWalkInGuestMode] = useState<'NEW' | 'EXISTING'>('NEW');
  const [walkInGuestName, setWalkInGuestName] = useState<string>('');
  const [walkInGuestPhone, setWalkInGuestPhone] = useState<string>('');
  const [walkInGuestIdNumber, setWalkInGuestIdNumber] = useState<string>('');
  const [walkInGuestEmail, setWalkInGuestEmail] = useState<string>('');
  const [walkInGuestSearch, setWalkInGuestSearch] = useState<string>('');
  const debouncedWalkInGuestSearch = useDebounce<string>(walkInGuestSearch, 400);
  const [walkInSearchedGuests, setWalkInSearchedGuests] = useState<GuestItem[]>([]);
  const [walkInSearchingGuests, setWalkInSearchingGuests] = useState<boolean>(false);
  const [walkInSelectedGuest, setWalkInSelectedGuest] = useState<GuestItem | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [walkInRoomTypeId, setWalkInRoomTypeId] = useState<number | ''>('');
  const [walkInRoomId, setWalkInRoomId] = useState<number | ''>('');
  const [walkInCheckOutDate, setWalkInCheckOutDate] = useState<string>(tomorrowStr);
  const [walkInAdults, setWalkInAdults] = useState<number>(2);
  const [walkInChildren, setWalkInChildren] = useState<number>(0);
  const [walkInDeposit, setWalkInDeposit] = useState<number>(0);
  const [walkInDepositMethod, setWalkInDepositMethod] = useState<PaymentMethod>('CASH');
  const [walkInDepositRef, setWalkInDepositRef] = useState<string>('');
  const [walkInNote, setWalkInNote] = useState<string>('');
  const [submittingWalkIn, setSubmittingWalkIn] = useState<boolean>(false);

  // ----------------- LOAD SUMMARY -----------------
  const fetchSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const res = await frontdeskService.getSummary();
      setSummary(res);
    } catch {
      // Ignore background error
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // ----------------- LOAD MASTER DATA -----------------
  const fetchMasterData = useCallback(async () => {
    try {
      const [rtRes, roomsRes] = await Promise.all([
        api.get<RoomTypeItem[]>('/room-types?all=true'),
        api.get<{ content: RoomItem[] }>('/rooms', {
          status: 'AVAILABLE',
          housekeepingStatus: 'CLEAN',
          size: 100,
        }),
      ]);
      setRoomTypes(rtRes || []);
      setCleanRooms(roomsRes.content || []);
    } catch {
      // Ignore
    }
  }, []);

  // ----------------- LOAD IN-HOUSE STAYS -----------------
  const fetchInHouseStays = useCallback(async () => {
    try {
      setLoadingInHouse(true);
      const res = await frontdeskService.getStays({
        status: 'IN_HOUSE',
        keyword: inHouseSearch.trim() || undefined,
        size: 50,
      });
      setInHouseStays(res.content || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách khách đang lưu trú';
      showToast(msg, 'error');
    } finally {
      setLoadingInHouse(false);
    }
  }, [inHouseSearch, showToast]);

  // ----------------- LOAD EXPECTED ARRIVALS -----------------
  const fetchExpectedArrivals = useCallback(async () => {
    try {
      setLoadingArrivals(true);
      const res = await frontdeskService.getExpectedArrivals(todayStr);
      setArrivals(res || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách dự kiến nhận phòng';
      showToast(msg, 'error');
    } finally {
      setLoadingArrivals(false);
    }
  }, [todayStr, showToast]);

  // ----------------- LOAD EXPECTED DEPARTURES -----------------
  const fetchExpectedDepartures = useCallback(async () => {
    try {
      setLoadingDepartures(true);
      const res = await frontdeskService.getExpectedDepartures(todayStr);
      setDepartures(res || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách dự kiến trả phòng';
      showToast(msg, 'error');
    } finally {
      setLoadingDepartures(false);
    }
  }, [todayStr, showToast]);

  // ----------------- LOAD STAY HISTORY -----------------
  const fetchStayHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await frontdeskService.getStays({
        status: historyStatus === 'ALL' ? undefined : historyStatus,
        keyword: historySearch.trim() || undefined,
        page: historyPage,
        size: 15,
      });
      setHistoryStays(res.content || []);
      setHistoryTotalPages(res.totalPages || 1);
      setHistoryTotalElements(res.totalElements || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải lịch sử lưu trú';
      showToast(msg, 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, [historyStatus, historySearch, historyPage, showToast]);

  // Initial Load & Refresh
  const refreshAll = useCallback(() => {
    fetchSummary();
    fetchMasterData();
    if (activeTab === 'IN_HOUSE') fetchInHouseStays();
    else if (activeTab === 'ARRIVALS') fetchExpectedArrivals();
    else if (activeTab === 'DEPARTURES') fetchExpectedDepartures();
    else if (activeTab === 'HISTORY') fetchStayHistory();
  }, [activeTab, fetchSummary, fetchMasterData, fetchInHouseStays, fetchExpectedArrivals, fetchExpectedDepartures, fetchStayHistory]);

  useEffect(() => {
    fetchSummary();
    fetchMasterData();
  }, [fetchSummary, fetchMasterData]);

  useEffect(() => {
    if (activeTab === 'IN_HOUSE') fetchInHouseStays();
    else if (activeTab === 'ARRIVALS') fetchExpectedArrivals();
    else if (activeTab === 'DEPARTURES') fetchExpectedDepartures();
    else if (activeTab === 'HISTORY') fetchStayHistory();
  }, [activeTab, fetchInHouseStays, fetchExpectedArrivals, fetchExpectedDepartures, fetchStayHistory]);

  // Handle URL query param: `checkInRes=123`
  useEffect(() => {
    const resId = searchParams.get('checkInRes');
    if (resId) {
      handleOpenCheckInByReservationId(Number(resId));
    }
  }, [searchParams]);

  // Debounced search for Existing Guests in Walk-in
  useEffect(() => {
    const q = debouncedWalkInGuestSearch.trim();
    if (!q) {
      setWalkInSearchedGuests([]);
      setWalkInSearchingGuests(false);
      return;
    }
    let isMounted = true;
    setWalkInSearchingGuests(true);
    api
      .get<{ content: GuestItem[] }>('/guests', {
        keyword: q,
        size: 10,
      })
      .then((res) => {
        if (isMounted) setWalkInSearchedGuests(res.content || []);
      })
      .catch(() => {
        if (isMounted) setWalkInSearchedGuests([]);
      })
      .finally(() => {
        if (isMounted) setWalkInSearchingGuests(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedWalkInGuestSearch]);

  // ================= ACTION HANDLERS =================

  // 1. Open Check-Out Modal
  const handleOpenCheckOut = (stay: StayItem) => {
    setSelectedStayForCheckOut(stay);
    setCheckOutAutoSettle(true);
    setCheckOutSettleMethod('CASH');
    setCheckOutSettleRef('');
    setCheckOutNote('');
    setEarlyPreview(null);
    setIsOverridePenalty(false);
    setOverridePenalty(0);
    setOverridePenaltyReason('');
    setIsCheckOutModalOpen(true);

    const isEarly = todayStr < stay.expectedCheckOut;
    if (isEarly) {
      setLoadingEarlyPreview(true);
      policyService
        .previewEarlyCheckout(stay.stayId)
        .then((prev) => {
          setEarlyPreview(prev);
          setOverridePenalty(prev.earlyCheckoutPenalty);
        })
        .catch(() => {})
        .finally(() => setLoadingEarlyPreview(false));
    }
  };

  // Submit Check-Out
  const handleCheckOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStayForCheckOut) return;

    // Is early checkout check
    const isEarly = todayStr < selectedStayForCheckOut.expectedCheckOut;
    if (isEarly && isOverridePenalty && !overridePenaltyReason.trim()) {
      showToast('Vui lòng nhập lý do can thiệp ngoại lệ phí phạt trả phòng sớm (Bắt buộc đối với Quản lý)', 'warning');
      return;
    }

    try {
      setSubmittingCheckOut(true);
      await frontdeskService.checkOut({
        stayId: selectedStayForCheckOut.stayId,
        isEarlyCheckOut: isEarly,
        autoSettle: checkOutAutoSettle,
        settleMethod: checkOutAutoSettle ? checkOutSettleMethod : undefined,
        settleRef: checkOutSettleRef.trim() || undefined,
        note: checkOutNote.trim() || undefined,
        customPenalty: isOverridePenalty ? overridePenalty : undefined,
        overrideReason: isOverridePenalty ? overridePenaltyReason.trim() : undefined,
      });

      showToast(
        `Trả phòng ${selectedStayForCheckOut.roomNumber} thành công! Phòng đã chuyển sang trạng thái CẦN DỌN (DIRTY).`,
        'success'
      );
      setIsCheckOutModalOpen(false);
      setSelectedStayForCheckOut(null);
      refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Trả phòng thất bại';
      showToast(msg, 'error');
    } finally {
      setSubmittingCheckOut(false);
    }
  };

  // 2. Open Change Room Modal
  const handleOpenChangeRoom = (stay: StayItem) => {
    setSelectedStayForChangeRoom(stay);
    setNewRoomId('');
    setChangeRoomReason('');
    setIsChangeRoomModalOpen(true);
  };

  // Submit Change Room
  const handleChangeRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStayForChangeRoom || !newRoomId) {
      showToast('Vui lòng chọn phòng mới cần chuyển đến', 'warning');
      return;
    }

    try {
      setSubmittingChangeRoom(true);
      await frontdeskService.changeRoom({
        stayId: selectedStayForChangeRoom.stayId,
        newRoomId: Number(newRoomId),
        reason: changeRoomReason.trim() || 'Lễ tân đổi phòng theo yêu cầu',
      });

      showToast(`Đã chuyển khách sang phòng mới thành công!`, 'success');
      setIsChangeRoomModalOpen(false);
      setSelectedStayForChangeRoom(null);
      refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đổi phòng thất bại';
      showToast(msg, 'error');
    } finally {
      setSubmittingChangeRoom(false);
    }
  };

  // 3. Open Check-In Modal for a Reservation
  const handleOpenCheckInByReservationId = async (reservationId: number) => {
    try {
      setLoadingCheckInRes(true);
      const res = await bookingService.getReservationById(reservationId);
      setCheckInReservation(res);

      // Select first room by default
      if (res.rooms && res.rooms.length > 0) {
        setCheckInReservationRoomId(res.rooms[0].reservationRoomId);
        setCheckInSpecificRoomId(res.rooms[0].roomId || '');
      }
      setCheckInNote('');
      setIsCheckInModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải thông tin đơn đặt phòng';
      showToast(msg, 'error');
    } finally {
      setLoadingCheckInRes(false);
    }
  };

  // Submit Check-In
  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInReservationRoomId) {
      showToast('Vui lòng chọn phòng cần nhận', 'warning');
      return;
    }

    try {
      setSubmittingCheckIn(true);
      await frontdeskService.checkIn({
        reservationRoomId: Number(checkInReservationRoomId),
        specificRoomId: checkInSpecificRoomId ? Number(checkInSpecificRoomId) : undefined,
        note: checkInNote.trim() || undefined,
      });

      showToast(`Thủ tục nhận phòng (Check-in) thành công! Folio đã được kích hoạt.`, 'success');
      setIsCheckInModalOpen(false);
      setCheckInReservation(null);
      refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nhận phòng thất bại';
      showToast(msg, 'error');
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  // 4. Submit Walk-In Check-In
  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walkInRoomTypeId) {
      showToast('Vui lòng chọn hạng phòng', 'warning');
      return;
    }
    if (!walkInCheckOutDate || walkInCheckOutDate <= todayStr) {
      showToast('Ngày trả phòng phải sau ngày hôm nay', 'warning');
      return;
    }

    let guestId: number | null = null;

    try {
      setSubmittingWalkIn(true);

      if (walkInGuestMode === 'EXISTING') {
        if (!walkInSelectedGuest) {
          showToast('Vui lòng tìm và chọn một khách hàng có sẵn trong hệ thống', 'warning');
          setSubmittingWalkIn(false);
          return;
        }
        guestId = walkInSelectedGuest.guestId;
      } else {
        // Create new guest
        if (!walkInGuestName.trim() || !walkInGuestPhone.trim()) {
          showToast('Vui lòng nhập Họ tên và Số điện thoại khách hàng', 'warning');
          setSubmittingWalkIn(false);
          return;
        }
        const createdGuest = await api.post<GuestItem>('/guests', {
          fullName: walkInGuestName.trim(),
          phone: walkInGuestPhone.trim(),
          idNumber: walkInGuestIdNumber.trim() || undefined,
          email: walkInGuestEmail.trim() || undefined,
          idType: 'CCCD',
          nationality: 'Việt Nam',
        });
        guestId = createdGuest.guestId;
      }

      await frontdeskService.walkIn({
        guestId,
        roomTypeId: Number(walkInRoomTypeId),
        roomId: walkInRoomId ? Number(walkInRoomId) : undefined,
        checkOutDate: walkInCheckOutDate,
        adults: walkInAdults,
        children: walkInChildren,
        depositAmount: walkInDeposit > 0 ? walkInDeposit : undefined,
        depositMethod: walkInDeposit > 0 ? walkInDepositMethod : undefined,
        depositRef: walkInDepositRef.trim() || undefined,
        note: walkInNote.trim() || undefined,
      });

      showToast(`Đón khách vãng lai (Walk-in) và nhận phòng thành công!`, 'success');
      setIsWalkInModalOpen(false);
      refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tạo đơn Walk-in thất bại';
      showToast(msg, 'error');
    } finally {
      setSubmittingWalkIn(false);
    }
  };

  // Helper formatting currency
  const formatCurrency = (val?: number | null) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  // Helper formatting datetime
  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs">
              <DoorOpen size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Tiền sảnh & Quản lý Lưu trú
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Tiếp nhận nhận phòng (Check-in), trả phòng (Check-out), đổi phòng và khách vãng lai (Walk-in)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refreshAll}
            disabled={loadingSummary}
            leftIcon={<RefreshCw size={14} className={loadingSummary ? 'animate-spin' : ''} />}
          >
            Làm mới
          </Button>

          {canManage && (
            <Button
              onClick={() => {
                setWalkInGuestMode('NEW');
                setWalkInGuestName('');
                setWalkInGuestPhone('');
                setWalkInGuestIdNumber('');
                setWalkInGuestEmail('');
                setWalkInSelectedGuest(null);
                setWalkInRoomTypeId(roomTypes.length > 0 ? roomTypes[0].roomTypeId : '');
                setWalkInRoomId('');
                setWalkInCheckOutDate(tomorrowStr);
                setWalkInAdults(2);
                setWalkInChildren(0);
                setWalkInDeposit(0);
                setWalkInNote('');
                setIsWalkInModalOpen(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-xs shadow-blue-500/20"
              leftIcon={<Plus size={15} />}
            >
              Khách vãng lai (Walk-in)
            </Button>
          )}
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Khách đang ở */}
        <div
          onClick={() => setActiveTab('IN_HOUSE')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'IN_HOUSE'
              ? 'bg-blue-50/50 border-blue-400 shadow-md ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Khách đang ở</span>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <DoorOpen size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{summary.inHouseCount}</span>
            <span className="text-xs text-slate-500 font-medium">lượt lưu trú</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <Clock size={13} className="text-blue-600" />
            Đang lưu trú tại khách sạn
          </p>
        </div>

        {/* Card 2: Đến hôm nay */}
        <div
          onClick={() => setActiveTab('ARRIVALS')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'ARRIVALS'
              ? 'bg-indigo-50/50 border-indigo-400 shadow-md ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200/80 hover:border-indigo-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Đến hôm nay</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <LogIn size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{summary.expectedArrivalsToday}</span>
            <span className="text-xs text-slate-500 font-medium">đơn đặt phòng</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <Calendar size={13} className="text-indigo-600" />
            Dự kiến nhận phòng hôm nay
          </p>
        </div>

        {/* Card 3: Đi hôm nay */}
        <div
          onClick={() => setActiveTab('DEPARTURES')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'DEPARTURES'
              ? 'bg-amber-50/50 border-amber-400 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200/80 hover:border-amber-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Đi hôm nay</span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <LogOut size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{summary.expectedDeparturesToday}</span>
            <span className="text-xs text-slate-500 font-medium">phòng trả</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <AlertTriangle size={13} className="text-amber-600" />
            Hết hạn lưu trú hôm nay
          </p>
        </div>

        {/* Card 4: Phòng sạch khả dụng */}
        <div className="p-5 rounded-2xl border bg-white border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Phòng sạch sẵn sàng</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">{summary.cleanAvailableRooms}</span>
            <span className="text-xs text-slate-500 font-medium">phòng trống sạch</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <Building size={13} className="text-emerald-600" />
            Sẵn sàng để bàn giao ngay
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('IN_HOUSE')}
          className={`pb-3 px-4 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'IN_HOUSE'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <DoorOpen size={17} />
          Khách đang lưu trú (In-House)
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-bold">
            {summary.inHouseCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ARRIVALS')}
          className={`pb-3 px-4 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'ARRIVALS'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <LogIn size={17} />
          Đến hôm nay (Arrivals)
          <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 font-bold">
            {summary.expectedArrivalsToday}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('DEPARTURES')}
          className={`pb-3 px-4 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'DEPARTURES'
              ? 'text-amber-600 border-b-2 border-amber-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <LogOut size={17} />
          Đi hôm nay (Departures)
          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-bold">
            {summary.expectedDeparturesToday}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 px-4 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock size={17} />
          Lịch sử lưu trú (Stay History)
        </button>
      </div>

      {/* ================= TAB 1: IN-HOUSE STAYS ================= */}
      {activeTab === 'IN_HOUSE' && (
        <Card className="p-6 border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={inHouseSearch}
                onChange={(e) => setInHouseSearch(e.target.value)}
                placeholder="Tìm theo số phòng, mã đơn, tên khách, SĐT..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div className="text-xs text-slate-500">
              Tổng số phòng đang phục vụ: <b className="text-slate-900">{inHouseStays.length}</b> phòng
            </div>
          </div>

          {loadingInHouse ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw size={28} className="animate-spin mx-auto mb-2 text-blue-500" />
              Đang tải danh sách khách lưu trú...
            </div>
          ) : inHouseStays.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <DoorOpen size={30} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Hiện không có khách nào đang lưu trú</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Khách nhận phòng từ mục "Đến hôm nay" hoặc bấm nút "Khách vãng lai (Walk-in)" để đón khách trực tiếp.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-700 min-w-[960px]">
                <thead className="bg-slate-50/80 text-xs uppercase font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Phòng & Hạng</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Khách hàng</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Giờ nhận phòng</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Dự kiến trả</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Công nợ Folio</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inHouseStays.map((stay) => {
                    const isDueToday = stay.expectedCheckOut === todayStr;
                    return (
                      <tr key={stay.stayId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 font-extrabold text-base rounded-xl border border-blue-200 shrink-0">
                              {stay.roomNumber}
                            </span>
                            <div>
                              <div className="font-semibold text-slate-900 whitespace-nowrap">{stay.roomTypeName}</div>
                              <div className="text-xs text-slate-400">Tầng {stay.floorNo}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
                            <User size={14} className="text-slate-400 shrink-0" />
                            {stay.guestName}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                            <Phone size={12} className="text-slate-400 shrink-0" />
                            {stay.guestPhone}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-xs text-slate-700 font-medium whitespace-nowrap">
                            {formatDateTime(stay.actualCheckIn)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                            {stay.expectedCheckOut}
                          </div>
                          {isDueToday && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse whitespace-nowrap">
                              Đến hạn hôm nay
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-xs">
                            <div className="font-bold text-slate-900 whitespace-nowrap">
                              {formatCurrency(stay.folioTotalAmount)}
                            </div>
                            <div className="text-xs text-slate-500 whitespace-nowrap">
                              Đã thu: {formatCurrency(stay.folioPaidAmount)}
                            </div>
                            {stay.folioBalance === 0 ? (
                              <span className="inline-block mt-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                Đã cân bằng (0 đ)
                              </span>
                            ) : stay.folioBalance > 0 ? (
                              <span className="inline-block mt-0.5 text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                Còn nợ: {formatCurrency(stay.folioBalance)}
                              </span>
                            ) : (
                              <span className="inline-block mt-0.5 text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                Thừa cọc: {formatCurrency(Math.abs(stay.folioBalance))}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <ActionDropdown
                            title="Thao tác lưu trú"
                            items={[
                              ...(canManage
                                ? [
                                    {
                                      label: 'Trả phòng (Check-out)',
                                      icon: <LogOut size={15} className="text-amber-600" />,
                                      variant: 'primary' as const,
                                      onClick: () => handleOpenCheckOut(stay),
                                    },
                                    {
                                      label: 'Đổi phòng cho khách',
                                      icon: <ArrowRightLeft size={15} className="text-blue-600" />,
                                      onClick: () => handleOpenChangeRoom(stay),
                                    },
                                  ]
                                : []),
                              ...(stay.folioId
                                ? [
                                    {
                                      label: 'Xem Folio & Thu ngân',
                                      icon: <Receipt size={15} className="text-emerald-600" />,
                                      onClick: () => navigate(`/billing?folioId=${stay.folioId}`),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ================= TAB 2: EXPECTED ARRIVALS ================= */}
      {activeTab === 'ARRIVALS' && (
        <Card className="p-6 border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Danh sách Dự kiến Nhận phòng hôm nay ({todayStr})</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các đơn đặt phòng đã xác nhận có ngày nhận phòng là hôm nay
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              {arrivals.length} lượt nhận phòng
            </span>
          </div>

          {loadingArrivals ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw size={28} className="animate-spin mx-auto mb-2 text-indigo-500" />
              Đang tải danh sách dự kiến nhận phòng...
            </div>
          ) : arrivals.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <LogIn size={30} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Không có đơn đặt phòng nào đến hôm nay</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tất cả khách đặt trước đã nhận phòng hoặc hôm nay không có lịch hẹn mới.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-700 min-w-[960px]">
                <thead className="bg-slate-50/80 text-xs uppercase font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Mã đơn</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Khách hàng</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Lưu trú</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Số lượng</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Tiền cọc / Tổng</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Nguồn đặt</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {arrivals.map((arr) => (
                    <tr key={arr.reservationId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        {arr.reservationCode}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">Mã KH #{arr.guestId}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <div>Đến: <b className="text-slate-800">{arr.checkInDate}</b></div>
                        <div>Đi: <b className="text-slate-800">{arr.checkOutDate}</b></div>
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <span className="font-medium">{arr.adults} NL</span>,{' '}
                        <span className="font-medium">{arr.children} TE</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <div className="font-bold text-slate-900">{formatCurrency(arr.totalAmount)}</div>
                        <div className="text-emerald-700 font-semibold">
                          Đã cọc: {formatCurrency(arr.depositAmount)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700">
                          {arr.bookingSource}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenCheckInByReservationId(arr.reservationId)}
                          className="h-8.5 px-3.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-600/20 transition-all flex items-center gap-1.5 ml-auto whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
                        >
                          <LogIn size={14} className="shrink-0" />
                          <span>Nhận phòng</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ================= TAB 3: EXPECTED DEPARTURES ================= */}
      {activeTab === 'DEPARTURES' && (
        <Card className="p-6 border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Danh sách Dự kiến Trả phòng hôm nay ({todayStr})</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các phòng đang lưu trú có ngày dự kiến trả phòng trùng hôm nay
              </p>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              {departures.length} phòng cần trả
            </span>
          </div>

          {loadingDepartures ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw size={28} className="animate-spin mx-auto mb-2 text-amber-500" />
              Đang tải danh sách dự kiến trả phòng...
            </div>
          ) : departures.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <LogOut size={30} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Không có phòng nào đến hạn trả hôm nay</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tất cả khách đều còn thời hạn lưu trú cho các ngày tiếp theo.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-700 min-w-[900px]">
                <thead className="bg-slate-50/80 text-xs uppercase font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Phòng & Hạng</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Khách hàng</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Giờ nhận phòng</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Số dư Folio</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departures.map((stay) => (
                    <tr key={stay.stayId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-amber-100 text-amber-800 font-extrabold text-base rounded-xl border border-amber-200 shrink-0">
                            {stay.roomNumber}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900 whitespace-nowrap">{stay.roomTypeName}</div>
                            <div className="text-xs text-slate-400">Tầng {stay.floorNo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 whitespace-nowrap">{stay.guestName}</div>
                        <div className="text-xs text-slate-500 whitespace-nowrap">{stay.guestPhone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {formatDateTime(stay.actualCheckIn)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(stay.folioTotalAmount)}
                        </div>
                        {stay.folioBalance === 0 ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                            Đã cân bằng (0 đ)
                          </span>
                        ) : stay.folioBalance > 0 ? (
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                            Còn nợ: {formatCurrency(stay.folioBalance)}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                            Thừa cọc: {formatCurrency(Math.abs(stay.folioBalance))}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenCheckOut(stay)}
                          className="h-8.5 px-3.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs shadow-amber-600/20 transition-all flex items-center gap-1.5 ml-auto whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
                        >
                          <LogOut size={14} className="shrink-0" />
                          <span>Trả phòng ngay</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ================= TAB 4: STAY HISTORY ================= */}
      {activeTab === 'HISTORY' && (
        <Card className="p-6 border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Tìm phòng, tên khách, mã đơn..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-500 focus:bg-white transition-all"
                />
              </div>

              <select
                value={historyStatus}
                onChange={(e) => setHistoryStatus(e.target.value as StayStatus | 'ALL')}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-500"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="IN_HOUSE">Đang ở (IN_HOUSE)</option>
                <option value="CHECKED_OUT">Đã trả phòng (CHECKED_OUT)</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>

            <div className="text-xs text-slate-500">
              Tổng số lượt: <b className="text-slate-900">{historyTotalElements}</b> bản ghi
            </div>
          </div>

          {loadingHistory ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw size={28} className="animate-spin mx-auto mb-2 text-slate-500" />
              Đang tải lịch sử lưu trú...
            </div>
          ) : historyStays.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              Chưa có dữ liệu lịch sử lưu trú phù hợp.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-700 min-w-[960px]">
                <thead className="bg-slate-50/80 text-xs uppercase font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 whitespace-nowrap">Lượt #</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Phòng & Hạng</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Khách hàng</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Thời gian nhận</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Thời gian trả</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Trạng thái</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Folio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyStays.map((stay) => (
                    <tr key={stay.stayId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600 whitespace-nowrap">
                        #{stay.stayId}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900">P.{stay.roomNumber}</span> -{' '}
                        <span className="text-xs text-slate-500">{stay.roomTypeName}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 whitespace-nowrap">{stay.guestName}</div>
                        <div className="text-xs text-slate-500 whitespace-nowrap">{stay.guestPhone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">{formatDateTime(stay.actualCheckIn)}</td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">{formatDateTime(stay.actualCheckOut)}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {stay.status === 'IN_HOUSE' ? (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                            Đang ở
                          </span>
                        ) : stay.status === 'CHECKED_OUT' ? (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
                            Đã trả phòng
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-700">
                            Đã hủy
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        {stay.folioId ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/billing?folioId=${stay.folioId}`)}
                            className="text-blue-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <Receipt size={13} /> Folio #{stay.folioId}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {historyTotalPages > 1 && (
            <div className="mt-4 flex justify-end">
              <Pagination
                page={historyPage}
                totalPages={historyTotalPages}
                totalElements={historyTotalElements}
                pageSize={15}
                onPageChange={setHistoryPage}
              />
            </div>
          )}
        </Card>
      )}

      {/* ================= MODAL 1: CHECK-OUT ================= */}
      <Modal
        isOpen={isCheckOutModalOpen}
        onClose={() => !submittingCheckOut && setIsCheckOutModalOpen(false)}
        title="Thủ tục Trả phòng (Check-out)"
        subtitle={`Quyết toán công nợ và trả phòng cho lượt lưu trú #${selectedStayForCheckOut?.stayId}`}
        icon={<LogOut size={22} className="text-amber-600" />}
        maxWidth="560px"
        onSubmit={handleCheckOutSubmit}
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsCheckOutModalOpen(false)}
              disabled={submittingCheckOut}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={submittingCheckOut}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs shadow-amber-600/20"
              leftIcon={submittingCheckOut ? <RefreshCw size={14} className="animate-spin" /> : <LogOut size={14} />}
            >
              {submittingCheckOut ? 'Đang xử lý...' : 'Xác nhận Trả phòng'}
            </Button>
          </>
        }
      >
        {selectedStayForCheckOut && (
          <div className="space-y-4">
            {/* Stay Summary Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Phòng</span>
                  <div className="font-extrabold text-xl text-blue-700">
                    Phòng {selectedStayForCheckOut.roomNumber} ({selectedStayForCheckOut.roomTypeName})
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Khách lưu trú</span>
                  <div className="font-bold text-slate-900">{selectedStayForCheckOut.guestName}</div>
                  <div className="text-xs text-slate-500">{selectedStayForCheckOut.guestPhone}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
                <div>
                  Nhận phòng: <b>{formatDateTime(selectedStayForCheckOut.actualCheckIn)}</b>
                </div>
                <div>
                  Dự kiến trả: <b>{selectedStayForCheckOut.expectedCheckOut}</b>
                </div>
              </div>
            </div>

            {/* Early Check-out Policy Analysis & Manager Override */}
            {todayStr < selectedStayForCheckOut.expectedCheckOut && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle size={15} className="text-amber-600" /> Phát hiện Trả phòng sớm (Early Check-Out)
                    </span>
                    {earlyPreview && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-200/80 font-bold text-amber-900 text-[11px]">
                        {earlyPreview.policyName} ({earlyPreview.policyCode})
                      </span>
                    )}
                  </div>

                  {loadingEarlyPreview ? (
                    <div className="py-2 text-center text-slate-400">
                      <RefreshCw className="animate-spin inline mr-1" size={14} /> Đang đối chiếu chính sách trả sớm...
                    </div>
                  ) : earlyPreview ? (
                    <div className="space-y-2">
                      <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100 text-slate-700">
                        <div className="font-semibold text-slate-900 mb-0.5">Quy tắc điều chỉnh Folio:</div>
                        <p className="text-slate-600">{earlyPreview.explanation}</p>
                      </div>

                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-slate-600">
                          <span>Số đêm đăng ký / Đã ở thực tế:</span>
                          <span className="font-semibold text-slate-800">
                            {earlyPreview.originalNights} đêm → <strong>{earlyPreview.actualNights} đêm thực tế</strong> (Dư {earlyPreview.unusedNights} đêm)
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Đơn giá phòng / đêm:</span>
                          <span className="font-medium text-slate-700">{formatCurrency(earlyPreview.pricePerNight)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-slate-200">
                          <span>Khấu trừ tiền phòng chưa ở (DISCOUNT):</span>
                          <span>-{formatCurrency(earlyPreview.unusedRoomAmount)}</span>
                        </div>
                        <div className="flex justify-between text-rose-700 font-semibold">
                          <span>Phí phạt trả sớm theo chính sách (PENALTY):</span>
                          <span>
                            +{formatCurrency(isOverridePenalty ? overridePenalty : earlyPreview.earlyCheckoutPenalty)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 font-bold text-xs">
                          <span className="text-slate-900">Điều chỉnh ròng vào Folio:</span>
                          <span
                            className={
                              (isOverridePenalty ? (overridePenalty - earlyPreview.unusedRoomAmount) : earlyPreview.netAdjustment) <= 0
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                            }
                          >
                            {(isOverridePenalty ? (overridePenalty - earlyPreview.unusedRoomAmount) : earlyPreview.netAdjustment) <= 0 ? '-' : '+'}
                            {formatCurrency(
                              Math.abs(
                                isOverridePenalty
                                  ? (overridePenalty - earlyPreview.unusedRoomAmount)
                                  : earlyPreview.netAdjustment
                              )
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Manager Exception Override for Early Check-out */}
                {earlyPreview && hasAnyRole(['ADMIN', 'MANAGER']) && (
                  <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-purple-900">
                      <input
                        type="checkbox"
                        checked={isOverridePenalty}
                        onChange={(e) => {
                          setIsOverridePenalty(e.target.checked);
                          if (!e.target.checked) {
                            setOverridePenalty(earlyPreview.earlyCheckoutPenalty);
                            setOverridePenaltyReason('');
                          }
                        }}
                        className="w-4 h-4 text-purple-600 rounded border-purple-300 focus:ring-purple-400"
                      />
                      ★ Phê duyệt ngoại lệ Quản lý (Manager Penalty Override)
                    </label>

                    {isOverridePenalty && (
                      <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                        <CurrencyInput
                          label="Phí phạt trả sớm điều chỉnh (VND)"
                          value={overridePenalty}
                          onChange={setOverridePenalty}
                          helperText="Quản lý có thể giảm hoặc miễn phí phạt (0 đ) trong trường hợp bất khả kháng"
                          inputClassName="bg-white border-purple-200 text-purple-900 py-1.5 text-xs rounded-lg"
                        />
                        <div>
                          <label className="block text-[11px] font-bold text-purple-900 mb-0.5">
                            Lý do phê duyệt ngoại lệ <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required={isOverridePenalty}
                            value={overridePenaltyReason}
                            onChange={(e) => setOverridePenaltyReason(e.target.value)}
                            placeholder="VD: Khách có sự cố chuyến bay, Quản lý duyệt miễn phí phạt..."
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Folio Billing Breakdown */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
              <div className="flex items-center justify-between font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                <span className="flex items-center gap-1.5">
                  <Receipt size={16} className="text-blue-600" />
                  Quyết toán tài khoản phòng (Folio #{selectedStayForCheckOut.folioId})
                </span>
                {selectedStayForCheckOut.isFolioSettled ? (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Đã tất toán
                  </span>
                ) : (
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                    Chưa cân bằng
                  </span>
                )}
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Tổng chi phí (Phòng + Dịch vụ):</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(selectedStayForCheckOut.folioTotalAmount)}
                </span>
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Đã thanh toán / Đã cọc:</span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(selectedStayForCheckOut.folioPaidAmount)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="font-bold text-sm text-slate-900">
                  {selectedStayForCheckOut.folioBalance > 0
                    ? 'Khách cần thanh toán thêm:'
                    : selectedStayForCheckOut.folioBalance < 0
                    ? 'Khách được hoàn lại tiền cọc thừa:'
                    : 'Số dư công nợ:'}
                </span>
                <span
                  className={`text-base font-black ${
                    selectedStayForCheckOut.folioBalance > 0
                      ? 'text-rose-600'
                      : selectedStayForCheckOut.folioBalance < 0
                      ? 'text-blue-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(Math.abs(selectedStayForCheckOut.folioBalance))}
                </span>
              </div>
            </div>

            {/* Auto Settle Options if balance !== 0 */}
            {selectedStayForCheckOut.folioBalance !== 0 && (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkOutAutoSettle}
                    onChange={(e) => setCheckOutAutoSettle(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  Tự động quyết toán cân bằng Folio khi hoàn tất trả phòng
                </label>

                {checkOutAutoSettle && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phương thức thanh toán
                      </label>
                      <select
                        value={checkOutSettleMethod}
                        onChange={(e) => setCheckOutSettleMethod(e.target.value as PaymentMethod)}
                        className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="CASH">Tiền mặt (CASH)</option>
                        <option value="TRANSFER">Chuyển khoản (TRANSFER)</option>
                        <option value="CARD">Thẻ ngân hàng (CARD)</option>
                        <option value="EWALLET">Ví điện tử (EWALLET)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mã tham chiếu / POS (tùy chọn)
                      </label>
                      <input
                        type="text"
                        value={checkOutSettleRef}
                        onChange={(e) => setCheckOutSettleRef(e.target.value)}
                        placeholder="VD: MB-123456"
                        className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú trả phòng (tùy chọn)
              </label>
              <textarea
                value={checkOutNote}
                onChange={(e) => setCheckOutNote(e.target.value)}
                rows={2}
                placeholder="VD: Khách đánh giá hài lòng, đã kiểm tra mini bar..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL 2: CHANGE ROOM ================= */}
      <Modal
        isOpen={isChangeRoomModalOpen}
        onClose={() => !submittingChangeRoom && setIsChangeRoomModalOpen(false)}
        title="Đổi phòng cho Khách đang ở"
        subtitle={`Chuyển khách từ phòng ${selectedStayForChangeRoom?.roomNumber} sang phòng mới`}
        icon={<ArrowRightLeft size={22} className="text-blue-600" />}
        maxWidth="520px"
        onSubmit={handleChangeRoomSubmit}
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsChangeRoomModalOpen(false)}
              disabled={submittingChangeRoom}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={submittingChangeRoom}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs shadow-blue-600/20"
              leftIcon={submittingChangeRoom ? <RefreshCw size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />}
            >
              {submittingChangeRoom ? 'Đang cập nhật...' : 'Xác nhận Đổi phòng'}
            </Button>
          </>
        }
      >
        {selectedStayForChangeRoom && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div>
                Khách hàng: <b>{selectedStayForChangeRoom.guestName}</b> ({selectedStayForChangeRoom.guestPhone})
              </div>
              <div>
                Phòng hiện tại: <b className="text-blue-700">{selectedStayForChangeRoom.roomNumber}</b> - {selectedStayForChangeRoom.roomTypeName} (Tầng {selectedStayForChangeRoom.floorNo})
              </div>
              <div>
                Thời hạn ở: đến ngày <b>{selectedStayForChangeRoom.expectedCheckOut}</b>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Chọn phòng mới sạch sẵn sàng <span className="text-rose-500">*</span>
              </label>
              <select
                value={newRoomId}
                onChange={(e) => setNewRoomId(Number(e.target.value))}
                required
                className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn một phòng trống sạch --</option>
                {cleanRooms
                  .filter((r) => r.roomId !== selectedStayForChangeRoom.roomId)
                  .map((r) => (
                    <option key={r.roomId} value={r.roomId}>
                      Phòng {r.roomNumber} - {r.roomTypeName || 'Hạng phòng'} (Tầng {r.floorNo})
                    </option>
                  ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Phòng cũ sẽ tự động chuyển sang trạng thái <b>CẦN DỌN DẸP (DIRTY)</b>. Phòng mới sẽ chuyển thành <b>ĐANG CÓ KHÁCH (OCCUPIED)</b>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý do đổi phòng <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={changeRoomReason}
                onChange={(e) => setChangeRoomReason(e.target.value)}
                required
                placeholder="VD: Khách yêu cầu tầng cao hơn, thiết bị máy lạnh trục trặc..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL 3: CHECK-IN (FROM RESERVATION) ================= */}
      <Modal
        isOpen={isCheckInModalOpen}
        onClose={() => !submittingCheckIn && setIsCheckInModalOpen(false)}
        title="Thủ tục Nhận phòng (Check-in)"
        subtitle={`Tiếp nhận khách theo đơn đặt phòng ${checkInReservation?.reservationCode || ''}`}
        icon={<LogIn size={22} className="text-blue-600" />}
        maxWidth="580px"
        onSubmit={handleCheckInSubmit}
        footer={
          checkInReservation && !loadingCheckInRes ? (
            <>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsCheckInModalOpen(false)}
                disabled={submittingCheckIn}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={submittingCheckIn}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs shadow-blue-600/20"
                leftIcon={submittingCheckIn ? <RefreshCw size={14} className="animate-spin" /> : <LogIn size={14} />}
              >
                {submittingCheckIn ? 'Đang nhận phòng...' : 'Hoàn tất Nhận phòng'}
              </Button>
            </>
          ) : undefined
        }
      >
        {loadingCheckInRes ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
            Đang tải dữ liệu đơn đặt phòng...
          </div>
        ) : checkInReservation && (
          <div className="space-y-4">
            {/* Reservation Summary */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-500">Mã đơn</span>
                  <div className="font-mono font-bold text-indigo-700 text-base">
                    {checkInReservation.reservationCode}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Khách hàng</span>
                  <div className="font-bold text-slate-900">{checkInReservation.guest?.fullName || 'Khách hàng'}</div>
                  <div className="text-xs text-slate-500">{checkInReservation.guest?.phone || ''}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
                <div>
                  Thời gian: <b>{checkInReservation.checkInDate}</b> → <b>{checkInReservation.checkOutDate}</b>
                </div>
                <div>
                  Đã cọc: <b className="text-emerald-700">{formatCurrency(checkInReservation.depositAmount)}</b>
                </div>
              </div>
            </div>

            {/* Room selection */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Chọn phòng trong đơn đặt <span className="text-rose-500">*</span>
              </label>
              <select
                value={checkInReservationRoomId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setCheckInReservationRoomId(id);
                  const found = checkInReservation.rooms.find((r) => r.reservationRoomId === id);
                  if (found && found.roomId) {
                    setCheckInSpecificRoomId(found.roomId);
                  } else {
                    setCheckInSpecificRoomId('');
                  }
                }}
                required
                className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold"
              >
                {checkInReservation.rooms
                  .filter((r) => r.status === 'BOOKED')
                  .map((r) => (
                    <option key={r.reservationRoomId} value={r.reservationRoomId}>
                      Phòng: {r.roomNumber || 'Chưa chỉ định'} ({r.roomTypeName}) - {formatCurrency(r.pricePerNight)}/đêm
                    </option>
                  ))}
              </select>
            </div>

            {/* Specific Room assignment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chỉ định phòng cụ thể (hoặc giữ nguyên phòng đã gán)
              </label>
              <select
                value={checkInSpecificRoomId}
                onChange={(e) => setCheckInSpecificRoomId(e.target.value ? Number(e.target.value) : '')}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="">-- Tự động theo đơn hoặc chọn phòng sạch bên dưới --</option>
                {cleanRooms.map((r) => (
                  <option key={r.roomId} value={r.roomId}>
                    Phòng {r.roomNumber} - {r.roomTypeName} (Tầng {r.floorNo})
                  </option>
                ))}
              </select>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú nhận phòng (tùy chọn)
              </label>
              <textarea
                value={checkInNote}
                onChange={(e) => setCheckInNote(e.target.value)}
                rows={2}
                placeholder="VD: Khách yêu cầu thêm gối, lễ tân đã giao thẻ khóa..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL 4: WALK-IN CHECK-IN ================= */}
      <Modal
        isOpen={isWalkInModalOpen}
        onClose={() => !submittingWalkIn && setIsWalkInModalOpen(false)}
        title="Khách vãng lai Nhận phòng ngay (Walk-in)"
        subtitle="Tạo đơn đặt và thực hiện nhận phòng trực tiếp tại quầy lễ tân"
        icon={<UserCheck size={22} className="text-indigo-600" />}
        maxWidth="620px"
        onSubmit={handleWalkInSubmit}
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsWalkInModalOpen(false)}
              disabled={submittingWalkIn}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={submittingWalkIn}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs shadow-indigo-600/20"
              leftIcon={submittingWalkIn ? <RefreshCw size={14} className="animate-spin" /> : <UserCheck size={14} />}
            >
              {submittingWalkIn ? 'Đang tạo đơn...' : 'Nhận phòng ngay'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Guest Mode Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => {
                setWalkInGuestMode('NEW');
                setWalkInSelectedGuest(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                walkInGuestMode === 'NEW'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Khách hàng mới (Tạo nhanh)
            </button>
            <button
              type="button"
              onClick={() => {
                setWalkInGuestMode('EXISTING');
                setWalkInGuestSearch('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                walkInGuestMode === 'EXISTING'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Khách hàng có sẵn (Tìm kiếm)
            </button>
          </div>

          {/* New Guest Form */}
          {walkInGuestMode === 'NEW' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên khách <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={walkInGuestName}
                  onChange={(e) => setWalkInGuestName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  required
                  className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={walkInGuestPhone}
                  onChange={(e) => setWalkInGuestPhone(e.target.value)}
                  placeholder="VD: 0912345678"
                  required
                  className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số CCCD / Hộ chiếu
                </label>
                <input
                  type="text"
                  value={walkInGuestIdNumber}
                  onChange={(e) => setWalkInGuestIdNumber(e.target.value)}
                  placeholder="VD: 001202000000"
                  className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email (tùy chọn)
                </label>
                <input
                  type="email"
                  value={walkInGuestEmail}
                  onChange={(e) => setWalkInGuestEmail(e.target.value)}
                  placeholder="khach@example.com"
                  className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          ) : (
            /* Existing Guest Search */
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Tìm kiếm khách hàng bằng Tên, SĐT hoặc CCCD:
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={walkInGuestSearch}
                  onChange={(e) => setWalkInGuestSearch(e.target.value)}
                  placeholder="Nhập tên, số điện thoại hoặc CCCD..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {walkInSearchingGuests && (
                <div className="text-xs text-slate-400 flex items-center gap-1.5 py-1">
                  <RefreshCw size={13} className="animate-spin" /> Đang tìm kiếm...
                </div>
              )}

              {walkInSearchedGuests.length > 0 && !walkInSelectedGuest && (
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white shadow-xs">
                  {walkInSearchedGuests.map((g) => (
                    <div
                      key={g.guestId}
                      onClick={() => setWalkInSelectedGuest(g)}
                      className="p-2.5 hover:bg-indigo-50 cursor-pointer flex justify-between items-center text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{g.fullName}</div>
                        <div className="text-slate-500">{g.phone} {g.idNumber ? `| CCCD: ${g.idNumber}` : ''}</div>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        Chọn
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {walkInSelectedGuest && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-emerald-900">{walkInSelectedGuest.fullName}</span>{' '}
                    <span className="text-emerald-700">({walkInSelectedGuest.phone})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWalkInSelectedGuest(null)}
                    className="text-xs text-rose-600 font-bold hover:underline"
                  >
                    Bỏ chọn
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Room Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hạng phòng <span className="text-rose-500">*</span>
              </label>
              <select
                value={walkInRoomTypeId}
                onChange={(e) => {
                  setWalkInRoomTypeId(Number(e.target.value));
                  setWalkInRoomId('');
                }}
                required
                className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="">-- Chọn hạng phòng --</option>
                {roomTypes.map((rt) => (
                  <option key={rt.roomTypeId} value={rt.roomTypeId}>
                    {rt.name} - {formatCurrency(rt.basePrice)}/đêm
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phòng cụ thể (Tùy chọn)
              </label>
              <select
                value={walkInRoomId}
                onChange={(e) => setWalkInRoomId(e.target.value ? Number(e.target.value) : '')}
                className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs"
              >
                <option value="">-- Hệ thống tự gán phòng trống --</option>
                {cleanRooms
                  .filter((r) => !walkInRoomTypeId || r.roomTypeId === Number(walkInRoomTypeId))
                  .map((r) => (
                    <option key={r.roomId} value={r.roomId}>
                      Phòng {r.roomNumber} (Tầng {r.floorNo})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Dates & Guests */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày trả phòng <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                min={tomorrowStr}
                value={walkInCheckOutDate}
                onChange={(e) => setWalkInCheckOutDate(e.target.value)}
                required
                className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Người lớn
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={walkInAdults}
                onChange={(e) => setWalkInAdults(Number(e.target.value))}
                className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trẻ em
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={walkInChildren}
                onChange={(e) => setWalkInChildren(Number(e.target.value))}
                className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Deposit Section */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-800">
                Tiền đặt cọc ban đầu (nếu có)
              </label>
              <span className="text-[11px] text-slate-500">Tùy chọn</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <CurrencyInput
                min={0}
                value={walkInDeposit || 0}
                onChange={setWalkInDeposit}
                placeholder="Số tiền cọc"
                inputClassName="py-1.5 px-3 bg-white border-slate-200 text-xs"
                className="w-full"
              />

              <select
                value={walkInDepositMethod}
                onChange={(e) => setWalkInDepositMethod(e.target.value as PaymentMethod)}
                className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="CASH">Tiền mặt</option>
                <option value="TRANSFER">Chuyển khoản</option>
                <option value="CARD">Thẻ ngân hàng</option>
              </select>

              <input
                type="text"
                value={walkInDepositRef}
                onChange={(e) => setWalkInDepositRef(e.target.value)}
                placeholder="Mã tham chiếu / POS"
                className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú
            </label>
            <input
              type="text"
              value={walkInNote}
              onChange={(e) => setWalkInNote(e.target.value)}
              placeholder="VD: Khách yêu cầu phòng yên tĩnh..."
              className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FrontdeskPage;
