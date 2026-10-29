import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Pagination } from '../../components/common/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  Phone,
  Mail,
  CreditCard,
  UserPlus,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  Globe,
} from 'lucide-react';

interface GuestItem {
  guestId: number;
  fullName: string;
  phone: string;
  email: string;
  gender: string;
  dateOfBirth?: string;
  nationality: string;
  idType: string;
  idNumber: string;
  address: string;
  loyaltyTier?: string;
  loyaltyPoints?: number;
  createdAt: string;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const GuestsPage: React.FC = () => {
  const toast = useToast();
  const { hasAnyRole } = useAuth();
  const canCreate = hasAnyRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']);
  const canEdit = hasAnyRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']);
  const canDelete = hasAnyRole(['ADMIN', 'MANAGER']);

  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce<string>(searchTerm, 400);

  // Pagination states (0-indexed for Spring Boot)
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(12);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Modal State: Thêm khách hàng mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFullName, setCreateFullName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createGender, setCreateGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [createDateOfBirth, setCreateDateOfBirth] = useState('');
  const [createNationality, setCreateNationality] = useState('Việt Nam');
  const [createIdType, setCreateIdType] = useState<'CCCD' | 'CMND' | 'PASSPORT'>('CCCD');
  const [createIdNumber, setCreateIdNumber] = useState('');
  const [createAddress, setCreateAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State: Sửa thông tin khách hàng
  const [editGuest, setEditGuest] = useState<GuestItem | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGender, setEditGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editNationality, setEditNationality] = useState('Việt Nam');
  const [editIdType, setEditIdType] = useState<'CCCD' | 'CMND' | 'PASSPORT'>('CCCD');
  const [editIdNumber, setEditIdNumber] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Modal State: Xóa khách hàng
  const [deleteGuest, setDeleteGuest] = useState<GuestItem | null>(null);

  const fetchGuests = useCallback(
    async (targetPage = page, targetSize = pageSize, query = debouncedSearch) => {
      setLoading(true);
      setError(null);
      try {
        let endpoint = `/guests?page=${targetPage}&size=${targetSize}`;
        if (query && query.trim()) {
          endpoint += `&keyword=${encodeURIComponent(query.trim())}`;
        }
        const data = await api.get<PageResponse<GuestItem>>(endpoint);
        setGuests(data.content || []);
        setTotalPages(data.totalPages || 1);
        setTotalElements(data.totalElements || 0);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Không thể tải danh sách khách hàng.');
        }
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, debouncedSearch]
  );

  // Tự động gọi API sau khi đổi page, pageSize hoặc debouncedSearch
  useEffect(() => {
    fetchGuests(page, pageSize, debouncedSearch);
  }, [fetchGuests, page, pageSize, debouncedSearch]);

  // Khi đổi từ khóa tìm kiếm -> reset về trang đầu
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchGuests(0, pageSize, searchTerm.trim());
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  // 1. Thêm khách hàng mới (POST /guests)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFullName.trim()) {
      toast.error('Vui lòng nhập họ và tên khách hàng.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/guests', {
        fullName: createFullName.trim(),
        phone: createPhone.trim() || null,
        email: createEmail.trim() || null,
        gender: createGender,
        dateOfBirth: createDateOfBirth || null,
        nationality: createNationality.trim() || 'Việt Nam',
        idType: createIdType,
        idNumber: createIdNumber.trim() || null,
        address: createAddress.trim() || null,
      });

      toast.success(`Đã thêm thành công hồ sơ khách hàng: ${createFullName.trim()}`);
      setShowCreateModal(false);
      // Reset form
      setCreateFullName('');
      setCreatePhone('');
      setCreateEmail('');
      setCreateGender('MALE');
      setCreateDateOfBirth('');
      setCreateNationality('Việt Nam');
      setCreateIdType('CCCD');
      setCreateIdNumber('');
      setCreateAddress('');
      fetchGuests(0, pageSize, searchTerm);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Thêm khách hàng thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Mở modal sửa khách hàng
  const openEditModal = (guest: GuestItem) => {
    setEditGuest(guest);
    setEditFullName(guest.fullName || '');
    setEditPhone(guest.phone || '');
    setEditEmail(guest.email || '');
    setEditGender((guest.gender as 'MALE' | 'FEMALE' | 'OTHER') || 'MALE');
    setEditDateOfBirth(guest.dateOfBirth ? guest.dateOfBirth.split('T')[0] : '');
    setEditNationality(guest.nationality || 'Việt Nam');
    setEditIdType((guest.idType as 'CCCD' | 'CMND' | 'PASSPORT') || 'CCCD');
    setEditIdNumber(guest.idNumber || '');
    setEditAddress(guest.address || '');
  };

  // Lưu sửa thông tin khách hàng (PUT /guests/{id})
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGuest) return;
    if (!editFullName.trim()) {
      toast.error('Vui lòng nhập họ và tên khách hàng.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/guests/${editGuest.guestId}`, {
        fullName: editFullName.trim(),
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        gender: editGender,
        dateOfBirth: editDateOfBirth || null,
        nationality: editNationality.trim() || 'Việt Nam',
        idType: editIdType,
        idNumber: editIdNumber.trim() || null,
        address: editAddress.trim() || null,
      });

