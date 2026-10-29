export type HousekeepingTaskType = 'CLEANING' | 'TURNDOWN' | 'INSPECTION' | 'DEEP_CLEAN';

export type HousekeepingTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export type HousekeepingStatus = 'CLEAN' | 'DIRTY' | 'CLEANING' | 'INSPECTED';

export interface HousekeepingTask {
  taskId: number;
  roomId: number;
  roomNumber: string;
  floorNo: number;
  roomTypeName: string;
  roomHousekeepingStatus: HousekeepingStatus;
  assignedTo?: number | null;
  assignedEmployeeName?: string | null;
  taskType: HousekeepingTaskType;
  status: HousekeepingTaskStatus;
  note?: string;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface HousekeepingSummary {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  dirtyRooms: number;
  cleanRooms: number;
  cleaningRooms: number;
  inspectedRooms: number;
}

export interface HousekeeperEmployee {
  employeeId: number;
  fullName: string;
  phone?: string;
  position?: string;
}

export interface HousekeepingTaskCreateRequest {
  roomId: number;
  taskType?: HousekeepingTaskType;
  assignedTo?: number;
  note?: string;
}

export interface HousekeepingTaskAssignRequest {
  assignedTo: number;
}
