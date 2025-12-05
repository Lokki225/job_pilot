import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function transformResumeData(rawData: any) {
  // Extract basic info
  const result: any = {
    firstName: rawData.data.name?.first || '',
    lastName: rawData.data.name?.last || '',
    phone: rawData.data.phoneNumbers?.[0] || null,
    location: rawData.data.location?.formatted || null,
    headline: rawData.data.profession || null,
    bio: rawData.data.summary || null,
  };

  // Extract skills
  if (rawData.data.skills?.length) {
    result.skills = rawData.data.skills
      .filter((skill: any) => skill.name)  // Only include skills with names
      .map((skill: any) => skill.name);
  }

  // Extract experiences
  if (rawData.data.workExperience?.length) {
    result.experiences = rawData.data.workExperience.map((exp: any) => ({
      title: exp.jobTitle || 'Untitled Position',
      company: exp.organization || 'Unknown Company',
      location: exp.location?.formatted || null,
      startDate: exp.dates?.startDate || new Date().toISOString(),
      endDate: exp.dates?.endDate || null,
      isCurrent: exp.isCurrent || false,
      description: exp.jobDescription || null
    }));
  }

  // Extract education
  if (rawData.data.education?.length) {
    result.educations = rawData.data.education.map((edu: any) => ({
      institution: edu.organization || 'Unknown Institution',
      degree: edu.accreditation?.education || 'Unknown Degree',
      field: edu.accreditation?.field || null,
      startDate: edu.dates?.startDate || new Date().toISOString(),
      endDate: edu.dates?.endDate || null,
      isCurrent: edu.isCurrent || false,
      description: edu.major || null
    }));
  }

  // Extract certifications
  if (rawData.data.certifications?.length) {
    result.certifications = rawData.data.certifications.map((cert: any) => ({
      name: cert.name || 'Unnamed Certification',
      issuer: cert.issuer || 'Unknown Issuer',
      issueDate: cert.date || new Date().toISOString(),
      expiryDate: cert.expiryDate || null,
      credentialUrl: cert.url || null
    }));
  }

  // Extract projects (if available in the data)
  if (rawData.data.projects?.length) {
    result.projects = rawData.data.projects.map((proj: any) => ({
      name: proj.name || 'Unnamed Project',
      description: proj.description || null,
      url: proj.url || null,
      startDate: proj.dates?.startDate || new Date().toISOString(),
      endDate: proj.dates?.endDate || null,
      isCurrent: proj.isCurrent || false
    }));
  }

  return result;
}

// Helper function to calculate profile completion percentage
export function calculateCompletionScore(profileData: any): number {
  let score = 0
  const weights = {
    basicInfo: 20,    // firstName, lastName, etc.
    skills: 15,
    experiences: 20,
    education: 15,
    certifications: 10,
    projects: 10,
    bio: 10
  }

  // Check basic info
  if (profileData.firstName && profileData.lastName) score += weights.basicInfo

  // Check skills
  if (profileData.skills?.length > 0) score += weights.skills

  // Check experiences
  if (profileData.experiences?.length > 0) score += weights.experiences

  // Check education
  if (profileData.educations?.length > 0) score += weights.education

  // Check certifications
  if (profileData.certifications?.length > 0) score += Math.min(weights.certifications, profileData.certifications.length * 2)

  // Check projects
  if (profileData.projects?.length > 0) score += Math.min(weights.projects, profileData.projects.length * 2)

  // Check bio
  if (profileData.bio) score += weights.bio

  return Math.min(100, score) // Cap at 100%
}