export interface DashboardData {
  summary: {
    totalUsers: number;
    totalSavingsBalance: number;
    pendingTransactionsCount: number;
    activeMissionsCount: number;
  };
  monthlyActivity: {
    newUsersThisMonth: number;
    depositsThisMonth: number;
    rewardsPaidThisMonth: number;
  };
}
