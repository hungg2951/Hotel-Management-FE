import { api } from './api';
import type {
  HousekeepingTask,
  HousekeepingSummary,
  HousekeeperEmployee,
  HousekeepingTaskCreateRequest,
  HousekeepingTaskAssignRequest,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
} from '../types/housekeeping';

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const housekeepingService = {
  getTasks: (params?: {
    status?: HousekeepingTaskStatus;
    taskType?: HousekeepingTaskType;
    roomId?: number;
    assignedTo?: number;
    page?: number;
    size?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.taskType) searchParams.append('taskType', params.taskType);
    if (params?.roomId) searchParams.append('roomId', params.roomId.toString());
    if (params?.assignedTo) searchParams.append('assignedTo', params.assignedTo.toString());
    if (params?.page !== undefined) searchParams.append('page', params.page.toString());
    if (params?.size !== undefined) searchParams.append('size', params.size.toString());

    const queryString = searchParams.toString();
    return api.get<PageResponse<HousekeepingTask>>(`/housekeeping-tasks${queryString ? `?${queryString}` : ''}`);
  },

  getSummary: () => {
    return api.get<HousekeepingSummary>('/housekeeping-tasks/summary');
  },

  getEmployees: () => {
    return api.get<HousekeeperEmployee[]>('/housekeeping-tasks/employees');
  },

  createTask: (data: HousekeepingTaskCreateRequest) => {
    return api.post<HousekeepingTask>('/housekeeping-tasks', data);
  },

  assignTask: (taskId: number, data: HousekeepingTaskAssignRequest) => {
    return api.put<HousekeepingTask>(`/housekeeping-tasks/${taskId}/assign`, data);
  },

  startTask: (taskId: number) => {
    return api.post<HousekeepingTask>(`/housekeeping-tasks/${taskId}/start`, {});
  },

  completeTask: (taskId: number) => {
    return api.post<HousekeepingTask>(`/housekeeping-tasks/${taskId}/complete`, {});
  },
};
