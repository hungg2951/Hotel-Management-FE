import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Trash2,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  Sparkles,
  RotateCcw,
  X,
  ShieldAlert,
  Wallet,
  Clock,
  Building,
  Layers,
  Lock,
} from 'lucide-react';
import { billingService } from '../../services/billingService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import type {
  FolioDetail,
  FolioSummary,
  FolioItemRequest,
  PaymentRequest,
  InvoiceRequest,
  FolioItemType,
  PaymentMethod,
  PaymentStatus,
  HotelService,
} from '../../types/billing';

export const BillingPage: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const { showToast } = useToast();
  const canDeleteItems = hasAnyRole(['ADMIN', 'MANAGER']);

  // Folio state
  const [folioIdInput, setFolioIdInput] = useState<string>('');
  const [folio, setFolio] = useState<FolioDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [recentFolios, setRecentFolios] = useState<FolioSummary[]>([]);

  // Open Folio Modal (for creating demo/real folio by stayId)
  const [isOpenFolioModalOpen, setIsOpenFolioModalOpen] = useState<boolean>(false);
  const [newStayId, setNewStayId] = useState<number>(1);
  const [openingFolio, setOpeningFolio] = useState<boolean>(false);

  // Active services for selection
  const [activeServices, setActiveServices] = useState<HotelService[]>([]);

  // Add Item Modal
  const [isAddItemOpen, setIsAddItemOpen] = useState<boolean>(false);
  const [itemType, setItemType] = useState<FolioItemType>('SERVICE');
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>('');
  const [itemDescription, setItemDescription] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(0);
  const [submittingItem, setSubmittingItem] = useState<boolean>(false);

  // Add Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('SUCCESS');
  const [referenceCode, setReferenceCode] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);

  // Create Invoice Modal
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerTaxCode, setBuyerTaxCode] = useState<string>('');
  const [buyerAddress, setBuyerAddress] = useState<string>('');
  const [submittingInvoice, setSubmittingInvoice] = useState<boolean>(false);

  // Print Invoice Preview Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Delete Item Confirmation
  const [itemToDeleteId, setItemToDeleteId] = useState<number | null>(null);
  const [deletingItem, setDeletingItem] = useState<boolean>(false);

  // Fetch Folio
  const loadFolio = useCallback(
    async (id: number) => {
      try {
        setLoading(true);
        const data = await billingService.getFolioById(id);
        setFolio(data);
        setFolioIdInput(String(id));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không tìm thấy Folio';
        showToast(msg, 'error');
        setFolio(null);
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  const fetchRecentFolios = useCallback(async () => {
    try {
      const res = await billingService.getFolios({ size: 20 });
      const list = res.content || [];
      setRecentFolios(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  // Initial load
  useEffect(() => {
    // Load active hotel services for add fee dropdown
    billingService
      .getHotelServices({ activeOnly: true, size: 100 })
      .then((res) => setActiveServices(res.content || []))
      .catch(() => {});

    // Load recent folios and pick the first one if available
    fetchRecentFolios().then((list) => {
      if (list.length > 0) {
        loadFolio(list[0].folioId);
      }
    });
  }, [loadFolio, fetchRecentFolios]);

  const handleOpenNewFolioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStayId || newStayId <= 0) {
      showToast('Vui lòng nhập mã lượt lưu trú (Stay ID) hợp lệ', 'error');
      return;
    }
    try {
      setOpeningFolio(true);
      const newFolioId = await billingService.openFolio(newStayId);
      showToast(`Mở thành công Folio #${newFolioId} cho Lượt lưu trú #${newStayId}`, 'success');
      setIsOpenFolioModalOpen(false);
      loadFolio(newFolioId);
      fetchRecentFolios();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể mở Folio';
      showToast(msg, 'error');
    } finally {
      setOpeningFolio(false);
    }
  };

  const handleSearchFolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folioIdInput.trim()) {
      showToast('Vui lòng nhập mã Folio để tra cứu', 'warning');
      return;
    }
    const id = parseInt(folioIdInput.trim(), 10);
    if (isNaN(id) || id <= 0) {
      showToast('Vui lòng nhập mã Folio hợp lệ', 'error');
      return;
    }
    loadFolio(id);
  };

  // Open Add Item Modal
  const handleOpenAddItem = () => {
    setItemType('SERVICE');
    if (activeServices.length > 0) {
      setSelectedServiceId(activeServices[0].serviceId);
      setItemUnitPrice(activeServices[0].unitPrice);
      setItemDescription(activeServices[0].name);
    } else {
      setSelectedServiceId('');
      setItemUnitPrice(50000);
      setItemDescription('');
    }
    setItemQuantity(1);
    setIsAddItemOpen(true);
  };

  const handleServiceChange = (serviceId: number) => {
    setSelectedServiceId(serviceId);
    const svc = activeServices.find((s) => s.serviceId === serviceId);
    if (svc) {
      setItemUnitPrice(svc.unitPrice);
      setItemDescription(svc.name);
    }
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folio) return;

    if (itemType === 'SERVICE' && !selectedServiceId) {
      showToast('Vui lòng chọn dịch vụ từ danh mục', 'error');
      return;
    }
    if (itemQuantity <= 0) {
      showToast('Số lượng phải lớn hơn 0', 'error');
      return;
    }
    if (itemUnitPrice < 0) {
      showToast('Đơn giá không được âm', 'error');
      return;
    }

    try {
      setSubmittingItem(true);
      const req: FolioItemRequest = {
        itemType,
        serviceId: itemType === 'SERVICE' ? (selectedServiceId as number) : undefined,
        description: itemDescription.trim() || undefined,
        quantity: itemQuantity,
        unitPrice: itemUnitPrice,
      };
      await billingService.addFolioItem(folio.folioId, req);
      showToast('Đã thêm khoản phí vào Folio thành công!', 'success');
      setIsAddItemOpen(false);
      loadFolio(folio.folioId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thêm khoản phí thất bại';
      showToast(msg, 'error');
    } finally {
      setSubmittingItem(false);
    }
  };

  // Remove Item
  const handleConfirmDeleteItem = async () => {
    if (!folio || !itemToDeleteId) return;
    try {
      setDeletingItem(true);
      await billingService.removeFolioItem(folio.folioId, itemToDeleteId);
      showToast('Đã xóa khoản phí khỏi Folio!', 'success');
      setItemToDeleteId(null);
      loadFolio(folio.folioId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa khoản phí';
      showToast(msg, 'error');
    } finally {
      setDeletingItem(false);
    }
  };

  // Open Payment Modal
  const handleOpenPayment = (status: PaymentStatus = 'SUCCESS') => {
    if (!folio) return;
    setPaymentStatus(status);
    setPaymentMethod('TRANSFER');
    setReferenceCode('');
    if (status === 'SUCCESS') {
      // Gợi ý số dư còn lại
      setPaymentAmount(Math.max(0, folio.balance));
    } else {
      setPaymentAmount(0);
    }
    setIsPaymentOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folio) return;
    if (paymentAmount <= 0) {
      showToast('Số tiền thanh toán phải lớn hơn 0', 'error');
      return;
    }

    try {
      setSubmittingPayment(true);
      const req: PaymentRequest = {
        method: paymentMethod,
        amount: paymentAmount,
        status: paymentStatus,
        referenceCode: referenceCode.trim() || undefined,
      };
      await billingService.recordPayment(folio.folioId, req);
      showToast(
        paymentStatus === 'SUCCESS'
          ? 'Ghi nhận thanh toán thành công!'
          : 'Ghi nhận hoàn tiền thành công!',
        'success'
      );
      setIsPaymentOpen(false);
      loadFolio(folio.folioId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thanh toán thất bại';
      showToast(msg, 'error');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Open Invoice Modal
  const handleOpenInvoiceModal = () => {
    if (!folio) return;
    if (folio.balance !== 0) {
      showToast(
        `Folio chưa cân bằng công nợ (còn dư: ${folio.balance.toLocaleString('vi-VN')} đ), không thể xuất hóa đơn VAT!`,
        'warning'
      );
      return;
    }
    setBuyerName('Công ty TNHH Khách hàng Thân thiết');
    setBuyerTaxCode('0101234567');
    setBuyerAddress('Hà Nội, Việt Nam');
    setIsInvoiceModalOpen(true);
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folio) return;

    try {
      setSubmittingInvoice(true);
      const req: InvoiceRequest = {
        buyerName: buyerName.trim() || undefined,
        buyerTaxCode: buyerTaxCode.trim() || undefined,
        buyerAddress: buyerAddress.trim() || undefined,
      };
      await billingService.createInvoice(folio.folioId, req);
      showToast('Xuất hóa đơn VAT 8% thành công!', 'success');
      setIsInvoiceModalOpen(false);
      loadFolio(folio.folioId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xuất hóa đơn VAT';
      showToast(msg, 'error');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const getMethodBadge = (m: PaymentMethod) => {
    switch (m) {
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <Banknote size={13} />
            <span>Tiền mặt</span>
          </span>
        );
      case 'CARD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
            <CreditCard size={13} />
            <span>Thẻ POS</span>
          </span>
        );
      case 'TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
            <ArrowRightLeft size={13} />
            <span>Chuyển khoản</span>
          </span>
        );
      case 'EWALLET':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
            <Smartphone size={13} />
            <span>Ví điện tử</span>
          </span>
        );
    }
  };

  const getItemTypeBadge = (t: FolioItemType) => {
    switch (t) {
      case 'ROOM':
        return (
          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
            TIỀN PHÒNG
          </span>
        );
      case 'SERVICE':
        return (
          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
            DỊCH VỤ
          </span>
        );
      case 'PENALTY':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
            PHẠT / ĐỀN BÙ
          </span>
        );
      case 'DISCOUNT':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            GIẢM GIÁ
          </span>
        );
      case 'TAX':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
            THUẾ / PHỤ PHÍ
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-950/20">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Receipt size={16} />
            <span>HỆ THỐNG THU NGÂN & THANH TOÁN (BILLING CONSOLE)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Quản lý Folio & Hóa đơn Điện tử
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Theo dõi chi phí lưu trú, ghi nhận phí minibar/dịch vụ, kiểm soát thanh toán đa phương thức và phát hành hóa đơn VAT 8%.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setNewStayId(recentFolios.length > 0 ? recentFolios.length + 1 : 1);
              setIsOpenFolioModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Mở Folio mới</span>
          </button>

          {/* Tra cứu Folio Bar */}
          <form onSubmit={handleSearchFolio} className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/15">
            <input
              type="number"
              min="1"
              placeholder="Nhập mã Folio..."
              value={folioIdInput}
              onChange={(e) => setFolioIdInput(e.target.value)}
              className="w-28 sm:w-36 px-3 py-1.5 bg-transparent text-white placeholder-slate-400 text-sm font-mono font-bold focus:outline-none no-spinner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="submit"
              disabled={loading || !folioIdInput.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-40"
            >
              <Search size={14} />
              <span>Tìm</span>
            </button>
          </form>
        </div>
      </div>

      {/* Quick Folio Selector Pills */}
      {recentFolios.length > 0 && (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 overflow-x-auto text-xs">
          <span className="font-bold text-slate-500 shrink-0">Chọn nhanh Folio:</span>
          <div className="flex items-center gap-2">
            {recentFolios.map((rf) => (
              <button
                key={rf.folioId}
                onClick={() => loadFolio(rf.folioId)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  folio?.folioId === rf.folioId
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Folio #{rf.folioId} (Stay #{rf.stayId})</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    rf.status === 'OPEN'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {rf.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent mb-3" />
          <p className="text-slate-500 text-sm font-semibold">Đang truy xuất thông tin Folio...</p>
        </div>
      ) : !folio ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 space-y-4">
          <Receipt size={52} className="mx-auto text-slate-300" />
          <h3 className="text-xl font-bold text-slate-800">Không tìm thấy Folio</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Vui lòng nhập mã Folio ở ô tìm kiếm hoặc khởi tạo một Folio mới theo mã lượt lưu trú (Stay ID) để thao tác thu ngân và phát hành hóa đơn VAT.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                setNewStayId(recentFolios.length + 1);
                setIsOpenFolioModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <Plus size={18} />
              <span>Khởi tạo Folio mới</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Folio Metadata & Status */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono font-black text-lg border border-indigo-100">
                #{folio.folioId}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">
                    Folio #{folio.folioId}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-slate-100 text-slate-600 font-bold">
                    Stay #{folio.stayId}
                  </span>
                  {folio.status === 'OPEN' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>ĐANG MỞ (OPEN)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300">
                      <span>ĐÃ ĐÓNG (CLOSED)</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock size={13} />
                    <span>Mở: {new Date(folio.createdAt).toLocaleString('vi-VN')}</span>
                  </span>
                  {folio.closedAt && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <span>Đóng: {new Date(folio.closedAt).toLocaleString('vi-VN')}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleOpenAddItem}
                disabled={folio.status !== 'OPEN'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus size={15} />
                <span>Thêm Phí / Dịch vụ</span>
              </button>

              <button
                onClick={() => handleOpenPayment('SUCCESS')}
                disabled={folio.status !== 'OPEN'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <CreditCard size={15} />
                <span>Thu tiền</span>
              </button>

              <button
                onClick={() => handleOpenPayment('REFUNDED')}
                disabled={folio.status !== 'OPEN' || folio.paidAmount <= 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCcw size={14} />
                <span>Hoàn tiền</span>
              </button>
            </div>
          </div>

          {/* 3 Master Financial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Total Amount */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-lg shadow-indigo-950/20 border border-indigo-800/40">
              <div className="flex items-center justify-between text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
                <span>Tổng chi phí phát sinh</span>
                <Layers size={18} className="text-indigo-400" />
              </div>
              <div className="text-3xl font-black font-mono tracking-tight text-white">
                {folio.totalAmount.toLocaleString('vi-VN')}
                <span className="text-lg font-medium text-indigo-300 ml-1.5">đ</span>
              </div>
              <p className="text-xs text-indigo-300/80 mt-2">
                Bao gồm tiền phòng, minibar, giặt ủi và các khoản giảm giá.
              </p>
            </div>

            {/* Paid Amount */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-800 to-teal-950 p-5 rounded-2xl text-white shadow-lg shadow-emerald-950/20 border border-emerald-700/40">
              <div className="flex items-center justify-between text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                <span>Đã thanh toán thực tế</span>
                <Wallet size={18} className="text-emerald-400" />
              </div>
              <div className="text-3xl font-black font-mono tracking-tight text-emerald-100">
                {folio.paidAmount.toLocaleString('vi-VN')}
                <span className="text-lg font-medium text-emerald-300 ml-1.5">đ</span>
              </div>
              <p className="text-xs text-emerald-300/80 mt-2">
                Tổng tiền mặt, thẻ POS, chuyển khoản (đã khấu trừ hoàn tiền).
              </p>
            </div>

            {/* Balance */}
            <div
              className={`relative overflow-hidden p-5 rounded-2xl text-white shadow-lg border ${
                folio.balance === 0
                  ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700'
                  : folio.balance > 0
                  ? 'bg-gradient-to-br from-amber-800 to-orange-950 border-amber-600/40 shadow-amber-950/20'
                  : 'bg-gradient-to-br from-purple-900 to-slate-900 border-purple-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-2 text-white/80">
                <span>Số dư công nợ còn lại</span>
                {folio.balance === 0 ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : (
                  <AlertTriangle size={18} className="text-amber-400" />
                )}
              </div>
              <div className="text-3xl font-black font-mono tracking-tight text-white">
                {folio.balance.toLocaleString('vi-VN')}
                <span className="text-lg font-medium text-white/80 ml-1.5">đ</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-bold">
                {folio.balance === 0 ? (
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <CheckCircle2 size={13} />
                    <span>ĐÃ CÂN BẰNG - ĐỦ ĐIỀU KIỆN XUẤT HÓA ĐƠN & CHECK-OUT</span>
                  </span>
                ) : folio.balance > 0 ? (
                  <span className="text-amber-300">CẦN THU THÊM TỪ KHÁCH HÀNG</span>
                ) : (
                  <span className="text-purple-300">KHÁCH NỘP THỪA - CẦN HOÀN TIỀN</span>
                )}
              </div>
            </div>
          </div>

          {/* Electronic Invoice (VAT) Banner / Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Hóa đơn Điện tử VAT (8%)
                    </h3>
                    {folio.invoice ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                        ĐÃ XUẤT HÓA ĐƠN
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                        CHƯA PHÁT HÀNH
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {folio.invoice
                      ? `Số HĐ: ${folio.invoice.invoiceNo} | Ngày xuất: ${new Date(
                          folio.invoice.issuedAt
                        ).toLocaleString('vi-VN')} | Người mua: ${
                          folio.invoice.buyerName || 'Khách lưu trú'
                        }`
                      : 'Hóa đơn giá trị gia tăng được phát hành khi số dư công nợ của Folio đã thanh toán hết (0 đ).'}
                  </p>
                </div>
              </div>

              <div>
                {folio.invoice ? (
                  <button
                    onClick={() => setIsPrintModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Printer size={16} />
                    <span>Xem & In Hóa đơn VAT</span>
                  </button>
                ) : (
                  <button
                    onClick={handleOpenInvoiceModal}
                    disabled={folio.balance !== 0}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title={
                      folio.balance !== 0
                        ? 'Cần thu hết công nợ về 0 để xuất hóa đơn'
                        : 'Xuất hóa đơn VAT điện tử'
                    }
                  >
                    <Sparkles size={16} />
                    <span>Xuất Hóa đơn Điện tử</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Grid: Folio Items & Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Folio Items (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Receipt size={18} className="text-indigo-600" />
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    Chi tiết Các khoản phí ({folio.items.length})
                  </h3>
                </div>
                {folio.status === 'OPEN' && (
                  <button
                    onClick={handleOpenAddItem}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Thêm phí</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto flex-1">
                {folio.items.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Chưa có khoản phí nào được ghi nhận.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                        <th className="py-3 px-3.5">Khoản mục</th>
                        <th className="py-3 px-2 text-center">SL</th>
                        <th className="py-3 px-3 text-right">Đơn giá</th>
                        <th className="py-3 px-3.5 text-right">Thành tiền</th>
                        {canDeleteItems && folio.status === 'OPEN' && (
                          <th className="py-3 px-2 text-center">Xóa</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {folio.items.map((item) => (
                        <tr key={item.itemId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2 mb-1">
                              {getItemTypeBadge(item.itemType)}
                              <span className="text-slate-400 text-[10px] font-mono">
                                #{item.itemId}
                              </span>
                            </div>
                            <div className="font-bold text-slate-800">
                              {item.serviceName || item.description || 'Khoản phí phòng'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {new Date(item.postedAt).toLocaleString('vi-VN')}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-700">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-slate-600">
                            {item.unitPrice.toLocaleString('vi-VN')} đ
                          </td>
                          <td
                            className={`py-3 px-3.5 text-right font-mono font-black ${
                              item.amount < 0 ? 'text-emerald-600' : 'text-slate-900'
                            }`}
                          >
                            {item.amount.toLocaleString('vi-VN')} đ
                          </td>
                          {canDeleteItems && folio.status === 'OPEN' && (
                            <td className="py-3 px-2 text-center">
                              {item.itemType === 'ROOM' ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 bg-slate-100 select-none"
                                  title="Khoản tiền phòng cố định theo đặt phòng - Không được phép xóa trực tiếp"
                                >
                                  <Lock size={11} className="text-slate-400" />
                                  <span>Cố định</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setItemToDeleteId(item.itemId)}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Xóa khoản phí phát sinh này (Chỉ Quản lý/Admin)"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Payments (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-emerald-600" />
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    Lịch sử Giao dịch ({folio.payments.length})
                  </h3>
                </div>
                {folio.status === 'OPEN' && (
                  <button
                    onClick={() => handleOpenPayment('SUCCESS')}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Thu tiền</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto flex-1">
                {folio.payments.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Chưa có giao dịch thanh toán nào.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                        <th className="py-3 px-3.5">Phương thức</th>
                        <th className="py-3 px-3.5 text-right">Số tiền</th>
                        <th className="py-3 px-3 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {folio.payments.map((p) => (
                        <tr key={p.paymentId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5">
                            <div className="mb-1">{getMethodBadge(p.method)}</div>
                            <div className="text-[11px] text-slate-400">
                              {new Date(p.paidAt).toLocaleString('vi-VN')}
                            </div>
                            {p.referenceCode && (
                              <div className="text-[10px] font-mono text-slate-500 truncate max-w-[130px]">
                                Ref: {p.referenceCode}
                              </div>
                            )}
                          </td>
                          <td
                            className={`py-3 px-3.5 text-right font-mono font-black ${
                              p.status === 'REFUNDED' ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {p.status === 'REFUNDED' ? '-' : '+'}
                            {p.amount.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-3 px-3 text-center">
                            {p.status === 'SUCCESS' ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Thành công
                              </span>
                            ) : p.status === 'REFUNDED' ? (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                Hoàn trả
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                                Thất bại
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Add Folio Item */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <Plus size={20} className="text-indigo-600" />
                <span>Thêm Khoản phí vào Folio</span>
              </h3>
              <button
                onClick={() => setIsAddItemOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="modal-scrollable-body p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Loại khoản phí <span className="text-rose-500">*</span>
                </label>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as FolioItemType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="SERVICE">Dịch vụ (Minibar, Giặt ủi, F&B...)</option>
                  <option value="PENALTY">Phạt / Làm hỏng đồ đạc</option>
                  <option value="DISCOUNT">Giảm giá / Voucher (Trừ vào tổng tiền)</option>
                  <option value="TAX">Thuế / Phụ phí khác</option>
                  <option value="ROOM">Tiền phòng bổ sung</option>
                </select>
              </div>

              {itemType === 'SERVICE' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Chọn dịch vụ từ Danh mục <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => handleServiceChange(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {activeServices.map((s) => (
                      <option key={s.serviceId} value={s.serviceId}>
                        {s.name} ({s.category}) - {s.unitPrice.toLocaleString('vi-VN')} đ / {s.unit}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mô tả / Lý do <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    placeholder="Ví dụ: Giảm giá voucher VIP, Làm vỡ cốc thủy tinh..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số lượng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <CurrencyInput
                  label="Đơn giá"
                  required
                  min={0}
                  value={itemUnitPrice}
                  onChange={setItemUnitPrice}
                  inputClassName="px-3.5 py-2.5 rounded-xl border-slate-200 text-sm font-mono font-extrabold focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Preview Total */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Thành tiền dự kiến:</span>
                <span
                  className={`font-mono font-black text-sm ${
                    itemType === 'DISCOUNT' ? 'text-emerald-600' : 'text-slate-900'
                  }`}
                >
                  {itemType === 'DISCOUNT' ? '-' : '+'}
                  {(itemQuantity * itemUnitPrice).toLocaleString('vi-VN')} đ
                </span>
              </div>

              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-bold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingItem}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingItem ? 'Đang lưu...' : 'Ghi nhận phí'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Record Payment */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <CreditCard size={20} className="text-emerald-600" />
                <span>
                  {paymentStatus === 'SUCCESS' ? 'Ghi nhận Thanh toán' : 'Ghi nhận Hoàn tiền'}
                </span>
              </h3>
              <button
                onClick={() => setIsPaymentOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="modal-scrollable-body p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phương thức thanh toán <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['CASH', 'CARD', 'TRANSFER', 'EWALLET'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        paymentMethod === m
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {m === 'CASH' && <Banknote size={15} />}
                      {m === 'CARD' && <CreditCard size={15} />}
                      {m === 'TRANSFER' && <ArrowRightLeft size={15} />}
                      {m === 'EWALLET' && <Smartphone size={15} />}
                      <span>
                        {m === 'CASH'
                          ? 'Tiền mặt'
                          : m === 'CARD'
                          ? 'Thẻ POS'
                          : m === 'TRANSFER'
                          ? 'Chuyển khoản'
                          : 'Ví điện tử'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Số tiền (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  {paymentStatus === 'SUCCESS' && folio && folio.balance > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(folio.balance)}
                      className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                    >
                      Thanh toán hết số dư ({folio.balance.toLocaleString('vi-VN')} đ)
                    </button>
                  )}
                </div>
                <CurrencyInput
                  required
                  min={1}
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  inputClassName="px-3.5 py-2.5 rounded-xl border-slate-200 text-base font-mono font-black text-slate-900 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mã tham chiếu / Số hóa đơn ngân hàng
                </label>
                <input
                  type="text"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  placeholder="Ví dụ: VCB_FT1029384..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-bold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingPayment ? 'Đang ghi nhận...' : 'Xác nhận giao dịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Create Invoice */}
      {isInvoiceModalOpen && folio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <FileText size={20} className="text-amber-500" />
                <span>Xuất Hóa đơn Điện tử VAT 8%</span>
              </h3>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInvoiceSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="modal-scrollable-body p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Sparkles size={14} />
                  <span>Quy định bóc tách thuế VAT 8%</span>
                </div>
                <p>
                  Tổng thanh toán niêm yết:{' '}
                  <strong>{folio.totalAmount.toLocaleString('vi-VN')} đ</strong> (đã gồm thuế 8%).
                </p>
                <p>
                  Tiền thuế VAT:{' '}
                  <strong>
                    {Math.round((folio.totalAmount * 8) / 108).toLocaleString('vi-VN')} đ
                  </strong>{' '}
                  | Tiền dịch vụ trước thuế:{' '}
                  <strong>
                    {(
                      folio.totalAmount - Math.round((folio.totalAmount * 8) / 108)
                    ).toLocaleString('vi-VN')}{' '}
                    đ
                  </strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên người mua / Đơn vị thụ hưởng
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Ví dụ: Công ty Cổ phần Công nghệ ABC hoặc Tên khách lưu trú..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mã số thuế (nếu xuất cho Doanh nghiệp)
                </label>
                <input
                  type="text"
                  value={buyerTaxCode}
                  onChange={(e) => setBuyerTaxCode(e.target.value)}
                  placeholder="Ví dụ: 0101234567..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Địa chỉ người mua
                </label>
                <input
                  type="text"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder="Ví dụ: Tầng 5, Tòa nhà Landmark 72, Hà Nội..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-bold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingInvoice}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingInvoice ? 'Đang tạo HĐ...' : 'Phát hành Hóa đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print / View VAT Invoice Modal */}
      {isPrintModalOpen && folio && folio.invoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-amber-500" />
                <h3 className="font-extrabold text-slate-800 text-sm">
                  Bản thể hiện Hóa đơn Điện tử (VAT)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  <Printer size={14} />
                  <span>In phiếu</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Area - Scrollable */}
            <div className="modal-scrollable-body p-8 overflow-y-auto flex-1 min-h-0 space-y-6 font-sans">
              <div className="flex justify-between items-start border-b pb-5 border-slate-200">
                <div>
                  <div className="flex items-center gap-2 text-amber-600 font-extrabold text-lg">
                    <Building size={20} />
                    <span>KHÁCH SẠN HOTEL MANAGEMENT 5*</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Địa chỉ: Số 123 Đường Trần Phú, Quận Ba Đình, TP. Hà Nội
                  </p>
                  <p className="text-xs text-slate-500">
                    Mã số thuế: <strong>0100998877</strong> | Hotline: (024) 3888 9999
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-400">
                    MẪU SỐ: 01GTKT0/001
                  </div>
                  <div className="text-sm font-mono font-black text-slate-900 mt-0.5">
                    SỐ: {folio.invoice.invoiceNo}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Ngày:{' '}
                    {new Date(folio.invoice.issuedAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-xl font-black text-slate-900 tracking-wider">
                  HÓA ĐƠN GIÁ TRỊ GIA TĂNG (VAT)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">(Bản thể hiện hóa đơn điện tử)</p>
              </div>

              {/* Buyer info */}
              <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-1.5 border border-slate-100">
                <div className="flex">
                  <span className="w-32 text-slate-500 font-semibold">Tên người mua:</span>
                  <span className="font-bold text-slate-900">
                    {folio.invoice.buyerName || 'Khách lưu trú vãng lai'}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-500 font-semibold">Mã số thuế:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {folio.invoice.buyerTaxCode || 'Không đăng ký'}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-500 font-semibold">Địa chỉ:</span>
                  <span className="text-slate-800">
                    {folio.invoice.buyerAddress || 'Việt Nam'}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-500 font-semibold">Mã Folio / Stay:</span>
                  <span className="font-mono font-bold text-indigo-600">
                    Folio #{folio.folioId} (Lượt lưu trú #{folio.stayId})
                  </span>
                </div>
              </div>

              {/* Items summary */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-y border-slate-300 font-bold text-slate-700 bg-slate-50">
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3">Nội dung chi phí / Dịch vụ</th>
                    <th className="py-2.5 px-3 text-center">SL</th>
                    <th className="py-2.5 px-3 text-right">Đơn giá</th>
                    <th className="py-2.5 px-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {folio.items.map((it, idx) => (
                    <tr key={it.itemId}>
                      <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {it.serviceName || it.description || 'Chi phí phòng'}
                      </td>
                      <td className="py-2.5 px-3 text-center">{it.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {it.unitPrice.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {it.amount.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tax breakdown */}
              <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs text-right">
                <div className="flex justify-end gap-12">
                  <span className="text-slate-500">Cộng tiền dịch vụ (trước thuế):</span>
                  <span className="font-mono font-bold text-slate-800 w-36">
                    {folio.invoice.subtotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-end gap-12">
                  <span className="text-slate-500">Thuế suất GTGT (8%):</span>
                  <span className="font-mono font-bold text-slate-800 w-36">
                    {folio.invoice.vatAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-end gap-12 border-t border-slate-200 pt-2 text-sm">
                  <span className="font-black text-slate-900">TỔNG CỘNG THANH TOÁN:</span>
                  <span className="font-mono font-black text-indigo-700 text-base w-36">
                    {folio.invoice.totalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* Digital Signature Badge */}
              <div className="flex justify-between items-end pt-6 border-t border-slate-200">
                <div className="text-center w-48 text-xs text-slate-500">
                  <p className="font-bold text-slate-800">Người mua hàng</p>
                  <p className="text-[11px] italic mt-1">(Ký, ghi rõ họ tên)</p>
                </div>
                <div className="text-center w-56 border-2 border-dashed border-rose-400 bg-rose-50/50 rounded-xl p-3">
                  <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">
                    ĐÃ KÝ ĐIỆN TỬ
                  </p>
                  <p className="text-[10px] text-rose-600 mt-0.5">Bởi: KHÁCH SẠN HOTEL MANAGEMENT</p>
                  <p className="text-[9px] font-mono text-slate-400 mt-1">
                    Thời gian: {new Date(folio.invoice.issuedAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer - Fixed */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-2.5 shrink-0">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <Printer size={14} />
                <span>In phiếu hóa đơn</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {itemToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert size={24} />
            </div>
            <div className="text-center">
              <h3 className="font-extrabold text-slate-900 text-lg">Xóa khoản phí khỏi Folio?</h3>
              <p className="text-slate-500 text-sm mt-1">
                Khoản phí #{itemToDeleteId} sẽ bị xóa và tổng tiền của Folio sẽ tự động được trừ đi tương ứng.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deletingItem}
                onClick={handleConfirmDeleteItem}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {deletingItem ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Open New Folio */}
      {isOpenFolioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" />
                <span>Khởi tạo Folio mới</span>
              </h3>
              <button
                onClick={() => setIsOpenFolioModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOpenNewFolioSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="modal-scrollable-body p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mã Lượt lưu trú (Stay ID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newStayId}
                    onChange={(e) => setNewStayId(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Mỗi lượt lưu trú liên kết với một Folio duy nhất để tính toàn bộ tiền phòng và phụ phí phát sinh.
                  </p>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpenFolioModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={openingFolio}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {openingFolio ? 'Đang khởi tạo...' : 'Xác nhận mở Folio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
