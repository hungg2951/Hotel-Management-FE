export type ReportPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

export interface RoomsSummary {
  totalRooms: number;
  availableRooms: number;
  readyRooms?: number;
  occupiedRooms: number;
  maintenanceRooms: number;
  outOfOrderRooms: number;
  cleanRooms: number;
  dirtyRooms: number;
  cleaningRooms: number;
  inspectedRooms: number;
}

export interface OccupancyTimelinePoint {
  label: string;
  date: string;
  occupiedRooms: number;
  occupancyRate: number;
}

export interface OccupancyReport {
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
  date?: string;
  totalRooms: number;
  operationalRooms: number;
  totalRoomNightsAvailable?: number;
  totalRoomNightsOccupied?: number;
  occupiedRooms?: number;
  maintenanceRooms: number;
  outOfOrderRooms: number;
  occupancyRate: number;
  timeline?: OccupancyTimelinePoint[];
}

export interface RevenueTimelinePoint {
  label: string;
  date: string;
  collectedRevenue: number;
  recognizedRevenue: number;
  roomRevenue: number;
  serviceRevenue: number;
}

export interface RevenueReport {
  period?: ReportPeriod;
  startDate?: string;
  endDate?: string;
  date?: string;
  collectedRevenue: number;
  recognizedRevenue: number;
  roomRevenue: number;
  serviceRevenue: number;
  discountTotal: number;
  timeline?: RevenueTimelinePoint[];
}

export interface OperationsSummary {
  todayArrivals: number;
  todayDepartures: number;
  activeStays: number;
  todayCollectedRevenue: number;
  inHouseUnpaidBalance: number;
  pendingArrivals: number;
  pendingDepartures: number;
  readyRooms: number;
  dirtyRooms: number;
}

export interface HousekeeperPerformerStat {
  employeeId: number;
  employeeName: string;
  completedTasks: number;
}

export interface HousekeeperPerformance {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  myAssignedTasks: number;
  myDoneTasks: number;
  myPendingTasks: number;
  myInProgressTasks: number;
  topPerformers: HousekeeperPerformerStat[];
}

export interface FinancialSummary {
  todayRevenue: number;
  monthRevenue: number;
  advanceDepositHeld: number;
  monthRefunded: number;
  inHouseUnpaidFolios: number;
  cancellationFeeCollected: number;
  occupancyRate: number;
  maintenanceRooms: number;
}
