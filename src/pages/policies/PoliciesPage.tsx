import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { policyService } from '../../services/policyService';
import type {
  CancellationPolicy,
  EarlyCheckoutPolicy,
  CancellationPenaltyType,
  EarlyCheckoutPenaltyType,
} from '../../types/policy';
import {
  Scale,
  Plus,
  RefreshCw,
  Clock,
  Ban,
  LogOut,
  Check,
  CheckCircle2,
  Edit,
  Trash2,
} from 'lucide-react';

export const PoliciesPage: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const { showToast } = useToast();
  const isManagerOrAdmin = hasAnyRole(['ADMIN', 'MANAGER']);

  // Tabs
  const [activeTab, setActiveTab] = useState<'cancellation' | 'earlyCheckout'>('cancellation');

  // Data states
  const [cancellationList, setCancellationList] = useState<CancellationPolicy[]>([]);
  const [earlyList, setEarlyList] = useState<EarlyCheckoutPolicy[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Modal: Create Cancellation Policy
  const [isCreateCancelModalOpen, setIsCreateCancelModalOpen] = useState<boolean>(false);
  const [cancelCode, setCancelCode] = useState<string>('');
  const [cancelName, setCancelName] = useState<string>('');
  const [cancelDesc, setCancelDesc] = useState<string>('');
  const [cancelFreeHours, setCancelFreeHours] = useState<number>(72);
  const [cancelPenaltyType, setCancelPenaltyType] = useState<CancellationPenaltyType>('ONE_NIGHT');
  const [cancelPenaltyValue, setCancelPenaltyValue] = useState<number>(0);
  const [cancelIsActive, setCancelIsActive] = useState<boolean>(true);
  const [submittingCancel, setSubmittingCancel] = useState<boolean>(false);

  // Modal: Edit Cancellation Policy
  const [editingCancelPolicy, setEditingCancelPolicy] = useState<CancellationPolicy | null>(null);
  const [submittingEditCancel, setSubmittingEditCancel] = useState<boolean>(false);

  // Modal: Create Early Checkout Policy
  const [isCreateEarlyModalOpen, setIsCreateEarlyModalOpen] = useState<boolean>(false);
  const [earlyCode, setEarlyCode] = useState<string>('');
  const [earlyName, setEarlyName] = useState<string>('');
  const [earlyDesc, setEarlyDesc] = useState<string>('');
  const [earlyPenaltyType, setEarlyPenaltyType] = useState<EarlyCheckoutPenaltyType>('NONE');
  const [earlyPenaltyValue, setEarlyPenaltyValue] = useState<number>(0);
  const [earlyIsActive, setEarlyIsActive] = useState<boolean>(true);
  const [submittingEarly, setSubmittingEarly] = useState<boolean>(false);

  // Modal: Edit Early Checkout Policy
  const [editingEarlyPolicy, setEditingEarlyPolicy] = useState<EarlyCheckoutPolicy | null>(null);
  const [submittingEditEarly, setSubmittingEditEarly] = useState<boolean>(false);

  // Confirm Delete Modal
  const [deletingPolicy, setDeletingPolicy] = useState<{
    id: number;
    name: string;
    type: 'cancellation' | 'earlyCheckout';
  } | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState<boolean>(false);

  // Fetch all policies
  const loadPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const [cancels, earlies] = await Promise.all([
        policyService.getCancellationPolicies(),
        policyService.getEarlyCheckoutPolicies(),
      ]);
      setCancellationList(cancels || []);
      setEarlyList(earlies || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách chính sách';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  // Activate cancellation policy (and turn others OFF)
  const handleActivateCancel = async (p: CancellationPolicy) => {
    try {
      await policyService.activateCancellationPolicy(p.policyId);
      showToast(`Đã kích hoạt chính sách "${p.name}". Các chính sách khác đã được chuyển sang tắt.`, 'success');
      loadPolicies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kích hoạt chính sách thất bại';
      showToast(msg, 'error');
    }
  };

  // Activate early checkout policy (and turn others OFF)
  const handleActivateEarly = async (p: EarlyCheckoutPolicy) => {
    try {
      await policyService.activateEarlyCheckoutPolicy(p.policyId);
      showToast(`Đã kích hoạt chính sách "${p.name}". Các chính sách khác đã được chuyển sang tắt.`, 'success');
      loadPolicies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kích hoạt chính sách thất bại';
      showToast(msg, 'error');
    }
  };

  // Submit Create Cancellation Policy
  const handleCreateCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelCode.trim() || !cancelName.trim()) {
      showToast('Vui lòng điền mã và tên chính sách', 'error');
      return;
    }
    try {
      setSubmittingCancel(true);
      await policyService.createCancellationPolicy({
        policyCode: cancelCode.trim().toUpperCase(),
        name: cancelName.trim(),
        description: cancelDesc.trim() || undefined,
        freeCancelHours: cancelFreeHours,
        penaltyType: cancelPenaltyType,
        penaltyValue: cancelPenaltyValue,
        isActive: cancelIsActive,
        isDefault: cancelIsActive,
      });
      showToast(`Tạo chính sách hủy mới thành công ${cancelIsActive ? '(Đang hoạt động)' : ''}`, 'success');
      setIsCreateCancelModalOpen(false);
      setCancelCode('');
      setCancelName('');
      setCancelDesc('');
      setCancelFreeHours(72);
      setCancelPenaltyType('ONE_NIGHT');
      setCancelPenaltyValue(0);
      setCancelIsActive(true);
      loadPolicies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tạo chính sách hủy thất bại';
      showToast(msg, 'error');
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Submit Edit Cancellation Policy
  const handleEditCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCancelPolicy) return;
    try {
      setSubmittingEditCancel(true);
      await policyService.updateCancellationPolicy(editingCancelPolicy.policyId, {
        name: editingCancelPolicy.name.trim(),
        description: editingCancelPolicy.description?.trim() || undefined,
        freeCancelHours: editingCancelPolicy.freeCancelHours,
        penaltyType: editingCancelPolicy.penaltyType,
        penaltyValue: editingCancelPolicy.penaltyValue,
      });
      showToast(`Cập nhật chính sách "${editingCancelPolicy.name}" thành công!`, 'success');
      setEditingCancelPolicy(null);
      loadPolicies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cập nhật chính sách thất bại';
      showToast(msg, 'error');
    } finally {
      setSubmittingEditCancel(false);
    }
  };

  // Submit Create Early Checkout Policy
  const handleCreateEarlySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!earlyCode.trim() || !earlyName.trim()) {
      showToast('Vui lòng điền mã và tên chính sách', 'error');
      return;
    }
    try {
      setSubmittingEarly(true);
      await policyService.createEarlyCheckoutPolicy({
        policyCode: earlyCode.trim().toUpperCase(),
        name: earlyName.trim(),
        description: earlyDesc.trim() || undefined,
        penaltyType: earlyPenaltyType,
        penaltyValue: earlyPenaltyValue,
        isActive: earlyIsActive,
        isDefault: earlyIsActive,
      });
      showToast(`Tạo chính sách trả phòng sớm mới thành công ${earlyIsActive ? '(Đang hoạt động)' : ''}`, 'success');
      setIsCreateEarlyModalOpen(false);
      setEarlyCode('');
      setEarlyName('');
      setEarlyDesc('');
      setEarlyPenaltyType('NONE');
      setEarlyPenaltyValue(0);
      setEarlyIsActive(true);
      loadPolicies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tạo chính sách thất bại';
      showToast(msg, 'error');
    } finally {
      setSubmittingEarly(false);
    }
  };

  // Submit Edit Early Checkout Policy
  const handleEditEarlySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEarlyPolicy) return;
    try {
      setSubmittingEditEarly(true);
      await policyService.updateEarlyCheckoutPolicy(editingEarlyPolicy.policyId, {
        name: editingEarlyPolicy.name.trim(),
        description: editingEarlyPolicy.description?.trim() || undefined,
        penaltyType: editingEarlyPolicy.penaltyType,
        penaltyValue: editingEarlyPolicy.penaltyValue,
      });
      showToast(`Cập nhật chính sách "${editingEarlyPolicy.name}" thành công!`, 'success');
      setEditingEarlyPolicy(null);
      loadPolicies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cập nhật chính sách thất bại';
      showToast(msg, 'error');
    } finally {
      setSubmittingEditEarly(false);
    }
  };

  // Confirm & Delete Policy
  const handleConfirmDelete = async () => {
    if (!deletingPolicy) return;
    try {
      setSubmittingDelete(true);
      if (deletingPolicy.type === 'cancellation') {
        await policyService.deleteCancellationPolicy(deletingPolicy.id);
      } else {
        await policyService.deleteEarlyCheckoutPolicy(deletingPolicy.id);
      }
      showToast(`Đã xóa vĩnh viễn chính sách "${deletingPolicy.name}"`, 'success');
      setDeletingPolicy(null);
      loadPolicies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xóa chính sách thất bại';
      showToast(msg, 'error');
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Format penalty description helper
  const getCancelPenaltyDesc = (p: CancellationPolicy) => {
    switch (p.penaltyType) {
      case 'NONE':
        return 'Miễn phạt (Hoàn 100% cọc)';
      case 'ONE_NIGHT':
        return 'Phạt 1 đêm tiền phòng (Hoàn phần cọc dư)';
      case 'FULL_DEPOSIT':
        return 'Phạt toàn bộ tiền cọc đã thu';
      case 'PERCENT_TOTAL':
        return `Phạt ${p.penaltyValue}% tổng tiền đơn đặt`;
      case 'PERCENT_DEPOSIT':
        return `Phạt ${p.penaltyValue}% tiền cọc`;
      case 'FIXED_AMOUNT':
        return `Phạt cố định ${new Intl.NumberFormat('vi-VN').format(p.penaltyValue)} đ`;
      default:
        return p.penaltyType;
    }
  };

  const getEarlyPenaltyDesc = (p: EarlyCheckoutPolicy) => {
    switch (p.penaltyType) {
      case 'NONE':
        return 'Miễn phạt (Tính đúng đêm ở thực tế, hoàn 100% đêm chưa ở)';
      case 'ONE_NIGHT':
        return 'Phạt 1 đêm tiền phòng (Khấu trừ các đêm chưa ở + tính phí 1 đêm)';
      case 'FULL_REMAINING':
        return 'Thu đủ 100% tiền phòng như ban đầu (Không khấu trừ)';
      case 'PERCENT_REMAINING':
        return `Phạt ${p.penaltyValue}% tiền phòng các đêm chưa ở`;
      default:
        return p.penaltyType;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-2xl text-white shadow-lg shadow-amber-500/25">
            <Scale size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Chính sách Khách sạn (Hotel Policies)
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadPolicies}
            disabled={loading}
            leftIcon={<RefreshCw size={15} className={loading ? 'animate-spin' : ''} />}
          >
            Làm mới
          </Button>

          {isManagerOrAdmin && (
            <Button
              onClick={() => {
                if (activeTab === 'cancellation') {
                  setIsCreateCancelModalOpen(true);
                } else {
                  setIsCreateEarlyModalOpen(true);
                }
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-600/20"
              leftIcon={<Plus size={16} />}
            >
              {activeTab === 'cancellation' ? 'Thêm chính sách Hủy' : 'Thêm chính sách Trả sớm'}
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('cancellation')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'cancellation'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Ban size={18} />
          Chính sách Hủy phòng ({cancellationList.length})
        </button>
        <button
          onClick={() => setActiveTab('earlyCheckout')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'earlyCheckout'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <LogOut size={18} />
          Chính sách Trả phòng sớm ({earlyList.length})
        </button>
      </div>

      {/* TAB 1: CANCELLATION POLICIES */}
      {activeTab === 'cancellation' && (
        <div className="space-y-3">
          {/* Active Policy Highlight Card */}
          {cancellationList.find((p) => p.isDefault) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50/30 border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs shadow-emerald-600/20">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-800 block">
                    Chính sách Hủy phòng đang áp dụng cho toàn bộ khách sạn:
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-base font-black text-emerald-950">
                      {cancellationList.find((p) => p.isDefault)?.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-emerald-200/70 text-emerald-900">
                      {cancellationList.find((p) => p.isDefault)?.policyCode}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {cancellationList.find((p) => p.isDefault)?.freeCancelHours &&
                    cancellationList.find((p) => p.isDefault)!.freeCancelHours > 0
                      ? `Miễn phí hủy trước ${cancellationList.find((p) => p.isDefault)?.freeCancelHours} giờ • `
                      : 'Không hoàn cọc khi hủy • '}
                    {getCancelPenaltyDesc(cancellationList.find((p) => p.isDefault)!)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Mã</th>
                    <th className="py-3 px-4">Tên chính sách</th>
                    <th className="py-3 px-4">Miễn phí hủy trước</th>
                    <th className="py-3 px-4">Phạt hủy muộn / quá hạn</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cancellationList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Chưa có chính sách hủy phòng nào được cấu hình
                      </td>
                    </tr>
                  ) : (
                    cancellationList.map((p) => {
                      const isRunning = Boolean(p.isDefault);
                      return (
                        <tr
                          key={p.policyId}
                          className={`transition-colors border-l-4 ${
                            isRunning
                              ? 'bg-emerald-50/40 border-l-emerald-500 hover:bg-emerald-50/60'
                              : 'border-l-transparent hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{p.policyCode}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                              <span>{p.name}</span>
                            </div>
                            {p.description && (
                              <div className="text-[11px] text-slate-400 font-normal mt-0.5">{p.description}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-medium">
                            {p.freeCancelHours > 0 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md font-semibold">
                                <Clock size={12} /> {p.freeCancelHours} giờ ({Math.round(p.freeCancelHours / 24)} ngày)
                              </span>
                            ) : (
                              <span className="text-rose-600 font-semibold bg-rose-50 px-2.5 py-0.5 rounded-md">
                                Không áp dụng (Non-refundable)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 font-medium">{getCancelPenaltyDesc(p)}</td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center">
                              <label
                                className={`inline-flex items-center gap-2 select-none ${
                                  isManagerOrAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                                }`}
                                title={
                                  !isManagerOrAdmin
                                    ? 'Chỉ Quản lý hoặc Quản trị viên mới có quyền bật/tắt chính sách'
                                    : isRunning
                                    ? 'Chính sách đang hoạt động (Bật). Để thay đổi, vui lòng gạt bật chính sách khác.'
                                    : 'Gạt để kích hoạt chính sách này hoạt động'
                                }
                              >
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isRunning}
                                  disabled={!isManagerOrAdmin}
                                  onClick={() => {
                                    if (isRunning) {
                                      showToast(
                                        'Chính sách này đang hoạt động. Để chuyển đổi, vui lòng gạt bật chính sách khác.',
                                        'info'
                                      );
                                      return;
                                    }
                                    handleActivateCancel(p);
                                  }}
                                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${
                                    isRunning ? 'bg-emerald-600' : 'bg-slate-300 hover:bg-slate-400'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                      isRunning ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                                <span
                                  className={`text-xs font-bold min-w-[70px] text-left transition-colors ${
                                    isRunning ? 'text-emerald-700' : 'text-slate-400'
                                  }`}
                                >
                                  {isRunning ? 'Hoạt động' : 'Tắt'}
                                </span>
                              </label>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isManagerOrAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setEditingCancelPolicy({ ...p })}
                                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  title="Chỉnh sửa chính sách"
                                >
                                  <Edit size={16} />
                                </button>
                              )}

                              {isManagerOrAdmin && (
                                <button
                                  type="button"
                                  disabled={isRunning}
                                  onClick={() =>
                                    setDeletingPolicy({
                                      id: p.policyId,
                                      name: p.name,
                                      type: 'cancellation',
                                    })
                                  }
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isRunning
                                      ? 'text-slate-300 cursor-not-allowed opacity-30'
                                      : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                                  }`}
                                  title={
                                    isRunning
                                      ? 'Không thể xóa chính sách đang hoạt động'
                                      : 'Xóa vĩnh viễn chính sách này'
                                  }
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: EARLY CHECKOUT POLICIES */}
      {activeTab === 'earlyCheckout' && (
        <div className="space-y-3">
          {/* Active Policy Highlight Card */}
          {earlyList.find((p) => p.isDefault) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50/30 border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs shadow-emerald-600/20">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-800 block">
                    Chính sách Trả phòng sớm đang áp dụng cho toàn bộ khách sạn:
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-base font-black text-emerald-950">
                      {earlyList.find((p) => p.isDefault)?.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-emerald-200/70 text-emerald-900">
                      {earlyList.find((p) => p.isDefault)?.policyCode}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {getEarlyPenaltyDesc(earlyList.find((p) => p.isDefault)!)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Mã</th>
                    <th className="py-3 px-4">Tên chính sách</th>
                    <th className="py-3 px-4">Quy tắc tính & Mức phạt trả sớm</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {earlyList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Chưa có chính sách trả phòng sớm nào được cấu hình
                      </td>
                    </tr>
                  ) : (
                    earlyList.map((p) => {
                      const isRunning = Boolean(p.isDefault);
                      return (
                        <tr
                          key={p.policyId}
                          className={`transition-colors border-l-4 ${
                            isRunning
                              ? 'bg-emerald-50/40 border-l-emerald-500 hover:bg-emerald-50/60'
                              : 'border-l-transparent hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{p.policyCode}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                              <span>{p.name}</span>
                            </div>
                            {p.description && (
                              <div className="text-[11px] text-slate-400 font-normal mt-0.5">{p.description}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 font-medium">{getEarlyPenaltyDesc(p)}</td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center">
                              <label
                                className={`inline-flex items-center gap-2 select-none ${
                                  isManagerOrAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                                }`}
                                title={
                                  !isManagerOrAdmin
                                    ? 'Chỉ Quản lý hoặc Quản trị viên mới có quyền bật/tắt chính sách'
                                    : isRunning
                                    ? 'Chính sách đang hoạt động (Bật). Để thay đổi, vui lòng gạt bật chính sách khác.'
                                    : 'Gạt để kích hoạt chính sách này hoạt động'
                                }
                              >
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isRunning}
                                  disabled={!isManagerOrAdmin}
                                  onClick={() => {
                                    if (isRunning) {
                                      showToast(
                                        'Chính sách này đang hoạt động. Để chuyển đổi, vui lòng gạt bật chính sách khác.',
                                        'info'
                                      );
                                      return;
                                    }
                                    handleActivateEarly(p);
                                  }}
                                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${
                                    isRunning ? 'bg-emerald-600' : 'bg-slate-300 hover:bg-slate-400'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                      isRunning ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                                <span
                                  className={`text-xs font-bold min-w-[70px] text-left transition-colors ${
                                    isRunning ? 'text-emerald-700' : 'text-slate-400'
                                  }`}
                                >
                                  {isRunning ? 'Hoạt động' : 'Tắt'}
                                </span>
                              </label>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isManagerOrAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setEditingEarlyPolicy({ ...p })}
                                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  title="Chỉnh sửa chính sách"
                                >
                                  <Edit size={16} />
                                </button>
                              )}

                              {isManagerOrAdmin && (
                                <button
                                  type="button"
                                  disabled={isRunning}
                                  onClick={() =>
                                    setDeletingPolicy({
                                      id: p.policyId,
                                      name: p.name,
                                      type: 'earlyCheckout',
                                    })
                                  }
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isRunning
                                      ? 'text-slate-300 cursor-not-allowed opacity-30'
                                      : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                                  }`}
                                  title={
                                    isRunning
                                      ? 'Không thể xóa chính sách đang hoạt động'
                                      : 'Xóa vĩnh viễn chính sách này'
                                  }
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL: CREATE CANCELLATION POLICY */}
      <Modal
        isOpen={isCreateCancelModalOpen}
        onClose={() => !submittingCancel && setIsCreateCancelModalOpen(false)}
        title="Thêm mới Chính sách Hủy đặt phòng"
        subtitle="Cấu hình điều kiện hủy miễn phí và mức phạt cho khách sạn"
        icon={<Ban size={22} className="text-amber-600" />}
        maxWidth="540px"
        onSubmit={handleCreateCancelSubmit}
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsCreateCancelModalOpen(false)}
              disabled={submittingCancel}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={submittingCancel}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              leftIcon={submittingCancel ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            >
              {submittingCancel ? 'Đang lưu...' : 'Lưu chính sách'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mã chính sách (duy nhất) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={cancelCode}
                onChange={(e) => setCancelCode(e.target.value.toUpperCase())}
                placeholder="VD: STRICT_7D"
                className="w-full px-3 py-2 text-xs uppercase bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên hiển thị <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={cancelName}
                onChange={(e) => setCancelName(e.target.value)}
                placeholder="VD: Hủy Nghiêm ngặt (7 ngày)"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả chi tiết</label>
            <input
              type="text"
              value={cancelDesc}
              onChange={(e) => setCancelDesc(e.target.value)}
              placeholder="VD: Miễn phí trước 7 ngày, sau đó phạt toàn bộ tiền cọc..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Miễn phí hủy trước (giờ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                required
                value={cancelFreeHours}
                onChange={(e) => setCancelFreeHours(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {cancelFreeHours === 0 ? '0h = Không hoàn hủy' : `Tương đương ~${Math.round(cancelFreeHours / 24)} ngày`}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Loại hình phạt hủy muộn</label>
              <select
                value={cancelPenaltyType}
                onChange={(e) => setCancelPenaltyType(e.target.value as CancellationPenaltyType)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="ONE_NIGHT">Phạt 1 đêm tiền phòng (ONE_NIGHT)</option>
                <option value="FULL_DEPOSIT">Phạt toàn bộ tiền cọc (FULL_DEPOSIT)</option>
                <option value="PERCENT_TOTAL">Phần trăm tổng đơn (%)</option>
                <option value="PERCENT_DEPOSIT">Phần trăm tiền cọc (%)</option>
                <option value="FIXED_AMOUNT">Số tiền phạt cố định (VND)</option>
                <option value="NONE">Miễn phạt (NONE)</option>
              </select>
            </div>
          </div>

          {(cancelPenaltyType === 'PERCENT_TOTAL' || cancelPenaltyType === 'PERCENT_DEPOSIT') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tỷ lệ phạt (%)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={cancelPenaltyValue}
                onChange={(e) => setCancelPenaltyValue(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          )}

          {cancelPenaltyType === 'FIXED_AMOUNT' && (
            <CurrencyInput
              label="Số tiền phạt cố định"
              value={cancelPenaltyValue}
              onChange={setCancelPenaltyValue}
              inputClassName="bg-slate-50 border-slate-200 py-2 text-xs rounded-xl"
            />
          )}

          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={cancelIsActive}
                onChange={(e) => setCancelIsActive(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-400"
              />
              Bật hoạt động chính sách này ngay sau khi tạo (tự động tắt chính sách cũ)
            </label>
          </div>
        </div>
      </Modal>

      {/* MODAL: EDIT CANCELLATION POLICY */}
      {editingCancelPolicy && (
        <Modal
          isOpen={true}
          onClose={() => !submittingEditCancel && setEditingCancelPolicy(null)}
          title={`Chỉnh sửa Chính sách Hủy #${editingCancelPolicy.policyCode}`}
          subtitle="Cập nhật quy tắc tính phí hủy của chính sách"
          icon={<Edit size={22} className="text-amber-600" />}
          maxWidth="540px"
          onSubmit={handleEditCancelSubmit}
          footer={
            <>
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditingCancelPolicy(null)}
                disabled={submittingEditCancel}
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                disabled={submittingEditCancel}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                leftIcon={
                  submittingEditCancel ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )
                }
              >
                {submittingEditCancel ? 'Đang lưu...' : 'Cập nhật chính sách'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên hiển thị <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editingCancelPolicy.name}
                onChange={(e) =>
                  setEditingCancelPolicy({ ...editingCancelPolicy, name: e.target.value })
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả chi tiết</label>
              <input
                type="text"
                value={editingCancelPolicy.description || ''}
                onChange={(e) =>
                  setEditingCancelPolicy({ ...editingCancelPolicy, description: e.target.value })
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Miễn phí hủy trước (giờ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={editingCancelPolicy.freeCancelHours}
                  onChange={(e) =>
                    setEditingCancelPolicy({
                      ...editingCancelPolicy,
                      freeCancelHours: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Loại hình phạt hủy muộn</label>
                <select
                  value={editingCancelPolicy.penaltyType}
                  onChange={(e) =>
                    setEditingCancelPolicy({
                      ...editingCancelPolicy,
                      penaltyType: e.target.value as CancellationPenaltyType,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="ONE_NIGHT">Phạt 1 đêm tiền phòng (ONE_NIGHT)</option>
                  <option value="FULL_DEPOSIT">Phạt toàn bộ tiền cọc (FULL_DEPOSIT)</option>
                  <option value="PERCENT_TOTAL">Phần trăm tổng đơn (%)</option>
                  <option value="PERCENT_DEPOSIT">Phần trăm tiền cọc (%)</option>
                  <option value="FIXED_AMOUNT">Số tiền phạt cố định (VND)</option>
                  <option value="NONE">Miễn phạt (NONE)</option>
                </select>
              </div>
            </div>

            {(editingCancelPolicy.penaltyType === 'PERCENT_TOTAL' ||
              editingCancelPolicy.penaltyType === 'PERCENT_DEPOSIT') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tỷ lệ phạt (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={editingCancelPolicy.penaltyValue}
                  onChange={(e) =>
                    setEditingCancelPolicy({
                      ...editingCancelPolicy,
                      penaltyValue: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            )}

            {editingCancelPolicy.penaltyType === 'FIXED_AMOUNT' && (
              <CurrencyInput
                label="Số tiền phạt cố định"
                value={editingCancelPolicy.penaltyValue}
                onChange={(val) =>
                  setEditingCancelPolicy({ ...editingCancelPolicy, penaltyValue: val })
                }
                inputClassName="bg-slate-50 border-slate-200 py-2 text-xs rounded-xl"
              />
            )}
          </div>
        </Modal>
      )}

      {/* MODAL: CREATE EARLY CHECKOUT POLICY */}
      <Modal
        isOpen={isCreateEarlyModalOpen}
        onClose={() => !submittingEarly && setIsCreateEarlyModalOpen(false)}
        title="Thêm mới Chính sách Trả phòng sớm"
        subtitle="Cấu hình quy tắc quyết toán khi khách trả phòng trước hạn"
        icon={<LogOut size={22} className="text-amber-600" />}
        maxWidth="540px"
        onSubmit={handleCreateEarlySubmit}
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsCreateEarlyModalOpen(false)}
              disabled={submittingEarly}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={submittingEarly}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              leftIcon={submittingEarly ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            >
              {submittingEarly ? 'Đang lưu...' : 'Lưu chính sách'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mã chính sách (duy nhất) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={earlyCode}
                onChange={(e) => setEarlyCode(e.target.value.toUpperCase())}
                placeholder="VD: STANDARD_EARLY"
                className="w-full px-3 py-2 text-xs uppercase bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên hiển thị <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={earlyName}
                onChange={(e) => setEarlyName(e.target.value)}
                placeholder="VD: Trả sớm Tiêu chuẩn"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả chi tiết</label>
            <input
              type="text"
              value={earlyDesc}
              onChange={(e) => setEarlyDesc(e.target.value)}
              placeholder="VD: Miễn phạt các đêm chưa ở hoặc phạt 1 đêm..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Loại hình phạt trả phòng sớm</label>
            <select
              value={earlyPenaltyType}
              onChange={(e) => setEarlyPenaltyType(e.target.value as EarlyCheckoutPenaltyType)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="NONE">Linh hoạt: Miễn phạt (Tính đúng số đêm thực ở, khấu trừ 100% đêm chưa ở)</option>
              <option value="ONE_NIGHT">Tiêu chuẩn: Phạt tương đương 1 đêm tiền phòng</option>
              <option value="FULL_REMAINING">Thu đủ: Khách vẫn phải trả 100% tiền phòng như ban đầu</option>
              <option value="PERCENT_REMAINING">Tỷ lệ % tiền phòng các đêm chưa ở</option>
            </select>
          </div>

          {earlyPenaltyType === 'PERCENT_REMAINING' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tỷ lệ phạt (%)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={earlyPenaltyValue}
                onChange={(e) => setEarlyPenaltyValue(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={earlyIsActive}
                onChange={(e) => setEarlyIsActive(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-400"
              />
              Bật hoạt động chính sách này ngay sau khi tạo (tự động tắt chính sách cũ)
            </label>
          </div>
        </div>
      </Modal>

      {/* MODAL: EDIT EARLY CHECKOUT POLICY */}
      {editingEarlyPolicy && (
        <Modal
          isOpen={true}
          onClose={() => !submittingEditEarly && setEditingEarlyPolicy(null)}
          title={`Chỉnh sửa Chính sách Trả sớm #${editingEarlyPolicy.policyCode}`}
        subtitle="Cập nhật quy tắc tính phí khi khách trả phòng trước hạn"
        icon={<Edit size={22} className="text-amber-600" />}
        maxWidth="540px"
        onSubmit={handleEditEarlySubmit}
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => setEditingEarlyPolicy(null)}
              disabled={submittingEditEarly}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={submittingEditEarly}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              leftIcon={
                submittingEditEarly ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )
              }
            >
              {submittingEditEarly ? 'Đang lưu...' : 'Cập nhật chính sách'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên hiển thị <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editingEarlyPolicy.name}
                onChange={(e) =>
                  setEditingEarlyPolicy({ ...editingEarlyPolicy, name: e.target.value })
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả chi tiết</label>
              <input
                type="text"
                value={editingEarlyPolicy.description || ''}
                onChange={(e) =>
                  setEditingEarlyPolicy({ ...editingEarlyPolicy, description: e.target.value })
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Loại hình phạt trả phòng sớm</label>
              <select
                value={editingEarlyPolicy.penaltyType}
                onChange={(e) =>
                  setEditingEarlyPolicy({
                    ...editingEarlyPolicy,
                    penaltyType: e.target.value as EarlyCheckoutPenaltyType,
                  })
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="NONE">Linh hoạt: Miễn phạt (Tính đúng số đêm thực ở, khấu trừ 100% đêm chưa ở)</option>
                <option value="ONE_NIGHT">Tiêu chuẩn: Phạt tương đương 1 đêm tiền phòng</option>
                <option value="FULL_REMAINING">Thu đủ: Khách vẫn phải trả 100% tiền phòng như ban đầu</option>
                <option value="PERCENT_REMAINING">Tỷ lệ % tiền phòng các đêm chưa ở</option>
              </select>
            </div>

            {editingEarlyPolicy.penaltyType === 'PERCENT_REMAINING' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tỷ lệ phạt (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={editingEarlyPolicy.penaltyValue}
                  onChange={(e) =>
                    setEditingEarlyPolicy({
                      ...editingEarlyPolicy,
                      penaltyValue: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(deletingPolicy)}
        onClose={() => setDeletingPolicy(null)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận Xóa chính sách"
        message={`Bạn có chắc chắn muốn xóa vĩnh viễn chính sách "${deletingPolicy?.name}" không? Thao tác này sẽ gỡ bỏ chính sách khỏi hệ thống.`}
        confirmText="Xóa chính sách"
        cancelText="Hủy bỏ"
        variant="danger"
        isLoading={submittingDelete}
      />
    </div>
  );
};
