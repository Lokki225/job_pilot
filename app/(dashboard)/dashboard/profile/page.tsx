"use client"
import React, { useState, useEffect } from 'react';
import { User, Briefcase, GraduationCap, Award, MapPin, Mail, Phone, Globe, Linkedin, Github, Edit2, Save, X, Plus, Trash2, Calendar, Building, FileText, Download, Eye } from 'lucide-react';
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProfileDetails, upsertProfile, updateCompletionScore } from "@/lib/actions/profile.action";
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { ResumePreviewModal } from '@/components/shared/ResumePreviewModal';

export default function ProfilePage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Profile data
  const [profile, setProfile] = useState({
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

        setProfile({
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
        });

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
          }))
        );

        setSkills(
          (skills || []).map((skill: any) => ({
            id: skill.id,
            name: skill.name,
            level: typeof skill.level === 'number' ? skill.level : 80,
          }))
        );

        setCertifications(
          (certifications || []).map((cert: any) => ({
            id: cert.id,
            name: cert.name,
            issuer: cert.issuer,
            date: cert.issueDate,
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

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const payload: any = {
        firstName: profile.firstName || undefined,
        lastName: profile.lastName || undefined,
        phone: profile.phone || undefined,
        location: profile.location || undefined,
        bio: profile.bio || undefined,
        headline: profile.headline || undefined,
        website: profile.website || undefined,
        linkedinUrl: profile.linkedin || undefined,
        githubUrl: profile.github || undefined,
        avatarUrl: profile.avatarUrl || undefined,
        resumeUrl: profile.resumeUrl || undefined,
        languages: (languages || []).map((l: any) => l.name),
      };

      const { data, error } = await upsertProfile(payload);
      if (error) {
        setError(error);
        return;
      }

      const { data: completionData, error: completionError } = await updateCompletionScore();
      if (!completionError && completionData?.completionScore !== undefined) {
        setProfileCompletion(completionData.completionScore);
      }

      setIsEditing(false);
    } catch (err) {
      setError('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return 'Present';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };


  const handlePreview = () => {
    setIsPreviewOpen(true)
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex justify-between items-start">
            <div className="flex gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-indigo-600 text-4xl font-bold shadow-xl">
                  {profile.firstName[0]}{profile.lastName[0]}
                </div>
                <button className="absolute bottom-0 right-0 bg-white text-indigo-600 p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              {/* Name & Title */}
              <div className="pt-2">
                <h1 className="text-4xl font-bold mb-2">
                  {profile.firstName} {profile.lastName}
                </h1>
                <p className="text-xl text-indigo-100 mb-4">{profile.headline}</p>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{profile.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors flex items-center gap-2" onClick={handlePreview}>
                <Eye className="w-4 h-4" />
                Preview Resume
              </button>
              <button className="px-4 py-2 bg-indigo-700 text-white rounded-lg font-semibold hover:bg-indigo-800 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 border-b border-indigo-400">
            {['overview', 'experience', 'education', 'skills'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-white text-white'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Overview */}
          <div className="col-span-2 space-y-6">
            {activeTab === 'overview' && (
              <>
                {/* About Section */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">About</h2>
                    <button
                      onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                      disabled={isSaving}
                      className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2 disabled:opacity-60"
                    >
                      {isEditing ? (
                        <>
                          <Save className="w-4 h-4" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </>
                      ) : (
                        <>
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </>
                      )}
                    </button>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      className="w-full p-3 border rounded-lg min-h-32 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  ) : (
                    <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                  )}
                </div>

                {/* Experience Preview */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Experience</h2>
                    <button
                      onClick={() => setActiveTab('experience')}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      View all →
                    </button>
                  </div>
                  <div className="space-y-4">
                    {experiences.slice(0, 2).map((exp) => (
                      <div key={exp.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{exp.title}</h3>
                          <p className="text-sm text-gray-600">{exp.company}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Education Preview */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Education</h2>
                    <button
                      onClick={() => setActiveTab('education')}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      View all →
                    </button>
                  </div>
                  <div className="space-y-4">
                    {education.slice(0, 2).map((edu) => (
                      <div key={edu.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{edu.degree}</h3>
                          <p className="text-sm text-gray-600">{edu.school}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'experience' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Experience</h2>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    <Plus className="w-4 h-4" />
                    Add Experience
                  </button>
                </div>
                <div className="space-y-6">
                  {experiences.map((exp) => (
                    <div key={exp.id} className="border-l-4 border-indigo-600 pl-6 pb-6">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800">{exp.title}</h3>
                          <p className="text-lg text-indigo-600 font-medium">{exp.company}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {exp.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                            </span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button className="p-2 text-gray-400 hover:text-indigo-600">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{exp.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'education' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Education</h2>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    <Plus className="w-4 h-4" />
                    Add Education
                  </button>
                </div>
                <div className="space-y-6">
                  {education.map((edu) => (
                    <div key={edu.id} className="border-l-4 border-purple-600 pl-6 pb-6">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800">{edu.degree}</h3>
                          <p className="text-lg text-purple-600 font-medium">{edu.school}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-4 mt-1">
                            <span>{edu.field}</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                            </span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button className="p-2 text-gray-400 hover:text-indigo-600">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'skills' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Skills</h2>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    <Plus className="w-4 h-4" />
                    Add Skill
                  </button>
                </div>
                <div className="space-y-4">
                  {skills.map((skill) => (
                    <div key={skill.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-800">{skill.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{skill.level}%</span>
                          <button className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-1000"
                          style={{ width: `${skill.level}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{profile.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{profile.location}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{profile.website}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Linkedin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{profile.linkedin}</span>
                </div>
              </div>
            </div>

            {/* Languages */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Languages</h3>
              <div className="space-y-3">
                {languages.map((lang) => (
                  <div key={lang.id} className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">{lang.name}</span>
                    <span className="text-sm text-gray-500">{lang.level}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Certifications</h3>
              <div className="space-y-4">
                {certifications.map((cert) => (
                  <div key={cert.id} className="border-l-2 border-indigo-600 pl-3">
                    <p className="font-semibold text-gray-800 text-sm">{cert.name}</p>
                    <p className="text-xs text-gray-600">{cert.issuer}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(cert.date)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Completeness */}
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

      <ResumePreviewModal 
        isPreviewOpen={isPreviewOpen}
        setIsPreviewOpen={setIsPreviewOpen}
        experiences={experiences}
        education={education}
        skills={skills}
        certifications={certifications}
        languages={languages}
        profile={profile}
        formatDate={formatDate}
      />
    </div>
  );
}