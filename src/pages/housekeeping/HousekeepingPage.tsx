import {
  AlertCircle,
  Brush,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  Play,
  Plus,
  RefreshCw,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { ActionDropdown, type ActionDropdownItem } from '../../components/common/ActionDropdown';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { housekeepingService } from '../../services/housekeepingService';
import type {
  HousekeeperEmployee,
  HousekeepingStatus,
  HousekeepingSummary,
  HousekeepingTask,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
} from '../../types/housekeeping';

interface RoomOption {
  roomId: number;
  roomNumber: string;
  floorNo: number;
  roomTypeName: string;
  housekeepingStatus: HousekeepingStatus;
}

export const HousekeepingPage: React.FC = () => {
  const { user, hasAnyRole } = useAuth();
  const toast = useToast();

  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [summary, setSummary] = useState<HousekeepingSummary | null>(null);
  const [employees, setEmployees] = useState<HousekeeperEmployee[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<HousekeepingTask | null>(null);
  const [detailTask, setDetailTask] = useState<HousekeepingTask | null>(null);

  const openDetailModal = (task: HousekeepingTask) => {
    setDetailTask(task);
    setIsDetailModalOpen(true);
  };

  const formatDuration = (startStr?: string | null, endStr?: string | null) => {
    if (!startStr) return null;
    const start = new Date(startStr).getTime();
    const end = endStr ? new Date(endStr).getTime() : Date.now();
    const minutes = Math.max(1, Math.round((end - start) / 60000));
    if (minutes < 60) {
      return `${minutes} phút`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours} giờ ${remainingMins > 0 ? `${remainingMins} phút` : ''}`;
  };

  // Form states
  const [createRoomId, setCreateRoomId] = useState<number | ''>('');
  const [createType, setCreateType] = useState<HousekeepingTaskType>('CLEANING');
  const [createAssignedTo, setCreateAssignedTo] = useState<number | ''>('');
  const [createNote, setCreateNote] = useState('');
  const [assignEmployeeId, setAssignEmployeeId] = useState<number | ''>('');
  const [actionLoading, setActionLoading] = useState(false);

  const isManagerOrAdmin = hasAnyRole(['ADMIN', 'MANAGER']);
  const canManage = hasAnyRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']);
  const canAssign = isManagerOrAdmin;

  // Kiểm tra quyền thao tác trên task:
  // - Admin & Manager có toàn quyền thao tác trên mọi việc
  // - Housekeeper chỉ được thao tác nếu việc chưa gán cho ai hoặc đã gán cho chính tài khoản của mình
  const canWorkOnTask = (task: HousekeepingTask): boolean => {
    if (isManagerOrAdmin) return true;
    if (task.assignedTo != null) {
      if (user?.employeeId != null && task.assignedTo === user.employeeId) {
        return true;
      }
      if (
        user?.fullName &&
        task.assignedEmployeeName &&
        user.fullName.trim().toLowerCase() === task.assignedEmployeeName.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    }
    // Chưa phân công ai: Nhân sự buồng phòng có thể tự nhận làm
    return Boolean(user?.employeeId || user?.fullName);
  };

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await housekeepingService.getSummary();
      setSummary(res);
    } catch {
      // Ignored
    }
  }, []);

  // Fetch Tasks
  const fetchTasks = useCallback(
    async (pageToFetch?: number) => {
      const targetPage = typeof pageToFetch === 'number' ? pageToFetch : currentPage;
      setLoading(true);
      try {
        const res = await housekeepingService.getTasks({
          status: statusFilter ? (statusFilter as HousekeepingTaskStatus) : undefined,
          taskType: typeFilter ? (typeFilter as HousekeepingTaskType) : undefined,
          page: targetPage,
          size: 15,
        });
        setTasks(res.content || []);
        setTotalPages(res.totalPages || 0);
        setTotalElements(res.totalElements || 0);
        if (typeof pageToFetch === 'number') {
          setCurrentPage(pageToFetch);
        }
      } catch {
        toast.error('Không thể tải danh sách công việc buồng phòng');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, typeFilter, currentPage, toast]
  );

  // 1. Fetch initial meta: rooms & employees chỉ 1 lần khi component mount
  useEffect(() => {
    fetchSummary();

    // Fetch active employees
    housekeepingService
      .getEmployees()
      .then((data) => setEmployees(data || []))
      .catch(() => {});

    // Fetch rooms for dropdown
    api
      .get<{ content: RoomOption[] }>('/rooms?size=100&activeOnly=true')
      .then((res) => setRooms(res.content || []))
      .catch(() => {});
  }, [fetchSummary]);

  // 2. Tự động tải công việc khi đổi trang hoặc bộ lọc
  useEffect(() => {
    fetchTasks(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, typeFilter]);

  // Handle Start Task
  const handleStartTask = async (taskId: number) => {
    try {
      await housekeepingService.startTask(taskId);
      toast.success('Đã bắt đầu thực hiện dọn phòng!');
      fetchTasks(currentPage);
      fetchSummary();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Có lỗi khi bắt đầu công việc';
      toast.error(errorMsg);
    }
  };

  // Handle Complete Task
  const handleCompleteTask = async (taskId: number) => {
    try {
      await housekeepingService.completeTask(taskId);
      toast.success('Đã hoàn thành công việc! Phòng đã chuyển sang trạng thái SẠCH.');
      fetchTasks(currentPage);
      fetchSummary();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Có lỗi khi hoàn thành công việc';
      toast.error(errorMsg);
    }
  };

  // Open Assign Modal
  const openAssignModal = (task: HousekeepingTask) => {
    setSelectedTask(task);
    setAssignEmployeeId(task.assignedTo || '');
    setIsAssignModalOpen(true);
  };

  // Submit Assign
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !assignEmployeeId) {
      toast.error('Vui lòng chọn nhân viên được phân công');
      return;
    }

    setActionLoading(true);
    try {
      await housekeepingService.assignTask(selectedTask.taskId, {
        assignedTo: Number(assignEmployeeId),
      });
      toast.success('Phân công công việc thành công!');
      setIsAssignModalOpen(false);
      fetchTasks(currentPage);
      fetchSummary();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi phân công';
      toast.error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Create Task
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createRoomId) {
      toast.error('Vui lòng chọn phòng cần dọn');
      return;
    }

    setActionLoading(true);
    try {
      await housekeepingService.createTask({
        roomId: Number(createRoomId),
        taskType: createType,
        assignedTo: createAssignedTo ? Number(createAssignedTo) : undefined,
        note: createNote.trim() || undefined,
      });
      toast.success('Đã tạo nhiệm vụ buồng phòng mới!');
      setIsCreateModalOpen(false);
      setCreateRoomId('');
      setCreateType('CLEANING');
      setCreateAssignedTo('');
      setCreateNote('');
      fetchTasks(0);
      fetchSummary();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Không thể tạo công việc';
      toast.error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const getTaskTypeBadge = (type: HousekeepingTaskType) => {
    switch (type) {
      case 'CLEANING':
        return <Badge variant="info">Dọn phòng định kỳ</Badge>;
      case 'TURNDOWN':
        return <Badge variant="warning">Dọn buổi tối</Badge>;
      case 'INSPECTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold leading-normal border whitespace-nowrap bg-purple-50 text-purple-800 border-purple-200">
            Kiểm tra buồng phòng
          </span>
        );
      case 'DEEP_CLEAN':
        return <Badge variant="danger">Tổng vệ sinh</Badge>;
      default:
        return <Badge variant="info">{type}</Badge>;
    }
  };

  const getTaskStatusBadge = (status: HousekeepingTaskStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">Chờ xử lý</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="info">Đang dọn</Badge>;
      case 'DONE':
        return <Badge variant="success">Đã hoàn thành</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const getRoomHKBadge = (status: HousekeepingStatus) => {
    switch (status) {
      case 'CLEAN':
        return <Badge variant="success">Sạch</Badge>;
      case 'DIRTY':
        return <Badge variant="danger">Cần dọn</Badge>;
      case 'CLEANING':
        return <Badge variant="info">Đang dọn</Badge>;
      case 'INSPECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold leading-normal border whitespace-nowrap bg-purple-50 text-purple-800 border-purple-200">
            Đã kiểm tra
          </span>
        );
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <Brush size={18} />
            <span className="text-xs font-extrabold tracking-wider uppercase">
              Bộ phận Buồng phòng (Housekeeping)
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Quản lý Dọn phòng & Vệ sinh
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi tiến độ làm sạch, phân công nhân viên và chuyển trạng thái phòng tự động
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              fetchTasks(currentPage);
              fetchSummary();
            }}
            isLoading={loading}
            leftIcon={<RefreshCw size={16} />}
          >
            Làm mới
          </Button>

          {canManage && (
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus size={16} />}
            >
              Tạo việc dọn phòng
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 border-l-4 border-l-amber-500 shadow-sm">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mb-1">
            <span>Chờ dọn dẹp</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">
            {summary?.pendingTasks ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Công việc chưa bắt đầu</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 border-l-4 border-l-blue-500 shadow-sm">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mb-1">
            <span>Đang thực hiện</span>
            <Brush size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-blue-600">
            {summary?.inProgressTasks ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Nhân viên đang dọn</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 border-l-4 border-l-emerald-500 shadow-sm">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mb-1">
            <span>Đã hoàn thành</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {summary?.doneTasks ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Công việc đã kết thúc</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 border-l-4 border-l-rose-500 shadow-sm">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mb-1">
            <span>Phòng bẩn (DIRTY)</span>
            <AlertCircle size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600">
            {summary?.dirtyRooms ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Cần tạo việc hoặc dọn dẹp</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter size={16} className="text-amber-600" />
          <span>Bộ lọc:</span>
        </div>

        <div className="w-48">
          <select
            className="w-full text-xs font-medium rounded-lg border border-slate-200 py-1.5 px-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(0);
            }}
          >
            <option value="">Tất cả trạng thái công việc</option>
            <option value="PENDING">Chờ xử lý (PENDING)</option>
            <option value="IN_PROGRESS">Đang dọn (IN_PROGRESS)</option>
            <option value="DONE">Đã xong (DONE)</option>
          </select>
        </div>

        <div className="w-48">
          <select
            className="w-full text-xs font-medium rounded-lg border border-slate-200 py-1.5 px-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(0);
            }}
          >
            <option value="">Tất cả loại công việc</option>
            <option value="CLEANING">Dọn phòng định kỳ</option>
            <option value="TURNDOWN">Dọn phòng buổi tối</option>
            <option value="INSPECTION">Kiểm tra buồng phòng</option>
            <option value="DEEP_CLEAN">Tổng vệ sinh</option>
          </select>
        </div>

        {(statusFilter || typeFilter) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStatusFilter('');
              setTypeFilter('');
              setCurrentPage(0);
            }}
          >
            Xóa lọc
          </Button>
        )}

        <div className="ml-auto text-xs text-slate-500 font-medium">
          Tổng số: <strong className="text-slate-800">{totalElements}</strong> công việc
        </div>
      </div>

      {/* Tasks Table */}
      <Card>
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            <RefreshCw className="animate-spin inline-block mr-2 text-amber-600" size={20} />
            Đang tải dữ liệu công việc buồng phòng...
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Không tìm thấy công việc buồng phòng nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Phòng</th>
                  <th className="py-3 px-4">Loại công việc</th>
                  <th className="py-3 px-4">Nhân sự phụ trách</th>
                  <th className="py-3 px-4">Trạng thái việc</th>
                  <th className="py-3 px-4">Vệ sinh phòng</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tasks.map((task) => {
                  const isPermittedToWork = canWorkOnTask(task);
                  const actionItems: ActionDropdownItem[] = [];

                  if (task.status === 'PENDING') {
                    if (isPermittedToWork) {
                      actionItems.push({
                        label: 'Bắt đầu dọn phòng',
                        icon: <Play size={14} className="text-amber-600" />,
                        onClick: () => handleStartTask(task.taskId),
                      });
                    }
                    if (canAssign) {
                      actionItems.push({
                        label: task.assignedTo ? 'Đổi nhân sự' : 'Phân công nhân sự',
                        icon: <UserPlus size={14} className="text-blue-600" />,
                        onClick: () => openAssignModal(task),
                      });
                    }
                  } else if (task.status === 'IN_PROGRESS') {
                    if (isPermittedToWork) {
                      actionItems.push({
                        label: 'Hoàn tất công việc',
                        icon: <CheckCircle2 size={14} className="text-emerald-600" />,
                        onClick: () => handleCompleteTask(task.taskId),
                      });
                    }
                    if (canAssign) {
                      actionItems.push({
                        label: 'Đổi nhân sự',
                        icon: <UserCheck size={14} className="text-blue-600" />,
                        onClick: () => openAssignModal(task),
                      });
                    }
                  }

                  // Action Xem chi tiết luôn hiển thị cho mọi công việc
                  actionItems.push({
                    label: 'Xem chi tiết',
                    icon: <Eye size={14} className="text-slate-600" />,
                    onClick: () => openDetailModal(task),
                  });

                  return (
                    <tr key={task.taskId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 text-sm">
                          Phòng {task.roomNumber}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Tầng {task.floorNo} • {task.roomTypeName}
                        </div>
                      </td>
                      <td className="py-3 px-4">{getTaskTypeBadge(task.taskType)}</td>
                      <td className="py-3 px-4">
                        {task.assignedEmployeeName ? (
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <UserCheck size={14} className="text-emerald-600" />
                            <span>{task.assignedEmployeeName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-normal">Chưa phân công</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{getTaskStatusBadge(task.status)}</td>
                      <td className="py-3 px-4">{getRoomHKBadge(task.roomHousekeepingStatus)}</td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        <div>Tạo: {new Date(task.createdAt).toLocaleString('vi-VN')}</div>
                        {task.finishedAt && (
                          <div className="text-emerald-600 font-medium">
                            Xong: {new Date(task.finishedAt).toLocaleString('vi-VN')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end">
                          {actionItems.length >= 2 ? (
                            <ActionDropdown items={actionItems} />
                          ) : actionItems.length === 1 ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={actionItems[0].onClick}
                              leftIcon={actionItems[0].icon}
                              className="text-xs font-semibold py-1 px-2.5 shadow-2xs"
                            >
                              {actionItems[0].label}
                            </Button>
                          ) : (
                            <span className="text-slate-300 select-none text-xs">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={15}
              onPageChange={(page) => fetchTasks(page)}
            />
          </div>
        )}
      </Card>

      {/* Modal Tạo việc dọn phòng */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tạo Công Việc Dọn Phòng"
        maxWidth="540px"
        onSubmit={handleCreateSubmit}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" isLoading={actionLoading}>
              Xác nhận tạo
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chọn phòng <span className="text-rose-500">*</span>
            </label>
            <select
              className="w-full text-xs font-medium rounded-lg border border-slate-200 py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={createRoomId}
              onChange={(e) => setCreateRoomId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">-- Chọn phòng khách sạn --</option>
              {rooms.map((r) => (
                <option key={r.roomId} value={r.roomId}>
                  Phòng {r.roomNumber} (Tầng {r.floorNo} - {r.roomTypeName}) [
                  {r.housekeepingStatus === 'DIRTY' ? 'Cần dọn' : r.housekeepingStatus}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Loại công việc <span className="text-rose-500">*</span>
            </label>
            <select
              className="w-full text-xs font-medium rounded-lg border border-slate-200 py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={createType}
              onChange={(e) => setCreateType(e.target.value as HousekeepingTaskType)}
              required
            >
              <option value="CLEANING">Dọn phòng định kỳ (CLEANING)</option>
              <option value="TURNDOWN">Dọn phòng buổi tối (TURNDOWN)</option>
              <option value="INSPECTION">Kiểm tra buồng phòng (INSPECTION)</option>
              <option value="DEEP_CLEAN">Tổng vệ sinh khử khuẩn (DEEP_CLEAN)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Phân công nhân sự (Tùy chọn)
            </label>
            <select
              className="w-full text-xs font-medium rounded-lg border border-slate-200 py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={createAssignedTo}
              onChange={(e) => setCreateAssignedTo(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">-- Chưa phân công --</option>
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.fullName} ({emp.position || 'Nhân viên'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú yêu cầu</label>
            <textarea
              rows={3}
              className="w-full text-xs font-medium rounded-lg border border-slate-200 py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Nhập ghi chú yêu cầu cụ thể (thay ga trải giường, dọn gấp trước 14h...)"
              value={createNote}
              onChange={(e) => setCreateNote(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Modal Phân công nhân sự */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Phân Công Dọn Phòng ${selectedTask?.roomNumber ? `(Phòng ${selectedTask.roomNumber})` : ''}`}
        maxWidth="440px"
        onSubmit={handleAssignSubmit}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" isLoading={actionLoading}>
              Lưu phân công
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chọn nhân viên phụ trách <span className="text-rose-500">*</span>
            </label>
            <select
              className="w-full text-xs font-medium rounded-lg border border-slate-200 py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={assignEmployeeId}
              onChange={(e) => setAssignEmployeeId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">-- Chọn nhân viên buồng phòng --</option>
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.fullName} - {emp.position || 'Nhân viên'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Modal Xem chi tiết công việc buồng phòng */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Chi Tiết Công Việc #${detailTask?.taskId || ''}`}
        subtitle={
          detailTask
            ? `Phòng ${detailTask.roomNumber} • ${detailTask.roomTypeName} (Tầng ${detailTask.floorNo})`
            : undefined
        }
        icon={<Eye size={20} className="text-amber-600" />}
        maxWidth="620px"
        footer={
          detailTask ? (
            <div className="flex items-center justify-between w-full">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Đóng
              </Button>

              <div className="flex items-center gap-2">
                {canAssign && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      openAssignModal(detailTask);
                    }}
                    leftIcon={<UserPlus size={14} className="text-blue-600" />}
                  >
                    {detailTask.assignedTo ? 'Đổi nhân sự' : 'Phân công'}
                  </Button>
                )}

                {detailTask.status === 'PENDING' && canWorkOnTask(detailTask) && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={async () => {
                      setIsDetailModalOpen(false);
                      await handleStartTask(detailTask.taskId);
                    }}
                    leftIcon={<Play size={14} />}
                  >
                    Bắt đầu dọn phòng
                  </Button>
                )}

                {detailTask.status === 'IN_PROGRESS' && canWorkOnTask(detailTask) && (
                  <Button
                    type="button"
                    variant="primary"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    onClick={async () => {
                      setIsDetailModalOpen(false);
                      await handleCompleteTask(detailTask.taskId);
                    }}
                    leftIcon={<CheckCircle2 size={14} />}
                  >
                    Hoàn tất công việc
                  </Button>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        {detailTask && (
          <div className="space-y-4">
            {/* 1. Header Badges Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Trạng thái việc
                </div>
                <div>{getTaskStatusBadge(detailTask.status)}</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Loại công việc
                </div>
                <div>{getTaskTypeBadge(detailTask.taskType)}</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Vệ sinh phòng
                </div>
                <div>{getRoomHKBadge(detailTask.roomHousekeepingStatus)}</div>
              </div>
            </div>

            {/* 2. Room & Staff Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Box Phòng */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                  <Building2 size={15} className="text-amber-600" />
                  <span>Thông tin buồng phòng</span>
                </div>
                <div className="text-xs space-y-1.5 pt-1 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Số phòng:</span>
                    <span className="font-bold text-slate-900">Phòng {detailTask.roomNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vị trí:</span>
                    <span className="font-semibold text-slate-800">Tầng {detailTask.floorNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hạng phòng:</span>
                    <span className="font-semibold text-slate-800">{detailTask.roomTypeName}</span>
                  </div>
                </div>
              </div>

              {/* Box Nhân sự */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                  <User size={15} className="text-blue-600" />
                  <span>Nhân sự phụ trách</span>
                </div>
                <div className="text-xs space-y-1.5 pt-1 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Họ và tên:</span>
                    <span className="font-bold text-slate-900">
                      {detailTask.assignedEmployeeName || 'Chưa phân công'}
                    </span>
                  </div>
                  {detailTask.assignedTo && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mã nhân sự:</span>
                      <span className="font-semibold text-slate-800">#{detailTask.assignedTo}</span>
                    </div>
                  )}
                  {(() => {
                    const staff = employees.find((e) => e.employeeId === detailTask.assignedTo);
                    if (!staff) return null;
                    return (
                      <>
                        {staff.position && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Chức vụ:</span>
                            <span className="font-medium text-slate-700">{staff.position}</span>
                          </div>
                        )}
                        {staff.phone && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Số điện thoại:</span>
                            <span className="font-medium text-slate-700">{staff.phone}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* 3. Ghi chú & Yêu cầu công việc (Nổi bật) */}
            <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <FileText size={15} className="text-amber-700" />
                <span>Ghi chú công việc & Yêu cầu dọn dẹp</span>
              </div>
              <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed pl-5">
                {detailTask.note && detailTask.note.trim() ? (
                  detailTask.note
                ) : (
                  <span className="text-slate-400 italic">Không có ghi chú thêm cho công việc này.</span>
                )}
              </div>
            </div>

            {/* 4. Tiến trình & Mốc thời gian */}
            <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Clock size={15} className="text-slate-600" />
                <span>Tiến trình thời gian</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                <div>
                  <span className="text-slate-500">Khởi tạo: </span>
                  <span className="font-medium text-slate-800">
                    {new Date(detailTask.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Bắt đầu dọn: </span>
                  <span className="font-medium text-slate-800">
                    {detailTask.startedAt
                      ? new Date(detailTask.startedAt).toLocaleString('vi-VN')
                      : 'Chưa bắt đầu'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Hoàn tất: </span>
                  <span className="font-medium text-slate-800">
                    {detailTask.finishedAt
                      ? new Date(detailTask.finishedAt).toLocaleString('vi-VN')
                      : 'Chưa hoàn tất'}
                  </span>
                </div>
                {detailTask.startedAt && (
                  <div>
                    <span className="text-slate-500">Thời gian dọn: </span>
                    <span className="font-bold text-emerald-700">
                      {formatDuration(detailTask.startedAt, detailTask.finishedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
