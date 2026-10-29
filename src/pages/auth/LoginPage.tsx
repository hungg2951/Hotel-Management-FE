import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Hotel, Lock, User, AlertCircle, ShieldAlert } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Chỉ hiện phần tài khoản mẫu khi trên URL có query = test (ví dụ: ?query=test hoặc ?test hoặc ?test=true)
  const isTestMode =
    searchParams.get('query') === 'test' ||
    searchParams.has('test') ||
    searchParams.get('mode') === 'test';

  // Hiển thị thông báo nếu tài khoản vừa bị khóa khi đang trong phiên làm việc
  useEffect(() => {
    const lockedMsg = sessionStorage.getItem('locked_message');
    if (lockedMsg) {
      setError(lockedMsg);
      toast.error(lockedMsg);
      sessionStorage.removeItem('locked_message');
    }
  }, [toast]);

  // Route muốn truy cập trước khi bị chuyển về login
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ username: username.trim(), password });
      toast.success('Đăng nhập thành công! Chào mừng đến với Royal Lotus.');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nút điền nhanh tài khoản Admin mặc định
  const fillAdmin = () => {
    setUsername('admin');
    setPassword('Admin@Hotel2026!');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 bg-[radial-gradient(circle_at_50%_10%,rgba(245,158,11,0.08)_0%,transparent_60%),radial-gradient(circle_at_90%_90%,rgba(37,99,235,0.05)_0%,transparent_50%)]">
      <div className="w-full max-w-md p-8 md:p-10 bg-white rounded-3xl shadow-xl border border-slate-200">
        {/* Logo & Tiêu đề */}
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 inline-flex items-center justify-center text-white shadow-lg shadow-amber-500/30 mb-3.5">
            <Hotel size={28} />
          </div>
          <h2 className="font-serif text-2xl font-bold text-amber-700 tracking-wide">
            ROYAL LOTUS
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Hệ thống Quản lý Khách sạn & Resort
          </p>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-4.5 animate-in fade-in duration-200">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form đăng nhập */}
        <form onSubmit={handleSubmit}>
          <Input
            label="Tên đăng nhập"
            placeholder="Nhập tên đăng nhập của bạn"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            leftIcon={<User size={18} />}
            autoFocus
          />

          <Input
            label="Mật khẩu"
            type="password"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={18} />}
            isPassword
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="w-full mt-2 py-3"
          >
            Đăng nhập vào Hệ thống
          </Button>
        </form>

        {/* Nút đăng nhập nhanh test: Ẩn đi mặc định, chỉ hiện khi URL có query test (?query=test hoặc ?test) */}
        {isTestMode && (
          <div className="mt-6 pt-5 border-t border-slate-100 animate-in fade-in duration-200">
            <p className="text-xs text-slate-500 text-center mb-2">
              Tài khoản mẫu để kiểm thử nhanh:
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={fillAdmin}
              className="w-full text-xs py-2"
            >
              Điền nhanh tài khoản Quản trị viên (ADMIN)
            </Button>
          </div>
        )}

        {/* Chú thích bảo mật */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
          <ShieldAlert size={14} />
          <span>Phần mềm nội bộ - Tài khoản do Ban Quản trị cấp phát</span>
        </div>
      </div>
    </div>
  );
};
