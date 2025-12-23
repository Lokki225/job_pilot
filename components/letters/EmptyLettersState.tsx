'use client';

import { FileText, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyLettersStateProps {
  onCreateNew?: () => void;
}

export function EmptyLettersState({ onCreateNew }: EmptyLettersStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-6">
        <div className="w-24 h-24 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
          <FileText className="w-12 h-12 text-primary dark:text-primary/90" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        No Cover Letters Yet
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
        Create your first AI-powered cover letter to stand out from the crowd. 
        Our AI will help you craft personalized letters for each job application.
      </p>
      
      {onCreateNew && (
        <Button 
          onClick={onCreateNew}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Your First Letter
        </Button>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl text-center">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-lg">🎯</span>
          </div>
          <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">Tailored Content</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            AI creates personalized letters for each job
          </p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl text-center">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-lg">⚡</span>
          </div>
          <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">Save Time</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Generate professional letters in seconds
          </p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl text-center">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-lg">✨</span>
          </div>
          <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">Multiple Tones</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Choose from professional to enthusiastic
          </p>
        </div>
      </div>
    </div>
  );
}
