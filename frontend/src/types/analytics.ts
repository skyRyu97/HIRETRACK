export interface IWeeklyVelocity {
  weekLabel: string;
  count: number;
}

export interface IAnalyticsSummary {
  totalApplications: number;
  activeInterviews: number;
  totalOffers: number;
  interviewConversionRate: number;
  statusCounts: Record<string, number>;
  weeklyVelocity: IWeeklyVelocity[];
  averageDaysPerStage: Record<string, number>;
}
