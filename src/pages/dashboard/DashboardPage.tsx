import {
  AlertCircle,
  ArrowRight,
  Award,
  BarChart3,
  BedDouble,
  Brush,
  Calendar,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  CreditCard,
  DollarSign,
  Hotel,
  Info,
  Percent,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TableProperties,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { reportService, type ReportFilterParams } from '../../services/reportService';
import type {
  FinancialSummary,
  HousekeeperPerformance,
  OccupancyReport,
  OperationsSummary,
  ReportPeriod,
  RevenueReport,
  RoomsSummary,
} from '../../types/report';

export const DashboardPage: React.FC = () => {
  const { user, hasAnyRole } = useAuth();
  const toast = useToast();

  const isHousekeeper = user?.role === 'HOUSEKEEPER';
  const isReceptionist = user?.role === 'RECEPTIONIST';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isManagerOrAdmin = hasAnyRole(['ADMIN', 'MANAGER']);

  // Admin / Manager view switcher mode
  const [adminActiveTab, setAdminActiveTab] = useState<
    'EXECUTIVE' | 'FRONTDESK' | 'HOUSEKEEPING' | 'FINANCE'
  >('EXECUTIVE');

  // Xác định góc nhìn hiển thị hiện tại
  const currentView = isHousekeeper
    ? 'HOUSEKEEPING'
    : isReceptionist
    ? 'FRONTDESK'
    : isAccountant
    ? 'FINANCE'
    : adminActiveTab;

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthStr = useMemo(() => todayStr.substring(0, 7), [todayStr]);
  const currentYearNum = useMemo(() => new Date().getFullYear(), []);

  // Filter States
  const [period, setPeriod] = useState<ReportPeriod>('DAY');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);
  const [customStart, setCustomStart] = useState<string>(todayStr);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  // Chart View State: 'REVENUE' | 'OCCUPANCY' | 'TABLE'
  const [chartView, setChartView] = useState<'REVENUE' | 'OCCUPANCY' | 'TABLE'>('REVENUE');

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [roomsSummary, setRoomsSummary] = useState<RoomsSummary | null>(null);
  const [occupancy, setOccupancy] = useState<OccupancyReport | null>(null);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [operationsSummary, setOperationsSummary] = useState<OperationsSummary | null>(null);
  const [housekeeperPerf, setHousekeeperPerf] = useState<HousekeeperPerformance | null>(null);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);

  const canViewRevenue = isManagerOrAdmin || isAccountant;

  // Format VND helper
  const formatVnd = (amount?: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const formatDateVi = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return dateStr;
    }
  };

  const fetchDashboardData = useCallback(
    async (isManualRefresh = false) => {
      setLoading(true);
      try {
        // 1. Rooms Summary: Tất cả role đều xem được
        const roomsPromise = reportService.getRoomsSummary();

        // 2. Build filter params
        let filterParams: ReportFilterParams = { period };
        if (period === 'DAY') {
          filterParams = { period: 'DAY', date: selectedDate };
        } else if (period === 'WEEK') {
          filterParams = { period: 'WEEK', date: selectedDate };
        } else if (period === 'MONTH') {
          filterParams = { period: 'MONTH', startDate: `${selectedMonth}-01` };
        } else if (period === 'YEAR') {
          filterParams = { period: 'YEAR', startDate: `${selectedYear}-01-01` };
        } else if (period === 'CUSTOM') {
          filterParams = { period: 'CUSTOM', startDate: customStart, endDate: customEnd };
        }

        // 3. Conditional queries theo đúng ma trận phân quyền
        const occPromise =
          isManagerOrAdmin || isAccountant || isReceptionist
            ? reportService.getOccupancy(isReceptionist ? { period: 'WEEK', date: todayStr } : filterParams)
            : Promise.resolve(null);

        const revPromise =
          isManagerOrAdmin || isAccountant
            ? reportService.getRevenue(filterParams)
            : isReceptionist
            ? reportService.getRevenue({ period: 'DAY', date: todayStr })
            : Promise.resolve(null);

        const opsPromise =
          isManagerOrAdmin || isReceptionist || isAccountant
            ? reportService.getOperationsSummary()
            : Promise.resolve(null);

        const hkPerfPromise =
          isManagerOrAdmin || isHousekeeper
            ? reportService.getHousekeeperPerformance()
            : Promise.resolve(null);

        const finPromise =
          isManagerOrAdmin || isAccountant
            ? reportService.getFinancialSummary()
            : Promise.resolve(null);

        const [roomsRes, occRes, revRes, opsRes, hkPerfRes, finRes] = await Promise.all([
          roomsPromise,
          occPromise,
          revPromise,
          opsPromise,
          hkPerfPromise,
          finPromise,
        ]);

        setRoomsSummary(roomsRes);
        if (occRes) setOccupancy(occRes);
        if (revRes) setRevenue(revRes);
        if (opsRes) setOperationsSummary(opsRes);
        if (hkPerfRes) setHousekeeperPerf(hkPerfRes);
        if (finRes) setFinancialSummary(finRes);

        if (isManualRefresh) {
          toast.success('Đã cập nhật số liệu thống kê mới nhất!');
        }
      } catch {
        if (isManualRefresh) {
          toast.error('Không thể làm mới số liệu thống kê máy chủ.');
        }
      } finally {
        setLoading(false);
      }
    },
    [
      period,
      selectedDate,
      selectedMonth,
      selectedYear,
      customStart,
      customEnd,
      isManagerOrAdmin,
      isAccountant,
      isReceptionist,
      isHousekeeper,
      todayStr,
      toast,
    ]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Quick Date Helpers
  const setQuickYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const setQuickLastMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    setSelectedMonth(d.toISOString().substring(0, 7));
  };

  const setQuickRange7Days = () => {
    const d = new Date();
    const end = d.toISOString().split('T')[0];
    d.setDate(d.getDate() - 6);
    const start = d.toISOString().split('T')[0];
    setCustomStart(start);
    setCustomEnd(end);
  };

  const setQuickRange30Days = () => {
    const d = new Date();
    const end = d.toISOString().split('T')[0];
    d.setDate(d.getDate() - 29);
    const start = d.toISOString().split('T')[0];
    setCustomStart(start);
    setCustomEnd(end);
  };

  // Label period for headers
  const getPeriodDisplayTitle = () => {
    switch (period) {
      case 'DAY':
        return selectedDate === todayStr ? 'Hôm nay' : `Ngày ${formatDateVi(selectedDate)}`;
      case 'WEEK':
        return occupancy?.startDate && occupancy?.endDate
          ? `Tuần từ ${formatDateVi(occupancy.startDate)} đến ${formatDateVi(occupancy.endDate)}`
          : 'Tuần đã chọn';
      case 'MONTH': {
        const [y, m] = selectedMonth.split('-');
        return `Tháng ${m}/${y}`;
      }
      case 'YEAR':
        return `Năm ${selectedYear}`;
      case 'CUSTOM':
        return `Khoảng ${formatDateVi(customStart)} - ${formatDateVi(customEnd)}`;
      default:
        return '';
    }
  };

  // Rooms Summary numbers
  const totalRooms = roomsSummary?.totalRooms || 0;
  const availableRooms = roomsSummary?.availableRooms || 0;
  const readyRooms = roomsSummary?.readyRooms ?? availableRooms;
  const availableDirtyRooms = Math.max(0, availableRooms - readyRooms);
  const occupiedRooms = roomsSummary?.occupiedRooms || 0;
  const maintenanceRooms = roomsSummary?.maintenanceRooms || 0;
  const outOfOrderRooms = roomsSummary?.outOfOrderRooms || 0;
  const cleanRooms = roomsSummary?.cleanRooms || 0;
  const inspectedRooms = roomsSummary?.inspectedRooms || 0;
  const dirtyRooms = roomsSummary?.dirtyRooms || 0;
  const cleaningRooms = roomsSummary?.cleaningRooms || 0;
  const totalClean = cleanRooms + inspectedRooms;
  const totalNeedClean = dirtyRooms + cleaningRooms;

  // Chart calculation metrics
  const revTimeline = revenue?.timeline || [];
  const occTimeline = occupancy?.timeline || [];

  const maxTimelineRevenue = useMemo(() => {
    if (revTimeline.length === 0) return 1;
    const maxVal = Math.max(
      ...revTimeline.map((p) => Math.max(p.collectedRevenue, p.recognizedRevenue, 0))
    );
    return maxVal > 0 ? maxVal : 1;
  }, [revTimeline]);

  // Housekeeper personal completion rate
  const myCompletedRatio = useMemo(() => {
    if (!housekeeperPerf || housekeeperPerf.myAssignedTasks === 0) return 0;
    return Math.round((housekeeperPerf.myDoneTasks / housekeeperPerf.myAssignedTasks) * 100);
  }, [housekeeperPerf]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              {isHousekeeper ? (
                <Brush size={18} />
              ) : isReceptionist ? (
                <Users size={18} />
              ) : isAccountant ? (
                <Wallet size={18} />
              ) : (
                <TrendingUp size={18} />
              )}
              <span className="text-xs font-extrabold tracking-wider uppercase">
                {isHousekeeper
                  ? 'Khu vực Tác nghiệp Buồng phòng'
                  : isReceptionist
                  ? 'Khu vực Vận hành Quầy Lễ tân'
                  : isAccountant
                  ? 'Khu vực Tài chính & Thu ngân'
                  : 'Trung tâm Quản trị & Điều hành Khách sạn'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span>
                {isHousekeeper
                  ? 'Bảng Điều Khiển Buồng Phòng'
                  : isReceptionist
                  ? 'Bảng Điều Khiển Lễ Tân'
                  : isAccountant
                  ? 'Bảng Thống Kê Tài Chính & Doanh Thu'
                  : 'Tổng Quan Hoạt Động & Doanh Thu'}
              </span>
              <span className="text-xs px-3 py-1 font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">
                {isHousekeeper || isReceptionist ? 'Hôm nay' : getPeriodDisplayTitle()}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Xin chào <strong className="text-slate-800">{user?.fullName || user?.username}</strong> (
              {user?.role}) •{' '}
              {isHousekeeper
                ? 'Theo dõi công việc cá nhân được phân công và trạng thái làm sạch phòng'
                : isReceptionist
                ? 'Theo dõi lượt khách đến/đi, phòng sẵn sàng đón khách và doanh thu ca trực'
                : isAccountant
                ? 'Kiểm soát dòng tiền thực thu, tiền cọc, công nợ folio và công suất phòng'
                : 'Báo cáo toàn diện doanh thu, lấp đầy, tiền sảnh và hiệu suất nhân viên'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => fetchDashboardData(true)}
              isLoading={loading}
              leftIcon={<RefreshCw size={15} />}
            >
              Làm mới
            </Button>
          </div>
        </div>

        {/* View Switcher for Admin / Manager */}
        {isManagerOrAdmin && (
          <div className="flex items-center gap-2 pt-1 pb-1 overflow-x-auto border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 shrink-0">Chế độ xem:</span>
            <div className="flex items-center p-1 bg-slate-100 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setAdminActiveTab('EXECUTIVE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  adminActiveTab === 'EXECUTIVE'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp size={14} className="text-amber-600" /> Tổng quan Điều hành
              </button>
              <button
                type="button"
                onClick={() => setAdminActiveTab('FRONTDESK')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  adminActiveTab === 'FRONTDESK'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users size={14} className="text-blue-600" /> Góc nhìn Lễ tân
              </button>
              <button
                type="button"
                onClick={() => setAdminActiveTab('HOUSEKEEPING')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  adminActiveTab === 'HOUSEKEEPING'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Brush size={14} className="text-emerald-600" /> Góc nhìn Buồng phòng
              </button>
              <button
                type="button"
                onClick={() => setAdminActiveTab('FINANCE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  adminActiveTab === 'FINANCE'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wallet size={14} className="text-indigo-600" /> Góc nhìn Tài chính
              </button>
            </div>
          </div>
        )}

        {/* Period Selector Tabs (Cho Executive & Finance Views) */}
        {(currentView === 'EXECUTIVE' || currentView === 'FINANCE') && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
            <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs font-bold overflow-x-auto">
              <button
                onClick={() => setPeriod('DAY')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  period === 'DAY'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar size={14} /> Theo Ngày
              </button>
              <button
                onClick={() => setPeriod('WEEK')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  period === 'WEEK'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarRange size={14} /> Theo Tuần
              </button>
              <button
                onClick={() => setPeriod('MONTH')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  period === 'MONTH'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays size={14} /> Theo Tháng
              </button>
              <button
                onClick={() => setPeriod('YEAR')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  period === 'YEAR'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 size={14} /> Theo Năm
              </button>
              <button
                onClick={() => setPeriod('CUSTOM')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  period === 'CUSTOM'
                    ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal size={14} /> Tùy chọn
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {period === 'DAY' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <Calendar size={15} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Ngày:</span>
                    <input
                      type="date"
                      className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      selectedDate === todayStr
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={setQuickYesterday}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Hôm qua
                  </button>
                </div>
              )}

              {period === 'WEEK' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <CalendarRange size={15} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Ngày trong tuần:</span>
                    <input
                      type="date"
                      className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    Tuần hiện tại
                  </button>
                </div>
              )}

              {period === 'MONTH' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <CalendarDays size={15} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Tháng:</span>
                    <input
                      type="month"
                      className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMonth(currentMonthStr)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      selectedMonth === currentMonthStr
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tháng này
                  </button>
                  <button
                    type="button"
                    onClick={setQuickLastMonth}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Tháng trước
                  </button>
                </div>
              )}

              {period === 'YEAR' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <BarChart3 size={15} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Năm:</span>
                    <select
                      className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                      {[2024, 2025, 2026, 2027, 2028].map((y) => (
                        <option key={y} value={y}>
                          Năm {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedYear(currentYearNum)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      selectedYear === currentYearNum
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Năm nay
                  </button>
                </div>
              )}

              {period === 'CUSTOM' && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <span className="text-xs font-bold text-slate-500">Từ:</span>
                    <input
                      type="date"
                      className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                    />
                    <span className="text-xs font-bold text-slate-500">Đến:</span>
                    <input
                      type="date"
                      className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={setQuickRange7Days}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    7 ngày qua
                  </button>
                  <button
                    type="button"
                    onClick={setQuickRange30Days}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    30 ngày qua
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: HOUSEKEEPER SPECIALIZED DASHBOARD */}
      {/* ========================================================================= */}
      {currentView === 'HOUSEKEEPING' && (
        <div className="space-y-6">
          {/* 4 Housekeeper KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Việc của tôi */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-amber-500 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Công việc của tôi hôm nay
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <UserCheck size={20} />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 leading-none">
                {housekeeperPerf?.myAssignedTasks ?? 0}{' '}
                <span className="text-xs font-bold text-slate-400">công việc</span>
              </div>
              <div className="text-xs mt-3 flex items-center gap-2 font-semibold">
                <span className="text-emerald-600">✓ {housekeeperPerf?.myDoneTasks ?? 0} đã xong</span>
                <span className="text-slate-300">•</span>
                <span className="text-blue-600">{housekeeperPerf?.myInProgressTasks ?? 0} đang làm</span>
              </div>
            </div>

            {/* Card 2: Phòng bẩn cần dọn toàn khách sạn */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-rose-500 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Phòng bẩn (Cần làm sạch)
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertCircle size={20} />
                </div>
              </div>
              <div className="text-3xl font-black text-rose-600 leading-none">
                {roomsSummary?.dirtyRooms ?? 0}{' '}
                <span className="text-xs font-bold text-slate-400">phòng bẩn</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-3 font-medium">
                Cần làm sạch phòng để khách mới nhận phòng
              </div>
            </div>

            {/* Card 3: Phòng đang dọn */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-blue-500 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Đang tiến hành dọn
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Brush size={20} />
                </div>
              </div>
              <div className="text-3xl font-black text-blue-600 leading-none">
                {roomsSummary?.cleaningRooms ?? 0}{' '}
                <span className="text-xs font-bold text-slate-400">phòng</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-3 font-medium">
                Nhân sự đang làm việc trong buồng phòng
              </div>
            </div>

            {/* Card 4: Phòng sạch đã sẵn sàng */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-emerald-500 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Sạch sẵn sàng đón khách
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-600 leading-none">
                {readyRooms} <span className="text-xs font-bold text-slate-400">/ {totalRooms} phòng</span>
              </div>
              <div className="text-[11px] text-emerald-700 mt-3 font-semibold flex items-center gap-1">
                <Sparkles size={13} /> Sạch sẽ & đủ tiêu chuẩn giao khách
              </div>
            </div>
          </div>

          {/* Progress & Quick Action Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Tiến độ cá nhân */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs md:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Tiến độ hoàn thành công việc của tôi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tỷ lệ hoàn tất các nhiệm vụ dọn phòng được giao trong ngày
                  </p>
                </div>
                <span className="text-2xl font-black text-amber-600">{myCompletedRatio}%</span>
              </div>

              {/* Progress Bar */}
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${myCompletedRatio}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                  <div className="text-xs text-slate-500 font-bold mb-0.5">Chờ bắt đầu</div>
                  <div className="text-lg font-black text-amber-600">
                    {housekeeperPerf?.myPendingTasks ?? 0}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                  <div className="text-xs text-slate-500 font-bold mb-0.5">Đang làm dở</div>
                  <div className="text-lg font-black text-blue-600">
                    {housekeeperPerf?.myInProgressTasks ?? 0}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-center">
                  <div className="text-xs text-emerald-700 font-bold mb-0.5">Đã hoàn thành</div>
                  <div className="text-lg font-black text-emerald-600">
                    {housekeeperPerf?.myDoneTasks ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Button Card */}
            <div className="p-6 bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl text-white shadow-md flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
                  <Brush size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-black leading-snug">Vào ca Dọn phòng</h3>
                <p className="text-xs text-amber-100 mt-2 leading-relaxed">
                  Xem danh sách chi tiết các phòng cần dọn, nhận phòng và bấm Hoàn tất để chuyển trạng
                  thái phòng sang SẠCH.
                </p>
              </div>

              <Link
                to="/housekeeping"
                className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-3 bg-white text-slate-900 rounded-2xl font-extrabold text-xs shadow-md hover:bg-amber-50 transition-all cursor-pointer"
              >
                <span>Mở bảng Quản lý Dọn phòng</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: RECEPTIONIST SPECIALIZED DASHBOARD */}
      {/* ========================================================================= */}
      {currentView === 'FRONTDESK' && (
        <div className="space-y-6">
          {/* 4 Front Desk KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Khách đến (Check-in) */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-blue-600 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Khách đến hôm nay (Check-in)
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 leading-none">
                {operationsSummary?.todayArrivals ?? 0}{' '}
                <span className="text-xs font-bold text-slate-400">lượt</span>
              </div>
              <div className="text-xs text-blue-700 mt-3 font-bold flex items-center gap-1">
                <Clock size={13} /> {operationsSummary?.pendingArrivals ?? 0} khách chưa nhận phòng
              </div>
            </div>

            {/* Card 2: Khách đi (Check-out) */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-rose-500 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Khách đi hôm nay (Check-out)
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Clock size={20} />
                </div>
              </div>
              <div className="text-3xl font-black text-rose-600 leading-none">
                {operationsSummary?.todayDepartures ?? 0}{' '}
                <span className="text-xs font-bold text-slate-400">phòng</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-3 font-medium">
                Cần chốt hóa đơn & kiểm tra phòng trước khi trả cọc
              </div>
            </div>

            {/* Card 3: Phòng sạch sẵn sàng đón khách */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-indigo-600 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Phòng sạch sẵn sàng đón khách
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <div className="text-3xl font-black text-indigo-600 leading-none">
                {readyRooms} <span className="text-xs font-bold text-slate-400">/ {totalRooms} phòng</span>
              </div>
              <div className="text-xs mt-3 font-semibold flex items-center gap-1.5">
                {availableDirtyRooms > 0 ? (
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {availableDirtyRooms} phòng trống chờ dọn
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold">✓ 100% phòng trống đã sẵn sàng</span>
                )}
              </div>
            </div>

            {/* Card 4: Doanh thu ca trực hôm nay */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-emerald-600 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Doanh thu ca trực hôm nay
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 leading-none truncate">
                {formatVnd(operationsSummary?.todayCollectedRevenue ?? 0)}
              </div>
              <div className="text-[11px] text-emerald-700 mt-3 font-bold flex items-center gap-1">
                <CheckCircle2 size={13} /> Tiền mặt, chuyển khoản, thẻ tại quầy
              </div>
            </div>
          </div>

          {/* Operational Alerts & In-house Guest Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Widget Cảnh báo công nợ In-House */}
            <div className="p-6 bg-amber-50/80 rounded-3xl border border-amber-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-700 font-black text-sm mb-2">
                  <CreditCard size={18} />
                  <span>Công nợ khách đang ở (In-house)</span>
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1">
                  {formatVnd(operationsSummary?.inHouseUnpaidBalance ?? 0)}
                </div>
                <p className="text-xs text-amber-800 leading-relaxed mt-2">
                  Tổng số tiền phòng và dịch vụ phát sinh của các phòng đang lưu trú chưa thanh toán.
                  Lễ tân lưu ý đối soát và thu đủ tiền khi khách làm thủ tục Check-out.
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-amber-200/60 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">
                  Số phòng đang có khách: <strong>{operationsSummary?.activeStays ?? 0} phòng</strong>
                </span>
                <Link
                  to="/frontdesk"
                  className="text-xs font-extrabold text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline"
                >
                  <span>Mở Tiền sảnh</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>

            {/* Quick Actions Front Desk */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs lg:col-span-2">
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                Lối tắt thao tác nhanh Quầy Lễ tân
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Thực hiện nhanh các nghiệp vụ nhận phòng, trả phòng, đổi phòng và thu ngân
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link
                  to="/reservations"
                  className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 hover:bg-blue-100 transition-colors flex flex-col items-center justify-center text-center gap-2 cursor-pointer"
                >
                  <Calendar size={22} className="text-blue-600" />
                  <span className="text-xs font-black">Đặt phòng mới</span>
                </Link>

                <Link
                  to="/frontdesk"
                  className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100 transition-colors flex flex-col items-center justify-center text-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={22} className="text-emerald-600" />
                  <span className="text-xs font-black">Nhận / Trả phòng</span>
                </Link>

                <Link
                  to="/rooms"
                  className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 hover:bg-indigo-100 transition-colors flex flex-col items-center justify-center text-center gap-2 cursor-pointer"
                >
                  <BedDouble size={22} className="text-indigo-600" />
                  <span className="text-xs font-black">Sơ đồ phòng</span>
                </Link>

                <Link
                  to="/billing"
                  className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 transition-colors flex flex-col items-center justify-center text-center gap-2 cursor-pointer"
                >
                  <Wallet size={22} className="text-amber-600" />
                  <span className="text-xs font-black">Thu ngân & Folio</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: ACCOUNTANT SPECIALIZED DASHBOARD */}
      {/* ========================================================================= */}
      {currentView === 'FINANCE' && (
        <div className="space-y-6">
          {/* 4 Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Thực thu */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-emerald-600 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Thực thu ({getPeriodDisplayTitle()})
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 leading-none truncate">
                {formatVnd(revenue?.collectedRevenue || financialSummary?.monthRevenue || 0)}
              </div>
              <div className="text-xs text-emerald-700 mt-2.5 font-bold flex items-center gap-1">
                <CheckCircle2 size={13} /> Dòng tiền thực thu (Đã trừ hoàn trả)
              </div>
            </div>

            {/* Card 2: Tiền cọc đang giữ */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-blue-600 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Tiền đặt cọc đang giữ
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-600 leading-none truncate">
                {formatVnd(financialSummary?.advanceDepositHeld || 0)}
              </div>
              <div className="text-[11px] text-slate-500 mt-2.5 font-medium">
                Cọc giữ trước từ các đơn đặt phòng sắp tới
              </div>
            </div>

            {/* Card 3: Công nợ Folio đang mở */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-rose-500 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Công nợ Folio chưa thu
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 leading-none truncate">
                {formatVnd(financialSummary?.inHouseUnpaidFolios || 0)}
              </div>
              <div className="text-[11px] text-slate-500 mt-2.5 font-medium">
                Khoản phải thu từ các Folio đang mở
              </div>
            </div>

            {/* Card 4: Công suất & Phòng hỏng */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-indigo-600 shadow-xs">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Công suất & Phòng hỏng
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Percent size={20} />
                </div>
              </div>
              <div className="text-2xl font-black text-indigo-600 leading-none">
                {occupancy?.occupancyRate || financialSummary?.occupancyRate || 0}%
              </div>
              <div className="text-[11px] text-slate-500 mt-2.5 font-medium">
                {financialSummary?.maintenanceRooms || 0} phòng bảo trì/hỏng làm giảm doanh thu
              </div>
            </div>
          </div>

          {/* Phân tích cơ cấu tài chính */}
          {revenue && (
            <Card title={`Báo cáo cơ cấu Doanh thu & Chiết khấu (${getPeriodDisplayTitle()})`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-bold text-slate-500 mb-1">Doanh thu Tiền phòng</div>
                  <div className="text-xl font-black text-slate-900">
                    {formatVnd(revenue.roomRevenue)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Ghi nhận từ tiền phòng lưu trú</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-bold text-slate-500 mb-1">Doanh thu Dịch vụ (F&B)</div>
                  <div className="text-xl font-black text-slate-900">
                    {formatVnd(revenue.serviceRevenue)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Minibar, nhà hàng, giặt là</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-bold text-slate-500 mb-1">Giảm giá & Khuyến mãi</div>
                  <div className="text-xl font-black text-rose-600">
                    {formatVnd(revenue.discountTotal)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Chiết khấu trừ vào hóa đơn</div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-xs font-bold text-emerald-800 mb-1">Doanh thu Ròng phát sinh</div>
                  <div className="text-xl font-black text-emerald-700">
                    {formatVnd(Math.max(0, revenue.recognizedRevenue - revenue.discountTotal))}
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-1 font-semibold">
                    Đã trừ chiết khấu khách hàng
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: EXECUTIVE MANAGEMENT DASHBOARD (Admin & Manager) */}
      {/* ========================================================================= */}
      {currentView === 'EXECUTIVE' && (
        <div className="space-y-6">
          {/* Executive Top 4 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Thực thu */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-emerald-600 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Thực thu kỳ này
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 leading-none truncate">
                {formatVnd(revenue?.collectedRevenue || 0)}
              </div>
              <div className="text-[11px] text-emerald-700 mt-2.5 font-bold flex items-center gap-1">
                <CheckCircle2 size={13} /> Tiền cọc & thanh toán (đã trừ hoàn cọc)
              </div>
            </div>

            {/* Card 2: Doanh thu ghi nhận Folio */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-blue-600 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Doanh thu phát sinh (Folio)
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CircleDollarSign size={20} />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 leading-none truncate">
                {formatVnd(revenue?.recognizedRevenue || 0)}
              </div>
              <div className="text-[11px] text-slate-500 mt-2.5 font-medium flex items-center gap-1">
                <Info size={13} /> Cước phòng + dịch vụ trong kỳ
              </div>
            </div>

            {/* Card 3: Tỷ lệ lấp đầy */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-amber-500 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  {period === 'DAY' ? 'Tỷ lệ lấp đầy trong ngày' : 'Công suất phòng bình quân'}
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Percent size={20} />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600 leading-none">
                {occupancy?.occupancyRate || 0}%
              </div>
              <div className="text-[11px] text-slate-500 mt-2.5 font-medium">
                {period === 'DAY' ? (
                  <span>
                    {occupancy?.occupiedRooms || 0} / {occupancy?.operationalRooms || 0} phòng sẵn sàng
                  </span>
                ) : (
                  <span>
                    {occupancy?.totalRoomNightsOccupied || 0} /{' '}
                    {occupancy?.totalRoomNightsAvailable || 0} đêm phòng phục vụ
                  </span>
                )}
              </div>
            </div>

            {/* Card 4: Phòng sẵn sàng đón khách */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 border-l-4 border-l-indigo-600 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Phòng sẵn sàng đón khách
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <div className="text-2xl font-black text-indigo-600 leading-none">
                {readyRooms} <span className="text-xs font-bold text-slate-400">/ {totalRooms} phòng</span>
              </div>
              <div className="text-[11px] mt-2.5 font-medium flex items-center gap-1.5">
                {availableDirtyRooms > 0 ? (
                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {availableDirtyRooms} phòng trống chờ dọn
                  </span>
                ) : (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    ✓ 100% phòng trống đã dọn sạch
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Operational Metrics Sub-Banner */}
          {operationsSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <div className="text-center sm:text-left">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Khách đến hôm nay</div>
                <div className="text-base font-black text-slate-800">
                  {operationsSummary.todayArrivals} khách{' '}
                  <span className="text-xs font-semibold text-blue-600">
                    ({operationsSummary.pendingArrivals} chưa đến)
                  </span>
                </div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Khách đi hôm nay</div>
                <div className="text-base font-black text-slate-800">
                  {operationsSummary.todayDepartures} phòng trả
                </div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Đang ở (In-house)</div>
                <div className="text-base font-black text-slate-800">
                  {operationsSummary.activeStays} lượt phòng
                </div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Cọc đang giữ</div>
                <div className="text-base font-black text-emerald-600 truncate">
                  {formatVnd(financialSummary?.advanceDepositHeld || 0)}
                </div>
              </div>
              <div className="text-center sm:text-left col-span-2 sm:col-span-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Công nợ Folio mở</div>
                <div className="text-base font-black text-rose-600 truncate">
                  {formatVnd(operationsSummary.inHouseUnpaidBalance)}
                </div>
              </div>
            </div>
          )}

          {/* Cơ cấu Doanh thu & Chiết khấu */}
          {canViewRevenue && revenue && (
            <Card title={`Cơ cấu Doanh thu & Chi phí (${getPeriodDisplayTitle()})`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-bold text-slate-500 mb-1">Doanh thu Tiền phòng</div>
                  <div className="text-xl font-black text-slate-900">
                    {formatVnd(revenue.roomRevenue)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Cước lưu trú các hạng</span>
                    <span className="font-bold text-slate-700">
                      {revenue.recognizedRevenue > 0
                        ? Math.round((revenue.roomRevenue / revenue.recognizedRevenue) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-bold text-slate-500 mb-1">Doanh thu Dịch vụ (F&B...)</div>
                  <div className="text-xl font-black text-slate-900">
                    {formatVnd(revenue.serviceRevenue)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Minibar, nhà hàng, giặt là</span>
                    <span className="font-bold text-slate-700">
                      {revenue.recognizedRevenue > 0
                        ? Math.round((revenue.serviceRevenue / revenue.recognizedRevenue) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-bold text-slate-500 mb-1">Giảm giá & Chiết khấu</div>
                  <div className="text-xl font-black text-rose-600">
                    {formatVnd(revenue.discountTotal)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Khuyến mãi & giảm trừ khách</div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-xs font-bold text-emerald-800 mb-1">Doanh thu Ròng phát sinh</div>
                  <div className="text-xl font-black text-emerald-700">
                    {formatVnd(Math.max(0, revenue.recognizedRevenue - revenue.discountTotal))}
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-1 font-semibold">
                    (Phòng + Dịch vụ) - Chiết khấu
                  </div>
                </div>
              </div>

              {revenue.recognizedRevenue > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span className="text-slate-600">Tỷ trọng nguồn doanh thu:</span>
                    <span className="text-slate-500 text-[11px]">
                      Tiền phòng: {Math.round((revenue.roomRevenue / revenue.recognizedRevenue) * 100)}% | Dịch vụ:{' '}
                      {Math.round((revenue.serviceRevenue / revenue.recognizedRevenue) * 100)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${(revenue.roomRevenue / revenue.recognizedRevenue) * 100}%` }}
                      title={`Tiền phòng: ${formatVnd(revenue.roomRevenue)}`}
                    />
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${(revenue.serviceRevenue / revenue.recognizedRevenue) * 100}%` }}
                      title={`Dịch vụ: ${formatVnd(revenue.serviceRevenue)}`}
                    />
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Timeline Chart & Data Table */}
          {(revTimeline.length > 0 || occTimeline.length > 0) && (
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                    <BarChart3 size={18} className="text-amber-600" />
                    Diễn biến & Biểu đồ Phân tích ({getPeriodDisplayTitle()})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quan sát sự thay đổi doanh thu thực thu, doanh thu ghi nhận và công suất phòng theo từng mốc thời gian
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  {canViewRevenue && (
                    <button
                      type="button"
                      onClick={() => setChartView('REVENUE')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        chartView === 'REVENUE'
                          ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Doanh thu
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setChartView('OCCUPANCY')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      chartView === 'OCCUPANCY'
                        ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Công suất phòng (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('TABLE')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      chartView === 'TABLE'
                        ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <TableProperties size={13} /> Bảng số liệu
                  </button>
                </div>
              </div>

              {/* Chart views */}
              {chartView === 'REVENUE' && canViewRevenue && (
                <div className="mt-4">
                  <div className="flex items-center gap-4 text-xs font-bold mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-md bg-emerald-500" />
                      <span className="text-slate-700">Thực thu (Collected)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-md bg-blue-500" />
                      <span className="text-slate-700">Ghi nhận Folio (Recognized)</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto pb-2">
                    <div
                      className="flex items-end gap-3 pt-8 pb-3 min-w-full"
                      style={{ minWidth: `${Math.max(600, revTimeline.length * 52)}px`, height: '260px' }}
                    >
                      {revTimeline.map((item, idx) => {
                        const colH = Math.max(
                          8,
                          Math.round((item.collectedRevenue / maxTimelineRevenue) * 190)
                        );
                        const recH = Math.max(
                          8,
                          Math.round((item.recognizedRevenue / maxTimelineRevenue) * 190)
                        );

                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center justify-end h-full group relative"
                          >
                            <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center pointer-events-none">
                              <div className="bg-slate-900 text-white text-[10px] rounded-lg py-1 px-2 shadow-xl whitespace-nowrap text-center leading-tight">
                                <span className="font-bold">{item.label}</span>
                                <br />
                                Thực thu: {formatVnd(item.collectedRevenue)}
                                <br />
                                Folio: {formatVnd(item.recognizedRevenue)}
                              </div>
                              <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                            </div>

                            <div className="w-full flex items-end justify-center gap-1">
                              <div
                                className="w-1/2 max-w-[20px] bg-emerald-500 hover:bg-emerald-600 rounded-t-md transition-all duration-300 relative"
                                style={{ height: `${colH}px` }}
                              />
                              <div
                                className="w-1/2 max-w-[20px] bg-blue-500 hover:bg-blue-600 rounded-t-md transition-all duration-300 relative"
                                style={{ height: `${recH}px` }}
                              />
                            </div>

                            <div className="text-[10px] font-bold text-slate-500 mt-2 truncate w-full text-center">
                              {item.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {chartView === 'OCCUPANCY' && (
                <div className="mt-4">
                  <div className="flex items-center gap-4 text-xs font-bold mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-md bg-emerald-500" />
                      <span className="text-slate-700">Cao (≥ 70%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-md bg-amber-500" />
                      <span className="text-slate-700">Trung bình (40 - 69%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-md bg-slate-400" />
                      <span className="text-slate-700">Thấp (&lt; 40%)</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto pb-2">
                    <div
                      className="flex items-end gap-3 pt-8 pb-3 min-w-full"
                      style={{ minWidth: `${Math.max(600, occTimeline.length * 48)}px`, height: '260px' }}
                    >
                      {occTimeline.map((item, idx) => {
                        const barHeight = Math.max(10, Math.round((item.occupancyRate / 100) * 190));
                        const isHigh = item.occupancyRate >= 70;
                        const isMedium = item.occupancyRate >= 40 && item.occupancyRate < 70;

                        const barColor = isHigh
                          ? 'bg-emerald-500 hover:bg-emerald-600'
                          : isMedium
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-slate-400 hover:bg-slate-500';

                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center justify-end h-full group relative"
                          >
                            <div className="absolute -top-10 z-20 hidden group-hover:flex flex-col items-center pointer-events-none">
                              <div className="bg-slate-900 text-white text-[10px] rounded-lg py-1 px-2 shadow-xl whitespace-nowrap text-center leading-tight">
                                <span className="font-bold">{item.label}</span>
                                <br />
                                Công suất: {item.occupancyRate}% ({item.occupiedRooms} phòng)
                              </div>
                              <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                            </div>

                            <span className="text-[10px] font-extrabold text-slate-700 mb-1">
                              {item.occupancyRate}%
                            </span>

                            <div
                              className={`w-full max-w-[28px] ${barColor} rounded-t-lg transition-all duration-300`}
                              style={{ height: `${barHeight}px` }}
                            />

                            <div className="text-[10px] font-bold text-slate-500 mt-2 truncate w-full text-center">
                              {item.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {chartView === 'TABLE' && (
                <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto max-h-[380px]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Mốc thời gian</th>
                          {canViewRevenue && <th className="py-2.5 px-3 text-right">Thực thu</th>}
                          {canViewRevenue && <th className="py-2.5 px-3 text-right">Ghi nhận Folio</th>}
                          {canViewRevenue && <th className="py-2.5 px-3 text-right">Tiền phòng</th>}
                          {canViewRevenue && <th className="py-2.5 px-3 text-right">Dịch vụ</th>}
                          <th className="py-2.5 px-3 text-center">Phòng có khách</th>
                          <th className="py-2.5 px-3 text-center">Công suất (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {revTimeline.map((r, i) => {
                          const occ = occTimeline[i];
                          return (
                            <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 font-bold text-slate-800">{r.label}</td>
                              {canViewRevenue && (
                                <td className="py-2 px-3 text-right font-semibold text-emerald-600">
                                  {formatVnd(r.collectedRevenue)}
                                </td>
                              )}
                              {canViewRevenue && (
                                <td className="py-2 px-3 text-right font-semibold text-blue-600">
                                  {formatVnd(r.recognizedRevenue)}
                                </td>
                              )}
                              {canViewRevenue && (
                                <td className="py-2 px-3 text-right text-slate-700">
                                  {formatVnd(r.roomRevenue)}
                                </td>
                              )}
                              {canViewRevenue && (
                                <td className="py-2 px-3 text-right text-slate-700">
                                  {formatVnd(r.serviceRevenue)}
                                </td>
                              )}
                              <td className="py-2 px-3 text-center font-medium text-slate-700">
                                {occ ? occ.occupiedRooms : '-'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {occ ? (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                      occ.occupancyRate >= 70
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : occ.occupancyRate >= 40
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {occ.occupancyRate}%
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50/90 font-black border-t-2 border-slate-200 text-slate-900">
                        <tr>
                          <td className="py-2.5 px-3">Tổng cộng kỳ này</td>
                          {canViewRevenue && (
                            <td className="py-2.5 px-3 text-right text-emerald-700">
                              {formatVnd(revenue?.collectedRevenue || 0)}
                            </td>
                          )}
                          {canViewRevenue && (
                            <td className="py-2.5 px-3 text-right text-blue-700">
                              {formatVnd(revenue?.recognizedRevenue || 0)}
                            </td>
                          )}
                          {canViewRevenue && (
                            <td className="py-2.5 px-3 text-right">
                              {formatVnd(revenue?.roomRevenue || 0)}
                            </td>
                          )}
                          {canViewRevenue && (
                            <td className="py-2.5 px-3 text-right">
                              {formatVnd(revenue?.serviceRevenue || 0)}
                            </td>
                          )}
                          <td className="py-2.5 px-3 text-center text-slate-700">
                            {occupancy?.totalRoomNightsOccupied || 0} đêm
                          </td>
                          <td className="py-2.5 px-3 text-center text-amber-700 font-extrabold">
                            {occupancy?.occupancyRate || 0}%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Top Performers (Bảng xếp hạng Hiệu suất Nhân viên Buồng phòng) */}
          {housekeeperPerf?.topPerformers && housekeeperPerf.topPerformers.length > 0 && (
            <Card title="Bảng Xếp Hạng Hiệu Suất Nhân Viên Buồng Phòng">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                {housekeeperPerf.topPerformers.map((perf, index) => (
                  <div
                    key={perf.employeeId}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                          index === 0
                            ? 'bg-amber-100 text-amber-700 border border-amber-300'
                            : index === 1
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {index === 0 ? <Award size={18} /> : `#${index + 1}`}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs">{perf.employeeName}</div>
                        <div className="text-[11px] text-slate-500">Mã NV: #{perf.employeeId}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-600 text-sm">
                        {perf.completedTasks}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">việc xong</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Phân bổ Trạng thái Phòng & Buồng phòng (Hiển thị cho tất cả ngoại trừ Accountant) */}
      {/* ========================================================================= */}
      {currentView !== 'FINANCE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Phân bổ trạng thái phòng */}
          <Card title="Phân bổ Trạng thái Phòng (Hiện tại)">
            <div className="flex flex-col gap-4 mt-2">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Sẵn sàng đón khách (Sạch & Trống)
                  </span>
                  <span className="font-bold text-emerald-600">
                    {readyRooms} phòng ({totalRooms > 0 ? Math.round((readyRooms / totalRooms) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${totalRooms > 0 ? (readyRooms / totalRooms) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {availableDirtyRooms > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Trống chờ dọn (Bẩn / Đang dọn)
                    </span>
                    <span className="font-bold text-amber-600">
                      {availableDirtyRooms} phòng ({totalRooms > 0 ? Math.round((availableDirtyRooms / totalRooms) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${totalRooms > 0 ? (availableDirtyRooms / totalRooms) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Đang có khách ở (OCCUPIED)
                  </span>
                  <span className="font-bold text-blue-600">
                    {occupiedRooms} phòng ({totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Bảo trì & Hỏng (MAINTENANCE / OUT_OF_ORDER)
                  </span>
                  <span className="font-bold text-slate-600">
                    {maintenanceRooms + outOfOrderRooms} phòng ({totalRooms > 0 ? Math.round(((maintenanceRooms + outOfOrderRooms) / totalRooms) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-400 rounded-full transition-all duration-300"
                    style={{ width: `${totalRooms > 0 ? ((maintenanceRooms + outOfOrderRooms) / totalRooms) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1.5">
                  <BedDouble size={14} className="text-slate-400" />
                  Tổng phòng hệ thống: <strong className="text-slate-800">{totalRooms} phòng</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Wrench size={14} className="text-amber-500" />
                  Đang bảo dưỡng: <strong className="text-slate-800">{maintenanceRooms} phòng</strong>
                </span>
              </div>
            </div>
          </Card>

          {/* Tình trạng vệ sinh buồng phòng */}
          <Card title="Tình trạng Buồng phòng & Vệ sinh (Housekeeping)">
            <div className="flex flex-col gap-4 mt-2">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-600" /> Sạch & Đã kiểm tra (CLEAN / INSPECTED)
                  </span>
                  <span className="font-bold text-emerald-600">
                    {totalClean} phòng ({totalRooms > 0 ? Math.round((totalClean / totalRooms) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${totalRooms > 0 ? (totalClean / totalRooms) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Brush size={14} className="text-rose-600" /> Cần dọn & Đang dọn (DIRTY / CLEANING)
                  </span>
                  <span className="font-bold text-rose-600">
                    {totalNeedClean} phòng ({totalRooms > 0 ? Math.round((totalNeedClean / totalRooms) * 100) : 0}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-300"
                    style={{ width: `${totalRooms > 0 ? (totalNeedClean / totalRooms) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="mt-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hotel size={16} className="text-amber-600 shrink-0" />
                  <span>
                    Phòng bẩn: <strong>{dirtyRooms}</strong> • Đang dọn: <strong>{cleaningRooms}</strong>
                  </span>
                </div>
                <Link
                  to="/housekeeping"
                  className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline"
                >
                  <span>Quản lý buồng phòng</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
