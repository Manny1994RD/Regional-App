export interface Branch {
  id: string;
  name: string;
  color: string;
  total: number;
  goal: number; // per-branch goal
}

export interface Entry {
  id: string;
  timestamp: number;
  amount: number;
  note?: string;
  allocations: Array<{
    branchId: string;
    amount: number;
  }>;
  submittedBy: UserRole | 'public';
  clientKey: string;
  syncStatus?: 'pending' | 'synced' | 'failed';
  isDeleted?: boolean;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  branchId?: string;
  earnedAt: number;
}

export type UserRole = 'public' | 'leader' | 'admin';
export type TimeGranularity = 'day' | 'week' | 'month' | 'total';

export interface ReportData {
  period: string;
  branch: string;
  amount: number;
  percentage: number;
}

export interface PinConfig {
  branchPins: Record<string, string>;
  adminPin: string;
}

export interface AppState {
  version: number;
  branches: Branch[];
  entries: Entry[];
  badges: Badge[];
  regionalGoal: number;
  offlineQueue: Entry[];
  lastSync: number;
}
