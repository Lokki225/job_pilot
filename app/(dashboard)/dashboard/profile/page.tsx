// app/(dashboard)/dashboard/profile/page.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { FileText, Briefcase, GraduationCap, Award, Mail, Phone, MapPin, Globe, Linkedin } from 'lucide-react';
import { getCurrentUser } from "@/lib/auth";

import { getProfileDetails, upsertProfile, updateCompletionScore } from "@/lib/actions/profile.action";
import { createSkill, updateSkill, deleteSkill } from "@/lib/actions/skill.action";
import { createExperience, updateExperience, deleteExperience } from "@/lib/actions/experience.action";
import { createCertification, updateCertification, deleteCertification } from "@/lib/actions/certification.action";
import { createEducation, updateEducation, deleteEducation } from "@/lib/actions/education.action";
import { uploadAvatar } from "@/lib/utils/upload";
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { ProfileOverview } from '@/components/profile/ProfileOverview';
import { ResumePreviewModal } from '@/components/shared/ResumePreviewModal';

export default function ProfilePage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Profile data
  const [profile, setProfile] = useState({
    id: '',
    firstName: '',
    lastName: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    website: '',
    linkedin: '',
    github: '',
    avatarUrl: null as string | null,
    resumeUrl: null as string | null,
  });

  const [experiences, setExperiences] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const { user, error: userError } = await getCurrentUser();
        if (!user || userError) {
          router.push('/login');
          return;
        }

        const { data, error } = await getProfileDetails(user.id);
        if (!data || error) {
          setError(error || 'Profile not found');
          return;
        }

        const { profile: p, skills, experiences, educations, certifications } = data as any;

        setProfile(prev => ({
          ...prev,
          id: p.id || '',
          firstName: p.firstName || '',
          lastName: p.lastName || '',
          headline: p.headline || '',
          email: user.email || '',
          phone: p.phone || '',
          location: p.location || '',
          bio: p.bio || '',
          website: p.website || '',
          linkedin: p.linkedinUrl || '',
          github: p.githubUrl || '',
          avatarUrl: p.avatarUrl || null,
          resumeUrl: p.resumeUrl || null,
        }));

        setExperiences(
          (experiences || []).map((exp: any) => ({
            id: exp.id,
            title: exp.title,
            company: exp.company,
            location: exp.location,
            startDate: exp.startDate,
            endDate: exp.endDate,
            current: exp.isCurrent,
            description: exp.description,
          }))
        );

        setEducation(
          (educations || []).map((edu: any) => ({
            id: edu.id,
            degree: edu.degree,
            school: edu.institution,
            field: edu.field,
            startDate: edu.startDate,
            endDate: edu.endDate,
            current: edu.isCurrent,
            description: edu.description,
          }))
        );

        setSkills(
          (skills || []).map((skill: any) => ({
            id: skill.id,
            name: skill.name,
            level: typeof skill.level === 'number' ? skill.level : 3,
            category: skill.category || 'Technical',
          }))
        );

        setCertifications(
          (certifications || []).map((cert: any) => ({
            id: cert.id,
            name: cert.name,
            issuer: cert.issuer,
            issueDate: cert.issueDate,
            expirationDate: cert.expirationDate || null,
            credentialId: cert.credentialId,
            credentialUrl: cert.credentialUrl,
            isExpired: cert.expirationDate ? new Date(cert.expirationDate) < new Date() : false,
          }))
        );

        setLanguages(
          (p.languages || []).map((lang: string, index: number) => ({
            id: index + 1,
            name: lang,
            level: 'Fluent',
          }))
        );

        if (typeof p.completionScore === 'number') {
          setProfileCompletion(p.completionScore);
        }
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (updatedProfile: any) => {
    try {
      setIsSaving(true);
      setError(null);

      // Build payload with only non-empty values
      const payload: any = {};
      
      if (updatedProfile.firstName) payload.firstName = updatedProfile.firstName;
      if (updatedProfile.lastName) payload.lastName = updatedProfile.lastName;
      if (updatedProfile.headline) payload.headline = updatedProfile.headline;
      if (updatedProfile.phone) payload.phone = updatedProfile.phone;
      if (updatedProfile.location) payload.location = updatedProfile.location;
      if (updatedProfile.bio) payload.bio = updatedProfile.bio;
      if (updatedProfile.website) payload.website = updatedProfile.website;
      if (updatedProfile.linkedin) payload.linkedinUrl = updatedProfile.linkedin;
      if (updatedProfile.github) payload.githubUrl = updatedProfile.github;
      if (updatedProfile.avatarUrl) payload.avatarUrl = updatedProfile.avatarUrl;
      if (updatedProfile.resumeUrl) payload.resumeUrl = updatedProfile.resumeUrl;

      const { data, error } = await upsertProfile(payload);
      if (error) {
        setError(error);
        return;
      }

      // Update local state with saved data
      if (data) {
        setProfile(prev => ({
          ...prev,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          headline: data.headline || '',
          phone: data.phone || '',
          location: data.location || '',
          bio: data.bio || '',
          website: data.website || '',
          linkedin: data.linkedinUrl || '',
          github: data.githubUrl || '',
          avatarUrl: data.avatarUrl || null,
          resumeUrl: data.resumeUrl || null,
        }));
      }

      const { data: completionData, error: completionError } = await updateCompletionScore();
      if (!completionError && completionData?.completionScore !== undefined) {
        setProfileCompletion(completionData.completionScore);
      }

      setSuccessMessage('Profile saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditing(false);
    } catch (err) {
      setError('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = (type: string) => {
    // Handle adding new items
    console.log('Add new', type);
  };

  const handleEditItem = (type: string, id: string) => {
    // Handle editing items
    console.log('Edit', type, id);
  };

  const handleDeleteItem = async (type: string, id: string) => {
    try {
      let result;
      
      switch (type) {
        case 'skill':
          result = await deleteSkill(id);
          if (!result.error) {
            setSkills(prev => prev.filter(item => item.id !== id));
            setSuccessMessage('Skill deleted successfully!');
          }
          break;
        case 'experience':
          result = await deleteExperience(id);
          if (!result.error) {
            setExperiences(prev => prev.filter(item => item.id !== id));
            setSuccessMessage('Experience deleted successfully!');
          }
          break;
        case 'education':
          result = await deleteEducation(id);
          if (!result.error) {
            setEducation(prev => prev.filter(item => item.id !== id));
            setSuccessMessage('Education deleted successfully!');
          }
          break;
        case 'certification':
          result = await deleteCertification(id);
          if (!result.error) {
            setCertifications(prev => prev.filter(item => item.id !== id));
            setSuccessMessage('Certification deleted successfully!');
          }
          break;
      }
      
      if (result?.error) {
        setError(result.error);
      } else {
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError('Failed to delete item');
    }
  };

  const handleSaveSkill = async (skill: any) => {
    try {
      if (skill.id.startsWith('skill-')) {
        // New skill
        const { data, error } = await createSkill(profile.id, {
          name: skill.name,
          level: skill.level,
          category: skill.category
        });
        
        if (error) {
          setError(error);
          return;
        }
        
        if (data) {
          setSkills(prev => [...prev, {
            id: data.id,
            name: data.name,
            level: data.level,
            category: data.category
          }]);
        }
      } else {
        // Update existing skill
        const { data, error } = await updateSkill(skill.id, {
          name: skill.name,
          level: skill.level,
          category: skill.category
        });
        
        if (error) {
          setError(error);
          return;
        }
        
        if (data) {
          setSkills(prev => prev.map(s => s.id === skill.id ? {
            id: data.id,
            name: data.name,
            level: data.level,
            category: data.category
          } : s));
        }
      }
    } catch (err) {
      setError('Failed to save skill');
    }
  };

  const handleSaveExperience = async (experience: any) => {
    try {
      if (experience.id.startsWith('exp-')) {
        // New experience
        const { data, error } = await createExperience(profile.id, {
          title: experience.title,
          company: experience.company,
          location: experience.location,
          startDate: experience.startDate,
          endDate: experience.endDate,
          isCurrent: experience.current,
          description: experience.description
        });
        
        if (error) {
          setError(error);
          return;
        }
        
        if (data) {
          setExperiences(prev => [...prev, {
            id: data.id,
            title: data.title,
            company: data.company,
            location: data.location,
            startDate: data.startDate,
            endDate: data.endDate,
            current: data.isCurrent,
            description: data.description
          }]);
        }
      } else {
        // Update existing experience
        const { data, error } = await updateExperience(experience.id, {
          title: experience.title,
          company: experience.company,
          location: experience.location,
          startDate: experience.startDate,
          endDate: experience.endDate,
          isCurrent: experience.current,
          description: experience.description
        });
        
        if (error) {
          setError(error);
          return;
        }
        
        if (data) {
          setExperiences(prev => prev.map(e => e.id === experience.id ? {
            id: data.id,
            title: data.title,
            company: data.company,
            location: data.location,
            startDate: data.startDate,
            endDate: data.endDate,
            current: data.isCurrent,
            description: data.description
          } : e));
        }
      }
    } catch (err) {
      setError('Failed to save experience');
    }
  };

  const handleSaveEducation = async (education: any) => {
    try {
      // Validate required fields
      if (!education.school?.trim() || !education.degree?.trim() || !education.field?.trim() || !education.startDate) {
        setError('Please fill in all required fields (Institution, Degree, Field, Start Date)');
        return;
      }

      const payload = {
        institution: education.school.trim(),
        degree: education.degree.trim(),
        field: education.field.trim(),
        startDate: education.startDate,
        endDate: education.endDate || null,
        isCurrent: education.current || false,
        description: education.description?.trim() || null
      };

      if (education.id.startsWith('edu-')) {
        // New education
        const { data, error } = await createEducation(profile.id, payload);
        
        if (error) {
          setError(error);
          return;
        }
        
        if (data) {
          setEducation(prev => [...prev, {
            id: data.id,
            school: data.institution,
            degree: data.degree,
            field: data.field,
            startDate: data.startDate,
            endDate: data.endDate,
            current: data.isCurrent,
            description: data.description,
            location: ''
          }]);
          setSuccessMessage('Education added successfully!');
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      } else {
        // Update existing education
        const { data, error } = await updateEducation(education.id, payload);
        
        if (error) {
          setError(error);
          return;
        }
        
        if (data) {
          setEducation(prev => prev.map(e => e.id === education.id ? {
            id: data.id,
            school: data.institution,
            degree: data.degree,
            field: data.field,
            startDate: data.startDate,
            endDate: data.endDate,
            current: data.isCurrent,
            description: data.description,
            location: ''
          } : e));
          setSuccessMessage('Education updated successfully!');
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      }
    } catch (err) {
      setError('Failed to save education');
    }
  };

  const handleSaveCertification = async (certification: any) => {
    try {
      if (certification.id.startsWith('cert-')) {
        // New certification
        const { data, error } = await createCertification({
          name: certification.name,
          issuer: certification.issuer,
          issueDate: certification.issueDate,
          expiryDate: certification.expirationDate,
          credentialUrl: certification.credentialUrl
        });
        
        if (error) {
          setError(error);
          return;
        }
        
        if (data) {
          setCertifications(prev => [...prev, {
            id: data.id,
            name: data.name,
            issuer: data.issuer,
            issueDate: data.issueDate,
            expirationDate: data.expiryDate,
            credentialId: '',
            credentialUrl: data.credentialUrl,
            isExpired: false
          }]);
        }
      } else {
        // Update existing certification
        const { data, error } = await updateCertification(certification.id, {
          name: certification.name,
          issuer: certification.issuer,
          issueDate: certification.issueDate,
          expiryDate: certification.expirationDate,
          credentialUrl: certification.credentialUrl
        });
        
        if (error) {
          setError(error);
          return;
        }
        
        if (data) {
          setCertifications(prev => prev.map(c => c.id === certification.id ? {
            id: data.id,
            name: data.name,
            issuer: data.issuer,
            issueDate: data.issueDate,
            expirationDate: data.expiryDate,
            credentialId: '',
            credentialUrl: data.credentialUrl,
            isExpired: false
          } : c));
        }
      }
    } catch (err) {
      setError('Failed to save certification');
    }
  };

  const handlePreview = () => {
    setIsPreviewOpen(true);
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      setIsUploadingAvatar(true);
      setError(null);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      const { user } = await getCurrentUser();
      if (!user) {
        setError('Unauthorized');
        return;
      }

      // Upload avatar
      const { data, error: uploadError } = await uploadAvatar(file, user.id);
      if (uploadError) {
        setError(uploadError);
        return;
      }

      if (data?.url) {
        // Update profile with new avatar URL
        const { error: updateError } = await upsertProfile({
          avatarUrl: data.url
        });

        if (updateError) {
          setError(updateError);
          return;
        }

        // Update local state
        setProfile(prev => ({
          ...prev,
          avatarUrl: data.url
        }));

        setSuccessMessage('Avatar updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError('Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return 'Present';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="h-8 w-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 px-6 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 shadow-lg flex items-center gap-2 animate-in slide-in-from-top">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Header */}
      <ProfileHeader
        profile={profile}
        isEditing={isEditing}
        isSaving={isSaving || isUploadingAvatar}
        onEditToggle={() => setIsEditing(!isEditing)}
        onSave={() => handleSaveProfile(profile)}
        onInputChange={(e) => onInputChange(e)}
        onPreview={handlePreview}
        onAvatarUpload={handleAvatarUpload}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Tabs + Main Sections */}
          <div className="lg:col-span-2 space-y-6">
            <ProfileTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabs={[
                { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
                { id: 'experience', label: 'Experience', icon: <Briefcase className="w-4 h-4" /> },
                { id: 'education', label: 'Education', icon: <GraduationCap className="w-4 h-4" /> },
                { id: 'skills', label: 'Skills', icon: <Award className="w-4 h-4" /> },
              ]}
            />

            <ProfileOverview
              activeTab={activeTab}
              profile={profile}
              experiences={experiences}
              education={education}
              skills={skills}
              certifications={certifications}
              isEditing={isEditing}
              onAddItem={handleAddItem}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              onInputChange={(e) => onInputChange(e)}
              onSave={() => handleSaveProfile(profile)}
              onCancel={() => setIsEditing(false)}
              onSaveSkill={handleSaveSkill}
              onSaveExperience={handleSaveExperience}
              onSaveEducation={handleSaveEducation}
              onSaveCertification={handleSaveCertification}
            />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Contact Information</h3>
              <div className="space-y-3 text-sm">
                {profile.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{profile.email}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{profile.phone}</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{profile.location}</span>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{profile.website}</span>
                  </div>
                )}
                {profile.linkedin && (
                  <div className="flex items-center gap-3">
                    <Linkedin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{profile.linkedin}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Languages */}
            {languages.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Languages</h3>
                <div className="space-y-3 text-sm">
                  {languages.map((lang: any) => (
                    <div key={lang.id} className="flex justify-between items-center">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{lang.name}</span>
                      <span className="text-gray-500 dark:text-gray-400">{lang.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {certifications.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Certifications</h3>
                <div className="space-y-4">
                  {certifications.map((cert: any) => (
                    <div key={cert.id} className="border-l-2 border-indigo-600 dark:border-indigo-400 pl-3">
                      <p className="font-semibold text-gray-800 dark:text-white text-sm">{cert.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{cert.issuer}</p>
                      {cert.issueDate && (
                        <p className="text-xs text-gray-500 mt-1">{formatDate(cert.issueDate)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Strength */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-md p-6 text-white">
              <h3 className="text-lg font-bold mb-2">Profile Strength</h3>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Completion</span>
                  <span className="font-bold">{profileCompletion}%</span>
                </div>
                <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: `${Math.min(Math.max(profileCompletion, 0), 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-indigo-100">
                Great job! Complete your profile to unlock all features.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Resume Preview Modal */}
      <ResumePreviewModal
        isPreviewOpen={isPreviewOpen}
        setIsPreviewOpen={() => setIsPreviewOpen(false)}
        profile={profile}
        certifications={certifications}
        languages={languages}
        experiences={experiences}
        education={education}
        skills={skills}
        formatDate={formatDate}
      />
    </div>
  );
}