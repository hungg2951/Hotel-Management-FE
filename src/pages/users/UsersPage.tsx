import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Pagination } from '../../components/common/Pagination';
import { ActionDropdown } from '../../components/common/ActionDropdown';
import {
  Crown,
  UserPlus,
  CheckCircle,
  Ban,
  KeyRound,
  Mail,
  Phone,
  Briefcase,
  Edit,
  Trash2,
  Lock,
} from 'lucide-react';
import type { AppRole } from '../../types/auth';
import { userService, type UserAccount } from '../../services/userService';

export const UsersPage: React.FC = () => {
  const toast = useToast();

  // Dữ liệu tài khoản trong hệ thống
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State: Tạo tài khoản mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPosition, setNewPosition] = useState('Nhân viên Lễ tân');
  const [newRole, setNewRole] = useState<AppRole>('RECEPTIONIST');

  // Modal State: Chỉnh sửa thông tin user khác
  const [editUser, setEditUser] = useState<UserAccount | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editRole, setEditRole] = useState<AppRole>('RECEPTIONIST');

  // Modal State: Admin đổi mật khẩu cho user khác
  const [resetPasswordUser, setResetPasswordUser] = useState<UserAccount | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Confirm Modal: Khóa/Mở khóa & Xóa
  const [toggleStatusUser, setToggleStatusUser] = useState<UserAccount | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserAccount | null>(null);

  // Phân trang
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(12);

  // Nạp danh sách người dùng từ API
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err: unknown) {
      console.error('Lỗi khi tải danh sách người dùng:', err);
      toast.error('Không thể tải danh sách tài khoản từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalElements = users.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const paginatedUsers = users.slice(page * pageSize, (page + 1) * pageSize);

  // 1. Tạo tài khoản mới
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newFullName.trim()) {
      toast.error('Vui lòng điền đầy đủ Tên đăng nhập, Mật khẩu và Họ tên nhân viên.');
      return;
    }

    try {
      const created = await userService.createUser({
        username: newUsername.trim(),
        password: newPassword.trim(),
        fullName: newFullName.trim(),
        email: newEmail.trim() || `${newUsername.trim()}@demohotel.vn`,
        phone: newPhone.trim() || '0900000000',
        role: newRole,
        position: newPosition,
      });

      setUsers([created, ...users]);
      setShowCreateModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');

      toast.success(`Đã tạo tài khoản thành công cho nhân viên: ${created.fullName}`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Tạo tài khoản thất bại.';
      toast.error(errorMsg);
    }
  };

  // 2. Mở Modal Chỉnh sửa thông tin
  const openEditModal = (user: UserAccount) => {
    setEditUser(user);
    setEditFullName(user.fullName);
    setEditEmail(user.email);
    setEditPhone(user.phone);
    setEditPosition(user.position);
    setEditRole(user.role);
  };

  // Lưu chỉnh sửa thông tin user khác
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    try {
      const updated = await userService.updateUser(editUser.id, {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        position: editPosition.trim(),
        role: editRole,
      });

      setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(`Đã cập nhật thông tin và vai trò cho tài khoản [${editUser.username}]!`);
      setEditUser(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Cập nhật tài khoản thất bại.';
      toast.error(errorMsg);
    }
  };

  // 3. Admin đổi mật khẩu cho user khác
  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    if (!adminNewPassword.trim() || adminNewPassword.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    try {
      setIsResettingPassword(true);
      await userService.adminResetPassword(resetPasswordUser.id, adminNewPassword.trim());
      toast.success(`Đã đặt lại mật khẩu mới cho tài khoản [${resetPasswordUser.username}] thành công!`);
      setResetPasswordUser(null);
      setAdminNewPassword('');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại.';
      toast.error(errorMsg);
    } finally {
      setIsResettingPassword(false);
    }
  };

  // 4. Khóa / Kích hoạt tài khoản
  const confirmToggleStatus = async () => {
    if (!toggleStatusUser) return;

    if (toggleStatusUser.username === 'admin') {
      toast.error('Không thể khóa tài khoản Quản trị viên tối cao (admin)!');
      setToggleStatusUser(null);
      return;
    }

    try {
      const updated = await userService.toggleUserStatus(toggleStatusUser.id);
      setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
      if (updated.isActive) {
        toast.success(`Đã kích hoạt lại tài khoản [${updated.username}].`);
      } else {
        toast.warning(`Đã khóa tạm thời tài khoản [${updated.username}].`);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Thao tác trạng thái tài khoản thất bại.';
      toast.error(errorMsg);
    } finally {
      setToggleStatusUser(null);
    }
  };

  // 5. Xóa tài khoản
  const confirmDeleteUser = async () => {
    if (!deleteUser) return;

    if (deleteUser.username === 'admin') {
      toast.error('Không thể xóa tài khoản Quản trị viên tối cao (admin)!');
      setDeleteUser(null);
      return;
    }

    try {
      await userService.deleteUser(deleteUser.id);
      setUsers(users.filter((u) => u.id !== deleteUser.id));
      toast.success(`Đã xóa tài khoản [${deleteUser.username}] khỏi hệ thống.`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Xóa tài khoản thất bại.';
      toast.error(errorMsg);
    } finally {
      setDeleteUser(null);
    }
  };

  return (
    <div>
      {/* Banner quyền tối cao */}
      <div className="p-6 md:p-7 mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 shadow-xs flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 mb-1">
            <Crown size={18} className="text-amber-600" />
            <span className="text-xs font-extrabold tracking-wider uppercase">
              ĐẶC QUYỀN QUẢN TRỊ VIÊN (ADMIN)
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Quản trị Người dùng & Phân cấp Vai trò
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Chỉ Admin mới có quyền cấp tài khoản, sửa thông tin, đổi mật khẩu và quản lý trạng thái của mọi nhân viên.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<UserPlus size={18} />}
          onClick={() => setShowCreateModal(true)}
        >
          Tạo tài khoản
        </Button>
      </div>

      {/* Bảng Danh sách Tài khoản */}
      <Card title="Danh sách Tài khoản Nhân viên trong Hệ thống">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3.5">Nhân viên</th>
                <th className="py-3 px-3.5">Tên đăng nhập</th>
                <th className="py-3 px-3.5">Vai trò</th>
                <th className="py-3 px-3.5">Liên hệ</th>
                <th className="py-3 px-3.5">Trạng thái</th>
                <th className="py-3 px-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Đang nạp dữ liệu tài khoản...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Chưa có tài khoản nào trong hệ thống.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((account) => (
                  <tr
                    key={account.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-3.5">
                      <div className="font-bold text-slate-900">{account.fullName}</div>
                      <div className="text-xs text-slate-500">{account.position}</div>
                    </td>
                  <td className="py-3.5 px-3.5">
                    <code className="bg-slate-100 py-1 px-2 rounded-md text-amber-800 font-mono text-xs font-bold">
                      {account.username}
                    </code>
                  </td>
                  <td className="py-3.5 px-3.5">
                    <Badge role={account.role} />
                  </td>
                  <td className="py-3.5 px-3.5 text-xs text-slate-600">
                    <div className="text-slate-800 font-medium">{account.email}</div>
                    <div className="text-slate-400 mt-0.5">{account.phone}</div>
                  </td>
                  <td className="py-3.5 px-3.5">
                    {account.isActive ? (
                      <span className="text-emerald-600 flex items-center gap-1.5 text-xs font-semibold">
                        <CheckCircle size={15} /> Hoạt động
                      </span>
                    ) : (
                      <span className="text-rose-600 flex items-center gap-1.5 text-xs font-semibold">
                        <Ban size={15} /> Đã khóa
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                    <ActionDropdown
                      title="Thao tác tài khoản"
                      items={[
                        {
                          label: 'Sửa thông tin & vai trò',
                          icon: <Edit size={14} className="text-blue-600" />,
                          onClick: () => openEditModal(account),
                        },
                        {
                          label: 'Đổi mật khẩu',
                          icon: <KeyRound size={14} className="text-amber-600" />,
                          onClick: () => {
                            setResetPasswordUser(account);
                            setAdminNewPassword('');
                          },
                        },
                        ...(account.username !== 'admin'
                          ? [
                              {
                                label: account.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
                                icon: account.isActive ? (
                                  <Lock size={14} className="text-amber-600" />
                                ) : (
                                  <CheckCircle size={14} className="text-emerald-600" />
                                ),
                                onClick: () => setToggleStatusUser(account),
                              },
                              {
                                label: 'Xóa tài khoản',
                                icon: <Trash2 size={14} className="text-rose-600" />,
                                variant: 'danger' as const,
                                dividerBefore: true,
                                onClick: () => setDeleteUser(account),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(0);
          }}
          pageSizeOptions={[12, 24, 48, 96]}
        />
      </Card>

      {/* Modal 1: Tạo tài khoản */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Cấp phát Tài khoản Nhân viên Mới"
        subtitle="Khởi tạo thông tin đăng nhập và phân vai trò trực tiếp trong hệ thống"
        icon={<UserPlus size={20} />}
        onSubmit={handleCreateUser}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Tạo tài khoản
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Tên đăng nhập *"
              placeholder="ví dụ: receptionist_an"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              leftIcon={<KeyRound size={16} />}
              autoFocus
            />
            <Input
              label="Mật khẩu khởi tạo *"
              type="password"
              placeholder="Mật khẩu"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              isPassword
            />
          </div>

          <Input
            label="Họ và tên nhân viên *"
            placeholder="ví dụ: Nguyễn Văn An"
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Email liên hệ"
              type="email"
              placeholder="an.nguyen@demohotel.vn"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              leftIcon={<Mail size={16} />}
            />
            <Input
              label="Số điện thoại"
              placeholder="0912345678"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              leftIcon={<Phone size={16} />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="Chức danh công việc"
              placeholder="ví dụ: Lễ tân ca đêm"
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              leftIcon={<Briefcase size={16} />}
            />

            <div className="flex flex-col gap-1.5 mb-4 text-left">
              <label className="text-xs font-semibold text-slate-700">Vai trò phân quyền (Role) *</label>
              <select
                className="w-full py-2.5 px-3.5 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AppRole)}
              >
                <option value="ADMIN">ADMIN - Quản trị viên (Toàn quyền)</option>
                <option value="MANAGER">MANAGER - Quản lý khách sạn</option>
                <option value="RECEPTIONIST">RECEPTIONIST - Lễ tân</option>
                <option value="ACCOUNTANT">ACCOUNTANT - Kế toán / Thu ngân</option>
                <option value="HOUSEKEEPER">HOUSEKEEPER - Buồng phòng</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Sửa Thông tin Nhân viên khác */}
      {editUser && (
        <Modal
          isOpen={!!editUser}
          onClose={() => setEditUser(null)}
          title={`Sửa thông tin: [${editUser.username}]`}
          subtitle="Admin chỉnh sửa hồ sơ và thay đổi vai trò phân quyền cho nhân viên này"
          icon={<Edit size={20} />}
          onSubmit={handleSaveEditUser}
          footer={
            <>
              <Button variant="secondary" type="button" onClick={() => setEditUser(null)}>
                Hủy
              </Button>
              <Button variant="primary" type="submit">
                Lưu cập nhật
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Họ và tên nhân viên *"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              autoFocus
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <Input
                label="Email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                leftIcon={<Mail size={16} />}
              />
              <Input
                label="Số điện thoại"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                leftIcon={<Phone size={16} />}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <Input
                label="Chức danh"
                value={editPosition}
                onChange={(e) => setEditPosition(e.target.value)}
                leftIcon={<Briefcase size={16} />}
              />

              <div className="flex flex-col gap-1.5 mb-4 text-left">
                <label className="text-xs font-semibold text-slate-700">Vai trò phân quyền *</label>
                <select
                  className="w-full py-2.5 px-3.5 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as AppRole)}
                  disabled={editUser.username === 'admin'}
                >
                  <option value="ADMIN">ADMIN - Quản trị viên</option>
                  <option value="MANAGER">MANAGER - Quản lý</option>
                  <option value="RECEPTIONIST">RECEPTIONIST - Lễ tân</option>
                  <option value="ACCOUNTANT">ACCOUNTANT - Kế toán</option>
                  <option value="HOUSEKEEPER">HOUSEKEEPER - Buồng phòng</option>
                </select>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 3: Admin Đổi Mật Khẩu cho User khác */}
      {resetPasswordUser && (
        <Modal
          isOpen={!!resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          title={`Đặt lại mật khẩu: [${resetPasswordUser.username}]`}
          subtitle={`Admin cấp mật khẩu mới cho ${resetPasswordUser.fullName} (không cần biết mật khẩu cũ)`}
          icon={<KeyRound size={20} />}
          onSubmit={handleAdminResetPassword}
          footer={
            <>
              <Button variant="secondary" type="button" onClick={() => setResetPasswordUser(null)}>
                Hủy
              </Button>
              <Button variant="primary" type="submit" disabled={isResettingPassword}>
                {isResettingPassword ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Mật khẩu mới (tối thiểu 6 ký tự) *"
              type="password"
              placeholder="Nhập mật khẩu mới muốn gán cho nhân viên này"
              value={adminNewPassword}
              onChange={(e) => setAdminNewPassword(e.target.value)}
              isPassword
              autoFocus
            />
          </div>
        </Modal>
      )}

      {/* Confirm Modal: Khóa / Kích hoạt */}
      <ConfirmModal
        isOpen={!!toggleStatusUser}
        onClose={() => setToggleStatusUser(null)}
        onConfirm={confirmToggleStatus}
        title={toggleStatusUser?.isActive ? 'Xác nhận khóa tài khoản' : 'Xác nhận kích hoạt tài khoản'}
        message={
          toggleStatusUser?.isActive
            ? `Bạn có chắc chắn muốn khóa tài khoản [${toggleStatusUser?.username}]? Nhân viên này sẽ không thể đăng nhập vào hệ thống.`
            : `Bạn có muốn kích hoạt lại tài khoản [${toggleStatusUser?.username}] để nhân viên tiếp tục làm việc?`
        }
        confirmText={toggleStatusUser?.isActive ? 'Khóa ngay' : 'Kích hoạt'}
        variant={toggleStatusUser?.isActive ? 'danger' : 'primary'}
      />

      {/* Confirm Modal: Xóa vĩnh viễn */}
      <ConfirmModal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={confirmDeleteUser}
        title="Xác nhận xóa tài khoản"
        message={`Hành động này không thể hoàn tác! Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản [${deleteUser?.username}]?`}
        confirmText="Xóa vĩnh viễn"
        variant="danger"
      />
    </div>
  );
};