      toast.success(`Đã cập nhật hồ sơ khách hàng [${editFullName.trim()}] thành công!`);
      setEditGuest(null);
      fetchGuests(page, pageSize, searchTerm);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Cập nhật thông tin khách hàng thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Xóa hồ sơ khách hàng (DELETE /guests/{id})
  const confirmDelete = async () => {
    if (!deleteGuest) return;
    try {
      await api.delete(`/guests/${deleteGuest.guestId}`);
      toast.success(`Đã xóa hồ sơ khách hàng [${deleteGuest.fullName}] thành công.`);
      setDeleteGuest(null);
      fetchGuests(page, pageSize, searchTerm);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa hồ sơ khách hàng này.');
    }
  };

  return (
    <div>
      {/* Tiêu đề & Nút thêm */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Hồ sơ Khách hàng
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý, tra cứu và lưu trữ thông tin khách lưu trú
          </p>
        </div>

        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            onClick={() => fetchGuests(page, pageSize, searchTerm)}
            isLoading={loading}
            leftIcon={<RefreshCw size={16} />}
          >
            Làm mới
          </Button>

          {canCreate && (
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              leftIcon={<UserPlus size={16} />}
            >
              Thêm khách hàng
            </Button>
          )}
        </div>
      </div>

      {/* Thanh tìm kiếm */}
      <Card className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-3 items-start">
          <div className="flex-1">
            <Input
              placeholder="Tìm theo Tên khách hàng, Số CCCD/Hộ chiếu, Số điện thoại hoặc Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search size={18} />}
            />
          </div>
          <Button type="submit" variant="primary" className="py-2.5 px-6">
            Tìm kiếm
          </Button>
          {searchTerm && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setPage(0);
                fetchGuests(0, pageSize, '');
              }}
              className="py-2.5 px-4"
            >
              Hủy lọc
            </Button>
          )}
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
            Đang tải dữ liệu khách hàng từ Backend...
          </div>
        </Card>
      ) : guests.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-slate-500 flex flex-col items-center">
            <Users size={40} className="text-slate-300 mb-3" />
            <p className="text-sm">Không tìm thấy hồ sơ khách hàng nào trong hệ thống.</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {guests.map((guest) => (
              <div
                key={guest.guestId}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col gap-3 relative"
              >
                {/* Header Card: Avatar + Họ tên + Actions */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {guest.fullName ? guest.fullName.charAt(0).toUpperCase() : 'K'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {guest.fullName}
                      </h4>
                      <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Globe size={12} /> {guest.nationality || 'Việt Nam'}
                      </span>
                    </div>
                  </div>

                  {/* Nút Sửa & Xóa theo phân quyền */}
                  {(canEdit || canDelete) && (
                    <div className="flex gap-1.5">
                      {canEdit && (
                        <button
                          onClick={() => openEditModal(guest)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin khách"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteGuest(guest)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                          title="Xóa hồ sơ khách"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Thông tin liên hệ & giấy tờ */}
                <div className="border-t border-slate-100 pt-3 flex flex-col gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <CreditCard size={15} className="text-amber-600 shrink-0" />
                    <span>
                      {guest.idType || 'CCCD'}:{' '}
                      <strong className="text-slate-900">{guest.idNumber || 'Chưa có số'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={15} className="text-emerald-600 shrink-0" />
                    <span>{guest.phone || 'Chưa cập nhật SĐT'}</span>
                  </div>

                  {guest.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail size={15} className="text-blue-600 shrink-0" />
                      <span className="truncate">{guest.email}</span>
                    </div>
                  )}

                  {guest.address && (
                    <div className="flex items-start gap-2 text-slate-500">
                      <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-tight line-clamp-2">{guest.address}</span>
                    </div>
                  )}
                </div>
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

      {/* Modal 1: Thêm khách hàng mới */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Thêm Hồ sơ Khách hàng Mới"
        subtitle="Lưu trữ thông tin khách lưu trú vào hệ thống (POST /api/v1/guests)"
        icon={<UserPlus size={20} />}
        onSubmit={handleCreateSubmit}
        footer={
          <>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowCreateModal(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Tạo hồ sơ khách hàng
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Họ và tên khách hàng *"
            placeholder="ví dụ: Nguyễn Văn An"
            value={createFullName}
            onChange={(e) => setCreateFullName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5 mb-4 text-left">
              <label className="text-xs font-semibold text-slate-700">Loại giấy tờ định danh *</label>
              <select
                className="w-full py-2.5 px-3.5 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                value={createIdType}
                onChange={(e) => setCreateIdType(e.target.value as 'CCCD' | 'CMND' | 'PASSPORT')}
              >
                <option value="CCCD">Căn cước công dân (CCCD)</option>
                <option value="PASSPORT">Hộ chiếu (Passport)</option>
                <option value="CMND">Chứng minh nhân dân (CMND)</option>
              </select>
            </div>

            <Input
              label="Số định danh *"
              placeholder="ví dụ: 001202008899"
              value={createIdNumber}
              onChange={(e) => setCreateIdNumber(e.target.value)}
              leftIcon={<CreditCard size={16} />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Số điện thoại"
              placeholder="0912345678"
              value={createPhone}
              onChange={(e) => setCreatePhone(e.target.value)}
              leftIcon={<Phone size={16} />}
            />

            <Input
              label="Email"
              type="email"
              placeholder="khachhang@example.com"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              leftIcon={<Mail size={16} />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5 mb-4 text-left">
              <label className="text-xs font-semibold text-slate-700">Giới tính</label>
              <select
                className="w-full py-2.5 px-3.5 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                value={createGender}
                onChange={(e) => setCreateGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER')}
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <Input
              label="Ngày sinh"
              type="date"
              value={createDateOfBirth}
              onChange={(e) => setCreateDateOfBirth(e.target.value)}
              leftIcon={<Calendar size={16} />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="md:col-span-1">
              <Input
                label="Quốc tịch"
                placeholder="Việt Nam"
                value={createNationality}
                onChange={(e) => setCreateNationality(e.target.value)}
                leftIcon={<Globe size={16} />}
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Địa chỉ thường trú"
                placeholder="ví dụ: 123 Cầu Giấy, Hà Nội"
                value={createAddress}
                onChange={(e) => setCreateAddress(e.target.value)}
                leftIcon={<MapPin size={16} />}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Chỉnh sửa khách hàng */}
      {editGuest && (
        <Modal
          isOpen={!!editGuest}
          onClose={() => setEditGuest(null)}
          title={`Sửa Hồ sơ Khách: ${editGuest.fullName}`}
          subtitle="Cập nhật thông tin khách lưu trú (PUT /api/v1/guests/{id})"
          icon={<Edit size={20} />}
          onSubmit={handleEditSubmit}
          footer={
            <>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEditGuest(null)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button variant="primary" type="submit" isLoading={isSubmitting}>
                Lưu thay đổi
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Họ và tên khách hàng *"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              required
              autoFocus
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5 mb-4 text-left">
                <label className="text-xs font-semibold text-slate-700">Loại giấy tờ định danh *</label>
                <select
                  className="w-full py-2.5 px-3.5 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  value={editIdType}
                  onChange={(e) => setEditIdType(e.target.value as 'CCCD' | 'CMND' | 'PASSPORT')}
                >
                  <option value="CCCD">Căn cước công dân (CCCD)</option>
                  <option value="PASSPORT">Hộ chiếu (Passport)</option>
                  <option value="CMND">Chứng minh nhân dân (CMND)</option>
                </select>
              </div>

              <Input
                label="Số định danh *"
                value={editIdNumber}
                onChange={(e) => setEditIdNumber(e.target.value)}
                leftIcon={<CreditCard size={16} />}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <Input
                label="Số điện thoại"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                leftIcon={<Phone size={16} />}
              />

              <Input
                label="Email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                leftIcon={<Mail size={16} />}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5 mb-4 text-left">
                <label className="text-xs font-semibold text-slate-700">Giới tính</label>
                <select
                  className="w-full py-2.5 px-3.5 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value as 'MALE' | 'FEMALE' | 'OTHER')}
                >
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>

              <Input
                label="Ngày sinh"
                type="date"
                value={editDateOfBirth}
                onChange={(e) => setEditDateOfBirth(e.target.value)}
                leftIcon={<Calendar size={16} />}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="md:col-span-1">
                <Input
                  label="Quốc tịch"
                  value={editNationality}
                  onChange={(e) => setEditNationality(e.target.value)}
                  leftIcon={<Globe size={16} />}
                />
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Địa chỉ thường trú"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  leftIcon={<MapPin size={16} />}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 3: Xác nhận xóa khách hàng */}
      <ConfirmModal
        isOpen={!!deleteGuest}
        onClose={() => setDeleteGuest(null)}
        onConfirm={confirmDelete}
        title="Xác nhận xóa hồ sơ khách hàng"
        message={`Bạn có chắc chắn muốn xóa hồ sơ của khách [${deleteGuest?.fullName}] (CCCD: ${deleteGuest?.idNumber})? Hành động này không thể hoàn tác.`}
        confirmText="Xóa hồ sơ"
        variant="danger"
      />
    </div>
  );
};
