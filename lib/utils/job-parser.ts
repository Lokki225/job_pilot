export interface ParsedJob {
  jobTitle: string;
  company: string;
  location: string | null;
  jobType: string | null;
  salary: string | null;
  description: string | null;
  requirements: string | null;
  jobPostUrl: string | null;
  source: string;
  isPasted: boolean;
}

/**
 * Main function to parse job posting text
 * Supports LinkedIn, Indeed, and generic job postings
 */
export function parseJobPosting(text: string): ParsedJob {
  const cleanText = text.trim();
  
  return {
    jobTitle: extractJobTitle(cleanText),
    company: extractCompany(cleanText),
    location: extractLocation(cleanText),
    jobType: extractJobType(cleanText),
    salary: extractSalary(cleanText),
    description: extractDescription(cleanText),
    requirements: extractRequirements(cleanText),
    jobPostUrl: extractUrl(cleanText),
    source: 'PASTED',
    isPasted: true,
  };
}

/**
 * Extract job title from text
 * Looks for patterns like:
 * - "Développeur Full Stack Windev"
 * - "Job Title: Software Engineer"
 * - First line if it looks like a title
 */
export function extractJobTitle(text: string): string {
  // LinkedIn pattern: Title appears early, often repeated
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Remove common noise words
  const noiseWords = ['Partager', 'Voir plus', 'Candidature', 'EnregistrerEnregistrer', 'Message', 'Promue'];
  const cleanLines = lines.filter(line => 
    !noiseWords.some(noise => line.includes(noise)) &&
    line.length > 5 &&
    line.length < 100 &&
    !line.includes('candidats') &&
    !line.includes('il y a') &&
    !line.includes('·')
  );
  
  // Look for "Poste:" or "Title:" patterns
  const titlePatterns = [
    /(?:poste|title|job title|position)\s*:?\s*(.+)/i,
    /^([A-Z][a-zé]+(?:\s+[A-Z][a-zé]+)*(?:\s+[A-Z][a-z]+)*)$/m, // Capitalized words
  ];
  
  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Fallback: Use first clean line that looks like a title
  if (cleanLines.length > 0) {
    return cleanLines[0];
  }
  
  return 'Untitled Position';
}

/**
 * Extract company name from text
 * Looks for patterns like:
 * - "CashDev Africa"
 * - "Company: Acme Corp"
 * - "chez [Company]"
 */
export function extractCompany(text: string): string {
  // LinkedIn pattern: "chez [Company]" or "[Company] ·"
  const chezPattern = /chez\s+([A-Z][^\n·]+?)(?:\s*·|\s*\n)/i;
  const chezMatch = text.match(chezPattern);
  if (chezMatch && chezMatch[1]) {
    return chezMatch[1].trim();
  }
  
  // Pattern: "Company: [Name]"
  const companyPattern = /(?:company|entreprise|société)\s*:?\s*([A-Z][^\n]+)/i;
  const companyMatch = text.match(companyPattern);
  if (companyMatch && companyMatch[1]) {
    return companyMatch[1].trim();
  }
  
  // Pattern: Look for company name near "À propos" or "About"
  const aboutPattern = /(?:À propos de l'offre|About the company|Infos sur l'entreprise)\s*\n\s*([A-Z][^\n]+)/i;
  const aboutMatch = text.match(aboutPattern);
  if (aboutMatch && aboutMatch[1]) {
    return aboutMatch[1].trim();
  }
  
  // Fallback: Look for capitalized name early in text
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    // Company names are usually capitalized and not too long
    if (/^[A-Z][A-Za-z\s&-]{2,50}$/.test(line) && 
        !line.includes('Développeur') &&
        !line.includes('Engineer') &&
        !line.includes('Manager')) {
      return line;
    }
  }
  
  return 'Unknown Company';
}

/**
 * Extract location from text
 * Looks for patterns like:
 * - "Cocody, Abidjan, Côte d'Ivoire"
 * - "Location: San Francisco, CA"
 * - "Remote" or "Hybride"
 */
