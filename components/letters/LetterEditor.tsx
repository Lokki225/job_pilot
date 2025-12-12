'use client';

import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  X, 
  Save, 
  Sparkles, 
  Loader2,
  Building2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CoverLetter {
  id: string;
  content: string;
  subject: string | null;
  tone: string;
  createdAt: string;
  job_applications: {
    id: string;
    jobTitle: string;
    company: string;
    status: string;
  } | null;
}

interface LetterEditorProps {
  letter: CoverLetter | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, content: string, subject: string) => Promise<void>;
  onImprove?: (id: string, feedback: string) => Promise<void>;
  isSaving?: boolean;
  isImproving?: boolean;
}

export function LetterEditor({ 
  letter, 
  isOpen, 
  onClose, 
  onSave,
  onImprove,
  isSaving = false,
  isImproving = false
}: LetterEditorProps) {
  const [content, setContent] = useState(letter?.content || '');
  const [subject, setSubject] = useState(letter?.subject || '');
  const [feedback, setFeedback] = useState('');
  const [showImproveInput, setShowImproveInput] = useState(false);

  // Update state when letter changes
  useState(() => {
    if (letter) {
      setContent(letter.content);
      setSubject(letter.subject || '');
    }
  });

  if (!letter) return null;

  const handleSave = async () => {
    await onSave(letter.id, content, subject);
  };

  const handleImprove = async () => {
    if (onImprove && feedback.trim()) {
      await onImprove(letter.id, feedback);
      setFeedback('');
      setShowImproveInput(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                  <div>
                    <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
                      Edit Cover Letter
                    </Dialog.Title>
                    {letter.job_applications && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <Building2 className="w-4 h-4" />
                        <span>
                          {letter.job_applications.jobTitle} at {letter.job_applications.company}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-gray-700 dark:text-gray-300">
                      Subject Line
                    </Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Application for [Position] at [Company]"
                      className="dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content" className="text-gray-700 dark:text-gray-300">
                      Letter Content
                    </Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={15}
                      className="resize-none dark:bg-slate-900 dark:border-slate-600 dark:text-white font-mono text-sm"
                      placeholder="Write your cover letter here..."
                    />
                  </div>

                  {/* AI Improve Section */}
                  {onImprove && (
                    <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                      {!showImproveInput ? (
                        <Button
                          variant="outline"
                          onClick={() => setShowImproveInput(true)}
                          className="w-full dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                        >
                          <Sparkles className="w-4 h-4 mr-2 text-indigo-500" />
                          Improve with AI
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <Label className="text-gray-700 dark:text-gray-300">
                            What would you like to improve?
                          </Label>
                          <Textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows={3}
                            className="resize-none dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                            placeholder="e.g., Make it more concise, add more enthusiasm, highlight leadership skills..."
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowImproveInput(false);
                                setFeedback('');
                              }}
                              className="dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleImprove}
                              disabled={!feedback.trim() || isImproving}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              {isImproving ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Improving...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  Apply Improvements
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
