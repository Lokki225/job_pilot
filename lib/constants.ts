export interface Profile {
    id: string;
    firstName: string;
    lastName: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    bio: string;
    website: string;
    linkedinUrl: string;
    githubUrl: string;
    avatarUrl: string;
    resumeUrl: string;
    languages: string[];
    completionScore: number;
    createdAt: string;
    updatedAt: string;
}

export interface ResumePreviewModalProps {
  isPreviewOpen: boolean;
  setIsPreviewOpen: (value: boolean) => void;
  experiences: any[];
  education: any[];
  skills: any[];
  certifications: any[];
  languages: any[];
  profile: any;
  formatDate: (dateString: string) => string;
}

export interface FormData {
  // Profile
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  title: string;
  bio: string;
  website: string;
  linkedinUrl: string;
  githubUrl: string;
  twitterUrl: string;
  languages: string[];
  
  // Job Preferences
  jobTitles: string[];
  keywords: string[];
  jobTypes: string[];
  remoteOptions: string[];
  industries: string[];
  companySize: string[];
  excludeCompanies: string[];
  experienceLevel: string;
  yearsExperience: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  preferredLocations: string[];
  skills: string[];
  autoSearch: boolean;
  notifyOnMatch: boolean;
  searchFrequency: string;
  
  // Notifications
  emailNotifications: boolean;
  jobAlerts: boolean;
  weeklyDigest: boolean;
  applicationUpdates: boolean;
  similarJobs: boolean;
  
  // Privacy
  profileVisibility: string;
  showSalary: boolean;
  showContact: boolean;
}

export type NotificationItem = {
  key: keyof FormData;
  label: string;
  description: string;
};