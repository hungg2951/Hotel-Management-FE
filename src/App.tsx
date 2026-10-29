import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleRoute } from './routes/RoleRoute';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { RoomsPage } from './pages/rooms/RoomsPage';
import { RoomTypesPage } from './pages/room-types/RoomTypesPage';
import { ReservationsPage } from './pages/reservations/ReservationsPage';
import { FrontdeskPage } from './pages/frontdesk/FrontdeskPage';
import { HousekeepingPage } from './pages/housekeeping/HousekeepingPage';
import { BillingPage } from './pages/billing/BillingPage';
import { HotelServicesPage } from './pages/services/HotelServicesPage';
import { GuestsPage } from './pages/guests/GuestsPage';
import { PoliciesPage } from './pages/policies/PoliciesPage';
import { PermissionsPage } from './pages/permissions/PermissionsPage';
import { UsersPage } from './pages/users/UsersPage';
import { ForbiddenPage } from './pages/forbidden/ForbiddenPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Route: Màn hình Login (Không có màn hình Register) */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes: Yêu cầu đăng nhập mới được vào trang quản trị */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                {/* Trang Thống kê (Statistics) */}
                <Route path="/" element={<DashboardPage />} />

                {/* Trang Quản lý Đặt phòng (ADMIN, MANAGER, RECEPTIONIST) */}
                <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST']} />}>
                  <Route path="/reservations" element={<ReservationsPage />} />
                  <Route path="/frontdesk" element={<FrontdeskPage />} />
                </Route>

                {/* Trang Buồng phòng & Vệ sinh (ADMIN, MANAGER, RECEPTIONIST, HOUSEKEEPER) */}
                <Route
                  element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER']} />}
                >
                  <Route path="/housekeeping" element={<HousekeepingPage />} />
                  <Route path="/rooms" element={<RoomsPage />} />
                </Route>

                {/* Trang Quản lý Hạng phòng & Chính sách Khách sạn (ADMIN, MANAGER) */}
                <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER']} />}>
                  <Route path="/room-types" element={<RoomTypesPage />} />
                  <Route path="/policies" element={<PoliciesPage />} />
                </Route>

                {/* Trang Thu ngân & Folio (ADMIN, MANAGER, RECEPTIONIST, ACCOUNTANT) */}
                <Route
                  element={
                    <RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT']} />
                  }
                >
                  <Route path="/billing" element={<BillingPage />} />
                </Route>

                {/* Trang Dịch vụ Khách sạn (ADMIN, MANAGER, RECEPTIONIST, ACCOUNTANT) */}
                <Route
                  element={
                    <RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT']} />
                  }
                >
                  <Route path="/services" element={<HotelServicesPage />} />
                </Route>

                {/* Trang Quản lý Khách hàng (ADMIN, MANAGER, RECEPTIONIST) */}
                <Route element={<RoleRoute allowedRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST']} />}>
                  <Route path="/guests" element={<GuestsPage />} />
                </Route>

                {/* Trang xem Ma trận phân quyền 5 Role */}
                <Route path="/permissions" element={<PermissionsPage />} />

                {/* Trang Quản trị Tài khoản & Phân quyền: CHỈ DUY NHẤT TÀI KHOẢN ADMIN MỚI ĐƯỢC PHÉP TRUY CẬP */}
                <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
                  <Route path="/users" element={<UsersPage />} />
                </Route>

                {/* Trang 403 Forbidden */}
                <Route path="/forbidden" element={<ForbiddenPage />} />
              </Route>
            </Route>

            {/* Điều hướng mặc định */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
