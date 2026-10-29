import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  RotateCcw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Coffee,
  Shirt,
  Wine,
  Flower2,
  Car,
  MoreHorizontal,
  X,
  AlertCircle,
} from 'lucide-react';
import { billingService } from '../../services/billingService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import type { HotelService, HotelServiceRequest, ServiceCategory } from '../../types/billing';

const CATEGORY_CONFIG: Record<
  ServiceCategory,
  { label: string; icon: React.ReactNode; color: string; bg: string; text: string }
> = {
  FOOD: {
    label: 'Ẩm thực (F&B)',
    icon: <Coffee size={16} />,
    color: 'border-amber-200 text-amber-700 bg-amber-50',
    bg: 'bg-amber-500',
    text: 'text-amber-700',
  },
  LAUNDRY: {
    label: 'Giặt ủi',
    icon: <Shirt size={16} />,
    color: 'border-blue-200 text-blue-700 bg-blue-50',
    bg: 'bg-blue-500',
    text: 'text-blue-700',
  },
  MINIBAR: {
    label: 'Minibar',
    icon: <Wine size={16} />,
    color: 'border-purple-200 text-purple-700 bg-purple-50',
    bg: 'bg-purple-500',
    text: 'text-purple-700',
  },
  SPA: {
    label: 'Spa & Chăm sóc',
    icon: <Flower2 size={16} />,
    color: 'border-emerald-200 text-emerald-700 bg-emerald-50',
    bg: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  TRANSPORT: {
    label: 'Đưa đón / Vận chuyển',
    icon: <Car size={16} />,
    color: 'border-cyan-200 text-cyan-700 bg-cyan-50',
    bg: 'bg-cyan-500',
    text: 'text-cyan-700',
  },
  OTHER: {
    label: 'Dịch vụ khác',
    icon: <MoreHorizontal size={16} />,
    color: 'border-slate-200 text-slate-700 bg-slate-50',
    bg: 'bg-slate-500',
    text: 'text-slate-700',
  },
};

export const HotelServicesPage: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const { showToast } = useToast();
  const canManage = hasAnyRole(['ADMIN', 'MANAGER']);

  const [services, setServices] = useState<HotelService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeOnly, setActiveOnly] = useState<boolean>(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<HotelService | null>(null);
  const [formData, setFormData] = useState<HotelServiceRequest>({
    name: '',
    category: 'FOOD',
    unit: 'lần',
    unitPrice: 0,
    isActive: true,
  });
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  // Delete Confirm State
  const [serviceToDelete, setServiceToDelete] = useState<HotelService | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await billingService.getHotelServices({
        category: selectedCategory !== 'ALL' ? (selectedCategory as ServiceCategory) : undefined,
        search: search.trim() || undefined,
        activeOnly: activeOnly ? true : undefined,
        size: 100,
      });
      setServices(res.content || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách dịch vụ';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, search, activeOnly, showToast]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleOpenAdd = () => {
    setEditingService(null);
    setFormData({
      name: '',
      category: 'FOOD',
      unit: 'lần',
      unitPrice: 50000,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (svc: HotelService) => {
    setEditingService(svc);
    setFormData({
      name: svc.name,
      category: svc.category,
      unit: svc.unit,
      unitPrice: svc.unitPrice,
      isActive: svc.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Vui lòng nhập tên dịch vụ', 'error');
      return;
    }
    if (formData.unitPrice < 0) {
      showToast('Đơn giá không được âm', 'error');
      return;
    }

    try {
      setFormSubmitting(true);
      if (editingService) {
        await billingService.updateHotelService(editingService.serviceId, formData);
        showToast('Cập nhật dịch vụ thành công!', 'success');
      } else {
        await billingService.createHotelService(formData);
        showToast('Tạo mới dịch vụ thành công!', 'success');
      }
      setIsModalOpen(false);
      fetchServices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thao tác dịch vụ thất bại';
      showToast(msg, 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;
    try {
      setDeleting(true);
      await billingService.deleteHotelService(serviceToDelete.serviceId);
      showToast(`Đã ngừng kích hoạt dịch vụ "${serviceToDelete.name}"`, 'success');
      setServiceToDelete(null);
      fetchServices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa dịch vụ';
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Quick stats
  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.isActive).length;
    return { total, active, inactive: total - active };
  }, [services]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-xl shadow-slate-950/20">
        <div>
          <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-sm mb-1">
            <Sparkles size={18} />
            <span>GIAI ĐOẠN 2: THU NGÂN & THANH TOÁN</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Danh mục Dịch vụ Khách sạn
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Bảng giá tiêu chuẩn cho Minibar, Giặt ủi, Ẩm thực F&B, Spa và Dịch vụ đưa đón phát sinh trong quá trình lưu trú.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Plus size={18} />
            <span>Thêm Dịch vụ Mới</span>
          </button>
        )}
      </div>

      {/* Filter and Stats Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-xs font-semibold text-slate-500">TỔNG DỊCH VỤ</span>
            <div className="text-2xl font-black text-slate-800 mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100">
            <span className="text-xs font-semibold text-emerald-700">ĐANG PHỤC VỤ</span>
            <div className="text-2xl font-black text-emerald-800 mt-0.5">{stats.active}</div>
          </div>
          <div className="bg-rose-50/70 rounded-xl p-3 border border-rose-100">
            <span className="text-xs font-semibold text-rose-700">TẠM NGƯNG HOẠT ĐỘNG</span>
            <div className="text-2xl font-black text-rose-800 mt-0.5">{stats.inactive}</div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm theo tên dịch vụ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="ALL">Tất cả danh mục</option>
              <option value="FOOD">Ẩm thực (F&B)</option>
              <option value="LAUNDRY">Giặt ủi</option>
              <option value="MINIBAR">Minibar</option>
              <option value="SPA">Spa & Chăm sóc</option>
              <option value="TRANSPORT">Đưa đón</option>
              <option value="OTHER">Dịch vụ khác</option>
            </select>

            <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer select-none text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
              />
              <span>Chỉ hiển thị đang phục vụ</span>
            </label>

            {(search || selectedCategory !== 'ALL' || activeOnly) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('ALL');
                  setActiveOnly(false);
                }}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Đặt lại bộ lọc"
              >
                <RotateCcw size={14} />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent mb-3" />
            <p className="text-slate-500 text-sm">Đang tải danh mục dịch vụ...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="py-16 text-center">
            <Coffee size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-600 font-bold">Không tìm thấy dịch vụ nào</p>
            <p className="text-slate-400 text-xs mt-1">
              Thử thay đổi bộ lọc tìm kiếm hoặc thêm dịch vụ mới
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Mã</th>
                  <th className="py-3.5 px-4">Tên dịch vụ</th>
                  <th className="py-3.5 px-4">Danh mục</th>
                  <th className="py-3.5 px-4">Đơn vị tính</th>
                  <th className="py-3.5 px-4 text-right">Đơn giá (VNĐ)</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  {canManage && <th className="py-3.5 px-4 text-center">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {services.map((svc) => {
                  const catConfig = CATEGORY_CONFIG[svc.category] || CATEGORY_CONFIG.OTHER;
                  return (
                    <tr key={svc.serviceId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400 text-xs">
                        #{svc.serviceId}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {svc.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${catConfig.color}`}
                        >
                          {catConfig.icon}
                          <span>{catConfig.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {svc.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900">
                        {svc.unitPrice.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {svc.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <CheckCircle2 size={13} />
                            <span>Đang phục vụ</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                            <XCircle size={13} />
                            <span>Tạm ngưng</span>
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(svc)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Chỉnh sửa dịch vụ"
                            >
                              <Edit2 size={16} />
                            </button>
                            {svc.isActive && (
                              <button
                                onClick={() => setServiceToDelete(svc)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Ngừng hoạt động dịch vụ"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Service */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <Sparkles size={20} className="text-amber-500" />
                <span>{editingService ? 'Chỉnh sửa Dịch vụ' : 'Thêm Dịch vụ Mới'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="modal-scrollable-body p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên dịch vụ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Giặt ủi nhanh, Bữa sáng buffet..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Danh mục <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as ServiceCategory })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="FOOD">Ẩm thực (F&B)</option>
                    <option value="LAUNDRY">Giặt ủi</option>
                    <option value="MINIBAR">Minibar</option>
                    <option value="SPA">Spa & Massage</option>
                    <option value="TRANSPORT">Vận chuyển</option>
                    <option value="OTHER">Dịch vụ khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Đơn vị tính <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="chai, kg, suất, lần..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <CurrencyInput
                label="Đơn giá"
                required
                min={0}
                value={formData.unitPrice}
                onChange={(val) => setFormData({ ...formData, unitPrice: val })}
                inputClassName="py-2.5 rounded-xl border-slate-200 text-sm font-mono font-extrabold focus:ring-amber-500/20 focus:border-amber-500"
              />

              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <span className="text-sm font-semibold text-slate-700">
                    Kích hoạt dịch vụ này ngay
                  </span>
                </label>
              </div>

              </div>

              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-bold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? 'Đang lưu...' : editingService ? 'Lưu cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>
            <div className="text-center">
              <h3 className="font-extrabold text-slate-900 text-lg">Ngừng phục vụ dịch vụ?</h3>
              <p className="text-slate-500 text-sm mt-1">
                Dịch vụ <strong className="text-slate-800">"{serviceToDelete.name}"</strong> sẽ được
                chuyển sang trạng thái tạm ngưng và không thể chọn khi thêm phí vào Folio.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