export function extractLocation(text: string): string | null {
  // Pattern: City, Region, Country
  const locationPattern = /([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*,\s*[A-ZÀ-Ÿ][a-zà-ÿ]+(?:,\s*[A-ZÀ-Ÿ][a-zà-ÿ\s]+)?)/;
  const locationMatch = text.match(locationPattern);
  if (locationMatch && locationMatch[1]) {
    return locationMatch[1].trim();
  }
  
  // Pattern: "Location:" or "Lieu:"
  const lieuPattern = /(?:location|lieu|localisation)\s*:?\s*([^\n]+)/i;
  const lieuMatch = text.match(lieuPattern);
  if (lieuMatch && lieuMatch[1]) {
    return lieuMatch[1].trim();
  }
  
  // Check for Remote/Hybride
  if (/\b(remote|à distance|télétravail|hybride|hybrid)\b/i.test(text)) {
    const remoteMatch = text.match(/\b(remote|à distance|télétravail|hybride|hybrid)\b/i);
    if (remoteMatch) {
      return remoteMatch[1].charAt(0).toUpperCase() + remoteMatch[1].slice(1);
    }
  }
  
  return null;
}

/**
 * Extract job type from text
 * Looks for: Full-time, Part-time, Contract, Freelance, Internship
 */
export function extractJobType(text: string): string | null {
  const jobTypePatterns = [
    { pattern: /\b(temps plein|full[- ]?time|plein temps)\b/i, type: 'Full-time' },
    { pattern: /\b(temps partiel|part[- ]?time|mi-temps)\b/i, type: 'Part-time' },
    { pattern: /\b(contract|contrat|cdd)\b/i, type: 'Contract' },
    { pattern: /\b(freelance|indépendant|consultant)\b/i, type: 'Freelance' },
    { pattern: /\b(internship|stage|intern)\b/i, type: 'Internship' },
    { pattern: /\b(hybride|hybrid)\b/i, type: 'Hybrid' },
    { pattern: /\b(remote|à distance|télétravail)\b/i, type: 'Remote' },
  ];
  
  for (const { pattern, type } of jobTypePatterns) {
    if (pattern.test(text)) {
      return type;
    }
  }
  
  return null;
}

/**
 * Extract salary information from text
 * Looks for patterns like: $80k-$120k, 50000€/year, etc.
 */
export function extractSalary(text: string): string | null {
  const salaryPatterns = [
    // $80k-$120k or $80,000-$120,000
    /\$\s*(\d{1,3}(?:,?\d{3})*(?:k|K)?)\s*[-–]\s*\$?\s*(\d{1,3}(?:,?\d{3})*(?:k|K)?)/,
    // €50,000 or 50000€
    /(\d{1,3}(?:,?\d{3})*)\s*(?:€|EUR|euros?)/i,
    // 50k-80k
    /(\d{1,3})\s*k?\s*[-–]\s*(\d{1,3})\s*k/i,
    // Salary: 80000
    /(?:salary|salaire|rémunération)\s*:?\s*(\d{1,3}(?:,?\d{3})*)/i,
  ];
  
  for (const pattern of salaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  
  return null;
}

/**
 * Extract job description from text
 * Looks for section starting with "Description" or "About the role"
 */
export function extractDescription(text: string): string | null {
  const descriptionPatterns = [
    /(?:description du poste|job description|about the (?:role|job|position))\s*:?\s*\n\s*([^\n]+(?:\n(?!(?:qualifications|requirements|compétences|skills)).*)*)/i,
    /(?:nous recherchons|we are looking for|we're hiring)\s+([^\n]+(?:\n(?!(?:qualifications|requirements|compétences)).*){0,5})/i,
  ];
  
  for (const pattern of descriptionPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().substring(0, 1000); // Limit length
    }
  }
  
  // Fallback: Look for paragraph after company info
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 50);
  if (lines.length > 0) {
    // Find first substantial paragraph
    for (const line of lines) {
      if (line.length > 100 && !line.includes('candidats') && !line.includes('Premium')) {
        return line.substring(0, 1000);
      }
    }
  }
  
  return null;
}

/**
 * Extract requirements/qualifications from text
 * Looks for section starting with "Requirements", "Qualifications", "Compétences"
 */
export function extractRequirements(text: string): string | null {
  const requirementsPatterns = [
    /(?:qualifications?|requirements?|compétences?|skills?)\s*:?\s*\n\s*([^]+?)(?:\n\n|\n(?:[A-Z][a-z]+\s+[a-z]+|$))/i,
    /(?:vous devez|you (?:must|should)|required)\s*:?\s*([^]+?)(?:\n\n|$)/i,
  ];
  
  for (const pattern of requirementsPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().substring(0, 1000); // Limit length
    }
  }
  
  // Look for bullet points or numbered lists
  const bulletPattern = /(?:[•\-*]|\d+\.)\s+(.+)/g;
  const bullets: string[] = [];
  let match;
  
  while ((match = bulletPattern.exec(text)) !== null) {
    bullets.push(match[1].trim());
    if (bullets.length >= 10) break; // Limit to 10 items
  }
  
  if (bullets.length > 0) {
    return bullets.join('\n');
  }
  
  return null;
}

/**
 * Extract application URL from text
 * Looks for http/https URLs
 */
export function extractUrl(text: string): string | null {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlPattern);
  
  if (matches && matches.length > 0) {
    // Return first URL that looks like a job posting
    for (const url of matches) {
      if (url.includes('linkedin.com/jobs') || 
          url.includes('indeed.com') || 
          url.includes('glassdoor.com') ||
          url.includes('apply') ||
          url.includes('career')) {
        return url;
      }
    }
    // Return first URL as fallback
    return matches[0];
  }
  
  return null;
}

/**
 * Helper function to detect the source platform
 */
export function detectJobSource(text: string): string {
  if (text.includes('linkedin.com') || text.includes('LinkedIn')) {
    return 'LINKEDIN';
  }
  if (text.includes('indeed.com') || text.includes('Indeed')) {
    return 'INDEED';
  }
  if (text.includes('glassdoor.com') || text.includes('Glassdoor')) {
    return 'GLASSDOOR';
  }
  return 'PASTED';
}

/**
 * Validate and clean parsed data
 */
export function validateParsedJob(parsed: ParsedJob): ParsedJob {
  return {
    ...parsed,
    jobTitle: parsed.jobTitle || 'Untitled Position',
    company: parsed.company || 'Unknown Company',
    location: parsed.location || null,
    jobType: parsed.jobType || 'Full-time', // Default to Full-time
    salary: parsed.salary || null,
    description: parsed.description || null,
    requirements: parsed.requirements || null,
    jobPostUrl: parsed.jobPostUrl || null,
    source: detectJobSource(parsed.description || ''),
    isPasted: true,
  };
}