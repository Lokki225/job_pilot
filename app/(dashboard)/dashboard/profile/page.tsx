"use client"
import React, { useState } from 'react';
import { User, Briefcase, GraduationCap, Award, MapPin, Mail, Phone, Globe, Linkedin, Github, Edit2, Save, X, Plus, Trash2, Calendar, Building, FileText, Download, Eye } from 'lucide-react';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Profile data
  const [profile, setProfile] = useState({
    firstName: 'Oriane',
    lastName: 'Martinez',
    headline: 'Senior Financial Analyst',
    email: 'oriane.martinez@email.com',
    phone: '+33 6 12 34 56 78',
    location: 'Paris, France',
    bio: 'Results-driven finance professional with 7+ years of experience in financial analysis, corporate finance, and strategic planning. Passionate about data-driven decision making and financial optimization.',
    website: 'orianemartinez.com',
    linkedin: 'linkedin.com/in/oriane-m',
    github: 'github.com/orianem',
    avatarUrl: null,
  });

  const [experiences, setExperiences] = useState([
    {
      id: 1,
      title: 'Senior Financial Analyst',
      company: 'BNP Paribas',
      location: 'Paris, France',
      startDate: '2020-01',
      endDate: null,
      current: true,
      description: 'Lead financial analysis and strategic planning initiatives for the Corporate Finance division, managing a portfolio of €500M+ in assets.',
    },
    {
      id: 2,
      title: 'Financial Analyst',
      company: 'Société Générale',
      location: 'Paris, France',
      startDate: '2017-06',
      endDate: '2020-01',
      current: false,
      description: 'Conducted financial analysis and reporting for the Investment Banking division.',
    },
  ]);

  const [education, setEducation] = useState([
    {
      id: 1,
      degree: "Master's in Finance",
      school: 'HEC Paris',
      field: 'Corporate Finance',
      startDate: '2013-09',
      endDate: '2015-06',
      current: false,
    },
    {
      id: 2,
      degree: "Bachelor's in Economics",
      school: 'Sciences Po Paris',
      field: 'Economics and Finance',
      startDate: '2010-09',
      endDate: '2013-06',
      current: false,
    },
  ]);

  const [skills, setSkills] = useState([
    { id: 1, name: 'Financial Analysis', level: 95 },
    { id: 2, name: 'Excel & Modeling', level: 90 },
    { id: 3, name: 'Risk Management', level: 85 },
    { id: 4, name: 'Bloomberg Terminal', level: 80 },
    { id: 5, name: 'Python & SQL', level: 75 },
  ]);

  const [certifications, setCertifications] = useState([
    { id: 1, name: 'CFA Level III', issuer: 'CFA Institute', date: '2022-06' },
    { id: 2, name: 'Financial Risk Manager', issuer: 'GARP', date: '2020-11' },
  ]);

  const [languages, setLanguages] = useState([
    { id: 1, name: 'French', level: 'Native' },
    { id: 2, name: 'English', level: 'Fluent' },
    { id: 3, name: 'Spanish', level: 'Professional' },
  ]);

  const handleSaveProfile = () => {
    setIsEditing(false);
    console.log('Profile saved:', profile);
    alert('Profile updated successfully!');
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return 'Present';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

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
              <button className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors flex items-center gap-2">
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
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
                    >
                      {isEditing ? (
                        <>
                          <Save className="w-4 h-4" />
                          Save
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
                  <span className="font-bold">85%</span>
                </div>
                <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              <p className="text-sm text-indigo-100">
                Great job! Complete your profile to unlock all features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}