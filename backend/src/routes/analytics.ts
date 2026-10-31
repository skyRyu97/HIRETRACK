import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Application, APPLICATION_STATUSES } from '../models/Application';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/analytics/summary - Aggregated metrics and velocity
router.get('/summary', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1. Stage counts & totals
    const statusCountsAgg = await Application.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusCounts: Record<string, number> = {};
    APPLICATION_STATUSES.forEach((st) => {
      statusCounts[st] = 0;
    });
    let totalApplications = 0;

    statusCountsAgg.forEach((item) => {
      if (item._id && statusCounts[item._id] !== undefined) {
        statusCounts[item._id] = item.count;
      }
      totalApplications += item.count;
    });

    const activeInterviews = statusCounts['interview'] || 0;
    const totalOffers = statusCounts['offer'] || 0;
    const totalAppliedOrBeyond =
      (statusCounts['applied'] || 0) +
      (statusCounts['oa'] || 0) +
      (statusCounts['interview'] || 0) +
      (statusCounts['offer'] || 0) +
      (statusCounts['rejected'] || 0);

    // Conversion rate: applications that reached Interview or Offer divided by total applied
    const interviewsAndOffers = activeInterviews + totalOffers;
    const interviewConversionRate =
      totalAppliedOrBeyond > 0
        ? Math.round((interviewsAndOffers / totalAppliedOrBeyond) * 100)
        : 0;

    // 2. Velocity: applications created in the last 8 weeks
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const velocityAgg = await Application.aggregate([
      {
        $match: {
          userId: userObjectId,
          createdAt: { $gte: eightWeeksAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $isoWeekYear: '$createdAt' },
            week: { $isoWeek: '$createdAt' },
          },
          count: { $sum: 1 },
          firstDate: { $min: '$createdAt' },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ]);

    // Build continuous 8-week series
    const weeklyVelocity: { weekLabel: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const weekNum = getIsoWeek(d);
      const yearNum = d.getFullYear();
      const label = `Wk ${weekNum}`;

      const matched = velocityAgg.find(
        (v) => v._id.week === weekNum && v._id.year === yearNum
      );

      weeklyVelocity.push({
        weekLabel: label,
        count: matched ? matched.count : 0,
      });
    }

    // 3. Stage Turnaround (Average days spent in each stage)
    const applications = await Application.find(
      { userId },
      { statusHistory: 1, status: 1, createdAt: 1 }
    ).lean();

    const stageDurations: Record<string, number[]> = {
      wishlist: [],
      applied: [],
      oa: [],
      interview: [],
    };

    applications.forEach((app) => {
      const history = app.statusHistory || [];
      for (let i = 0; i < history.length; i++) {
        const cur = history[i];
        const next = history[i + 1];
        const startTime = new Date(cur.at).getTime();
        const endTime = next ? new Date(next.at).getTime() : Date.now();
        const days = Math.max(0, Math.round((endTime - startTime) / (1000 * 60 * 60 * 24)));

        if (stageDurations[cur.status]) {
          stageDurations[cur.status].push(days);
        }
      }
    });

    const averageDaysPerStage: Record<string, number> = {};
    Object.keys(stageDurations).forEach((stage) => {
      const arr = stageDurations[stage];
      if (arr.length > 0) {
        const avg = arr.reduce((acc, v) => acc + v, 0) / arr.length;
        averageDaysPerStage[stage] = Math.round(avg * 10) / 10;
      } else {
        averageDaysPerStage[stage] = 0;
      }
    });

    res.status(200).json({
      totalApplications,
      activeInterviews,
      totalOffers,
      interviewConversionRate,
      statusCounts,
      weeklyVelocity,
      averageDaysPerStage,
    });
  } catch (err: any) {
    console.error('Analytics summary error:', err);
    res.status(500).json({ error: 'Failed to compute analytics summary' });
  }
});

function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default router;
