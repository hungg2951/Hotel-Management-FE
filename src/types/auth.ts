export type AppRole = 'ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'ACCOUNTANT' | 'HOUSEKEEPER';

export interface User {
  username: string;
  role: AppRole;
  fullName?: string;
  email?: string;
  phone?: string;
  employeeId?: number;
  userId?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresInMs?: number;
  username: string;
  userId?: number;
  roles?: string[];
  role?: AppRole;
  employeeId?: number;
  fullName?: string;
  email?: string;
  phone?: string;
}

export const normalizeRole = (rawRole: string | undefined): AppRole => {
  if (!rawRole) return 'ADMIN';
  const clean = rawRole.replace(/^ROLE_/, '').toUpperCase();
  if (
    clean === 'ADMIN' ||
    clean === 'MANAGER' ||
    clean === 'RECEPTIONIST' ||
    clean === 'ACCOUNTANT' ||
    clean === 'HOUSEKEEPER'
  ) {
    return clean;
  }
  return 'ADMIN';
};

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
  timestamp?: string;
}

export interface RolePermissionInfo {
  code: AppRole;
  title: string;
  level: number; // 1: Highest (Admin), 2: Management, 3: Operational
  description: string;
  badgeColor: string;
  permissions: string[];
}

export const ROLE_DEFINITIONS: Record<AppRole, RolePermissionInfo> = {
  ADMIN: {
    code: 'ADMIN',
    title: 'Quản trị hệ thống (Toàn quyền)',
    level: 1,
    description: 'Quyền cao nhất. Quản trị toàn bộ hệ thống, phân quyền, tạo/sửa/xóa tài khoản người dùng, cấu hình khách sạn.',
    badgeColor: '#dc2626', // Đỏ hoàng gia
    permissions: [
      'Quản lý tài khoản người dùng (Tạo, sửa, khóa, xóa)',
      'Toàn quyền quản lý danh mục (Hạng phòng, Phòng, Tiện ích, Dịch vụ)',
      'Quản lý đặt phòng, nhận/trả phòng, đổi phòng',
      'Quản lý thu ngân, folio, thanh toán, hoàn tiền, hủy hóa đơn',
      'Phân công và giám sát toàn bộ công việc buồng phòng',
      'Xem tất cả báo cáo doanh thu, công suất phòng và audit log',
    ],
  },
  MANAGER: {
    code: 'MANAGER',
    title: 'Quản lý khách sạn',
    level: 2,
    description: 'Quản lý nghiệp vụ khách sạn, duyệt giảm giá/hoàn tiền, quản lý phòng và nhân sự ca trực.',
    badgeColor: '#d97706', // Hổ phách
    permissions: [
      'Quản lý danh mục phòng và giá phòng cơ bản',
      'Xác nhận đặt phòng đặc biệt (miễn cọc, khách VIP)',
      'Duyệt hoàn tiền (Refund) và điều chỉnh Folio',
      'Phân công công việc buồng phòng cho nhân viên',
      'Xem dashboard và báo cáo doanh thu tổng hợp',
      'KHÔNG được tạo/sửa/xóa tài khoản nhân viên khác',
    ],
  },
  RECEPTIONIST: {
    code: 'RECEPTIONIST',
    title: 'Lễ tân',
    level: 3,
    description: 'Trực quầy, xử lý đặt phòng, check-in, check-out, đổi phòng và thu cọc.',
    badgeColor: '#2563eb', // Xanh dương
    permissions: [
      'Tra cứu tình trạng phòng trống (Availability)',
      'Tạo và tra cứu hồ sơ khách hàng (Guest profile)',
      'Tạo đặt phòng mới (Reservation, Walk-in)',
      'Thu tiền đặt cọc và xác nhận đơn',
      'Thực hiện Check-in, Đổi phòng, Check-out',
      'Thêm chi phí dịch vụ phát sinh vào Folio của khách',
      'KHÔNG được xóa folio item, KHÔNG được hoàn tiền',
    ],
  },
  ACCOUNTANT: {
    code: 'ACCOUNTANT',
    title: 'Kế toán / Thu ngân',
    level: 3,
    description: 'Quản lý dòng tiền, quyết toán folio, xuất hóa đơn VAT và báo cáo tài chính.',
    badgeColor: '#059669', // Xanh ngọc lục bảo
    permissions: [
      'Xem và kiểm tra chi tiết hóa đơn (Folio)',
      'Ghi nhận các khoản thanh toán của khách (Tiền mặt, thẻ, chuyển khoản)',
      'Xuất hóa đơn GTGT (VAT Invoice 8%) khi khách trả phòng',
      'Xem báo cáo doanh thu thực thu (collected) và ghi nhận (recognized)',
      'KHÔNG được sửa trạng thái phòng hoặc đổi phòng',
    ],
  },
  HOUSEKEEPER: {
    code: 'HOUSEKEEPER',
    title: 'Nhân viên buồng phòng',
    level: 3,
    description: 'Thực hiện dọn dẹp, kiểm tra vệ sinh và cập nhật trạng thái phòng sạch/bẩn.',
    badgeColor: '#7c3aed', // Tím thạch anh
    permissions: [
      'Xem danh sách công việc buồng phòng được phân công cho mình',
      'Bắt đầu thực hiện nhiệm vụ (Chuyển sang IN_PROGRESS)',
      'Hoàn thành dọn phòng (Đưa phòng về trạng thái CLEAN)',
      'Xem sơ đồ và trạng thái vệ sinh của các phòng',
      'KHÔNG được can thiệp vào đặt phòng, khách hàng hay tiền tệ',
    ],
  },
};
