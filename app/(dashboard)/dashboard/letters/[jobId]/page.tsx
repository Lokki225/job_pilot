"use client"

import React, { useState } from 'react';
import { Sparkles, FileText, Briefcase, Building, MapPin, Send, Copy, Download, RefreshCw, Eye, Edit2, Save, Wand2, Zap, TrendingUp, Target, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function CoverLetterPage() {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    jobDescription: '',
    location: '',
    tone: 'professional',
    length: 'medium',
  });

  const [savedLetters, setSavedLetters] = useState([
    {
      id: 1,
      jobTitle: 'Senior Frontend Developer',
      company: 'Stripe',
      createdAt: '2024-01-10',
      status: 'used',
      preview: 'Dear Hiring Manager, I am writing to express my strong interest in the Senior Frontend Developer position at Stripe...',
    },
    {
      id: 2,
      jobTitle: 'React Engineer',
      company: 'Vercel',
      createdAt: '2024-01-08',
      status: 'draft',
      preview: 'Dear Vercel Team, With 5 years of experience in React development and a passion for creating...',
    },
  ]);

  const tones = [
    { value: 'professional', label: 'Professional', icon: '👔', desc: 'Formal and polished' },
    { value: 'enthusiastic', label: 'Enthusiastic', icon: '🎉', desc: 'Energetic and passionate' },
    { value: 'confident', label: 'Confident', icon: '💪', desc: 'Bold and assertive' },
    { value: 'friendly', label: 'Friendly', icon: '😊', desc: 'Warm and approachable' },
  ];

  const lengths = [
    { value: 'short', label: 'Short', desc: '250-300 words' },
    { value: 'medium', label: 'Medium', desc: '350-400 words' },
    { value: 'long', label: 'Long', desc: '450-500 words' },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      const letter = `Dear Hiring Manager,

I am writing to express my strong interest in the ${formData.jobTitle} position at ${formData.company}. With my extensive experience in software development and a proven track record of delivering high-quality solutions, I am confident that I would be a valuable addition to your team.

Throughout my career, I have developed expertise in modern web technologies, particularly in React, TypeScript, and Next.js. My experience aligns perfectly with the requirements outlined in your job posting, and I am excited about the opportunity to contribute to ${formData.company}'s mission.

In my current role, I have successfully led multiple projects that resulted in significant improvements in performance and user experience. I am particularly drawn to ${formData.company} because of your commitment to innovation and your reputation for technical excellence. The challenges described in the job posting resonate with my professional goals, and I am eager to bring my skills to your talented team.

I am impressed by ${formData.company}'s recent achievements and would welcome the opportunity to discuss how my background, skills, and enthusiasm can contribute to your continued success. Thank you for considering my application. I look forward to the possibility of discussing this exciting opportunity with you.

Best regards,
[Your Name]`;

      setGeneratedLetter(letter);
      setIsGenerating(false);
      setStep(2);
    }, 3000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLetter);
    alert('Cover letter copied to clipboard!');
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([generatedLetter], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `cover_letter_${formData.company.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSave = () => {
    const newLetter = {
      id: savedLetters.length + 1,
      jobTitle: formData.jobTitle,
      company: formData.company,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'draft',
      preview: generatedLetter.substring(0, 100) + '...',
    };
    setSavedLetters([newLetter, ...savedLetters]);
    alert('Cover letter saved successfully!');
  };

  const handleRegenerate = () => {
    setStep(1);
    setGeneratedLetter('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">AI Cover Letter Generator</h1>
                <p className="text-sm text-gray-600">Create personalized cover letters in seconds</p>
              </div>
            </div>
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              New Letter
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Progress Steps */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Job Details</p>
                    <p className="text-xs text-gray-500">Enter job information</p>
                  </div>
                </div>

                <div className="flex-1 h-1 mx-4 bg-gray-200 rounded">
                  <div className={`h-full rounded transition-all duration-500 ${step >= 2 ? 'bg-indigo-600 w-full' : 'w-0'}`}></div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Review & Edit</p>
                    <p className="text-xs text-gray-500">Customize your letter</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1: Form */}
            {step === 1 && (
              <div className="bg-white rounded-xl shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Tell us about the job</h2>
                
                <div className="space-y-6">
                  {/* Job Title */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      Job Title *
                    </label>
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      placeholder="e.g., Senior Frontend Developer"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <Building className="w-4 h-4 text-indigo-600" />
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="e.g., Stripe"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., San Francisco, CA"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>

                  {/* Job Description */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Job Description (Optional)
                    </label>
                    <textarea
                      value={formData.jobDescription}
                      onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                      placeholder="Paste the job description here to generate a more tailored cover letter..."
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                    />
                  </div>

                  {/* Tone Selection */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">
                      Writing Tone
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {tones.map((tone) => (
                        <button
                          key={tone.value}
                          onClick={() => setFormData({ ...formData, tone: tone.value })}
                          className={`p-4 border-2 rounded-lg text-left transition-all ${
                            formData.tone === tone.value
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{tone.icon}</span>
                            <span className="font-semibold text-gray-800">{tone.label}</span>
                          </div>
                          <p className="text-xs text-gray-600">{tone.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Length Selection */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">
                      Letter Length
                    </label>
                    <div className="flex gap-3">
                      {lengths.map((length) => (
                        <button
                          key={length.value}
                          onClick={() => setFormData({ ...formData, length: length.value })}
                          className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                            formData.length === length.value
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className="font-semibold text-gray-800 mb-1">{length.label}</p>
                          <p className="text-xs text-gray-600">{length.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={!formData.jobTitle || !formData.company || isGenerating}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Generating Your Letter...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Cover Letter
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Generated Letter */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Action Bar */}
                <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-gray-800">Cover Letter Generated!</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      {isEditing ? 'Save' : 'Edit'}
                    </button>
                    <button
                      onClick={handleCopy}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>

                {/* Letter Content */}
                <div className="bg-white rounded-xl shadow-sm p-8">
                  {isEditing ? (
                    <textarea
                      value={generatedLetter}
                      onChange={(e) => setGeneratedLetter(e.target.value)}
                      className="w-full h-[600px] p-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-serif text-gray-800 leading-relaxed resize-none"
                    />
                  ) : (
                    <div className="prose prose-lg max-w-none">
                      <div className="font-serif text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {generatedLetter}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleRegenerate}
                    className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Regenerate
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Save className="w-5 h-5" />
                    Save to Library
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Tips Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5" />
                <h3 className="font-bold text-lg">Pro Tips</h3>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Include specific keywords from the job description</span>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Highlight your most relevant achievements</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Keep it concise - 300-400 words is ideal</span>
                </li>
              </ul>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-4">Your Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Letters Created</span>
                  </div>
                  <span className="font-bold text-blue-600">24</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Applications Sent</span>
                  </div>
                  <span className="font-bold text-green-600">18</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">Response Rate</span>
                  </div>
                  <span className="font-bold text-purple-600">33%</span>
                </div>
              </div>
            </div>

            {/* Saved Letters */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-4">Recent Letters</h3>
              <div className="space-y-3">
                {savedLetters.slice(0, 3).map((letter) => (
                  <div key={letter.id} className="p-3 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-800">{letter.jobTitle}</p>
                        <p className="text-xs text-gray-600">{letter.company}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        letter.status === 'used' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {letter.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{letter.preview}</p>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors">
                View All Letters →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}