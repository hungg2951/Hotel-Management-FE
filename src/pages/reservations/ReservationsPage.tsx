import {
  AlertTriangle,
  ArrowRight,
  Ban,
  BedDouble,
  Building,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  FileText,
  Mail,
  Maximize2,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  UserX,
  X,
  LogIn,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { api } from '../../services/api';
import { bookingService } from '../../services/bookingService';
import { policyService } from '../../services/policyService';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import type {
  CancellationPolicy,
  EarlyCheckoutPolicy,
  CancellationPreview,
} from '../../types/policy';
import type {
  BookingSource,
  PaymentMethod,
  ReservationCreateRequest,
  ReservationDepositRequest,
  ReservationDetailResponse,
  ReservationResponse,
  ReservationStatus,
  RoomTypeAvailabilityResponse,
} from '../../types/booking';

interface GuestItem {
  guestId: number;
  fullName: string;
  phone: string;
  email: string;
  idNumber?: string;
}

interface RoomTypeItem {
  roomTypeId: number;
  name: string;
  description?: string;
  basePrice: number;
  maxAdults: number;
  maxChildren: number;
  bedType?: string;
  areaSqm?: number;
}

export const ReservationsPage: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const canConfirmManual = hasAnyRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']);

  // Active view tab: 'list' | 'availability'
  const [activeTab, setActiveTab] = useState<'list' | 'availability'>('list');

  // Reservations List state
  const [reservations, setReservations] = useState<ReservationResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterKeyword, setFilterKeyword] = useState<string>('');
  const debouncedKeyword = useDebounce<string>(filterKeyword, 400);
  const [filterCheckIn, setFilterCheckIn] = useState<string>('');
  const [filterCheckOut, setFilterCheckOut] = useState<string>('');

  // Selected reservation detail modal
  const [selectedResId, setSelectedResId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ReservationDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Deposit Modal
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER');
  const [depositRef, setDepositRef] = useState<string>('');
  const [submittingDeposit, setSubmittingDeposit] = useState<boolean>(false);

  // Policies
  const [cancellationPolicies, setCancellationPolicies] = useState<CancellationPolicy[]>([]);
  const [earlyCheckoutPolicies, setEarlyCheckoutPolicies] = useState<EarlyCheckoutPolicy[]>([]);

  // Cancel Modal with Policy Preview & Override
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [submittingCancel, setSubmittingCancel] = useState<boolean>(false);
  const [cancelPreview, setCancelPreview] = useState<CancellationPreview | null>(null);
  const [loadingCancelPreview, setLoadingCancelPreview] = useState<boolean>(false);
  const [isOverrideCancelFee, setIsOverrideCancelFee] = useState<boolean>(false);
  const [overrideCancelFee, setOverrideCancelFee] = useState<number>(0);
  const [overrideCancelReason, setOverrideCancelReason] = useState<string>('');

  // Availability Search state
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const defaultCheckOutStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }, []);

  const [availCheckIn, setAvailCheckIn] = useState<string>(todayStr);
  const [availCheckOut, setAvailCheckOut] = useState<string>(defaultCheckOutStr);
  const [availAdults, setAvailAdults] = useState<number>(2);
  const [availChildren, setAvailChildren] = useState<number>(0);
  const [availResults, setAvailResults] = useState<RoomTypeAvailabilityResponse[]>([]);
  const [loadingAvail, setLoadingAvail] = useState<boolean>(false);

  // Create Reservation Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [roomTypesList, setRoomTypesList] = useState<RoomTypeItem[]>([]);
  const [createGuestId, setCreateGuestId] = useState<number | ''>('');
  const [createBookingSource, setCreateBookingSource] = useState<BookingSource>('PHONE');
  const [createCheckIn, setCreateCheckIn] = useState<string>(todayStr);
  const [createCheckOut, setCreateCheckOut] = useState<string>(defaultCheckOutStr);
  const [createAdults, setCreateAdults] = useState<number>(2);
  const [createChildren, setCreateChildren] = useState<number>(0);
  const [createRoomTypeId, setCreateRoomTypeId] = useState<number | ''>('');
  const [createSpecificRoomId, setCreateSpecificRoomId] = useState<number | ''>('');
  const [specificRooms, setSpecificRooms] = useState<{ roomId: number; roomNumber: string; floorNo: number; isAvailable?: boolean }[]>([]);
  const [loadingSpecificRooms, setLoadingSpecificRooms] = useState<boolean>(false);
  const [createNote, setCreateNote] = useState<string>('');
  const [submittingCreate, setSubmittingCreate] = useState<boolean>(false);

  // Direct Guest Input states (Default mode is NEW guest)
  const [guestInputMode, setGuestInputMode] = useState<'NEW' | 'EXISTING'>('NEW');
  const [guestFullName, setGuestFullName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [guestIdNumber, setGuestIdNumber] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');

  // Search guests for Existing Guest mode
  const [guestSearchQuery, setGuestSearchQuery] = useState<string>('');
  const debouncedGuestSearch = useDebounce<string>(guestSearchQuery, 400);
  const [searchingGuests, setSearchingGuests] = useState<boolean>(false);
  const [searchedGuests, setSearchedGuests] = useState<GuestItem[]>([]);
  const [selectedExistingGuest, setSelectedExistingGuest] = useState<GuestItem | null>(null);

  // Instant Deposit states
  const [createInstantDeposit, setCreateInstantDeposit] = useState<boolean>(false);
  const [instantDepositAmount, setInstantDepositAmount] = useState<number>(0);
  const [instantDepositMethod, setInstantDepositMethod] = useState<PaymentMethod>('TRANSFER');
  const [instantDepositRef, setInstantDepositRef] = useState<string>('');

  // Selected Room Type details
  const selectedRoomType = useMemo(() => {
    if (!createRoomTypeId) return null;
    return roomTypesList.find((rt) => rt.roomTypeId === Number(createRoomTypeId)) || null;
  }, [createRoomTypeId, roomTypesList]);

  // Calculate nights for create modal
  const createNights = useMemo(() => {
    if (!createCheckIn || !createCheckOut) return 0;
    const start = new Date(createCheckIn);
    const end = new Date(createCheckOut);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [createCheckIn, createCheckOut]);

  // Check over-capacity
  const isOverCapacity = useMemo(() => {
    if (!selectedRoomType) return false;
    return createAdults > selectedRoomType.maxAdults || createChildren > selectedRoomType.maxChildren;
  }, [selectedRoomType, createAdults, createChildren]);

  // Chính sách hiện hành áp dụng tự động cho đơn đặt phòng
  const activeCancelPolicy = useMemo(() => {
    return (
      cancellationPolicies.find((p) => p.isActive) ||
      cancellationPolicies.find((p) => p.isDefault) ||
      cancellationPolicies[0] ||
      null
    );
  }, [cancellationPolicies]);

  const activeEarlyPolicy = useMemo(() => {
    return (
      earlyCheckoutPolicies.find((p) => p.isActive) ||
      earlyCheckoutPolicies.find((p) => p.isDefault) ||
      earlyCheckoutPolicies[0] ||
      null
    );
  }, [earlyCheckoutPolicies]);

  // Fetch reservations
  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await bookingService.getReservations({
        status: filterStatus === 'ALL' ? undefined : (filterStatus as ReservationStatus),
        keyword: debouncedKeyword.trim() || undefined,
        checkInDate: filterCheckIn || undefined,
        checkOutDate: filterCheckOut || undefined,
        page,
        size: 15,
      });
      setReservations(res.content || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách đơn đặt phòng';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, debouncedKeyword, filterCheckIn, filterCheckOut, page, showToast]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const refreshPoliciesForBooking = useCallback(() => {
    policyService
      .getCancellationPolicies()
      .then((res) => {
        setCancellationPolicies(res || []);
      })
      .catch(() => {});

    policyService
      .getEarlyCheckoutPolicies()
      .then((res) => {
        setEarlyCheckoutPolicies(res || []);
      })
      .catch(() => {});
  }, []);

  // Load master data (Room types & Hotel Policies for create modal)
  useEffect(() => {
    api
      .get<{ content: RoomTypeItem[] }>('/room-types', { size: 100, activeOnly: true })
      .then((res) => setRoomTypesList(res.content || []))
      .catch(() => {});

    refreshPoliciesForBooking();
  }, [refreshPoliciesForBooking]);

  // Search guests by keyword (Name, Phone, CCCD/Passport) using debounced query
  useEffect(() => {
    const q = debouncedGuestSearch.trim();
    if (!q) {
      setSearchedGuests([]);
      setSearchingGuests(false);
      return;
    }

    let isMounted = true;
    setSearchingGuests(true);

    api
      .get<{ content: GuestItem[] }>('/guests', {
        keyword: q,
        size: 15,
      })
      .then((res) => {
        if (isMounted) {
          setSearchedGuests(res.content || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSearchedGuests([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setSearchingGuests(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedGuestSearch]);

  // Open Detail Modal
  const handleOpenDetail = async (id: number) => {
    try {
      setSelectedResId(id);
      setLoadingDetail(true);
      const data = await bookingService.getReservationById(id);
      setDetail(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải chi tiết đơn đặt phòng';
      showToast(msg, 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Availability Search
  const handleSearchAvailability = useCallback(async () => {
    if (!availCheckIn || !availCheckOut) {
      showToast('Vui lòng chọn ngày nhận và trả phòng', 'warning');
      return;
    }
    if (availCheckOut <= availCheckIn) {
      showToast('Ngày trả phòng phải sau ngày nhận phòng', 'warning');
      return;
    }
    try {
      setLoadingAvail(true);
      const data = await bookingService.searchAvailability({
        checkIn: availCheckIn,
        checkOut: availCheckOut,
        adults: availAdults,
        children: availChildren,
      });
      setAvailResults(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tra cứu phòng trống thất bại';
      showToast(msg, 'error');
    } finally {
      setLoadingAvail(false);
    }
  }, [availCheckIn, availCheckOut, availAdults, availChildren, showToast]);

  // Fetch specific rooms when room type or dates change
  useEffect(() => {
    if (!createRoomTypeId || !createCheckIn || !createCheckOut || createCheckOut <= createCheckIn) {
      setSpecificRooms([]);
      setCreateSpecificRoomId('');
      return;
    }
    setLoadingSpecificRooms(true);
    api
      .get<{ roomId: number; roomNumber: string; floorNo: number; isAvailable: boolean }[]>('/availability/rooms', {
        roomTypeId: Number(createRoomTypeId),
        checkIn: createCheckIn,
        checkOut: createCheckOut,
      })
      .then((res) => {
        const rooms = res || [];
        setSpecificRooms(rooms);
        // Nếu phòng đang chọn trước đó lại bị trùng lịch thì tự động hủy chọn
        if (createSpecificRoomId) {
          const current = rooms.find((r) => r.roomId === Number(createSpecificRoomId));
          if (current && !current.isAvailable) {
            setCreateSpecificRoomId('');
            showToast(`Phòng ${current.roomNumber} đã có khách giữ chỗ trong thời gian này, hệ thống đã hủy chọn phòng đó`, 'warning');
          }
        }
      })
      .catch(() => {
        setSpecificRooms([]);
      })
      .finally(() => {
        setLoadingSpecificRooms(false);
      });
  }, [createRoomTypeId, createCheckIn, createCheckOut, showToast]);

  // Quick book from availability result
  const handleQuickBook = (roomTypeId: number) => {
    refreshPoliciesForBooking();
    setCreateRoomTypeId(roomTypeId);
    setCreateSpecificRoomId('');
    setSelectedExistingGuest(null);
    setGuestSearchQuery('');
    setCreateCheckIn(availCheckIn);
    setCreateCheckOut(availCheckOut);
    setCreateAdults(availAdults);
    setCreateChildren(availChildren);
    setIsCreateModalOpen(true);
  };

  // Submit Create Reservation
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createRoomTypeId) {
      showToast('Vui lòng chọn hạng phòng', 'error');
      return;
    }
    if (createCheckOut <= createCheckIn) {
      showToast('Ngày trả phòng phải sau ngày nhận phòng', 'error');
      return;
    }

    try {
      setSubmittingCreate(true);

      let finalGuestId: number;

      if (guestInputMode === 'NEW') {
        if (!guestFullName.trim()) {
          showToast('Vui lòng nhập họ và tên khách hàng', 'error');
          setSubmittingCreate(false);
          return;
        }
        if (!guestPhone.trim()) {
          showToast('Vui lòng nhập số điện thoại khách hàng', 'error');
          setSubmittingCreate(false);
          return;
        }

        // Tự động tìm khách theo số điện thoại nếu đã từng có trong hệ thống
        try {
          const searchExisting = await api.get<{ content: GuestItem[] }>('/guests', {
            phone: guestPhone.trim(),
            size: 1,
          });
          if (searchExisting.content && searchExisting.content.length > 0) {
            finalGuestId = searchExisting.content[0].guestId;
          } else {
            throw new Error('Not found');
          }
        } catch {
          // Lưu khách hàng mới vào hệ thống
          const newGuest = await api.post<GuestItem>('/guests', {
            fullName: guestFullName.trim(),
            phone: guestPhone.trim(),
            email: guestEmail.trim() || undefined,
            idType: 'CCCD',
            idNumber: guestIdNumber.trim() || undefined,
            nationality: 'Việt Nam',
          });
          finalGuestId = newGuest.guestId;
        }
      } else {
        const guestIdToUse = selectedExistingGuest ? selectedExistingGuest.guestId : createGuestId;
        if (!guestIdToUse) {
          showToast('Vui lòng tìm và chọn khách hàng từ danh bạ', 'error');
          setSubmittingCreate(false);
          return;
        }
        finalGuestId = Number(guestIdToUse);
      }

      const payload: ReservationCreateRequest = {
        guestId: finalGuestId,
        bookingSource: createBookingSource,
        checkInDate: createCheckIn,
        checkOutDate: createCheckOut,
        adults: createAdults,
        children: createChildren,
        rooms: [
          {
            roomTypeId: Number(createRoomTypeId),
            specificRoomId: createSpecificRoomId ? Number(createSpecificRoomId) : undefined,
          },
        ],
        note: createNote.trim() || undefined,
        cancellationPolicyId: activeCancelPolicy ? activeCancelPolicy.policyId : undefined,
        earlyCheckoutPolicyId: activeEarlyPolicy ? activeEarlyPolicy.policyId : undefined,
      };

      const res = await bookingService.createReservation(payload);

      // Nếu có chọn thu tiền cọc ngay
      if (createInstantDeposit && instantDepositAmount > 0) {
        try {
          await bookingService.recordDeposit(res.reservationId, {
            amount: instantDepositAmount,
            method: instantDepositMethod,
            referenceCode: instantDepositRef.trim() || undefined,
          });
          showToast(`Tạo đơn #${res.reservationCode} & thu cọc ${formatVND(instantDepositAmount)} thành công!`, 'success');
        } catch (depErr: unknown) {
          const depMsg = depErr instanceof Error ? depErr.message : 'Ghi nhận cọc thất bại';
          showToast(`Đã tạo đơn #${res.reservationCode} nhưng thu cọc lỗi: ${depMsg}`, 'warning');
        }
      } else {
        showToast(`Tạo thành công đơn đặt phòng #${res.reservationCode} (Chờ cọc)`, 'success');
      }

      setIsCreateModalOpen(false);
      setGuestFullName('');
      setGuestPhone('');
      setGuestIdNumber('');
      setGuestEmail('');
      setCreateGuestId('');
      setSelectedExistingGuest(null);
      setGuestSearchQuery('');
      setCreateInstantDeposit(false);
      setInstantDepositAmount(0);
      setInstantDepositRef('');
      fetchReservations();
      handleOpenDetail(res.reservationId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tạo đơn đặt phòng thất bại';
      showToast(msg, 'error');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Submit Deposit
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    if (depositAmount <= 0) {
      showToast('Số tiền đặt cọc phải lớn hơn 0', 'error');
      return;
    }

    try {
      setSubmittingDeposit(true);
      const req: ReservationDepositRequest = {
        amount: depositAmount,
        method: depositMethod,
        referenceCode: depositRef.trim() || undefined,
      };
      const updated = await bookingService.recordDeposit(detail.reservationId, req);
      setDetail(updated);
      showToast('Ghi nhận đặt cọc thành công', 'success');
      setIsDepositModalOpen(false);
      setDepositAmount(0);
      setDepositRef('');
      fetchReservations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ghi nhận đặt cọc thất bại';
      showToast(msg, 'error');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  // Confirm Reservation manually
  const handleConfirmReservation = async () => {
    if (!detail) return;
    try {
      const updated = await bookingService.confirmReservation(detail.reservationId);
      setDetail(updated);
      showToast(`Đã xác nhận đơn đặt phòng #${detail.reservationCode}`, 'success');
      fetchReservations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xác nhận đơn thất bại';
      showToast(msg, 'error');
    }
  };

  // Open Cancel Modal with real-time policy calculation preview
  const handleOpenCancelModal = async (resDetail: ReservationDetailResponse) => {
    setIsCancelModalOpen(true);
    setCancelReason('');
    setIsOverrideCancelFee(false);
    setOverrideCancelReason('');
    setLoadingCancelPreview(true);
    setCancelPreview(null);
    try {
      const prev = await policyService.previewCancellation(resDetail.reservationId);
      setCancelPreview(prev);
      setOverrideCancelFee(prev.cancellationFee);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tính toán phí hủy phòng';
      showToast(msg, 'error');
    } finally {
      setLoadingCancelPreview(false);
    }
  };

  // Submit Cancel Reservation
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    if (isOverrideCancelFee && !overrideCancelReason.trim()) {
      showToast('Vui lòng nhập lý do can thiệp ngoại lệ chính sách (Bắt buộc đối với Quản lý)', 'warning');
      return;
    }
    try {
      setSubmittingCancel(true);
      const updated = await bookingService.cancelReservation(detail.reservationId, {
        reason: cancelReason.trim() || undefined,
        customFee: isOverrideCancelFee ? overrideCancelFee : undefined,
        overrideReason: isOverrideCancelFee ? overrideCancelReason.trim() : undefined,
      });
      setDetail(updated);
      showToast(`Đã hủy đơn đặt phòng #${detail.reservationCode}`, 'success');
      setIsCancelModalOpen(false);
      setCancelReason('');
      fetchReservations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Hủy đơn đặt phòng thất bại';
      showToast(msg, 'error');
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Mark No-Show
  const handleMarkNoShow = async () => {
    if (!detail) return;
    if (!window.confirm(`Xác nhận khách vắng mặt (No-Show) cho đơn #${detail.reservationCode}? Phòng sẽ được giải phóng lập tức.`)) {
      return;
    }
    try {
      const updated = await bookingService.markNoShow(detail.reservationId);
      setDetail(updated);
      showToast(`Đã cập nhật trạng thái NO_SHOW cho đơn #${detail.reservationCode}`, 'success');
      fetchReservations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cập nhật NO_SHOW thất bại';
      showToast(msg, 'error');
    }
  };

  // Format currency
  const formatVND = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  // Badge Status helper
  const getStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} /> Chờ cọc / xác nhận
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> Đã xác nhận
          </span>
        );
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Building size={12} /> Đang lưu trú
          </span>
        );
      case 'CHECKED_OUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Check size={12} /> Đã trả phòng
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <Ban size={12} /> Đã hủy
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <UserX size={12} /> Vắng mặt (No-Show)
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-2xl text-white shadow-lg shadow-amber-500/25">
              <CalendarDays size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                Quản lý Đặt phòng & Phòng trống
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refreshPoliciesForBooking();
              setCreateGuestId('');
              setCreateRoomTypeId('');
              setCreateSpecificRoomId('');
              setGuestFullName('');
              setGuestPhone('');
              setGuestIdNumber('');
              setGuestEmail('');
              setGuestSearchQuery('');
              setSelectedExistingGuest(null);
              setSearchedGuests([]);
              setCreateCheckIn(todayStr);
              setCreateCheckOut(defaultCheckOutStr);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus size={18} />
            Đặt phòng mới
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'list'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={18} />
          Danh sách Đặt phòng ({totalElements})
        </button>
        <button
          onClick={() => {
            setActiveTab('availability');
            if (availResults.length === 0) {
              handleSearchAvailability();
            }
          }}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'availability'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles size={18} />
          Tra cứu phòng trống & Giá đêm
        </button>
      </div>

      {/* TAB 1: DANH SÁCH ĐẶT PHÒNG */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Tìm theo CCCD, Hộ chiếu, SĐT, Họ tên khách..."
                value={filterKeyword}
                onChange={(e) => {
                  setFilterKeyword(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
              {filterKeyword && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterKeyword('');
                    setPage(0);
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  title="Xóa tìm kiếm"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Trạng thái:</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(0);
                }}
                className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING">Chờ cọc / xác nhận</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="CHECKED_IN">Đang lưu trú</option>
                <option value="CHECKED_OUT">Đã trả phòng</option>
                <option value="CANCELLED">Đã hủy</option>
                <option value="NO_SHOW">Vắng mặt (No-Show)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Nhận từ:</label>
              <input
                type="date"
                value={filterCheckIn}
                onChange={(e) => {
                  setFilterCheckIn(e.target.value);
                  setPage(0);
                }}
                className="py-1.5 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                setFilterKeyword('');
                setFilterStatus('ALL');
                setFilterCheckIn('');
                setFilterCheckOut('');
                setPage(0);
                fetchReservations();
              }}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Đặt lại bộ lọc"
            >
              <RefreshCw size={17} />
            </button>
          </div>

          {/* Reservations Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Khách hàng</th>
                    <th className="py-3 px-4">Khoảng thời gian</th>
                    <th className="py-3 px-4">Phòng & Nguồn</th>
                    <th className="py-3 px-4 text-right">Tổng tiền & Cọc</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="animate-spin inline mr-2" size={18} />
                        Đang tải danh sách đặt phòng...
                      </td>
                    </tr>
                  ) : reservations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Không tìm thấy đơn đặt phòng nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    reservations.map((item) => (
                      <tr key={item.reservationId} className="hover:bg-amber-50/25 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{item.guestName}</div>
                          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-0.5">
                            <span className="flex items-center gap-1 text-slate-600">
                              <Phone size={11} className="text-slate-400" /> {item.guestPhone}
                            </span>
                            {item.guestIdNumber && (
                              <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                                CCCD: {item.guestIdNumber}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium">
                            {item.checkInDate} <ArrowRight size={12} className="inline mx-1 text-slate-400" />{' '}
                            {item.checkOutDate}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {item.nights} đêm ({item.adults} NL, {item.children} TE)
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-700">{item.roomCount} phòng</span>
                          <div className="text-xs text-slate-400 uppercase mt-0.5">{item.bookingSource}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-slate-800">{formatVND(item.totalAmount)}</div>
                          <div className="text-xs mt-0.5">
                            <span className={item.depositAmount > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                              Cọc: {formatVND(item.depositAmount)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">{getStatusBadge(item.status)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenDetail(item.reservationId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                          >
                            <Eye size={13} /> Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Trang {page + 1} / {totalPages} (Tổng {totalElements} đơn)
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TRA CỨU PHÒNG TRỐNG & GIÁ ĐÊM */}
      {activeTab === 'availability' && (
        <div className="space-y-6">
          {/* Availability Filter Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CalendarDays className="text-amber-500" size={19} />
              Chọn thời gian và số lượng khách lưu trú
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ngày nhận phòng</label>
                <input
                  type="date"
                  value={availCheckIn}
                  onChange={(e) => setAvailCheckIn(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ngày trả phòng</label>
                <input
                  type="date"
                  value={availCheckOut}
                  onChange={(e) => setAvailCheckOut(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Người lớn</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={availAdults}
                  onChange={(e) => setAvailAdults(Number(e.target.value))}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Trẻ em</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={availChildren}
                  onChange={(e) => setAvailChildren(Number(e.target.value))}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <button
                  onClick={handleSearchAvailability}
                  disabled={loadingAvail}
                  className="w-full h-9 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loadingAvail ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />}
                  <span>Tra cứu phòng trống</span>
                </button>
              </div>
            </div>
          </div>

          {/* Availability Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loadingAvail ? (
              <div className="col-span-3 py-16 text-center text-slate-400">
                <RefreshCw className="animate-spin inline mr-2" size={24} />
                Đang kiểm tra phòng trống theo lịch giữ chỗ...
              </div>
            ) : availResults.length === 0 ? (
              <div className="col-span-3 py-16 text-center text-slate-400">
                Nhấn "Tra cứu phòng trống" để xem danh sách hạng phòng còn trống.
              </div>
            ) : (
              availResults.map((item) => (
                <div
                  key={item.roomTypeId}
                  className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                    item.isAvailable
                      ? 'border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400'
                      : 'border-slate-100 bg-slate-50/50 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-extrabold text-lg text-slate-800">{item.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          item.availableRoomsCount > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}
                      >
                        {item.availableRoomsCount > 0 ? `Còn ${item.availableRoomsCount} phòng` : 'Hết phòng'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl mb-4">
                      <div>
                        <span className="text-slate-400">Giường:</span> {item.bedType || 'Tiêu chuẩn'}
                      </div>
                      <div>
                        <span className="text-slate-400">Diện tích:</span> {item.areaSqm} m²
                      </div>
                      <div>
                        <span className="text-slate-400">Sức chứa:</span> {item.maxAdults} NL, {item.maxChildren} TE
                      </div>
                      <div>
                        <span className="text-slate-400">Số đêm:</span> {item.nights} đêm
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between mb-3">
                      <div>
                        <div className="text-xs text-slate-400">Giá mỗi đêm:</div>
                        <div className="text-sm font-bold text-slate-700">{formatVND(item.basePrice)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Tổng cộng ({item.nights} đêm):</div>
                        <div className="text-lg font-black text-amber-600">{formatVND(item.totalPrice)}</div>
                      </div>
                    </div>

                    <button
                      disabled={!item.isAvailable}
                      onClick={() => handleQuickBook(item.roomTypeId)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        item.isAvailable
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Plus size={15} /> Đặt ngay hạng này
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: TẠO ĐƠN ĐẶT PHÒNG MỚI */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800">Tạo đơn đặt phòng mới</h3>
                  <p className="text-xs text-slate-500">Giữ chỗ và lưu vào bảng RoomNight chống đặt trùng</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Modal Body - Scrollable */}
              <div className="modal-scrollable-body p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
              {/* Customer Section */}
              <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 font-bold">
                      <Users size={16} />
                    </span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Thông tin khách đặt phòng
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setGuestInputMode('NEW')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        guestInputMode === 'NEW'
                          ? 'bg-amber-500 text-white font-bold shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Khách mới (Nhập trực tiếp)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuestInputMode('EXISTING')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        guestInputMode === 'EXISTING'
                          ? 'bg-amber-500 text-white font-bold shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Tìm trong hồ sơ có sẵn
                    </button>
                  </div>
                </div>

                {guestInputMode === 'NEW' ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Họ và tên khách hàng (*)
                        </label>
                        <input
                          type="text"
                          required
                          value={guestFullName}
                          onChange={(e) => setGuestFullName(e.target.value)}
                          placeholder="Ví dụ: Nguyễn Văn Tuấn"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Số điện thoại liên hệ (*)
                        </label>
                        <input
                          type="text"
                          required
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="Ví dụ: 0912345678"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Số CCCD / Hộ chiếu (Tùy chọn)
                        </label>
                        <input
                          type="text"
                          value={guestIdNumber}
                          onChange={(e) => setGuestIdNumber(e.target.value)}
                          placeholder="Nhập CCCD hoặc Passport nếu có"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Email nhận xác nhận (Tùy chọn)
                        </label>
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      ℹ Hệ thống sẽ tự động lưu hồ sơ khách hàng vào cơ sở dữ liệu khi đơn đặt phòng được tạo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    {selectedExistingGuest ? (
                      <div className="p-3.5 bg-emerald-50/80 border border-emerald-300 rounded-2xl flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-emerald-500 text-white rounded-xl mt-0.5">
                            <CheckCircle2 size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-800">
                                {selectedExistingGuest.fullName}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Đã chọn
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                              <span>📞 {selectedExistingGuest.phone}</span>
                              {selectedExistingGuest.idNumber && (
                                <span>🪪 CCCD/Hộ chiếu: {selectedExistingGuest.idNumber}</span>
                              )}
                              {selectedExistingGuest.email && <span>✉️ {selectedExistingGuest.email}</span>}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExistingGuest(null);
                            setCreateGuestId('');
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-red-600 bg-white border border-slate-200 rounded-lg hover:border-red-200 shadow-xs cursor-pointer"
                        >
                          Đổi khách khác
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search size={16} />
                          </div>
                          <input
                            type="text"
                            value={guestSearchQuery}
                            onChange={(e) => setGuestSearchQuery(e.target.value)}
                            placeholder="🔍 Tìm theo Tên, Số điện thoại hoặc Số CCCD/Hộ chiếu..."
                            className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                          />
                          {guestSearchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setGuestSearchQuery('');
                                setSearchedGuests([]);
                              }}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>

                        {/* Search Results List: Chỉ hiện khi người dùng nhập từ khóa tìm kiếm */}
                        {guestSearchQuery.trim().length > 0 && (
                          <div className="max-h-56 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-1.5 bg-white shadow-xs">
                            {searchingGuests || guestSearchQuery.trim() !== debouncedGuestSearch.trim() ? (
                              <div className="py-6 text-center text-xs text-slate-400">
                                <RefreshCw size={14} className="animate-spin inline mr-1.5 text-amber-500" />
                                Đang tra cứu danh bạ khách hàng...
                              </div>
                            ) : searchedGuests.length === 0 ? (
                              <div className="py-5 text-center space-y-2">
                                <p className="text-xs text-slate-500">
                                  Không tìm thấy khách hàng nào khớp với "<strong>{guestSearchQuery}</strong>"
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGuestInputMode('NEW');
                                    if (/^[0-9]+$/.test(guestSearchQuery)) {
                                      setGuestPhone(guestSearchQuery);
                                    } else if (guestSearchQuery) {
                                      setGuestFullName(guestSearchQuery);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-xs cursor-pointer"
                                >
                                  <Plus size={13} /> Tạo mới hồ sơ cho khách này
                                </button>
                              </div>
                            ) : (
                              searchedGuests.map((g) => (
                                <div
                                  key={g.guestId}
                                  onClick={() => {
                                    setSelectedExistingGuest(g);
                                    setCreateGuestId(g.guestId);
                                  }}
                                  className="p-2.5 rounded-xl hover:bg-amber-50/80 border border-transparent hover:border-amber-200 transition-all cursor-pointer flex items-center justify-between"
                                >
                                  <div>
                                    <div className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                                      {g.fullName}
                                      {g.idNumber && (
                                        <span className="font-mono text-[11px] font-semibold text-slate-500">
                                          • CCCD: {g.idNumber}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                                      <span>📞 {g.phone}</span>
                                      {g.email && <span>✉️ {g.email}</span>}
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-bold text-amber-600 bg-amber-100/60 px-2.5 py-1 rounded-lg">
                                    Chọn
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Stay Dates & Guests Section: Ngày nhận phòng, Ngày trả phòng & Số lượng khách (Đặt ngay sau thông tin khách) */}
              <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 font-bold">
                      <CalendarDays size={16} />
                    </span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Thời gian lưu trú & Số lượng khách
                    </span>
                  </div>
                  {createNights > 0 && (
                    <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                      Thời gian: {createNights} đêm
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày nhận phòng (*)
                    </label>
                    <input
                      type="date"
                      required
                      value={createCheckIn}
                      onChange={(e) => setCreateCheckIn(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày trả phòng (*)
                    </label>
                    <input
                      type="date"
                      required
                      min={createCheckIn || todayStr}
                      value={createCheckOut}
                      onChange={(e) => setCreateCheckOut(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-0.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số người lớn (*)
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={createAdults}
                      onChange={(e) => setCreateAdults(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số trẻ em
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={createChildren}
                      onChange={(e) => setCreateChildren(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nguồn đặt phòng
                    </label>
                    <select
                      value={createBookingSource}
                      onChange={(e) => setCreateBookingSource(e.target.value as BookingSource)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="PHONE">PHONE (Điện thoại)</option>
                      <option value="WALK_IN">WALK_IN (Khách vãng lai)</option>
                      <option value="WEBSITE">WEBSITE (Trực tuyến)</option>
                      <option value="OTA">OTA (Booking/Agoda...)</option>
                      <option value="OTHER">OTHER (Khác)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Room Selection Section */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hạng phòng (*)</label>
                <select
                  required
                  value={createRoomTypeId}
                  onChange={(e) => setCreateRoomTypeId(Number(e.target.value) || '')}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="">-- Chọn hạng phòng khách sạn --</option>
                  {roomTypesList.map((rt) => (
                    <option key={rt.roomTypeId} value={rt.roomTypeId}>
                      {rt.name} — {rt.bedType || 'Tiêu chuẩn'} • Tối đa {rt.maxAdults} NL, {rt.maxChildren} TE • {formatVND(rt.basePrice)}/đêm
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Room Type Details Card */}
              {selectedRoomType && (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
                        <BedDouble size={16} />
                      </span>
                      <div>
                        <span className="font-extrabold text-sm text-slate-800">{selectedRoomType.name}</span>
                        {selectedRoomType.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">{selectedRoomType.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-full whitespace-nowrap">
                      {formatVND(selectedRoomType.basePrice)} / đêm
                    </span>
                  </div>

                  {/* Room Specs Highlights */}
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div className="bg-white/90 p-2.5 rounded-xl border border-amber-100 flex items-center gap-2">
                      <BedDouble size={18} className="text-amber-600 shrink-0" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Loại giường</div>
                        <div className="text-xs font-extrabold text-slate-800">
                          {selectedRoomType.bedType || 'Tiêu chuẩn'}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/90 p-2.5 rounded-xl border border-amber-100 flex items-center gap-2">
                      <Users size={18} className="text-blue-600 shrink-0" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Sức chứa tối đa</div>
                        <div className="text-xs font-extrabold text-slate-800">
                          {selectedRoomType.maxAdults} NL + {selectedRoomType.maxChildren} TE
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/90 p-2.5 rounded-xl border border-amber-100 flex items-center gap-2">
                      <Maximize2 size={18} className="text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Diện tích</div>
                        <div className="text-xs font-extrabold text-slate-800">
                          {selectedRoomType.areaSqm || 25} m²
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price Calculation for Stay */}
                  {createNights > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-amber-200/50 text-xs">
                      <span className="text-slate-600 font-medium">
                        Tạm tính tiền phòng ({createNights} đêm × {formatVND(selectedRoomType.basePrice)}):
                      </span>
                      <span className="text-sm font-black text-amber-700">
                        {formatVND(selectedRoomType.basePrice * createNights)}
                      </span>
                    </div>
                  )}

                  {/* Capacity Warning Alert */}
                  {isOverCapacity && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs font-semibold">
                      <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <strong>Cảnh báo vượt sức chứa:</strong> Số khách bạn chọn ({createAdults} người lớn, {createChildren} trẻ em) vượt quá mức tối đa ({selectedRoomType.maxAdults} NL, {selectedRoomType.maxChildren} TE) của hạng phòng này!
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Optional Specific Room Selection */}
              {selectedRoomType && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Chỉ định phòng cụ thể (Tùy chọn)</span>
                    {loadingSpecificRooms && (
                      <span className="text-[11px] text-amber-600 font-normal flex items-center gap-1">
                        <RefreshCw size={11} className="animate-spin" /> Đang tải phòng...
                      </span>
                    )}
                  </label>
                  <select
                    value={createSpecificRoomId}
                    onChange={(e) => setCreateSpecificRoomId(Number(e.target.value) || '')}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="">-- Tự động phân bổ phòng trống khả dụng --</option>
                    {specificRooms.map((rm) => (
                      <option
                        key={rm.roomId}
                        value={rm.roomId}
                        disabled={rm.isAvailable === false}
                        className={rm.isAvailable === false ? 'text-slate-400 bg-slate-100 italic' : 'text-slate-800 font-medium'}
                      >
                        Phòng {rm.roomNumber} (Tầng {rm.floorNo}) {rm.isAvailable === false ? '• [ĐÃ CÓ KHÁCH ĐẶT / GIỮ CHỖ]' : '• [Trống sẵn sàng]'}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {specificRooms.length > 0 ? (
                      <>
                        Hạng phòng này có <strong>{specificRooms.filter((r) => r.isAvailable !== false).length}/{specificRooms.length}</strong> phòng còn trống trong khoảng ngày đã chọn.
                      </>
                    ) : (
                      'Nếu để trống, hệ thống sẽ tự động gán phòng còn trống khi khách làm thủ tục Check-in.'
                    )}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú đặc biệt</label>
                <textarea
                  rows={2}
                  value={createNote}
                  onChange={(e) => setCreateNote(e.target.value)}
                  placeholder="Yêu cầu tầng cao, nhận phòng muộn..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              {/* Policy Applied for this Reservation (Read-only, Auto-selected) */}
              <div className="p-3.5 bg-amber-50/50 border border-amber-200/70 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Scale size={15} className="text-amber-600" /> Chính sách khách sạn áp dụng
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                    Tự động áp dụng theo chính sách hiện hành
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                  {/* Cancellation Policy Display */}
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1 shadow-2xs">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Chính sách hủy phòng
                    </div>
                    <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                      <span>{activeCancelPolicy ? activeCancelPolicy.name : 'Đang tải chính sách...'}</span>
                    </div>
                    {activeCancelPolicy && (
                      <div className="text-[11px] text-slate-500 leading-tight">
                        {activeCancelPolicy.freeCancelHours > 0
                          ? `Hủy miễn phí trước ${activeCancelPolicy.freeCancelHours} giờ`
                          : 'Không hủy miễn phí'}
                        {' • '}
                        {activeCancelPolicy.penaltyType === 'ONE_NIGHT' && 'Phạt 1 đêm'}
                        {activeCancelPolicy.penaltyType === 'PERCENT_TOTAL' && `Phạt ${activeCancelPolicy.penaltyValue}% tổng tiền`}
                        {activeCancelPolicy.penaltyType === 'PERCENT_DEPOSIT' && `Phạt ${activeCancelPolicy.penaltyValue}% tiền cọc`}
                        {activeCancelPolicy.penaltyType === 'FULL_DEPOSIT' && 'Giữ toàn bộ tiền cọc'}
                        {activeCancelPolicy.penaltyType === 'FIXED_AMOUNT' && `Phạt ${formatVND(activeCancelPolicy.penaltyValue)}`}
                        {activeCancelPolicy.penaltyType === 'NONE' && 'Miễn phí phạt'}
                      </div>
                    )}
                  </div>

                  {/* Early Checkout Policy Display */}
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1 shadow-2xs">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Chính sách trả phòng sớm
                    </div>
                    <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Clock size={14} className="text-blue-600 shrink-0" />
                      <span>{activeEarlyPolicy ? activeEarlyPolicy.name : 'Đang tải chính sách...'}</span>
                    </div>
                    {activeEarlyPolicy && (
                      <div className="text-[11px] text-slate-500 leading-tight">
                        {activeEarlyPolicy.penaltyType === 'NONE' && 'Miễn phạt khi trả phòng sớm'}
                        {activeEarlyPolicy.penaltyType === 'ONE_NIGHT' && 'Phụ thu 1 đêm kế tiếp'}
                        {activeEarlyPolicy.penaltyType === 'PERCENT_REMAINING' && `Phạt ${activeEarlyPolicy.penaltyValue}% tiền các đêm còn lại`}
                        {activeEarlyPolicy.penaltyType === 'FULL_REMAINING' && 'Tính đủ tiền toàn bộ các đêm còn lại'}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  * Chính sách sẽ được tự động lưu Snapshot cố định cho đơn đặt này, đảm bảo quyền lợi nhất quán cho khách hàng.
                </p>
              </div>

              {/* Optional Instant Deposit Section */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createInstantDeposit}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCreateInstantDeposit(checked);
                      if (checked && instantDepositAmount === 0 && selectedRoomType) {
                        setInstantDepositAmount(selectedRoomType.basePrice);
                      }
                    }}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Khách đặt cọc ngay khi đặt phòng (Chuyển khoản / Tiền mặt / Thẻ)
                  </span>
                </label>

                {createInstantDeposit && (
                  <div className="mt-2.5 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
                    <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CreditCard size={15} /> Ghi nhận cọc ngay (Tự động xác nhận đơn nếu đủ cọc 1 đêm)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <CurrencyInput
                          label="Số tiền cọc"
                          value={instantDepositAmount}
                          onChange={setInstantDepositAmount}
                          helperText={`Gợi ý: ${formatVND(selectedRoomType?.basePrice || 0)}`}
                          inputClassName="bg-white border-emerald-200 text-emerald-700 py-1.5 text-xs rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Hình thức cọc</label>
                        <select
                          value={instantDepositMethod}
                          onChange={(e) => setInstantDepositMethod(e.target.value as PaymentMethod)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-200 rounded-lg focus:outline-none"
                        >
                          <option value="TRANSFER">Chuyển khoản (TRANSFER)</option>
                          <option value="CASH">Tiền mặt (CASH)</option>
                          <option value="CREDIT_CARD">Thẻ POS / Tín dụng</option>
                          <option value="OTHER">Hình thức khác</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Mã giao dịch / Ghi chú</label>
                        <input
                          type="text"
                          value={instantDepositRef}
                          onChange={(e) => setInstantDepositRef(e.target.value)}
                          placeholder="Mã GD ngân hàng..."
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-200 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              </div>

              {/* Modal Footer - Fixed */}
              <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {submittingCreate ? 'Đang tạo...' : 'Xác nhận đặt phòng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHI TIẾT ĐƠN ĐẶT PHÒNG */}
      {selectedResId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {loadingDetail || !detail ? (
              <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center">
                <RefreshCw className="animate-spin mb-2" size={28} />
                <span className="text-sm">Đang tải chi tiết đơn đặt phòng...</span>
              </div>
            ) : (
              <>
                {/* Fixed Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between shrink-0 bg-white">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-black text-slate-800">
                        Đơn đặt phòng #{detail.reservationCode}
                      </h2>
                      {getStatusBadge(detail.status)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Nguồn: <strong className="uppercase">{detail.bookingSource}</strong> | Tạo lúc:{' '}
                      {new Date(detail.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedResId(null);
                      setDetail(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="modal-scrollable-body p-6 overflow-y-auto flex-1 min-h-0 space-y-6">
                {/* 4 Overview Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Guest Info */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Users size={14} /> Khách hàng
                    </div>
                    <div className="font-extrabold text-slate-800 text-base">{detail.guest.fullName}</div>
                    <div className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                      <Phone size={12} /> {detail.guest.phone}
                    </div>
                    {detail.guest.email && (
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Mail size={12} /> {detail.guest.email}
                      </div>
                    )}
                  </div>

                  {/* Dates & Capacity */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Calendar size={14} /> Lịch lưu trú
                    </div>
                    <div className="font-bold text-slate-800 text-sm">
                      {detail.checkInDate} <ArrowRight size={12} className="inline mx-1 text-slate-400" />{' '}
                      {detail.checkOutDate}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Thời lượng: <strong>{detail.nights} đêm</strong>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Khách: {detail.adults} người lớn, {detail.children} trẻ em
                    </div>
                  </div>

                  {/* Finance & Deposits */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <DollarSign size={14} /> Tài chính & Đặt cọc
                    </div>
                    <div className="text-lg font-black text-slate-900">{formatVND(detail.totalAmount)}</div>
                    <div className="text-xs mt-1">
                      Đã cọc:{' '}
                      <strong className={detail.isDepositMet ? 'text-emerald-600' : 'text-amber-600'}>
                        {formatVND(detail.depositAmount)}
                      </strong>{' '}
                      / Yêu cầu {formatVND(detail.requiredDepositAmount)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {detail.isDepositMet ? '✓ Đã đủ cọc tối thiểu' : '⚠ Chưa đủ cọc 1 đêm'}
                    </div>
                    {detail.status === 'PENDING' && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between gap-1">
                        <span className="text-[11px] font-medium text-slate-500">
                          {detail.depositAmount > 0 ? 'Đã nhận một phần cọc' : 'Chưa nhận cọc'}
                        </span>
                        {canConfirmManual && (
                          <button
                            type="button"
                            onClick={handleConfirmReservation}
                            className="text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                          >
                            Xác nhận cọc ngay
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Applied Policies Snapshot */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Scale size={14} /> Chính sách áp dụng
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Chính sách hủy:</span>
                        <div className="font-bold text-slate-800">
                          {detail.cancellationPolicy?.name || 'Hủy Tiêu chuẩn (3 ngày)'}
                        </div>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200/60">
                        <span className="text-[11px] text-slate-400 block">Trả phòng sớm:</span>
                        <div className="font-bold text-slate-800">
                          {detail.earlyCheckoutPolicy?.name || 'Trả sớm Linh hoạt (Miễn phạt)'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cancelled Info Banner if cancelled */}
                {detail.status === 'CANCELLED' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 space-y-1.5">
                    <div className="font-bold text-sm flex items-center gap-1.5 text-red-700">
                      <Ban size={16} /> Đơn đã hủy theo chính sách
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-medium">
                      <div>Phí hủy: <strong className="text-red-700">{formatVND(detail.cancellationFee || 0)}</strong></div>
                      <div>Hoàn cọc: <strong className="text-emerald-700">{formatVND(detail.refundAmount || 0)}</strong></div>
                      <div className="col-span-2">Chính sách: <strong>{detail.cancellationPolicy?.name || 'Tiêu chuẩn'}</strong></div>
                    </div>
                    {detail.overrideReason && (
                      <div className="pt-1 border-t border-red-200/80 text-purple-700 font-medium italic">
                        ★ Quản lý can thiệp ngoại lệ: "{detail.overrideReason}"
                      </div>
                    )}
                  </div>
                )}

                {/* Assigned Rooms */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <BedDouble size={16} className="text-amber-600" />
                    Danh sách phòng đã giữ chỗ ({detail.rooms.length} phòng)
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Hạng phòng</th>
                          <th className="py-2.5 px-3">Số phòng gán tạm</th>
                          <th className="py-2.5 px-3 text-right">Giá mỗi đêm</th>
                          <th className="py-2.5 px-3 text-center">Trạng thái phòng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail.rooms.map((r) => (
                          <tr key={r.reservationRoomId}>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{r.roomTypeName}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-700">
                              {r.roomNumber ? `Phòng ${r.roomNumber}` : 'Chưa chỉ định'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium">{formatVND(r.pricePerNight)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payments & Deposits History */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <CreditCard size={16} className="text-emerald-600" />
                      Lịch sử đặt cọc & thanh toán ({detail.payments.length})
                    </h3>
                    {(detail.status === 'PENDING' || detail.status === 'CONFIRMED') && (
                      <button
                        onClick={() => {
                          const suggestedDeposit = Math.max(0, detail.requiredDepositAmount - detail.depositAmount);
                          setDepositAmount(suggestedDeposit > 0 ? suggestedDeposit : 500000);
                          setIsDepositModalOpen(true);
                        }}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={14} /> Ghi nhận cọc mới
                      </button>
                    )}
                  </div>

                  {detail.payments.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl text-center text-xs text-slate-400">
                      Chưa có khoản đặt cọc nào cho đơn này.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Thời gian</th>
                            <th className="py-2 px-3">Hình thức</th>
                            <th className="py-2 px-3">Mã tham chiếu</th>
                            <th className="py-2 px-3 text-right">Số tiền</th>
                            <th className="py-2 px-3 text-center">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detail.payments.map((p) => (
                            <tr key={p.paymentId}>
                              <td className="py-2 px-3 text-slate-500">
                                {new Date(p.paidAt).toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2 px-3 font-semibold">{p.method}</td>
                              <td className="py-2 px-3 font-mono text-slate-600">{p.referenceCode || '-'}</td>
                              <td
                                className={`py-2 px-3 text-right font-bold ${
                                  p.status === 'REFUNDED' ? 'text-red-600' : 'text-emerald-600'
                                }`}
                              >
                                {p.status === 'REFUNDED' ? '-' : '+'}
                                {formatVND(p.amount)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    p.status === 'SUCCESS'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-red-50 text-red-700'
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Footer Action Buttons */}
              <div className="shrink-0 px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex items-center justify-between gap-3">
                  {/* Cụm nút bên trái: Hủy / No-Show */}
                  <div className="flex items-center gap-2">
                    {(detail.status === 'PENDING' || detail.status === 'CONFIRMED') && (
                      <button
                        onClick={() => handleOpenCancelModal(detail)}
                        className="h-9 px-3 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Ban size={14} /> Hủy đơn đặt phòng
                      </button>
                    )}

                    {detail.status === 'CONFIRMED' && (
                      <button
                        onClick={handleMarkNoShow}
                        className="h-9 px-3 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <UserX size={14} /> Khách vắng mặt (No-Show)
                      </button>
                    )}
                  </div>

                  {/* Cụm nút bên phải: Xác nhận / Nhận phòng / Đóng */}
                  <div className="flex items-center gap-2.5 ml-auto">
                    {/* Nút xác nhận cho Receptionist/Manager/Admin */}
                    {detail.status === 'PENDING' && canConfirmManual && (
                      <button
                        onClick={handleConfirmReservation}
                        className="h-9 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <CheckCircle2 size={15} /> Xác nhận đã nhận cọc
                      </button>
                    )}

                    {/* Nút Nhận phòng cho CONFIRMED */}
                    {detail.status === 'CONFIRMED' && (
                      <button
                        onClick={() => navigate(`/frontdesk?checkInRes=${detail.reservationId}`)}
                        className="h-9 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <LogIn size={15} /> Nhận phòng (Check-in)
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedResId(null);
                        setDetail(null);
                      }}
                      className="h-9 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: GHI NHẬN ĐẶT CỌC */}
      {isDepositModalOpen && detail && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800">Ghi nhận tiền đặt cọc</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cọc tối thiểu: <strong>{formatVND(detail.requiredDepositAmount)}</strong> (1 đêm).
                </p>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Modal Body */}
              <div className="modal-scrollable-body p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
                <CurrencyInput
                  label="Số tiền đặt cọc"
                  required
                  min={1000}
                  value={depositAmount}
                  onChange={setDepositAmount}
                  helperText="Tối thiểu 1,000 đ"
                  inputClassName="bg-slate-50 border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hình thức thanh toán</label>
                  <select
                    value={depositMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="TRANSFER">TRANSFER (Chuyển khoản ngân hàng)</option>
                    <option value="CASH">CASH (Tiền mặt)</option>
                    <option value="CARD">CARD (Quẹt thẻ)</option>
                    <option value="EWALLET">EWALLET (Ví điện tử)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã giao dịch / Tham chiếu</label>
                  <input
                    type="text"
                    value={depositRef}
                    onChange={(e) => setDepositRef(e.target.value)}
                    placeholder="Ví dụ: VCB-987654321"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Modal Footer - Fixed */}
              <div className="shrink-0 px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingDeposit}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {submittingDeposit ? 'Đang lưu...' : 'Lưu cọc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: HỦY ĐƠN ĐẶT PHÒNG THEO CHÍNH SÁCH */}
      {isCancelModalOpen && detail && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2 text-red-600">
                  <Ban size={20} /> Xác nhận hủy đơn đặt phòng #{detail.reservationCode}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đối chiếu chính sách hủy đã chốt (Snapshot) khi tạo đơn.
                </p>
              </div>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {loadingCancelPreview ? (
              <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                <RefreshCw className="animate-spin mb-2" size={24} />
                Đang đối soát chính sách và tính toán tiền cọc / phí hủy...
              </div>
            ) : cancelPreview ? (
              <form onSubmit={handleCancelSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Modal Body */}
                <div className="modal-scrollable-body p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
                  {/* Policy Applied Badge & Explanation */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Scale size={14} className="text-amber-700" /> Chính sách áp dụng:
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-200/80 font-bold text-amber-900 text-[11px]">
                        {cancelPreview.policyName} ({cancelPreview.policyCode})
                      </span>
                    </div>
                    <div className="text-slate-700 bg-white/80 p-2.5 rounded-xl border border-amber-100">
                      <div className="font-semibold text-slate-900 mb-0.5">Quy tắc tính phí hủy:</div>
                      <p className="text-slate-600">{cancelPreview.explanation}</p>
                    </div>
                  </div>

                  {/* Calculation Breakdown */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Tổng tiền phòng dự kiến:</span>
                      <span className="font-semibold text-slate-800">{formatVND(cancelPreview.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tiền khách đã đặt cọc:</span>
                      <span className="font-bold text-emerald-700">{formatVND(cancelPreview.totalDeposit)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200">
                      <span>Phí hủy theo chính sách:</span>
                      <span className="font-bold text-red-600 text-sm">
                        {isOverrideCancelFee ? formatVND(overrideCancelFee) : formatVND(cancelPreview.cancellationFee)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 font-bold">
                      <span className="text-slate-900">
                        {(isOverrideCancelFee
                          ? Math.max(0, cancelPreview.totalDeposit - overrideCancelFee)
                          : cancelPreview.refundAmount) > 0
                          ? 'Số tiền hoàn lại cho khách:'
                          : 'Số tiền phạt cọc giữ lại:'}
                      </span>
                      <span className="text-base text-emerald-600">
                        {formatVND(
                          isOverrideCancelFee
                            ? Math.max(0, cancelPreview.totalDeposit - overrideCancelFee)
                            : cancelPreview.refundAmount
                        )}
                      </span>
                    </div>
                    {(isOverrideCancelFee
                      ? Math.max(0, overrideCancelFee - cancelPreview.totalDeposit)
                      : cancelPreview.shortfallAmount) > 0 && (
                      <div className="flex justify-between items-center text-rose-600 font-bold text-xs bg-rose-50 p-2 rounded-lg">
                        <span>Khoản phạt vượt cọc (Cần thu thêm):</span>
                        <span>
                          {formatVND(
                            isOverrideCancelFee
                              ? Math.max(0, overrideCancelFee - cancelPreview.totalDeposit)
                              : cancelPreview.shortfallAmount
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Manager Exception Override */}
                  {hasAnyRole(['ADMIN', 'MANAGER']) && (
                    <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2.5">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-purple-900">
                        <input
                          type="checkbox"
                          checked={isOverrideCancelFee}
                          onChange={(e) => {
                            setIsOverrideCancelFee(e.target.checked);
                            if (!e.target.checked) {
                              setOverrideCancelFee(cancelPreview.cancellationFee);
                              setOverrideCancelReason('');
                            }
                          }}
                          className="w-4 h-4 text-purple-600 rounded border-purple-300 focus:ring-purple-400"
                        />
                        ★ Phê duyệt ngoại lệ Quản lý (Manager Policy Override)
                      </label>

                      {isOverrideCancelFee && (
                        <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                          <CurrencyInput
                            label="Phí hủy điều chỉnh ngoại lệ (VND)"
                            value={overrideCancelFee}
                            onChange={setOverrideCancelFee}
                            helperText="Quản lý có thể giảm hoặc miễn phí hủy (0 đ) trong trường hợp bất khả kháng"
                            inputClassName="bg-white border-purple-200 text-purple-900 py-1.5 text-xs rounded-lg"
                          />
                          <div>
                            <label className="block text-[11px] font-bold text-purple-900 mb-0.5">
                              Lý do phê duyệt ngoại lệ <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required={isOverrideCancelFee}
                              value={overrideCancelReason}
                              onChange={(e) => setOverrideCancelReason(e.target.value)}
                              placeholder="VD: Khách ốm đột xuất có giấy y tế, Quản lý duyệt miễn phạt..."
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Lý do hủy đơn</label>
                    <textarea
                      rows={2}
                      required
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Khách thay đổi lịch trình, hủy chuyến đi..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                {/* Modal Footer - Fixed */}
                <div className="shrink-0 px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCancel}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md shadow-red-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {submittingCancel ? 'Đang hủy...' : 'Đồng ý hủy đơn'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
