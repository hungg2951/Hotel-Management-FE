import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Pagination } from '../../components/common/Pagination';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import {
  Layers,
  RefreshCw,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Search,
  Users as UsersIcon,
  Maximize2,
  Bed,
} from 'lucide-react';

export interface RoomTypeItem {
  roomTypeId: number;
  name: string;
  description?: string;
  maxAdults: number;
  maxChildren: number;
  bedType?: string;
  areaSqm?: number;
  basePrice: number;
  isActive: boolean;
}

export interface BedConfigItem {
  id: string;
  count: number;
  type: string;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// Chuyển danh sách BedConfigItem thành chuỗi lưu trữ (VD: "1 Giường King và 1 Giường phụ")
export const formatBedConfigToString = (items: BedConfigItem[]): string => {
  if (!items || items.length === 0) return 'Tiêu chuẩn';
  const valid = items.filter((it) => it.count > 0 && it.type.trim());
  if (valid.length === 0) return 'Tiêu chuẩn';
  return valid.map((it) => `${it.count} ${it.type.trim()}`).join(' và ');
};

// Phân tích chuỗi từ Backend thành mảng BedConfigItem
export const parseBedConfigFromString = (str?: string): BedConfigItem[] => {
  if (!str || !str.trim()) {
    return [{ id: '1', count: 1, type: 'Giường King' }];
  }

  const parts = str.split(/\s*(?:và|,|\+)\s*/i).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) {
    return [{ id: '1', count: 1, type: 'Giường King' }];
  }

  return parts.map((part, index) => {
    const match = part.match(/^(\d+)\s*(.*)$/);
    if (match && match[2]) {
      return {
        id: String(Date.now() + index),
        count: parseInt(match[1], 10) || 1,
        type: match[2].trim(),
      };
    }

    let normalized = part;
    if (part.toLowerCase() === 'king') normalized = 'Giường King';
    else if (part.toLowerCase() === 'queen') normalized = 'Giường Queen';
    else if (part.toLowerCase() === 'double') normalized = 'Giường Đôi';
    else if (part.toLowerCase() === 'single') normalized = 'Giường Single';
    else if (part.toLowerCase() === 'twin') normalized = 'Giường Single';

    return {
      id: String(Date.now() + index),
      count: part.toLowerCase() === 'twin' ? 2 : 1,
      type: normalized,
    };
  });
};

// Tách chuỗi thành các thẻ tag hiển thị đẹp trên UI
export const parseBedListForDisplay = (str?: string): string[] => {
  if (!str || !str.trim()) return ['Tiêu chuẩn'];
  const parts = str.split(/\s*(?:và|,|\+)\s*/i).map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [str];
};

