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