import { api } from './api';
import type {
  RoomsSummary,
  OccupancyReport,
  RevenueReport,
  ReportPeriod,
  OperationsSummary,
  HousekeeperPerformance,
  FinancialSummary,
} from '../types/report';

export interface ReportFilterParams {
  period?: ReportPeriod;
  date?: string;
  startDate?: string;
  endDate?: string;
}

const buildQuery = (params?: ReportFilterParams | string): string => {
  if (!params) return '';
  if (typeof params === 'string') {
    return `?date=${encodeURIComponent(params)}`;
  }
  const searchParams = new URLSearchParams();
  if (params.period) searchParams.append('period', params.period);
  if (params.date) searchParams.append('date', params.date);
  if (params.startDate) searchParams.append('startDate', params.startDate);
  if (params.endDate) searchParams.append('endDate', params.endDate);
  const q = searchParams.toString();
  return q ? `?${q}` : '';
};

export const reportService = {
  getRoomsSummary: () => {
    return api.get<RoomsSummary>('/dashboard/rooms-summary');
  },

  getOccupancy: (params?: ReportFilterParams | string) => {
    return api.get<OccupancyReport>(`/dashboard/occupancy${buildQuery(params)}`);
  },

  getRevenue: (params?: ReportFilterParams | string) => {
    return api.get<RevenueReport>(`/dashboard/revenue${buildQuery(params)}`);
  },

  getOperationsSummary: () => {
    return api.get<OperationsSummary>('/dashboard/operations-summary');
  },

  getHousekeeperPerformance: () => {
    return api.get<HousekeeperPerformance>('/dashboard/housekeeper-summary');
  },

  getFinancialSummary: () => {
    return api.get<FinancialSummary>('/dashboard/financial-summary');
  },
};
