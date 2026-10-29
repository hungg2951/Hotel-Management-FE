import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Pagination } from '../../components/common/Pagination';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import {
  BedDouble,
  RefreshCw,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Search,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react';

interface RoomItem {
  roomId: number;
  roomNumber: string;
  floorNo: number;
  roomTypeId: number;
  roomTypeName: string;
  roomTypeCode?: string;
  basePrice?: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'OUT_OF_ORDER';
  housekeepingStatus: 'CLEAN' | 'DIRTY' | 'CLEANING' | 'INSPECTED';
  isActive: boolean;
  note?: string;
}

interface RoomTypeOption {
  roomTypeId: number;
  name: string;
  basePrice?: number;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const RoomsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasAnyRole, isAdmin } = useAuth();
  const toast = useToast();

  const canManageRooms = isAdmin || hasAnyRole(['ADMIN', 'MANAGER']) || user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc & Tìm kiếm với debounce 700ms
  const [searchTerm, setSearchTerm] = useState<string>('');
  const debouncedSearch = useDebounce<string>(searchTerm, 700);
  const [filterFloor, setFilterFloor] = useState<number | ''>('');
  const [filterRoomType, setFilterRoomType] = useState<number | ''>('');
  const [filterHk, setFilterHk] = useState<string>('');

  // Danh sách hạng phòng lấy trực tiếp từ Database qua API /api/v1/room-types
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([]);

  // Pagination states (0-indexed for Spring Boot)
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(12);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Modal Thêm phòng mới
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addRoomNumber, setAddRoomNumber] = useState<string>('');
  const [addRoomTypeId, setAddRoomTypeId] = useState<number>(0);
  const [addFloorNo, setAddFloorNo] = useState<number>(1);
  const [addNote, setAddNote] = useState<string>('');
  const [addIsActive, setAddIsActive] = useState<boolean>(true);
  const [submittingAdd, setSubmittingAdd] = useState<boolean>(false);

  // Modal Sửa phòng
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [editRoomNumber, setEditRoomNumber] = useState<string>('');
  const [editRoomTypeId, setEditRoomTypeId] = useState<number>(0);
  const [editFloorNo, setEditFloorNo] = useState<number>(1);
  const [editNote, setEditNote] = useState<string>('');
  const [editStatus, setEditStatus] = useState<RoomItem['status']>('AVAILABLE');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);

  // Modal Xóa phòng
  const [deletingRoom, setDeletingRoom] = useState<RoomItem | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState<boolean>(false);

  // 1. Tải danh sách hạng phòng từ Backend
  const fetchRoomTypes = useCallback(async () => {
    try {
      const res = await api.get<unknown>('/room-types?all=true');
      if (Array.isArray(res)) {
        setRoomTypes(res);
        if (res.length > 0 && !addRoomTypeId) {
          setAddRoomTypeId(res[0].roomTypeId);
        }
      } else if (res && typeof res === 'object' && 'content' in res) {
        const pageData = res as PageResponse<RoomTypeOption>;
        setRoomTypes(pageData.content || []);
        if (pageData.content?.length > 0 && !addRoomTypeId) {
          setAddRoomTypeId(pageData.content[0].roomTypeId);
        }
      }
    } catch {
      // Fallback nếu chưa tải được
    }
  }, [addRoomTypeId]);

  useEffect(() => {
    fetchRoomTypes();
  }, [fetchRoomTypes]);

  // 2. Tải danh sách phòng từ Backend
  const fetchRooms = useCallback(
    async (
      targetPage = page,
      targetSize = pageSize,
      currentSearch = debouncedSearch,
      currentFloor = filterFloor,
      currentRoomType = filterRoomType,
      currentHk = filterHk
    ) => {
      setLoading(true);
      setError(null);
      try {
        let endpoint = `/rooms?page=${targetPage}&size=${targetSize}`;
        if (currentFloor !== '') {
          endpoint += `&floorNo=${currentFloor}`;
        }
        if (currentRoomType !== '') {
          endpoint += `&roomTypeId=${currentRoomType}`;
        }
        if (currentHk) {
          endpoint += `&housekeepingStatus=${currentHk}`;
        }
        if (currentSearch.trim()) {
          endpoint += `&search=${encodeURIComponent(currentSearch.trim())}`;
        }

        const data = await api.get<PageResponse<RoomItem>>(endpoint);
        setRooms(data.content || []);
        setTotalPages(data.totalPages || 1);
        setTotalElements(data.totalElements || 0);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Không thể tải danh sách phòng từ máy chủ.');
        }
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, debouncedSearch, filterFloor, filterRoomType, filterHk]
  );

  // Tự động gọi API sau 700ms debounce
  useEffect(() => {
    fetchRooms(page, pageSize, debouncedSearch, filterFloor, filterRoomType, filterHk);
  }, [fetchRooms, page, pageSize, debouncedSearch, filterFloor, filterRoomType, filterHk]);

  // Khi thay đổi từ khóa hoặc bộ lọc -> reset về trang đầu
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, filterFloor, filterRoomType, filterHk]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchRooms(0, pageSize, searchTerm.trim(), filterFloor, filterRoomType, filterHk);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterFloor('');
    setFilterRoomType('');
    setFilterHk('');
    setPage(0);
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() || filterFloor !== '' || filterRoomType !== '' || filterHk !== ''
  );

  // Tự động suy ra tầng khi nhập số phòng (ví dụ 101 -> tầng 1, 203 -> tầng 2)
  const handleRoomNumberChange = (val: string) => {
    setAddRoomNumber(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 100) {
      const floor = Math.floor(num / 100);
      setAddFloorNo(floor);
    }
  };

  // 1. Thêm phòng mới
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addRoomNumber.trim()) {
      toast.error('Vui lòng nhập số phòng.');
      return;
    }

    const targetRoomTypeId = addRoomTypeId || (roomTypes.length > 0 ? roomTypes[0].roomTypeId : null);
    if (!targetRoomTypeId) {
      toast.error('Chưa tải được danh mục hạng phòng từ máy chủ. Vui lòng thử lại.');
      return;
    }

    setSubmittingAdd(true);
    try {
      await api.post('/rooms', {
        roomTypeId: targetRoomTypeId,
        roomNumber: addRoomNumber.trim(),
        floorNo: addFloorNo,
        note: addNote.trim(),
        isActive: addIsActive,
      });

      toast.success(`Thêm phòng ${addRoomNumber.trim()} thành công!`);
      setShowAddModal(false);
      setAddRoomNumber('');
      setAddNote('');
      setAddFloorNo(1);
      fetchRooms(page, pageSize, searchTerm, filterFloor, filterRoomType, filterHk);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Không thể tạo mới phòng. Vui lòng thử lại.');
      }
    } finally {
      setSubmittingAdd(false);
    }
  };

  // 2. Mở modal sửa phòng
  const handleOpenEdit = (room: RoomItem) => {
    setEditingRoom(room);
    setEditRoomNumber(room.roomNumber);
    setEditRoomTypeId(room.roomTypeId || 1);
    setEditFloorNo(room.floorNo || 1);
    setEditNote(room.note || '');
    setEditStatus(room.status);
    setEditIsActive(room.isActive ?? true);
  };

  // 3. Lưu chỉnh sửa phòng
  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    if (!editRoomNumber.trim()) {
      toast.error('Số phòng không được để trống.');
      return;
    }

    setSubmittingEdit(true);
    try {
      await api.put(`/rooms/${editingRoom.roomId}`, {
        roomTypeId: editRoomTypeId,
        roomNumber: editRoomNumber.trim(),
        floorNo: editFloorNo,
        note: editNote.trim(),
        isActive: editIsActive,
      });

      if (editStatus !== editingRoom.status && editingRoom.status !== 'OCCUPIED' && editStatus !== 'OCCUPIED') {
        try {
          await api.patch(`/rooms/${editingRoom.roomId}/status`, {
            status: editStatus,
            note: editNote.trim() || undefined,
          });
        } catch {
          // Bỏ qua nếu backend báo trạng thái không hợp lệ
        }
      }

      toast.success(`Cập nhật phòng ${editRoomNumber} thành công!`);
      setEditingRoom(null);
      fetchRooms(page, pageSize, searchTerm, filterFloor, filterRoomType, filterHk);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Không thể cập nhật phòng.');
      }
    } finally {
      setSubmittingEdit(false);
    }
  };

  // 4. Xóa phòng
  const handleDeleteRoom = async () => {
    if (!deletingRoom) return;
    setSubmittingDelete(true);
    try {
      await api.delete(`/rooms/${deletingRoom.roomId}`);
      toast.success(`Đã xóa / ngừng hoạt động phòng ${deletingRoom.roomNumber}!`);
      setDeletingRoom(null);
      fetchRooms(page, pageSize, searchTerm, filterFloor, filterRoomType, filterHk);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error('Không thể xóa phòng.');
      }
    } finally {
      setSubmittingDelete(false);
    }
  };

  const getStatusBadge = (status: RoomItem['status']) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge variant="success">TRỐNG</Badge>;
      case 'OCCUPIED':
        return <Badge variant="danger">CÓ KHÁCH</Badge>;
      case 'MAINTENANCE':
        return <Badge variant="warning">BẢO TRÌ</Badge>;
      case 'OUT_OF_ORDER':
        return <Badge variant="danger">HỎNG</Badge>;
    }
  };

  const getHkBadge = (hk: RoomItem['housekeepingStatus']) => {
    switch (hk) {
      case 'CLEAN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sparkles size={11} /> ĐÃ DỌN SẠCH
          </span>
        );
      case 'DIRTY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            CHƯA DỌN (BẨN)
          </span>
        );
      case 'CLEANING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            ĐANG DỌN
          </span>
        );
      case 'INSPECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            ĐÃ KIỂM TRA
          </span>
        );
    }
  };

  return (
    <div>
      {/* Header & Hành động */}
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quản lý Danh sách Phòng</h2>
          <p className="text-xs text-slate-500 mt-1">
            Tra cứu, lọc theo tầng, hạng phòng, tình trạng vệ sinh và quản lý phòng
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={() => fetchRooms(page, pageSize, searchTerm, filterFloor, filterRoomType, filterHk)}
            isLoading={loading}
            leftIcon={<RefreshCw size={16} />}
          >
            Làm mới
          </Button>

          {canManageRooms && (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate('/room-types')}
                leftIcon={<Layers size={16} />}
              >
                Hạng phòng
              </Button>

              <Button
                variant="primary"
                onClick={() => setShowAddModal(true)}
                leftIcon={<Plus size={16} />}
              >
                Thêm phòng mới
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Thanh Tìm kiếm & Bộ lọc nâng cao */}
      <Card
        className="mb-5 bg-white"
        title="Bộ lọc & Tìm kiếm phòng"
        subtitle="Tìm kiếm theo số phòng hoặc lọc tự động theo tầng, hạng phòng và tình trạng dọn dẹp"
        action={
          hasActiveFilters ? (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors cursor-pointer"
              title="Khôi phục về trạng thái mặc định"
            >
              <RotateCcw size={13} />
              <span>Đặt lại bộ lọc</span>
            </button>
          ) : undefined
        }
      >
        <form onSubmit={handleSearchSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end">
            {/* 1. Tìm kiếm theo tên / số phòng */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số phòng
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nhập số phòng (tự động lọc)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-2 pl-9 pr-3 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
                <Search
                  size={15}
                  className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>
            </div>

            {/* 2. Lọc theo Tầng */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tầng
              </label>
              <select
                value={filterFloor}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : '';
                  setFilterFloor(val);
                  setPage(0);
                  fetchRooms(0, pageSize, searchTerm, val, filterRoomType, filterHk);
                }}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="">Tất cả các tầng</option>
                <option value="1">Tầng 1</option>
                <option value="2">Tầng 2</option>
                <option value="3">Tầng 3</option>
                <option value="4">Tầng 4</option>
                <option value="5">Tầng 5</option>
                <option value="6">Tầng 6</option>
                <option value="7">Tầng 7</option>
                <option value="8">Tầng 8</option>
                <option value="9">Tầng 9</option>
                <option value="10">Tầng 10</option>
              </select>
            </div>

            {/* 3. Lọc theo Hạng phòng */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hạng phòng
              </label>
              <select
                value={filterRoomType}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : '';
                  setFilterRoomType(val);
                  setPage(0);
                  fetchRooms(0, pageSize, searchTerm, filterFloor, val, filterHk);
                }}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="">Tất cả hạng phòng</option>
                {roomTypes.map((rt) => (
                  <option key={rt.roomTypeId} value={rt.roomTypeId}>
                    {rt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Lọc theo Phòng đã vệ sinh chưa */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tình trạng vệ sinh
              </label>
              <select
                value={filterHk}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterHk(val);
                  setPage(0);
                  fetchRooms(0, pageSize, searchTerm, filterFloor, filterRoomType, val);
                }}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="">Tất cả tình trạng</option>
                <option value="CLEAN">Đã dọn sạch (SẠCH)</option>
                <option value="DIRTY">Chưa dọn (BẨN)</option>
                <option value="CLEANING">Đang dọn dẹp</option>
                <option value="INSPECTED">Đã kiểm tra</option>
              </select>
            </div>
          </div>
        </form>
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
            Đang tải dữ liệu phòng từ máy chủ...
          </div>
        </Card>
      ) : rooms.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-slate-500 flex flex-col items-center">
            <BedDouble size={48} className="text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              {hasActiveFilters ? 'Không tìm thấy phòng nào phù hợp với bộ lọc hiện tại' : 'Chưa có phòng nào trong hệ thống'}
            </p>
            {hasActiveFilters ? (
              <Button
                variant="secondary"
                onClick={handleResetFilters}
                className="mt-3.5"
                leftIcon={<RotateCcw size={15} />}
              >
                Xóa bộ lọc & xem tất cả
              </Button>
            ) : canManageRooms && (
              <Button
                variant="primary"
                onClick={() => setShowAddModal(true)}
                className="mt-4"
                leftIcon={<Plus size={16} />}
              >
                Tạo phòng đầu tiên ngay
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {rooms.map((room) => (
              <div
                key={room.roomId}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col gap-3 relative"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-extrabold text-sm">
                      <BedDouble size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                        Phòng {room.roomNumber}
                      </h3>
                      <span className="text-[11px] text-slate-500">Tầng {room.floorNo}</span>
                    </div>
                  </div>

                  {getStatusBadge(room.status)}
                </div>

                <div className="border-t border-slate-100 pt-3 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hạng phòng:</span>
                    <span className="font-semibold text-slate-900 truncate ml-2">
                      {room.roomTypeName || 'Tiêu chuẩn'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Vệ sinh:</span>
                    {getHkBadge(room.housekeepingStatus)}
                  </div>
                  {room.basePrice && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Giá niêm yết:</span>
                      <span className="font-bold text-slate-900">
                        {Number(room.basePrice).toLocaleString('vi-VN')} đ/đêm
                      </span>
                    </div>
                  )}
                  {room.note && (
                    <div className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-2">
                      * {room.note}
                    </div>
                  )}
                </div>

                {/* Các nút hành động Sửa / Xóa cho Admin / Manager */}
                {canManageRooms && (
                  <div className="border-t border-slate-100 pt-2.5 flex justify-end gap-2 mt-auto">
                    <button
                      onClick={() => handleOpenEdit(room)}
                      className="inline-flex items-center gap-1 py-1 px-2.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
                      title="Sửa thông tin phòng"
                    >
                      <Edit size={13} /> Sửa
                    </button>

                    <button
                      onClick={() => setDeletingRoom(room)}
                      className="inline-flex items-center gap-1 py-1 px-2.5 rounded-md border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold cursor-pointer transition-colors"
                      title="Xóa phòng"
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

      {/* Modal 1: Thêm phòng mới */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm Phòng Mới"
        subtitle="Khởi tạo số phòng, phân loại hạng phòng và thiết lập tầng"
        icon={<BedDouble size={20} />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={submittingAdd}>
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateRoom}
              isLoading={submittingAdd}
              leftIcon={<CheckCircle2 size={16} />}
            >
              Lưu & Tạo phòng
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Số phòng <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: 104, 205, 301..."
              value={addRoomNumber}
              onChange={(e) => handleRoomNumberChange(e.target.value)}
              required
              className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Hạng phòng <span className="text-rose-600">*</span>
              </label>
              <select
                value={addRoomTypeId}
                onChange={(e) => setAddRoomTypeId(Number(e.target.value))}
                className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none bg-white text-slate-900 focus:border-amber-500 cursor-pointer"
              >
                {roomTypes.map((rt) => (
                  <option key={rt.roomTypeId} value={rt.roomTypeId}>
                    {rt.name} {rt.basePrice ? `(${Number(rt.basePrice).toLocaleString('vi-VN')} đ)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Tầng
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={addFloorNo}
                onChange={(e) => setAddFloorNo(Number(e.target.value))}
                className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Ghi chú thêm
            </label>
            <input
              type="text"
              placeholder="VD: View biển, gần thang máy, cửa sổ lớn..."
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id="addRoomActive"
              checked={addIsActive}
              onChange={(e) => setAddIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="addRoomActive" className="text-xs text-slate-700 cursor-pointer font-medium">
              Kích hoạt đưa vào sử dụng ngay lập tức
            </label>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Chỉnh sửa thông tin phòng */}
      <Modal
        isOpen={!!editingRoom}
        onClose={() => setEditingRoom(null)}
        title={`Chỉnh sửa Phòng ${editingRoom?.roomNumber || ''}`}
        subtitle="Cập nhật số phòng, hạng phòng và trạng thái hoạt động"
        icon={<Edit size={20} />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingRoom(null)} disabled={submittingEdit}>
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateRoom}
              isLoading={submittingEdit}
              leftIcon={<CheckCircle2 size={16} />}
            >
              Lưu thay đổi
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateRoom} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Số phòng <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={editRoomNumber}
              onChange={(e) => setEditRoomNumber(e.target.value)}
              required
              className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Hạng phòng
              </label>
              <select
                value={editRoomTypeId}
                onChange={(e) => setEditRoomTypeId(Number(e.target.value))}
                className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none bg-white text-slate-900 focus:border-amber-500 cursor-pointer"
              >
                {roomTypes.map((rt) => (
                  <option key={rt.roomTypeId} value={rt.roomTypeId}>
                    {rt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Tầng
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={editFloorNo}
                onChange={(e) => setEditFloorNo(Number(e.target.value))}
                className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Trạng thái phòng
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as RoomItem['status'])}
              disabled={editingRoom?.status === 'OCCUPIED'}
              className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none bg-white text-slate-900 focus:border-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="AVAILABLE">Trống (Sẵn sàng đón khách)</option>
              <option value="MAINTENANCE">Bảo trì</option>
              <option value="OUT_OF_ORDER">Hỏng hóc</option>
              {editingRoom?.status === 'OCCUPIED' && <option value="OCCUPIED">Đang có khách</option>}
            </select>
            {editingRoom?.status === 'OCCUPIED' && (
              <span className="text-[11px] text-rose-600 mt-1 block">
                * Phòng đang có khách lưu trú không thể đổi trạng thái thủ công.
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Ghi chú
            </label>
            <input
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Ghi chú chi tiết phòng..."
              className="w-full py-2.5 px-3.5 rounded-lg border border-slate-300 text-sm outline-none text-slate-900 bg-white focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editRoomActive"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="editRoomActive" className="text-xs text-slate-700 cursor-pointer font-medium">
              Trạng thái kích hoạt (Hoạt động)
            </label>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Xác nhận Xóa phòng */}
      <ConfirmModal
        isOpen={!!deletingRoom}
        onClose={() => setDeletingRoom(null)}
        onConfirm={handleDeleteRoom}
        isLoading={submittingDelete}
        title="Xác nhận xóa phòng"
        message={`Bạn có chắc chắn muốn xóa hoặc ngừng sử dụng Phòng "${deletingRoom?.roomNumber}" (${deletingRoom?.roomTypeName || 'Tiêu chuẩn'}) không? Hành động này sẽ chuyển trạng thái phòng sang ngưng hoạt động.`}
        confirmText="Xác nhận Xóa"
        cancelText="Hủy bỏ"
        variant="danger"
      />
    </div>
  );
};
