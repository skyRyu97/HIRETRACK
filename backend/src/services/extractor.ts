export interface ExtractedJob {
  company: string;
  role: string;
  location: string;
  salary: string;
  jdText: string;
  source?: string;
}

function runHeuristicExtraction(rawText: string, url?: string): ExtractedJob {
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  let role = lines[0] || 'Software Engineer';
  let company = lines[1] || 'Company';
  let location = 'Remote / Unspecified';
  let salary = '';

  if (url) {
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      if (company.toLowerCase().includes('indeed') || company.toLowerCase().includes('linkedin')) {
        company = hostname.split('.')[0];
        company = company.charAt(0).toUpperCase() + company.slice(1);
      }
    } catch {
      // ignore
    }
  }

  // Look for compensation keywords
  const salaryLine = lines.find((l) => /[$₹€£]|lpa|per year|per month|\/yr|\/mo/i.test(l));
  if (salaryLine) {
    salary = salaryLine.slice(0, 50);
  }

  const jdText = lines.slice(2).join('\n').slice(0, 15000);

  return {
    company: company.slice(0, 100),
    role: role.slice(0, 100),
    location: location.slice(0, 100),
    salary,
    jdText,
    source: 'heuristic-extractor',
  };
}

export async function extractJobWithAI(rawText: string, url?: string): Promise<ExtractedJob> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    return runHeuristicExtraction(rawText, url);
  }

  const { GoogleGenAI } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  const candidateModels = Array.from(
    new Set([
      process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
    ])
  );

  const prompt = [
    'You are an expert ATS data extraction engine.',
    'Analyze the provided web page text from a job posting or career site.',
    'Extract and return ONLY a valid JSON object matching this schema:',
    '{',
    '  "company": "string (The actual hiring company, NOT the job board or hosting platform like Indeed, LinkedIn, or Greenhouse)",',
    '  "role": "string (Official job title)",',
    '  "location": "string (City, State/Country, or Remote)",',
    '  "salary": "string (Compensation or salary range if specified, otherwise empty string)",',
    '  "jdText": "string (Clean, comprehensive job description, responsibilities, and requirements formatted in readable plain text without form or navigation noise)"',
    '}',
    '',
    'RULES:',
    '1. NEVER output job board or aggregator names (e.g. "Indeed", "LinkedIn", "Naukri", "Glassdoor") as the company unless the job is explicitly for employment at that company.',
    '2. DISCARD all applicant form fields, contact inputs (e.g. First name, Last name, Phone number, Email), login buttons, headers, and footers.',
    '3. If salary is not explicitly stated in the text, return an empty string "".',
    url ? `Page URL: ${url}` : '',
    '',
    `<page_text>\n${rawText.slice(0, 12000)}\n</page_text>`,
  ].join('\n');

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const company = String(parsed.company || '').trim();
      const role = String(parsed.role || '').trim();

      // Ensure we don't accidentally return 'Indeed.com' or 'Indeed'
      const cleanCompany =
        company.toLowerCase() === 'indeed' || company.toLowerCase() === 'indeed.com'
          ? 'Company'
          : company || 'Company';

      return {
        company: cleanCompany,
        role: role || 'Software Engineer',
        location: String(parsed.location || 'Remote / Unspecified').trim(),
        salary: String(parsed.salary || '').trim(),
        jdText: String(parsed.jdText || rawText.slice(0, 5000)).trim(),
        source: modelName,
      };
    } catch (err: any) {
      console.warn(`[AI Extractor] Model ${modelName} failed (${err.message || err}). Trying next candidate...`);
    }
  }

  return runHeuristicExtraction(rawText, url);
}
