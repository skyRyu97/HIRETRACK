import { Router, Response } from 'express';
import { z } from 'zod';
import { Application, APPLICATION_STATUSES, ApplicationStatus } from '../models/Application';
import { MatchResult } from '../models/MatchResult';
import { Resume } from '../models/Resume';
import { User } from '../models/User';
import { analyzeMatch, computeInputHash } from '../services/matcher';
import { extractJobWithAI } from '../services/extractor';
import { requireAuth, AuthenticatedRequest, isDemoUser, requireValidObjectId } from '../middleware/auth';

const router = Router();

// Protect all routes in this router with requireAuth
router.use(requireAuth);

const httpUrlSchema = z
  .string()
  .url('Invalid URL')
  .max(2048, 'URL must not exceed 2,048 characters')
  .refine((u) => /^https?:\/\//i.test(u), 'Job URL must start with http:// or https://')
  .optional()
  .or(z.literal(''));

const applicationInputSchema = z.object({
  company: z.string().trim().min(1, 'Company name is required').max(150, 'Company name must not exceed 150 characters'),
  role: z.string().trim().min(1, 'Role / Title is required').max(150, 'Role must not exceed 150 characters'),
  jobUrl: httpUrlSchema,
  sourcePortal: z.string().max(100).optional(),
  location: z.string().max(150).optional(),
  salary: z.string().max(100).optional(),
  jdText: z.string().max(20000).optional(),
  status: z.enum(APPLICATION_STATUSES as [ApplicationStatus, ...ApplicationStatus[]]).default('wishlist'),
  notes: z.string().max(5000).optional(),
  followUpAt: z.string().datetime().optional().nullable(),
  appliedAt: z.string().datetime().optional().nullable(),
});

const extractJobSchema = z.object({
  rawText: z
    .string()
    .trim()
    .min(15, 'Text content is too short for job extraction (minimum 15 characters)')
    .max(20000, 'Text content must not exceed 20,000 characters'),
  url: httpUrlSchema,
});

function deriveSourcePortal(url?: string): string {
  if (!url) return '';
  try {
    const host = new URL(url).hostname.replace('www.', '').toLowerCase();
    if (host.includes('linkedin.com')) return 'LinkedIn';
    if (host.includes('indeed.')) return 'Indeed';
    if (host.includes('naukri.com')) return 'Naukri';
    if (host.includes('greenhouse.io')) return 'Greenhouse';
    if (host.includes('lever.co')) return 'Lever';
    if (host.includes('myworkdayjobs.com')) return 'Workday';
    if (host.includes('glassdoor.com')) return 'Glassdoor';
    if (host.includes('wellfound.com')) return 'Wellfound';
    return `Company Portal (${host})`;
  } catch {
    return 'Company Portal';
  }
}

const moveInputSchema = z.object({
  status: z.enum(APPLICATION_STATUSES as [ApplicationStatus, ...ApplicationStatus[]]),
  position: z.number(),
});

// Seed data helper for Demo Reviewer
async function seedDemoJobsIfEmpty(userId: string) {
  const count = await Application.countDocuments({ userId });
  if (count === 0) {
    const demoJobs = [
      {
        userId,
        company: 'Razorpay',
        role: 'Frontend Engineer (React/TS)',
        jobUrl: 'https://razorpay.com/jobs/frontend-engineer',
        location: 'Bengaluru / Remote',
        salary: '₹14 - ₹18 LPA',
        status: 'interview',
        position: 1000,
        appliedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        statusHistory: [
          { status: 'applied', at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { status: 'oa', at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
          { status: 'interview', at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        ],
        notes: 'Round 1 Technical scheduled: Live coding with React performance & state management.',
        jdText:
          'Looking for a passionate Frontend Engineer skilled in React, TypeScript, Redux Toolkit, and web performance optimization. Experience building scalable dashboard interfaces and working with REST/GraphQL APIs is required.',
      },
      {
        userId,
        company: 'Swiggy',
        role: 'Full Stack Developer (Node/React)',
        jobUrl: 'https://careers.swiggy.com/job/fullstack',
        location: 'Remote',
        salary: '₹16 - ₹20 LPA',
        status: 'oa',
        position: 1000,
        appliedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        statusHistory: [
          { status: 'applied', at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { status: 'oa', at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        ],
        notes: 'Received HackerEarth assessment link. Need to complete by Sunday.',
        jdText:
          'Responsibilities include designing REST APIs in Node.js/Express, building responsive frontend screens with React & Tailwind, and deploying containerized microservices with Docker.',
      },
      {
        userId,
        company: 'Zomato',
        role: 'Software Development Engineer I',
        jobUrl: 'https://zomato.com/careers',
        location: 'Gurugram / Hybrid',
        salary: '₹12 - ₹15 LPA',
        status: 'applied',
        position: 1000,
        appliedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        statusHistory: [
          { status: 'applied', at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        ],
        notes: 'Applied via referral from college alumnus.',
        jdText:
          'Seeking SDE-1 candidates with strong understanding of JavaScript, React, Node.js, and data structures. Familiarity with MongoDB and Redis caching is a strong plus.',
      },
      {
        userId,
        company: 'CRED',
        role: 'Backend Engineer (Node.js)',
        jobUrl: 'https://cred.club/careers',
        location: 'Bengaluru',
        salary: '₹18 - ₹22 LPA',
        status: 'wishlist',
        position: 1000,
        statusHistory: [{ status: 'wishlist', at: new Date() }],
        notes: 'Targeting referral from senior engineer before submitting application.',
        jdText:
          'Core backend engineering role: architecting distributed systems in Node.js/TypeScript, high-throughput database design, and asynchronous message queue processing.',
      },
      {
        userId,
        company: 'Postman',
        role: 'Associate Software Engineer',
        jobUrl: 'https://postman.com/careers',
        location: 'Bengaluru / Remote',
        salary: '₹15 - ₹18 LPA',
        status: 'offer',
        position: 1000,
        appliedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        statusHistory: [
          { status: 'applied', at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
          { status: 'oa', at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000) },
          { status: 'interview', at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
          { status: 'offer', at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        ],
        notes: 'Offer letter received! Reviewing compensation package.',
        jdText:
          'Build tools loved by 30+ million developers worldwide. Looking for engineers with strong foundations in API architecture, TypeScript, and developer tools.',
      },
    ];

    await Application.insertMany(demoJobs);
  }
}

// GET /api/applications - List all applications for authenticated user
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Check if demo user needs initial seed
    if (isDemoUser(req.user!.email)) {
      await seedDemoJobsIfEmpty(userId);
    }

    const applications = await Application.find({ userId }).sort({
      position: 1,
      createdAt: -1,
    });

    res.status(200).json(applications);
  } catch (err: any) {
    console.error('Fetch applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// POST /api/applications - Create a new job application
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const parseResult = applicationInputSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const data = parseResult.data;

    // Calculate position: place newly added cards at the top of the column
    const lowestInCol = await Application.findOne({
      userId,
      status: data.status,
    })
      .sort({ position: 1 })
      .select('position');

    const position = lowestInCol ? lowestInCol.position - 1000 : 1000;

    const application = new Application({
      userId,
      company: data.company,
      role: data.role,
      jobUrl: data.jobUrl || undefined,
      sourcePortal: data.sourcePortal || deriveSourcePortal(data.jobUrl) || undefined,
      location: data.location || undefined,
      salary: data.salary || undefined,
      jdText: data.jdText || undefined,
      status: data.status,
      position,
      notes: data.notes || undefined,
      followUpAt: data.followUpAt ? new Date(data.followUpAt) : undefined,
      appliedAt:
        data.status === 'applied'
          ? new Date()
          : data.appliedAt
          ? new Date(data.appliedAt)
          : undefined,
      statusHistory: [{ status: data.status, at: new Date() }],
    });

    await application.save();
    res.status(201).json(application);
  } catch (err: any) {
    console.error('Create application error:', err);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// GET /api/applications/:id - Get specific job details
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!requireValidObjectId(req.params.id, res, 'application ID')) return;
    const userId = req.user!.userId;
    const application = await Application.findOne({
      _id: req.params.id,
      userId, // IDOR Prevention: strictly scoped to current user
    });

    if (!application) {
      res.status(404).json({ error: 'Job application not found' });
      return;
    }

    res.status(200).json(application);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// PUT /api/applications/:id - Update job application
router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!requireValidObjectId(req.params.id, res, 'application ID')) return;
    const userId = req.user!.userId;
    const parseResult = applicationInputSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const application = await Application.findOne({
      _id: req.params.id,
      userId,
    });

    if (!application) {
      res.status(404).json({ error: 'Job application not found' });
      return;
    }

    const data = parseResult.data;

    // Check if status changed to log to history
    if (data.status !== application.status) {
      application.statusHistory.push({ status: data.status, at: new Date() });
      if (data.status === 'applied' && !application.appliedAt) {
        application.appliedAt = new Date();
      }
    }

    application.company = data.company;
    application.role = data.role;
    application.jobUrl = data.jobUrl || undefined;
    application.sourcePortal = data.sourcePortal || (data.jobUrl ? deriveSourcePortal(data.jobUrl) : undefined);
    application.location = data.location || undefined;
    application.salary = data.salary || undefined;
    application.jdText = data.jdText || undefined;
    application.status = data.status;
    application.notes = data.notes || undefined;
    application.followUpAt = data.followUpAt ? new Date(data.followUpAt) : undefined;
    if (data.appliedAt) {
      application.appliedAt = new Date(data.appliedAt);
    }

    await application.save();
    res.status(200).json(application);
  } catch (err: any) {
    console.error('Update application error:', err);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// PATCH /api/applications/:id/move - Move card between columns or reorder (Drag-and-Drop)
router.patch('/:id/move', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!requireValidObjectId(req.params.id, res, 'application ID')) return;
    const userId = req.user!.userId;
    const parseResult = moveInputSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { status, position } = parseResult.data;

    const application = await Application.findOne({
      _id: req.params.id,
      userId,
    });

    if (!application) {
      res.status(404).json({ error: 'Job application not found' });
      return;
    }

    // Record transition in history if status changed
    if (application.status !== status) {
      application.statusHistory.push({ status, at: new Date() });
      if (status === 'applied' && !application.appliedAt) {
        application.appliedAt = new Date();
      }
      application.status = status;
    }

    application.position = position;
    await application.save();

    res.status(200).json(application);
  } catch (err: any) {
    console.error('Move application error:', err);
    res.status(500).json({ error: 'Failed to move application' });
  }
});

// DELETE /api/applications/:id - Delete job application
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!requireValidObjectId(req.params.id, res, 'application ID')) return;
    const userId = req.user!.userId;
    const application = await Application.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!application) {
      res.status(404).json({ error: 'Job application not found' });
      return;
    }

    // Cascade delete associated match results
    await MatchResult.deleteMany({ applicationId: req.params.id, userId });

    res.status(200).json({ message: 'Application deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// Shared atomic daily AI quota gate for both match analysis and AI job extraction
async function consumeAiQuota(userId: string, res: Response): Promise<boolean> {
  const DAILY_LIMIT = 10;
  const todayString = new Date().toISOString().split('T')[0];

  // Atomic check-and-increment prevents parallel bursts from bypassing DAILY_LIMIT
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: userId,
      $or: [
        { lastAiCallDate: { $ne: todayString } },
        { lastAiCallDate: todayString, aiCallsToday: { $lt: DAILY_LIMIT } },
      ],
    },
    [
      {
        $set: {
          aiCallsToday: {
            $cond: [{ $eq: ['$lastAiCallDate', todayString] }, { $add: ['$aiCallsToday', 1] }, 1],
          },
          lastAiCallDate: todayString,
        },
      },
    ],
    { new: true }
  );

  if (!updatedUser) {
    const exists = await User.exists({ _id: userId });
    if (!exists) {
      res.status(404).json({ error: 'User not found' });
      return false;
    }
    res.status(429).json({
      error: `Daily AI quota reached (${DAILY_LIMIT} analyses/day). Quota resets tomorrow.`,
    });
    return false;
  }

  return true;
}

// POST /api/applications/:id/match - Run or fetch cached AI match
router.post('/:id/match', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!requireValidObjectId(req.params.id, res, 'application ID')) return;
    const userId = req.user!.userId;
    const applicationId = req.params.id;
    const { resumeId, forceRefresh } = req.body;
    if (resumeId !== undefined && resumeId !== '' && !requireValidObjectId(String(resumeId), res, 'resume ID')) {
      return;
    }

    // 1. Fetch application and ensure JD is present
    const application = await Application.findOne({ _id: applicationId, userId });
    if (!application) {
      res.status(404).json({ error: 'Job application not found' });
      return;
    }

    if (!application.jdText || application.jdText.trim().length < 10) {
      res.status(400).json({
        error: 'Job description is too short (minimum 10 characters). Please paste a valid job description.',
      });
      return;
    }

    // 2. Fetch target resume or pick latest
    let resume;
    if (resumeId) {
      resume = await Resume.findOne({ _id: resumeId, userId });
    } else {
      resume = await Resume.findOne({ userId }).sort({ createdAt: -1 });
    }

    if (!resume) {
      res.status(400).json({
        error: 'No resume found in your vault. Please upload a resume in the Resume Vault first.',
      });
      return;
    }

    // 3. Compute hash for cache lookup
    const inputHash = computeInputHash(resume.extractedText, application.jdText);

    // 4. Cache check (skipped if forceRefresh is true)
    if (!forceRefresh) {
      const existingMatch = await MatchResult.findOne({ userId, inputHash });
      if (existingMatch) {
        res.status(200).json({
          ...existingMatch.toObject(),
          cached: true,
        });
        return;
      }
    } else {
      // Clean up previous cached entry for this inputHash so fresh data takes over
      await MatchResult.deleteMany({ userId, inputHash });
    }

    // 5. Daily quota check & usage increment
    if (!(await consumeAiQuota(userId, res))) {
      return;
    }

    // 6. Execute AI analysis
    const analysis = await analyzeMatch(resume.extractedText, application.jdText);

    // 8. Persist match result
    const matchRecord = new MatchResult({
      userId,
      applicationId: application._id,
      resumeId: resume._id,
      inputHash,
      score: analysis.score,
      summary: analysis.summary,
      matchedSkills: analysis.matchedSkills,
      missingSkills: analysis.missingSkills,
      suggestions: analysis.suggestions,
      modelUsed: analysis.modelUsed || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
    });

    await matchRecord.save();

    res.status(200).json({
      ...matchRecord.toObject(),
      cached: false,
    });
  } catch (err: any) {
    console.error('Match execution error:', err);
    res.status(500).json({ error: 'Failed to complete AI match analysis' });
  }
});

// GET /api/applications/:id/matches - List past matches for this job
router.get('/:id/matches', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!requireValidObjectId(req.params.id, res, 'application ID')) return;
    const userId = req.user!.userId;
    const applicationId = req.params.id;

    const matches = await MatchResult.find({ userId, applicationId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json(matches);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve match history' });
  }
});

// POST /api/applications/extract-job - Universal AI Fallback Extractor (Gemini Flash)
router.post('/extract-job', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parseResult = extractJobSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { rawText, url } = parseResult.data;

    if (!(await consumeAiQuota(req.user!.userId, res))) {
      return;
    }

    const extracted = await extractJobWithAI(rawText, url || undefined);
    res.status(200).json(extracted);
  } catch (err: any) {
    console.error('Job extraction error:', err);
    res.status(500).json({ error: 'Failed to extract job details' });
  }
});

export default router;
