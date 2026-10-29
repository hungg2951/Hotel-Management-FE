import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const ForbiddenPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
      <div className="w-18 h-18 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mb-6">
        <ShieldX size={36} />
      </div>

      <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
        403 - Quyền truy cập bị từ chối
      </h2>

      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        Tài khoản hiện tại của bạn không có đủ thẩm quyền để truy cập trang này. Chức năng này yêu cầu quyền quản trị cao hơn.
      </p>

      {user && (
        <div className="flex items-center gap-2.5 py-2 px-4 rounded-xl bg-white border border-slate-200 mb-8 shadow-xs">
          <span className="text-xs text-slate-500">Vai trò hiện tại của bạn:</span>
          <Badge role={user.role} />
        </div>
      )}

      <Button
        variant="primary"
        onClick={() => navigate('/')}
        leftIcon={<ArrowLeft size={16} />}
      >
        Quay lại Trang chủ
      </Button>
    </div>
  );
};
