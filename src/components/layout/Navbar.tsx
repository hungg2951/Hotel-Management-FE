import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import {
  Hotel,
  User,
  ChevronDown,
  KeyRound,
  UserCheck,
  LogOut,
  Mail,
  Phone,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const toast = useToast();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Form Đổi mật khẩu
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Form Sửa thông tin cá nhân
  const [fullName, setFullName] = useState(user?.fullName || user?.username || '');
  const [email, setEmail] = useState(user?.email || `${user?.username || 'admin'}@demohotel.vn`);
  const [phone, setPhone] = useState(user?.phone || '0241234567');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Đồng bộ form khi user thay đổi hoặc mở modal
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.username || '');
      setEmail(user.email || `${user.username || 'admin'}@demohotel.vn`);
      setPhone(user.phone || '0241234567');
    }
  }, [user, showProfileModal]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    toast.info('Bạn đã đăng xuất khỏi hệ thống thành công.');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!oldPassword || !newPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Xác nhận mật khẩu mới không trùng khớp.');
      return;
    }

    try {
      setIsChangingPassword(true);
      await authService.changePassword({ oldPassword, newPassword });
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới cho các lần đăng nhập sau.');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.';
      setPasswordError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Họ và tên không được để trống.');
      return;
    }

    try {
      setIsUpdatingProfile(true);
      const updatedUser = await authService.updateProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      updateUser(updatedUser);
      setShowProfileModal(false);
      toast.success('Cập nhật thông tin cá nhân thành công!');
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Cập nhật thông tin thất bại. Vui lòng thử lại sau.';
      toast.error(errorMsg);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40 shadow-xs">
        {/* Left: Hotel Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Hotel size={20} />
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold text-amber-700 tracking-wide leading-tight">
              ROYAL LOTUS
            </h1>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
              Hotel & Resort Management
            </p>
          </div>
        </div>

        {/* Right: User Icon & Name with Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex items-center gap-2.5 py-1.5 px-3.5 rounded-full border border-slate-200 cursor-pointer transition-colors ${
              dropdownOpen ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
              <User size={15} />
            </div>

            <span className="text-xs font-bold text-slate-800">
              {user?.fullName || user?.username || 'Người dùng'}
            </span>

            <ChevronDown
              size={14}
              className={`text-slate-500 transition-transform duration-200 ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* User Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2.5 border-b border-slate-100 mb-1">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {user?.fullName || user?.username}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  @{user?.username}
                </div>
                <div className="mt-1.5">
                  {user?.role && <Badge role={user.role} />}
                </div>
              </div>

              {/* Option 1: Sửa thông tin cá nhân */}
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setShowProfileModal(true);
                }}
                className="w-full flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <UserCheck size={16} className="text-blue-600" />
                <span>Sửa thông tin cá nhân</span>
              </button>

              {/* Option 2: Đổi mật khẩu */}
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setShowPasswordModal(true);
                }}
                className="w-full flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <KeyRound size={16} className="text-amber-600" />
                <span>Đổi mật khẩu</span>
              </button>

              <div className="h-px bg-slate-100 my-1" />

              {/* Option 3: Đăng xuất */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-xs text-rose-600 font-semibold hover:bg-rose-50 transition-colors text-left cursor-pointer"
              >
                <LogOut size={16} className="text-rose-600" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Modal Sửa thông tin cá nhân */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Sửa thông tin cá nhân"
        subtitle="Cập nhật hồ sơ và thông tin liên hệ của bạn trong hệ thống"
        icon={<UserCheck size={20} />}
        onSubmit={handleUpdateProfile}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setShowProfileModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={isUpdatingProfile}>
              {isUpdatingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Họ và tên của bạn *"
            placeholder="Nhập họ và tên đầy đủ"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoFocus
          />

          <Input
            label="Địa chỉ Email"
            type="email"
            placeholder="email@demohotel.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail size={16} />}
          />

          <Input
            label="Số điện thoại liên hệ"
            placeholder="0912345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone size={16} />}
          />
        </div>
      </Modal>

      {/* Modal Đổi mật khẩu cá nhân */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Đổi mật khẩu tài khoản"
        subtitle="Thiết lập mật khẩu bảo mật mới cho tài khoản của bạn"
        icon={<KeyRound size={20} />}
        onSubmit={handleChangePassword}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setShowPasswordModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {passwordError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {passwordError}
            </div>
          )}

          <Input
            label="Mật khẩu hiện tại *"
            type="password"
            placeholder="Nhập mật khẩu đang dùng"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            isPassword
          />

          <Input
            label="Mật khẩu mới (tối thiểu 6 ký tự) *"
            type="password"
            placeholder="Nhập mật khẩu mới"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            isPassword
          />

          <Input
            label="Xác nhận mật khẩu mới *"
            type="password"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            isPassword
          />
        </div>
      </Modal>
    </>
  );
};
