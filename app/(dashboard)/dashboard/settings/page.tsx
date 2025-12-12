"use client"

import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, CreditCard, Briefcase, MapPin, DollarSign, Clock, FileText, Sparkles, Check, Upload, Mail, Lock, Globe, Trash2, Download, Eye, EyeOff, LogOut, ChevronRight, Save, Loader2 } from 'lucide-react';
import { FormData } from '@/lib/constants';
import { getProfile, upsertProfile } from '@/lib/actions/profile.action';
import { getJobPreferences, upsertJobPreferences } from '@/lib/actions/job-preferences.action';
import { getCurrentUser } from '@/lib/auth';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { createResume, deleteResume, listResumes } from '@/lib/actions/resume.action';

export default function JobSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [currentResume, setCurrentResume] = useState<{ id: string; fileName: string; fileUrl: string } | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeUploadProgress, setResumeUploadProgress] = useState(0);

  const [formData, setFormData] = useState<FormData>({
    // Profile
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    title: '',
    bio: '',
    
    // Job Preferences
    jobTypes: [],
    experienceLevel: '',
    salaryMin: '',
    salaryMax: '',
    preferredLocations: [],
    skills: [],
    
    // Notifications
    emailNotifications: true,
    jobAlerts: true,
    weeklyDigest: true,
    applicationUpdates: true,
    similarJobs: false,
    
    // Privacy
    profileVisibility: 'public',
    showSalary: false,
    showContact: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load user data on mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const { user, error: userError } = await getCurrentUser();
      if (!user || userError) {
        router.push('/login');
        return;
      }

      const { data: profile } = await getProfile(user.id);
      const { data: preferences } = await getJobPreferences();

      if (profile) {
        setAvatarUrl(profile.avatarUrl || '');
        setFormData(prev => ({
          ...prev,
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          email: user.email || '',
          phone: profile.phone || '',
          location: profile.location || '',
          title: profile.headline || '',
          bio: profile.bio || '',
        }));
      }

      if (preferences) {
        setFormData(prev => ({
          ...prev,
          jobTypes: preferences.workTypes || [],
          experienceLevel: preferences.experienceLevel || '',
          salaryMin: preferences.minSalary?.toString() || '',
          salaryMax: preferences.maxSalary?.toString() || '',
          preferredLocations: preferences.locations || [],
          skills: preferences.skills || [],
        }));
      }

      // Load existing resume
      const { data: resumes } = await listResumes();
      if (resumes && resumes.length > 0) {
        const latestResume = resumes[0];
        setCurrentResume({
          id: latestResume.id,
          fileName: latestResume.fileName,
          fileUrl: latestResume.fileUrl,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field: 'jobTypes' | 'preferredLocations' | 'skills', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? (prev[field] as string[]).filter(v => v !== value)
        : [...(prev[field] as string[]), value]
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error: profileError } = await upsertProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        location: formData.location,
        headline: formData.title,
        bio: formData.bio,
      });
      if (profileError) throw new Error(profileError);

      const { error: prefsError } = await upsertJobPreferences({
        workTypes: formData.jobTypes,
        experienceLevel: formData.experienceLevel || null,
        minSalary: formData.salaryMin ? parseInt(formData.salaryMin) : null,
        maxSalary: formData.salaryMax ? parseInt(formData.salaryMax) : null,
        locations: formData.preferredLocations,
        skills: formData.skills,
        jobTitles: [],
        keywords: [],
        remoteOptions: [],
        industries: [],
        companySize: [],
        excludeCompanies: [],
        currency: 'USD',
        autoSearch: false,
        notifyOnMatch: true,
        searchFrequency: 'daily',
      });
      if (prefsError) throw new Error(prefsError);

      setSaved(true);
      toast({ title: 'Settings saved', description: 'Your changes have been saved successfully' });
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save settings', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        toast({ title: 'Invalid file type', description: 'Please upload a PDF or Word document', variant: 'destructive' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Please upload a file smaller than 10MB', variant: 'destructive' });
        return;
      }
      setResumeFile(file);
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) return;

    setIsUploadingResume(true);
    setResumeUploadProgress(10);

    try {
      const { user } = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Delete previous resume if exists
      if (currentResume) {
        await deleteResume(currentResume.id);
        // Delete from storage
        const oldFilePath = currentResume.fileUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('resumes-files').remove([oldFilePath]);
      }

      setResumeUploadProgress(30);

      // Upload new file to storage
      const fileExt = resumeFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `user-${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes-files')
        .upload(filePath, resumeFile);

      if (uploadError) throw new Error(uploadError.message);

      setResumeUploadProgress(50);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resumes-files')
        .getPublicUrl(filePath);

      // Create resume record
      const { data: resumeData, error: dbError } = await createResume({
        fileUrl: publicUrl,
        fileName: resumeFile.name,
        fileType: resumeFile.type,
        fileSize: resumeFile.size,
      });

      if (dbError) throw new Error(dbError);

      setResumeUploadProgress(70);

      // Parse resume and update profile
      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId: resumeData?.id })
      });

      const result = await response.json();

      setResumeUploadProgress(100);

      if (result.success) {
        setCurrentResume({
          id: resumeData?.id || '',
          fileName: resumeFile.name,
          fileUrl: publicUrl,
        });
        setResumeFile(null);
        
        // Reload user data to reflect parsed resume data
        await loadUserData();
        
        toast({ title: 'Resume uploaded', description: 'Your resume has been uploaded and your profile has been updated' });
      } else {
        toast({ title: 'Resume uploaded', description: 'Resume uploaded but parsing failed. Your profile was not updated.', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Error uploading resume:', error);
      toast({ title: 'Upload failed', description: error.message || 'Failed to upload resume', variant: 'destructive' });
    } finally {
      setIsUploadingResume(false);
      setResumeUploadProgress(0);
    }
  };

  const handleRemoveResume = async () => {
    if (!currentResume) return;

    try {
      await deleteResume(currentResume.id);
      const filePath = currentResume.fileUrl.split('/').slice(-2).join('/');
      await supabase.storage.from('resumes-files').remove([filePath]);
      setCurrentResume(null);
      toast({ title: 'Resume removed', description: 'Your resume has been removed' });
    } catch (error: any) {
      console.error('Error removing resume:', error);
      toast({ title: 'Error', description: 'Failed to remove resume', variant: 'destructive' });
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'preferences', name: 'Job Preferences', icon: Briefcase },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'privacy', name: 'Privacy & Security', icon: Shield },
    { id: 'billing', name: 'Billing', icon: CreditCard },
  ];

  const notificationsData = [
    { 
        key: 'weeklyDigest', 
        label: 'Weekly Digest', 
        description: 'Summary of top jobs every week' 
    },
    { 
        key: 'applicationUpdates', 
        label: 'Application Updates', 
        description: 'Updates on your job applications' 
    },
    { 
        key: 'similarJobs', 
        label: 'Similar Job Recommendations', 
        description: 'Get suggestions for jobs similar to those you saved' 
    },
 ]

  const jobTypeOptions = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Remote'];
  const experienceLevels = ['Entry', 'Mid-level', 'Senior', 'Lead', 'Executive'];
  const availableSkills = ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java', 'AWS', 'Docker', 'SQL', 'GraphQL', 'Vue.js', 'Angular'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading your settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account and preferences</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saved && (
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium flex items-center gap-1 animate-fade-in">
                  <Check className="w-4 h-4" />
                  Saved!
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 sticky top-6">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Profile Information</h2>
                    <p className="text-slate-600 dark:text-slate-400">Update your personal details and professional information</p>
                  </div>

                  {/* Profile Photo */}
                  <div className="flex items-center gap-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-3xl text-white font-bold">
                        {formData.firstName?.[0]?.toUpperCase() || ''}{formData.lastName?.[0]?.toUpperCase() || ''}
                      </div>
                    )}
                    <div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 mb-2">
                        <Upload className="w-4 h-4" />
                        Upload Photo
                      </button>
                      <p className="text-sm text-slate-500">JPG or PNG, max 5MB</p>
                    </div>
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">First Name</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Location & Title */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        placeholder="City, Country"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Professional Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        placeholder="e.g., Senior Developer"
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bio</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  {/* Resume */}
                  <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Resume/CV</label>
                    
                    {/* Current Resume Display */}
                    {currentResume && !resumeFile && (
                      <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{currentResume.fileName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Current resume</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={currentResume.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-500 hover:text-blue-600 transition-colors"
                              title="View resume"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            <button
                              onClick={handleRemoveResume}
                              className="p-2 text-slate-500 hover:text-red-600 transition-colors"
                              title="Remove resume"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Selected File Preview */}
                    {resumeFile && (
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{resumeFile.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setResumeFile(null)}
                            className="p-2 text-slate-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Upload Progress */}
                    {isUploadingResume && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Uploading and parsing resume...</span>
                          <span className="text-sm font-medium text-blue-600">{resumeUploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${resumeUploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Upload Area */}
                    {!isUploadingResume && (
                      <>
                        <label className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer block">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleResumeFileChange}
                            className="hidden"
                          />
                          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {currentResume ? 'Click to upload a new resume' : 'Click to upload or drag and drop'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">PDF, DOC, DOCX (max 10MB)</p>
                        </label>

                        {/* Upload Button */}
                        {resumeFile && (
                          <button
                            onClick={handleResumeUpload}
                            className="mt-4 w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            Upload & Update Profile
                          </button>
                        )}
                      </>
                    )}

                    {currentResume && (
                      <p className="mt-3 text-xs text-slate-500">
                        Uploading a new resume will replace your current one and update your profile with the new information.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Job Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Job Preferences</h2>
                    <p className="text-slate-600 dark:text-slate-400">Set your job search criteria to get better matches</p>
                  </div>

                  {/* Job Types */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Job Types</label>
                    <div className="flex flex-wrap gap-2">
                      {jobTypeOptions.map(type => (
                        <button
                          key={type}
                          onClick={() => handleArrayToggle('jobTypes', type)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            formData.jobTypes.includes(type)
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Experience Level */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Experience Level</label>
                    <div className="flex flex-wrap gap-2">
                      {experienceLevels.map(level => (
                        <button
                          key={level}
                          onClick={() => handleInputChange('experienceLevel', level)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            formData.experienceLevel === level
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Salary Range */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Expected Salary (USD/year)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">Minimum</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="number"
                            value={formData.salaryMin}
                            onChange={(e) => handleInputChange('salaryMin', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            placeholder="80,000"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">Maximum</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="number"
                            value={formData.salaryMax}
                            onChange={(e) => handleInputChange('salaryMax', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            placeholder="120,000"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preferred Locations */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Preferred Locations</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.preferredLocations.map(loc => (
                        <span
                          key={loc}
                          className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          <MapPin className="w-4 h-4" />
                          {loc}
                          <button
                            onClick={() => handleArrayToggle('preferredLocations', loc)}
                            className="hover:text-blue-900"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Add a location..."
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Skills */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Skills</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.skills.map(skill => (
                        <span
                          key={skill}
                          className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          {skill}
                          <button
                            onClick={() => handleArrayToggle('skills', skill)}
                            className="hover:text-green-900"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableSkills
                        .filter(skill => !formData.skills.includes(skill))
                        .map(skill => (
                          <button
                            key={skill}
                            onClick={() => handleArrayToggle('skills', skill)}
                            className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            + {skill}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Notification Settings</h2>
                    <p className="text-slate-600 dark:text-slate-400">Choose what updates you want to receive</p>
                  </div>

                  <div className="space-y-4">
                    {notificationsData.map(item => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">{item.label}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
                        </div>
                        <button
                            onClick={() => handleInputChange(item.key as keyof FormData, !formData[item.key as keyof FormData])}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                formData[item.key as keyof FormData] ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                            >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                formData[item.key as keyof FormData] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                            />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Privacy & Security Tab */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Privacy & Security</h2>
                    <p className="text-slate-600 dark:text-slate-400">Manage your privacy settings and account security</p>
                  </div>

                  {/* Change Password */}
                  <div className="pb-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className="w-full pl-10 pr-12 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            placeholder="Enter your current password"
                          />
                          <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            placeholder="Enter your new password"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            placeholder="Confirm your new password"
                          />
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        Update Password
                      </button>
                    </div>
                  </div>

                  {/* Privacy Settings */}
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Privacy Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-white">Profile Visibility</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Who can see your profile</p>
                        </div>
                        <select
                          value={formData.profileVisibility}
                          onChange={(e) => handleInputChange('profileVisibility', e.target.value)}
                          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        >
                          <option value="public">Public</option>
                          <option value="recruiters">Recruiters Only</option>
                          <option value="private">Private</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-white">Show Salary Expectations</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Display your salary range to recruiters</p>
                        </div>
                        <button
                          onClick={() => handleInputChange('showSalary', !formData.showSalary)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formData.showSalary ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.showSalary ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-slate-900">Show Contact Information</h4>
                          <p className="text-sm text-slate-600">Allow recruiters to contact you directly</p>
                        </div>
                        <button
                          onClick={() => handleInputChange('showContact', !formData.showContact)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formData.showContact ? 'bg-blue-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.showContact ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Data Management */}
                  <div className="pt-6 border-t border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-4">Data Management</h3>
                    <div className="space-y-3">
                      <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <Download className="w-5 h-5 text-slate-600" />
                          <div className="text-left">
                            <h4 className="font-medium text-slate-900">Download Your Data</h4>
                            <p className="text-sm text-slate-600">Get a copy of all your data</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </button>
                      <button className="w-full flex items-center justify-between p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <Trash2 className="w-5 h-5 text-red-600" />
                          <div className="text-left">
                            <h4 className="font-medium text-red-900">Delete Account</h4>
                            <p className="text-sm text-red-700">Permanently delete your account and data</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Tab */}
              {activeTab === 'billing' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Billing & Subscription</h2>
                    <p className="text-slate-600">Manage your subscription and payment methods</p>
                  </div>

                  {/* Current Plan */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">Free Plan</h3>
                        <p className="text-slate-600">5 job searches per month</p>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }} />
                      </div>
                      <span className="text-sm font-medium text-slate-700">5 / 5 used</span>
                    </div>
                    <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Upgrade to Pro
                    </button>
                  </div>

                  {/* Pro Plan */}
                  <div className="border-2 border-slate-200 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-slate-900">Pro Plan</h3>
                          <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded text-xs font-bold">
                            POPULAR
                          </span>
                        </div>
                        <p className="text-3xl font-bold text-slate-900 mb-1">$29<span className="text-lg text-slate-600">/month</span></p>
                        <p className="text-slate-600">Everything you need to land your dream job</p>
                      </div>
                    </div>
                    <ul className="space-y-3 mb-6">
                      {[
                        'Unlimited job searches',
                        'AI-powered job matching',
                        'Priority application processing',
                        'Resume optimization',
                        'Interview preparation',
                        'Salary negotiation tips',
                        'Direct recruiter messaging',
                      ].map(feature => (
                        <li key={feature} className="flex items-center gap-2 text-slate-700">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors">
                      Subscribe to Pro
                    </button>
                  </div>

                  {/* Payment Method */}
                  <div className="pt-6 border-t border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-4">Payment Method</h3>
                    <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">No payment method</p>
                          <p className="text-sm text-slate-600">Add a card to upgrade</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-white transition-colors">
                        Add Card
                      </button>
                    </div>
                  </div>

                  {/* Billing History */}
                  <div className="pt-6 border-t border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-4">Billing History</h3>
                    <div className="bg-slate-50 rounded-lg p-8 text-center">
                      <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600">No billing history yet</p>
                      <p className="text-sm text-slate-500">Your invoices will appear here</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}