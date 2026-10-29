import { Router, Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { z } from 'zod';
import { Resume } from '../models/Resume';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Protect all resume routes with auth
router.use(requireAuth);

// Configure multer memory storage (no disk writes, secure and ephemeral)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF documents are allowed.'));
    }
  },
});

const rawResumeSchema = z.object({
  label: z.string().min(2, 'Label must be at least 2 characters'),
  text: z.string().min(50, 'Resume text must contain at least 50 characters'),
});

// Auto-seed sample resume for Demo Reviewer
async function seedDemoResumeIfEmpty(userId: string) {
  const count = await Resume.countDocuments({ userId });
  if (count === 0) {
    const demoResumeText = `
GAGANDEEP SINGH DANDIWAL
Chandigarh | gagandeep.apply@gmail.com | (+91) 6284451907
LinkedIn: linkedin.com/in/gagan-dandiwal | GitHub: github.com/skyRyu97

PROFESSIONAL SUMMARY
Full-Stack MERN Developer with hands-on experience building scalable web applications with React.js, Node.js, Express, and MongoDB. Strong foundation in RESTful API design, state management, Docker, and AI-assisted workflows. Available for immediate joining.

TECHNICAL SKILLS
- Languages: JavaScript (ES6+), TypeScript, Java, HTML5, CSS3, SQL
- Frontend: React.js, Redux Toolkit, Tailwind CSS, Vite
- Backend: Node.js, Express.js, REST APIs, JWT Auth, Microservices
- Databases: MongoDB (Mongoose), SQL Server
- DevOps & Tools: Git, GitHub Actions, Docker, Postman, Linux

WORK EXPERIENCE
ALPHA I.T — MERN Stack Developer Intern (Jan 2026 – Jun 2026)
- Developed and maintained responsive full-stack modules using React and Express.js in 2-week Agile sprints.
- Implemented secure JWT authentication and role-based route guards across 20+ client endpoints.
- Optimized MongoDB indexing and aggregation queries, cutting API response latency by 35%.
- Collaborated on code reviews, Git-flow branching, and unit testing workflows.

PROJECTS
1. HireTrack AI — Smart Job Application & Pipeline Tracker
- Architected a full-stack job application tracker with React, TypeScript, Express, and MongoDB Atlas.
- Implemented Kanban drag-and-drop board with optimistic updates and comprehensive status history tracking.
- Secured using in-memory access tokens and httpOnly refresh token rotation to prevent XSS and CSRF attacks.

2. Online Store E-Commerce Platform
- Built responsive full-stack shopping platform with catalog browsing, shopping cart, and order processing.
- Integrated payment gateway in test mode and implemented product filtering and search.

EDUCATION
- B.Tech in Computer Science and Engineering, MRSPTU (2022 – 2026)
- Diploma in Information Technology, Bathinda (2018 – 2021)
    `.trim();

    await Resume.create({
      userId,
      label: 'Fullstack MERN Profile (Default)',
      extractedText: demoResumeText,
      fileName: 'Gagandeep_Dandiwal_Resume.pdf',
      fileSize: 104850,
      wordCount: demoResumeText.split(/\s+/).filter(Boolean).length,
    });
  }
}

// GET /api/resumes - List all user resumes
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    if (req.user!.email.includes('demo')) {
      await seedDemoResumeIfEmpty(userId);
    }

    const resumes = await Resume.find({ userId })
      .select('-extractedText') // Exclude heavy text from list payload
      .sort({ createdAt: -1 });

    res.status(200).json(resumes);
  } catch (err: any) {
    console.error('Fetch resumes error:', err);
    res.status(500).json({ error: 'Failed to retrieve resumes' });
  }
});

// GET /api/resumes/:id - Get single resume with full extracted text
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const resume = await Resume.findOne({ _id: req.params.id, userId });

    if (!resume) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    res.status(200).json(resume);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve resume' });
  }
});

// POST /api/resumes/upload - Upload PDF & parse text
router.post(
  '/upload',
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;

      if (!req.file) {
        res.status(400).json({ error: 'Please select a PDF file to upload' });
        return;
      }

      // Extract text using pdf-parse from memory buffer
      let parsed;
      try {
        const buffer = Buffer.isBuffer(req.file.buffer) ? req.file.buffer : Buffer.from(req.file.buffer);
        parsed = await pdfParse(buffer);
      } catch (parseErr: any) {
        console.error('PDF Parse Error:', parseErr);
        res.status(400).json({
          error: `Could not read PDF. Ensure the file is not password-protected or corrupted.`,
        });
        return;
      }

      const rawText = parsed && parsed.text ? parsed.text.trim() : '';

      // Clean excessive whitespace while preserving line breaks
      const cleanedText = rawText
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (cleanedText.length < 15) {
        res.status(400).json({
          error:
            'This PDF has no readable text stream (common with Canva "PDF Print", image scans, or flattened vector exports). Switch to the "Paste Plain Text" tab to paste your resume text directly.',
        });
        return;
      }

      const label =
        req.body.label && req.body.label.trim()
          ? req.body.label.trim()
          : req.file.originalname.replace(/\.pdf$/i, '');

      const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;

      const resume = new Resume({
        userId,
        label,
        extractedText: cleanedText,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        wordCount,
      });

      await resume.save();

      res.status(201).json({
        _id: resume._id,
        label: resume.label,
        fileName: resume.fileName,
        fileSize: resume.fileSize,
        wordCount: resume.wordCount,
        uploadedAt: resume.uploadedAt,
        extractedText: resume.extractedText,
      });
    } catch (err: any) {
      console.error('Upload resume error:', err);
      res.status(500).json({ error: err.message || 'Failed to upload and parse resume' });
    }
  }
);

// POST /api/resumes/raw - Paste plain text fallback
router.post('/raw', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const parseResult = rawResumeSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { label, text } = parseResult.data;
    const cleanedText = text.trim();
    const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;

    const resume = new Resume({
      userId,
      label,
      extractedText: cleanedText,
      fileName: 'Manual Text Entry',
      wordCount,
    });

    await resume.save();

    res.status(201).json(resume);
  } catch (err: any) {
    console.error('Raw resume creation error:', err);
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

// DELETE /api/resumes/:id - Delete a resume
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const resume = await Resume.findOneAndDelete({ _id: req.params.id, userId });

    if (!resume) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    res.status(200).json({ message: 'Resume deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

export default router;
