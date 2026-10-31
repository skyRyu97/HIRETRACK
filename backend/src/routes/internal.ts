import { Router, Request, Response } from 'express';
import { Application } from '../models/Application';
import { User } from '../models/User';
import { sendEmail } from '../services/mailer';

const router = Router();

// POST /api/internal/reminders - Cron webhook to trigger follow-up reminder emails
router.post('/reminders', async (req: Request, res: Response): Promise<void> => {
  try {
    const cronSecretHeader = req.headers['x-cron-secret'];
    const expectedSecret = process.env.CRON_SECRET || 'dev_cron_secret_12345';

    if (!cronSecretHeader || cronSecretHeader !== expectedSecret) {
      res.status(401).json({ error: 'Unauthorized: Invalid or missing cron secret' });
      return;
    }

    const now = new Date();

    // Find pending applications that need follow-up
    const dueApplications = await Application.find({
      followUpAt: { $ne: null, $lte: now },
      status: { $in: ['applied', 'oa', 'interview'] },
    }).lean();

    if (dueApplications.length === 0) {
      res.status(200).json({
        message: 'No pending reminders due at this time.',
        processedCount: 0,
      });
      return;
    }

    // Group due applications by userId
    const userAppsMap: Record<string, typeof dueApplications> = {};
    dueApplications.forEach((app) => {
      const uId = String(app.userId);
      if (!userAppsMap[uId]) userAppsMap[uId] = [];
      userAppsMap[uId].push(app);
    });

    let sentEmailsCount = 0;

    for (const [userId, apps] of Object.entries(userAppsMap)) {
      const user = await User.findById(userId).lean();
      if (!user || !user.email) continue;

      const itemsHtml = apps
        .map(
          (a) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 8px; font-weight: 600; color: #1e293b;">${a.company}</td>
            <td style="padding: 12px 8px; color: #475569;">${a.role}</td>
            <td style="padding: 12px 8px; text-transform: uppercase; font-size: 11px; font-weight: 700; color: #2563eb;">${a.status}</td>
            <td style="padding: 12px 8px; color: #64748b; font-size: 12px;">${a.notes ? a.notes.slice(0, 100) : 'None'}</td>
          </tr>`
        )
        .join('');

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">🎯 HireTrack AI: Follow-up Digest</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">
            Hi ${user.name}, you have <strong>${apps.length} job application(s)</strong> flagged for follow-up today. Reaching out proactively increases your interview conversion rate!
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left;">
                <th style="padding: 8px;">Company</th>
                <th style="padding: 8px;">Role</th>
                <th style="padding: 8px;">Stage</th>
                <th style="padding: 8px;">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <p style="margin-top: 24px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/board" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 600;">Open HireTrack Pipeline →</a>
          </p>
        </div>
      `;

      await sendEmail({
        to: user.email,
        subject: `⏰ [HireTrack AI] Follow-up reminder: ${apps.length} applications pending action`,
        html: emailHtml,
      });

      sentEmailsCount++;
    }

    res.status(200).json({
      message: `Processed ${dueApplications.length} reminders across ${sentEmailsCount} user digest(s).`,
      processedCount: dueApplications.length,
      emailsDispatched: sentEmailsCount,
    });
  } catch (err: any) {
    console.error('Reminder cron processing error:', err);
    res.status(500).json({ error: 'Failed to process reminders' });
  }
});

export default router;
