'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  X, 
  Copy, 
  Download, 
  Edit, 
  Building2, 
  Calendar,
  Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

interface LetterPreviewProps {
  letter: CoverLetter | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (letter: CoverLetter) => void;
  onCopy: (content: string) => void;
  onDownload: (letter: CoverLetter) => void;
}

export function LetterPreview({ 
  letter, 
  isOpen, 
  onClose, 
  onEdit, 
  onCopy, 
  onDownload 
}: LetterPreviewProps) {
  if (!letter) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getToneColor = (tone: string) => {
    const colors: Record<string, string> = {
      professional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      friendly: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      formal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      enthusiastic: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return colors[tone] || colors.professional;
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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                  <div>
                    <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
                      {letter.subject || 'Cover Letter'}
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

                {/* Meta Info */}
                <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                  <Badge variant="secondary" className={getToneColor(letter.tone)}>
                    <Sparkles className="w-3 h-3 mr-1" />
                    {letter.tone}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    {formatDate(letter.createdAt)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                      {letter.content}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                  <Button
                    variant="outline"
                    onClick={() => onCopy(letter.content)}
                    className="dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onDownload(letter)}
                    className="dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    onClick={() => {
                      onClose();
                      onEdit(letter);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Letter
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
