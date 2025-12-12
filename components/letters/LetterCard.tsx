'use client';

import { useState } from 'react';
import { 
  FileText, 
  Building2, 
  Calendar, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  Copy, 
  Download,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface LetterCardProps {
  letter: CoverLetter;
  onView: (letter: CoverLetter) => void;
  onEdit: (letter: CoverLetter) => void;
  onDelete: (id: string) => void;
  onCopy: (content: string) => void;
  onDownload: (letter: CoverLetter) => void;
}

export function LetterCard({ 
  letter, 
  onView, 
  onEdit, 
  onDelete, 
  onCopy, 
  onDownload 
}: LetterCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      wishlist: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      applied: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      interviewing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      offered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[status] || colors.wishlist;
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="group bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
              {letter.subject || 'Cover Letter'}
            </h3>
            {letter.job_applications && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />
                <span className="line-clamp-1">
                  {letter.job_applications.jobTitle} at {letter.job_applications.company}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onView(letter)}>
              <Eye className="w-4 h-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(letter)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopy(letter.content)}>
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload(letter)}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(letter.id)}
              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content Preview */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
        {truncateContent(letter.content)}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={getToneColor(letter.tone)}>
            <Sparkles className="w-3 h-3 mr-1" />
            {letter.tone}
          </Badge>
          {letter.job_applications && (
            <Badge variant="secondary" className={getStatusColor(letter.job_applications.status)}>
              {letter.job_applications.status}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(letter.createdAt)}
        </div>
      </div>
    </div>
  );
}