export const RoomTypesPage: React.FC = () => {
  const { user, hasAnyRole, isAdmin } = useAuth();
  const toast = useToast();

  const canManage = isAdmin || hasAnyRole(['ADMIN', 'MANAGER']) || user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [roomTypes, setRoomTypes] = useState<RoomTypeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search input với debounce 700ms
  const [searchTerm, setSearchTerm] = useState<string>('');
  const debouncedSearch = useDebounce<string>(searchTerm, 700);

  // Pagination states
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(12);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Modal 1: Thêm hạng phòng mới
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addName, setAddName] = useState<string>('');
  const [addDescription, setAddDescription] = useState<string>('');
  const [addMaxAdults, setAddMaxAdults] = useState<number>(2);
  const [addMaxChildren, setAddMaxChildren] = useState<number>(1);
  const [addBedItems, setAddBedItems] = useState<BedConfigItem[]>([
    { id: '1', count: 1, type: 'Giường King' },
  ]);
  const [addAreaSqm, setAddAreaSqm] = useState<number>(30);
  const [addBasePrice, setAddBasePrice] = useState<number>(800000);
  const [addIsActive, setAddIsActive] = useState<boolean>(true);
  const [submittingAdd, setSubmittingAdd] = useState<boolean>(false);

  // Modal 2: Sửa hạng phòng
  const [editingRoomType, setEditingRoomType] = useState<RoomTypeItem | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editMaxAdults, setEditMaxAdults] = useState<number>(2);
  const [editMaxChildren, setEditMaxChildren] = useState<number>(1);
  const [editBedItems, setEditBedItems] = useState<BedConfigItem[]>([]);
  const [editAreaSqm, setEditAreaSqm] = useState<number>(30);
  const [editBasePrice, setEditBasePrice] = useState<number>(800000);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);

  // Confirm Modal Xóa hạng phòng
  const [deletingRoomType, setDeletingRoomType] = useState<RoomTypeItem | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState<boolean>(false);

  const fetchRoomTypes = useCallback(
    async (targetPage = page, targetSize = pageSize) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<unknown>(`/room-types?page=${targetPage}&size=${targetSize}`);
        if (res && typeof res === 'object' && 'content' in res) {
          const pageData = res as PageResponse<RoomTypeItem>;
          setRoomTypes(pageData.content || []);
          setTotalPages(pageData.totalPages || 1);
          setTotalElements(pageData.totalElements || 0);
        } else if (Array.isArray(res)) {
          setRoomTypes(res as RoomTypeItem[]);
          setTotalPages(1);
          setTotalElements((res as RoomTypeItem[]).length);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Không thể tải danh sách hạng phòng từ Backend.');
        }
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize]
  );

  useEffect(() => {
    fetchRoomTypes(page, pageSize);
  }, [fetchRoomTypes, page, pageSize]);

  // Lọc theo từ khóa tìm kiếm
  const filteredRoomTypes = roomTypes.filter((rt) => {
    if (!debouncedSearch.trim()) return true;
    const query = debouncedSearch.trim().toLowerCase();
    return (
      rt.name.toLowerCase().includes(query) ||
      (rt.description && rt.description.toLowerCase().includes(query)) ||
      (rt.bedType && rt.bedType.toLowerCase().includes(query))
    );
  });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  // Các thao tác thêm/xóa/sửa dòng giường cho Modal Thêm
  const handleAddBedItem = () => {
    setAddBedItems((prev) => [
      ...prev,
      { id: String(Date.now()), count: 1, type: 'Giường phụ' },
    ]);
  };

  const handleRemoveBedItem = (id: string) => {
    setAddBedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateBedItem = (id: string, field: 'count' | 'type', value: unknown) => {
    setAddBedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Các thao tác thêm/xóa/sửa dòng giường cho Modal Sửa
  const handleEditAddBedItem = () => {
    setEditBedItems((prev) => [
      ...prev,
      { id: String(Date.now()), count: 1, type: 'Giường phụ' },
    ]);
  };

  const handleEditRemoveBedItem = (id: string) => {
    setEditBedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleEditUpdateBedItem = (id: string, field: 'count' | 'type', value: unknown) => {
    setEditBedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // 1. Thêm hạng phòng mới
  const handleCreateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      toast.error('Vui lòng nhập tên hạng phòng.');
      return;
    }
    if (!addBasePrice || addBasePrice < 0) {
      toast.error('Giá cơ bản không hợp lệ.');
      return;
    }

    const bedTypeString = formatBedConfigToString(addBedItems);

    setSubmittingAdd(true);
    try {
      await api.post('/room-types', {
        name: addName.trim(),
        description: addDescription.trim() || undefined,
        maxAdults: addMaxAdults,
        maxChildren: addMaxChildren,
        bedType: bedTypeString,
        areaSqm: addAreaSqm,
        basePrice: addBasePrice,
        isActive: addIsActive,
      });

      toast.success(`Tạo mới hạng phòng "${addName.trim()}" thành công!`);
      setShowAddModal(false);
      // Reset form
      setAddName('');
      setAddDescription('');
      setAddMaxAdults(2);
      setAddMaxChildren(1);
      setAddBedItems([{ id: '1', count: 1, type: 'Giường King' }]);
      setAddAreaSqm(30);
      setAddBasePrice(800000);
      fetchRoomTypes(page, pageSize);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Không thể tạo hạng phòng. Vui lòng thử lại.');
      }
    } finally {
      setSubmittingAdd(false);
    }
  };

  // 2. Mở modal sửa hạng phòng
  const handleOpenEdit = (rt: RoomTypeItem) => {
    setEditingRoomType(rt);
    setEditName(rt.name);
    setEditDescription(rt.description || '');
    setEditMaxAdults(rt.maxAdults);
    setEditMaxChildren(rt.maxChildren);
    setEditBedItems(parseBedConfigFromString(rt.bedType));
    setEditAreaSqm(rt.areaSqm || 30);
    setEditBasePrice(rt.basePrice);
    setEditIsActive(rt.isActive ?? true);
  };

  // 3. Lưu cập nhật hạng phòng
  const handleUpdateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoomType) return;
    if (!editName.trim()) {
      toast.error('Tên hạng phòng không được để trống.');
      return;
    }

    const bedTypeString = formatBedConfigToString(editBedItems);

    setSubmittingEdit(true);
    try {
      await api.put(`/room-types/${editingRoomType.roomTypeId}`, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        maxAdults: editMaxAdults,
        maxChildren: editMaxChildren,
        bedType: bedTypeString,
        areaSqm: editAreaSqm,
        basePrice: editBasePrice,
        isActive: editIsActive,
      });

      toast.success(`Cập nhật hạng phòng "${editName.trim()}" thành công!`);
      setEditingRoomType(null);
      fetchRoomTypes(page, pageSize);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Không thể cập nhật hạng phòng.');
      }
    } finally {
      setSubmittingEdit(false);
    }
  };

  // 4. Xóa / Tạm dừng hạng phòng
  const handleDeleteRoomType = async () => {
    if (!deletingRoomType) return;
    setSubmittingDelete(true);
    try {
      await api.delete(`/room-types/${deletingRoomType.roomTypeId}`);
      toast.success(`Đã ngừng kích hoạt hạng phòng "${deletingRoomType.name}" thành công!`);
      setDeletingRoomType(null);
      fetchRoomTypes(page, pageSize);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Không thể xóa hạng phòng.');
      }
    } finally {
      setSubmittingDelete(false);
    }
  };

  return (
    <div>
      {/* Header & Hành động */}
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quản lý Hạng phòng</h2>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập tiêu chuẩn hạng phòng, sức chứa, cấu hình giường linh hoạt và mức giá niêm yết
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={() => fetchRoomTypes(page, pageSize)}
            isLoading={loading}
            leftIcon={<RefreshCw size={16} />}
          >
            Làm mới
          </Button>

          {canManage && (
            <Button
              variant="primary"
              onClick={() => setShowAddModal(true)}
              leftIcon={<Plus size={16} />}
            >
              Thêm hạng phòng
            </Button>
          )}
        </div>
      </div>

      {/* Thanh Tìm kiếm nhanh với debounce 700ms */}
      <Card className="mb-5 p-3.5 bg-white">
        <div className="relative max-w-sm">
          <input
            type="text"
            placeholder="Tìm theo tên hạng phòng, cấu hình giường, mô tả..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 pl-9 pr-3 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
          <Search
            size={15}
            className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-5 animate-in fade-in duration-200">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <Card>
          <div className="text-center py-10 text-slate-500 text-sm">
            Đang tải dữ liệu hạng phòng từ máy chủ...
          </div>
        </Card>
      ) : filteredRoomTypes.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-slate-500 flex flex-col items-center">
            <Layers size={48} className="text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              {searchTerm ? 'Không tìm thấy hạng phòng nào khớp với từ khóa tìm kiếm' : 'Chưa có hạng phòng nào trong cơ sở dữ liệu'}
            </p>
            {canManage && !searchTerm && (
              <Button
                variant="primary"
                onClick={() => setShowAddModal(true)}
                className="mt-4"
                leftIcon={<Plus size={16} />}
              >
                Tạo hạng phòng đầu tiên
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {filteredRoomTypes.map((rt) => (
              <div
                key={rt.roomTypeId}
                className="bg-white rounded-2xl border border-slate-200 p-5.5 shadow-xs hover:shadow-md transition-shadow flex flex-col gap-3.5 relative"
              >
                {/* Header Card */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 leading-tight">{rt.name}</h3>
                    <div className="mt-1">
                      <span className="text-lg font-extrabold text-amber-700">
                        {Number(rt.basePrice).toLocaleString('vi-VN')} đ
                      </span>
                      <span className="text-xs text-slate-400"> / đêm</span>
                    </div>
                  </div>

                  <Badge variant={rt.isActive ? 'success' : 'danger'}>
                    {rt.isActive ? 'HOẠT ĐỘNG' : 'TẠM NGỪNG'}
                  </Badge>
                </div>

                {/* Mô tả */}
                {rt.description && (
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 m-0">
                    {rt.description}
                  </p>
                )}

                {/* Thuộc tính phòng */}
                <div className="border-t border-slate-100 pt-3 flex flex-col gap-2.5 text-xs text-slate-700">
                  {/* Cấu hình giường hiển thị trực quan dạng badges */}
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1 font-medium">
                      Cấu hình giường:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {parseBedListForDisplay(rt.bedType).map((bed, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-md bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold"
                        >
                          <Bed size={13} className="text-slate-500" /> {bed}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <UsersIcon size={14} className="text-slate-400" />
                      <span>Sức chứa: <strong className="text-slate-900 font-semibold">{rt.maxAdults}L, {rt.maxChildren}N</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Maximize2 size={14} className="text-slate-400" />
                      <span>Diện tích: <strong className="text-slate-900 font-semibold">{rt.areaSqm || '--'} m²</strong></span>
                    </div>
                  </div>
                </div>

                {/* Nút Sửa / Xóa cho Admin / Manager */}
                {canManage && (
                  <div className="border-t border-slate-100 pt-3 flex justify-end gap-2 mt-auto">
                    <button
                      onClick={() => handleOpenEdit(rt)}
                      className="inline-flex items-center gap-1 py-1 px-2.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
                      title="Sửa thông tin hạng phòng"
                    >
                      <Edit size={13} /> Sửa
                    </button>

                    <button
                      onClick={() => setDeletingRoomType(rt)}
                      className="inline-flex items-center gap-1 py-1 px-2.5 rounded-md border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold cursor-pointer transition-colors"
                      title="Ngừng kích hoạt hạng phòng"
                    >
                      <Trash2 size={13} /> Xóa
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Phân trang */}
          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[12, 24, 48, 96]}
          />
        </>
      )}

      {/* Datalist gợi ý các loại giường */}
      <datalist id="bedSuggestions">
        <option value="giường King" />
        <option value="giường Queen" />
        <option value="giường Đôi" />
        <option value="giường Single" />
        <option value="giường phụ" />
        <option value="sofa bed" />
        <option value="giường tầng" />
      </datalist>

      {/* Modal 1: Thêm hạng phòng mới */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm Hạng Phòng Mới"
        subtitle="Khởi tạo tên hạng phòng, cấu hình giường linh hoạt và giá niêm yết"
        icon={<Layers size={20} />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={submittingAdd}>
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateRoomType}
              isLoading={submittingAdd}
              leftIcon={<CheckCircle2 size={16} />}
            >
              Lưu & Tạo hạng phòng
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateRoomType} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Tên hạng phòng <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Deluxe King, Suite Family, Standard Twin..."
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              required
              className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CurrencyInput
              label="Giá niêm yết (VNĐ/đêm)"
              required
              min={0}
              value={addBasePrice}
              onChange={setAddBasePrice}
              inputClassName="py-2.5 px-3.5 rounded-lg border-slate-300 text-sm focus:border-amber-500"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Diện tích (m²)
              </label>
              <input
                type="number"
                min={10}
                step={0.5}
                value={addAreaSqm}
                onChange={(e) => setAddAreaSqm(Number(e.target.value))}
                className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500"
              />
            </div>
          </div>

          {/* Cấu hình linh hoạt các loại giường (Hỗ trợ thêm / xóa dòng) */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70">
            <div className="flex justify-between items-center mb-2.5">
              <label className="text-xs font-bold text-slate-900">
                Cấu hình Loại giường <span className="text-rose-600">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddBedItem}
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-md border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
              >
                <Plus size={13} /> Thêm giường
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {addBedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  {/* Số lượng giường */}
                  <div className="w-24 shrink-0">
                    <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white h-9 shadow-xs focus-within:border-amber-500">
                      <button
                        type="button"
                        onClick={() => handleUpdateBedItem(item.id, 'count', Math.max(1, item.count - 1))}
                        className="w-8 h-full border-none bg-slate-100 hover:bg-slate-200 active:bg-slate-300 cursor-pointer font-bold text-slate-700 flex items-center justify-center transition-colors select-none"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={item.count}
                        onChange={(e) => handleUpdateBedItem(item.id, 'count', Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 w-0 h-full text-center border-none outline-none text-xs font-bold text-slate-900 bg-transparent p-0 m-0 no-spinner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateBedItem(item.id, 'count', item.count + 1)}
                        className="w-8 h-full border-none bg-slate-100 hover:bg-slate-200 active:bg-slate-300 cursor-pointer font-bold text-slate-700 flex items-center justify-center transition-colors select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Loại giường */}
                  <div className="flex-1">
                    <input
                      type="text"
                      list="bedSuggestions"
                      placeholder="VD: giường King, giường Single, giường phụ..."
                      value={item.type}
                      onChange={(e) => handleUpdateBedItem(item.id, 'type', e.target.value)}
                      required
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs outline-none bg-white text-slate-900 focus:border-amber-500"
                    />
                  </div>

                  {/* Nút Xóa dòng */}
                  {addBedItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBedItem(item.id)}
                      className="w-9 h-9 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                      title="Xóa loại giường này"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-2 text-[11px] text-slate-500">
              Chuỗi cấu hình: <strong className="text-slate-900 font-semibold">{formatBedConfigToString(addBedItems)}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Số người lớn tối đa
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={addMaxAdults}
                onChange={(e) => setAddMaxAdults(Number(e.target.value))}
                className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Số trẻ em tối đa
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={addMaxChildren}
                onChange={(e) => setAddMaxChildren(Number(e.target.value))}
                className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Mô tả chi tiết hạng phòng
            </label>
            <textarea
              placeholder="VD: Phòng có ban công rộng rãi, hướng nhìn ra biển, trang bị bồn tắm nằm cao cấp..."
              value={addDescription}
              onChange={(e) => setAddDescription(e.target.value)}
              rows={2}
              className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id="addRoomTypeActive"
              checked={addIsActive}
              onChange={(e) => setAddIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="addRoomTypeActive" className="text-xs text-slate-700 cursor-pointer font-medium">
              Kích hoạt hạng phòng ngay lập tức
            </label>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Chỉnh sửa hạng phòng */}
      {editingRoomType && (
        <Modal
          isOpen={!!editingRoomType}
          onClose={() => setEditingRoomType(null)}
          title={`Sửa Hạng Phòng: ${editingRoomType.name}`}
          subtitle="Cập nhật thông tin, cấu hình giường và mức giá niêm yết"
          icon={<Edit size={20} />}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditingRoomType(null)} disabled={submittingEdit}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateRoomType}
                isLoading={submittingEdit}
                leftIcon={<CheckCircle2 size={16} />}
              >
                Lưu thay đổi
              </Button>
            </>
          }
        >
          <form onSubmit={handleUpdateRoomType} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Tên hạng phòng <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
              <CurrencyInput
                label="Giá niêm yết (VNĐ/đêm)"
                required
                min={0}
                value={editBasePrice}
                onChange={setEditBasePrice}
                inputClassName="py-2.5 px-3.5 rounded-lg border-slate-300 text-sm focus:border-amber-500"
              />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Diện tích (m²)
                </label>
                <input
                  type="number"
                  min={10}
                  step={0.5}
                  value={editAreaSqm}
                  onChange={(e) => setEditAreaSqm(Number(e.target.value))}
                  className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500"
                />
              </div>
            </div>

            {/* Cấu hình linh hoạt các loại giường (Sửa) */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70">
              <div className="flex justify-between items-center mb-2.5">
                <label className="text-xs font-bold text-slate-900">
                  Cấu hình Loại giường <span className="text-rose-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleEditAddBedItem}
                  className="inline-flex items-center gap-1 py-1 px-2.5 rounded-md border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Plus size={13} /> Thêm giường
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {editBedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className="w-24 shrink-0">
                      <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white h-9 shadow-xs focus-within:border-amber-500">
                        <button
                          type="button"
                          onClick={() => handleEditUpdateBedItem(item.id, 'count', Math.max(1, item.count - 1))}
                          className="w-8 h-full border-none bg-slate-100 hover:bg-slate-200 active:bg-slate-300 cursor-pointer font-bold text-slate-700 flex items-center justify-center transition-colors select-none"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={item.count}
                          onChange={(e) => handleEditUpdateBedItem(item.id, 'count', Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 w-0 h-full text-center border-none outline-none text-xs font-bold text-slate-900 bg-transparent p-0 m-0 no-spinner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleEditUpdateBedItem(item.id, 'count', item.count + 1)}
                          className="w-8 h-full border-none bg-slate-100 hover:bg-slate-200 active:bg-slate-300 cursor-pointer font-bold text-slate-700 flex items-center justify-center transition-colors select-none"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex-1">
                      <input
                        type="text"
                        list="bedSuggestions"
                        placeholder="VD: giường King, giường Single..."
                        value={item.type}
                        onChange={(e) => handleEditUpdateBedItem(item.id, 'type', e.target.value)}
                        required
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs outline-none bg-white text-slate-900 focus:border-amber-500"
                      />
                    </div>

                    {editBedItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleEditRemoveBedItem(item.id)}
                        className="w-9 h-9 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                        title="Xóa loại giường này"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-2 text-[11px] text-slate-500">
                Chuỗi cấu hình: <strong className="text-slate-900 font-semibold">{formatBedConfigToString(editBedItems)}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Số người lớn tối đa
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={editMaxAdults}
                  onChange={(e) => setEditMaxAdults(Number(e.target.value))}
                  className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Số trẻ em tối đa
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={editMaxChildren}
                  onChange={(e) => setEditMaxChildren(Number(e.target.value))}
                  className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Mô tả chi tiết hạng phòng
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500 font-sans"
              />
            </div>

            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                id="editRoomTypeActive"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="editRoomTypeActive" className="text-xs text-slate-700 cursor-pointer font-medium">
                Trạng thái kích hoạt (Hoạt động)
              </label>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 3: Xác nhận Xóa hạng phòng */}
      <ConfirmModal
        isOpen={!!deletingRoomType}
        onClose={() => setDeletingRoomType(null)}
        onConfirm={handleDeleteRoomType}
        isLoading={submittingDelete}
        title="Xác nhận xóa hạng phòng"
        message={`Bạn có chắc chắn muốn ngừng hoạt động Hạng phòng "${deletingRoomType?.name}" không? Hành động này sẽ chuyển trạng thái của hạng phòng sang ngưng hoạt động.`}
        confirmText="Xác nhận Xóa"
        cancelText="Hủy bỏ"
        variant="danger"
      />
    </div>
  );
};
