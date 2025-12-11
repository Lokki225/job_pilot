"use client"

import React, { useState } from 'react';
import { User, Bell, Shield, CreditCard, Briefcase, MapPin, DollarSign, Clock, FileText, Sparkles, Check, Upload, Mail, Lock, Globe, Trash2, Download, Eye, EyeOff, LogOut, ChevronRight, Save } from 'lucide-react';
import { FormData } from '@/lib/constants';


export default function JobSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    // Profile
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
    phone: '+1 (555) 123-4567',
    location: 'Abidjan, Côte d\'Ivoire',
    title: 'Senior Frontend Developer',
    bio: 'Passionate developer with 5+ years of experience building modern web applications.',
    
    // Job Preferences
    jobTypes: ['Full-time', 'Remote'],
    experienceLevel: 'Senior',
    salaryMin: '100000',
    salaryMax: '160000',
    preferredLocations: ['Remote', 'Abidjan', 'San Francisco'],
    skills: ['React', 'TypeScript', 'Node.js', 'Python', 'AWS'],
    
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
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-sm text-slate-500">Manage your account and preferences</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saved && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-1 animate-fade-in">
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 sticky top-6">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Profile Information</h2>
                    <p className="text-slate-600">Update your personal details and professional information</p>
                  </div>

                  {/* Profile Photo */}
                  <div className="flex items-center gap-6 pb-6 border-b border-slate-200">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-3xl text-white font-bold">
                      JD
                    </div>
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
                      <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Location & Title */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="City, Country"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Professional Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Senior Developer"
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  {/* Resume */}
                  <div className="pt-6 border-t border-slate-200">
                    <label className="block text-sm font-medium text-slate-700 mb-3">Resume/CV</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                      <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-700 mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-slate-500">PDF, DOC, DOCX (max 10MB)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Job Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Job Preferences</h2>
                    <p className="text-slate-600">Set your job search criteria to get better matches</p>
                  </div>

                  {/* Job Types */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Job Types</label>
                    <div className="flex flex-wrap gap-2">
                      {jobTypeOptions.map(type => (
                        <button
                          key={type}
                          onClick={() => handleArrayToggle('jobTypes', type)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            formData.jobTypes.includes(type)
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Experience Level */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Experience Level</label>
                    <div className="flex flex-wrap gap-2">
                      {experienceLevels.map(level => (
                        <button
                          key={level}
                          onClick={() => handleInputChange('experienceLevel', level)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            formData.experienceLevel === level
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Salary Range */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Expected Salary (USD/year)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-2">Minimum</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="number"
                            value={formData.salaryMin}
                            onChange={(e) => handleInputChange('salaryMin', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="80,000"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-2">Maximum</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="number"
                            value={formData.salaryMax}
                            onChange={(e) => handleInputChange('salaryMax', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="120,000"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preferred Locations */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Preferred Locations</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.preferredLocations.map(loc => (
                        <span
                          key={loc}
                          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2"
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
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Skills */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Skills</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.skills.map(skill => (
                        <span
                          key={skill}
                          className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2"
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
                            className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
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
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Notification Settings</h2>
                    <p className="text-slate-600">Choose what updates you want to receive</p>
                  </div>

                  <div className="space-y-4">
                    {notificationsData.map(item => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h3 className="font-medium text-slate-900">{item.label}</h3>
                          <p className="text-sm text-slate-600">{item.description}</p>
                        </div>
                        <button
                            onClick={() => handleInputChange(item.key as keyof FormData, !formData[item.key as keyof FormData])}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                formData[item.key as keyof FormData] ? 'bg-blue-600' : 'bg-slate-300'
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
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Privacy & Security</h2>
                    <p className="text-slate-600">Manage your privacy settings and account security</p>
                  </div>

                  {/* Change Password */}
                  <div className="pb-6 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <h3 className="font-semibold text-slate-900 mb-4">Privacy Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-slate-900">Profile Visibility</h4>
                          <p className="text-sm text-slate-600">Who can see your profile</p>
                        </div>
                        <select
                          value={formData.profileVisibility}
                          onChange={(e) => handleInputChange('profileVisibility', e.target.value)}
                          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="public">Public</option>
                          <option value="recruiters">Recruiters Only</option>
                          <option value="private">Private</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-slate-900">Show Salary Expectations</h4>
                          <p className="text-sm text-slate-600">Display your salary range to recruiters</p>
                        </div>
                        <button
                          onClick={() => handleInputChange('showSalary', !formData.showSalary)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formData.showSalary ? 'bg-blue-600' : 'bg-slate-300'
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