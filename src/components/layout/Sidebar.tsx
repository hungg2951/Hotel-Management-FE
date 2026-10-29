import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart3,
  Hotel,
  BedDouble,
  Brush,
  Layers,
  Users,
  UserCog,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Receipt,
  Sparkles,
  CalendarDays,
  DoorOpen,
  Scale,
  Settings,
} from 'lucide-react';
import type { AppRole } from '../../types/auth';

interface NavSubItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles?: AppRole[];
  adminOnly?: boolean;
}

interface NavMenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  to?: string; // Direct link nếu không có submenu
  allowedRoles?: AppRole[];
  children?: NavSubItem[];
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { hasAnyRole } = useAuth();
  const location = useLocation();

  const menuConfig: NavMenuItem[] = [
    // 1. TỔNG QUAN
    {
      key: 'dashboard',
      to: '/',
      label: 'Thống kê',
      icon: <BarChart3 size={20} />,
    },

    // 2. VẬN HÀNH TIỀN SẢNH (Submenu)
    {
      key: 'frontdesk',
      label: 'Tiền sảnh & Vận hành',
      icon: <Hotel size={20} />,
      allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT'],
      children: [
        {
          to: '/reservations',
          label: 'Quản lý Đặt phòng',
          icon: <CalendarDays size={16} />,
          allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTIONIST'],
        },
        {
          to: '/frontdesk',
          label: 'Tiền sảnh & Lưu trú',
          icon: <DoorOpen size={16} />,
          allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTIONIST'],
        },
        {
          to: '/billing',
          label: 'Thu ngân & Folio',
          icon: <Receipt size={16} />,
          allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT'],
        },
        {
          to: '/services',
          label: 'Dịch vụ Khách sạn',
          icon: <Sparkles size={16} />,
          allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT'],
        },
        {
          to: '/guests',
          label: 'Hồ sơ Khách hàng',
          icon: <Users size={16} />,
          allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTIONIST'],
        },
      ],
    },

    // 3. PHÒNG & BUỒNG PHÒNG (Submenu)
    {
      key: 'rooms',
      label: 'Phòng & Buồng phòng',
      icon: <BedDouble size={20} />,
      allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER'],
      children: [
        {
          to: '/rooms',
          label: 'Quản lý Phòng',
          icon: <BedDouble size={16} />,
          allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER'],
        },
        {
          to: '/housekeeping',
          label: 'Quản lý Buồng phòng',
          icon: <Brush size={16} />,
          allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER'],
        },
      ],
    },

    // 4. CẤU HÌNH & QUẢN TRỊ (Submenu)
    {
      key: 'settings',
      label: 'Cấu hình & Quản trị',
      icon: <Settings size={20} />,
      allowedRoles: ['ADMIN', 'MANAGER'],
      children: [
        {
          to: '/room-types',
          label: 'Hạng phòng & Giá',
          icon: <Layers size={16} />,
          allowedRoles: ['ADMIN', 'MANAGER'],
        },
        {
          to: '/policies',
          label: 'Chính sách Khách sạn',
          icon: <Scale size={16} />,
          allowedRoles: ['ADMIN', 'MANAGER'],
        },
        // Tạm thời ẩn tab Ma trận Phân quyền theo yêu cầu
        // {
        //   to: '/permissions',
        //   label: 'Ma trận Phân quyền',
        //   icon: <ShieldCheck size={16} />,
        // },
        {
          to: '/users',
          label: 'Quản lý Tài khoản',
          icon: <UserCog size={16} />,
          adminOnly: true,
          allowedRoles: ['ADMIN'],
        },
      ],
    },
  ];

  // Khởi tạo trạng thái mở của submenu dựa theo URL hiện tại
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => ({
    frontdesk: ['/reservations', '/frontdesk', '/billing', '/services', '/guests'].includes(
      location.pathname
    ),
    rooms: ['/rooms', '/housekeeping'].includes(location.pathname),
    settings: ['/room-types', '/policies', '/users'].includes(location.pathname),
  }));

  // Tự động mở menu cha khi người dùng truy cập hoặc chuyển trang đến trang con
  useEffect(() => {
    const path = location.pathname;
    if (['/reservations', '/frontdesk', '/billing', '/services', '/guests'].includes(path)) {
      setOpenMenus((prev) => ({ ...prev, frontdesk: true }));
    } else if (['/rooms', '/housekeeping'].includes(path)) {
      setOpenMenus((prev) => ({ ...prev, rooms: true }));
    } else if (['/room-types', '/policies', '/users'].includes(path)) {
      setOpenMenus((prev) => ({ ...prev, settings: true }));
    }
  }, [location.pathname]);

  const toggleSubmenu = (key: string) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Lọc các menu cha và menu con theo quyền hạn (role)
  const visibleMenus = menuConfig
    .filter((menu) => !menu.allowedRoles || hasAnyRole(menu.allowedRoles))
    .map((menu) => {
      if (!menu.children) return menu;
      const visibleChildren = menu.children.filter(
        (child) => !child.allowedRoles || hasAnyRole(child.allowedRoles)
      );
      return {
        ...menu,
        children: visibleChildren,
      };
    })
    .filter((menu) => menu.to || (menu.children && menu.children.length > 0));

  return (
    <aside
      className={`bg-white border-r border-slate-200 flex flex-col py-4 px-2 shrink-0 transition-all duration-200 relative ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Navigation Links */}
      <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto overflow-x-hidden pr-0.5">
        {visibleMenus.map((menu) => {
          // Trực tiếp là link đơn (Ví dụ: Thống kê)
          if (!menu.children) {
            return (
              <NavLink
                key={menu.key}
                to={menu.to!}
                end={menu.to === '/'}
                title={isCollapsed ? menu.label : undefined}
                className={({ isActive }) =>
                  `flex items-center ${
                    isCollapsed ? 'justify-center py-2.5 px-0' : 'justify-start py-2.5 px-3'
                  } rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/20 font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0">{menu.icon}</div>
                  {!isCollapsed && <span className="truncate">{menu.label}</span>}
                </div>
              </NavLink>
            );
          }

          // Có Menu con (Submenu)
          const isChildActive = menu.children.some((child) => child.to === location.pathname);
          const isOpen = Boolean(openMenus[menu.key]);

          // Khi Sidebar thu gọn (Collapsed - 72px)
          if (isCollapsed) {
            return (
              <div key={menu.key} className="relative group flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    onToggle();
                    setOpenMenus((prev) => ({ ...prev, [menu.key]: true }));
                  }}
                  title={menu.label}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                    isChildActive
                      ? 'bg-amber-100 text-amber-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {menu.icon}
                </button>

                {/* Floating flyout popup khi hover lúc thu gọn */}
                <div className="absolute left-full top-0 ml-2 hidden group-hover:flex flex-col gap-1 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 min-w-[210px] z-50">
                  <div className="px-3 py-1.5 text-[11px] font-extrabold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                    {menu.label}
                  </div>
                  {menu.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-amber-500 text-white font-bold shadow-sm'
                            : child.adminOnly
                            ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                    >
                      <div className="shrink-0">{child.icon}</div>
                      <span className="truncate">{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          }

          // Khi Sidebar mở rộng bình thường (Expanded - 256px)
          return (
            <div key={menu.key} className="flex flex-col">
              {/* Nút bấm mở/đóng menu cha */}
              <button
                type="button"
                onClick={() => toggleSubmenu(menu.key)}
                className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  isChildActive
                    ? 'text-amber-800 bg-amber-50/80 font-bold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`shrink-0 ${isChildActive ? 'text-amber-600' : 'text-slate-500'}`}>
                    {menu.icon}
                  </div>
                  <span className="truncate">{menu.label}</span>
                </div>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-amber-600' : ''
                  }`}
                />
              </button>

              {/* Danh sách menu con (Submenu items) */}
              {isOpen && (
                <div className="flex flex-col gap-1 mt-1 pl-3 ml-3 border-l-2 border-slate-100 transition-all">
                  {menu.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
                          isActive
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-sm shadow-amber-500/20'
                            : child.adminOnly
                            ? 'text-rose-700 bg-rose-50/70 hover:bg-rose-100/70'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                    >
                      <div className="shrink-0">{child.icon}</div>
                      <span className="truncate">{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Nút Thu / Mở Sidebar ở chân Sidebar */}
      <div
        className={`pt-3 border-t border-slate-100 flex ${
          isCollapsed ? 'justify-center' : 'justify-end'
        }`}
      >
        <button
          onClick={onToggle}
          className={`flex items-center justify-center gap-2 h-9 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer text-xs font-semibold transition-colors ${
            isCollapsed ? 'w-10' : 'w-full'
          }`}
          title={isCollapsed ? 'Mở rộng Sidebar' : 'Thu gọn Sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight size={18} />
          ) : (
            <>
              <ChevronLeft size={16} />
              <span>Thu gọn menu</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
