'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Search, 
  Filter, 
  Loader2, 
  AlertCircle,
  Grid3X3,
  List,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  LetterCard, 
  LetterPreview, 
  LetterEditor, 
  EmptyLettersState,
  TemplatesSection 
} from '@/components/letters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  getAllCoverLetters, 
  updateCoverLetter, 
  deleteCoverLetter,
  improveCoverLetter 
} from '@/lib/actions/cover-letter.action';
import { toast } from '@/components/ui/use-toast';

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

export default function CoverLettersPage() {
  const router = useRouter();
  
  // State
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [filteredLetters, setFilteredLetters] = useState<CoverLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [toneFilter, setToneFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'letters' | 'templates'>('letters');
  
  // Modal State
  const [selectedLetter, setSelectedLetter] = useState<CoverLetter | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImproving, setIsImproving] = useState(false);

  // Load letters on mount
  useEffect(() => {
    loadLetters();
  }, []);

  // Filter letters when search or filter changes
  useEffect(() => {
    let filtered = [...letters];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(letter => 
        letter.content.toLowerCase().includes(query) ||
        letter.subject?.toLowerCase().includes(query) ||
        letter.job_applications?.jobTitle.toLowerCase().includes(query) ||
        letter.job_applications?.company.toLowerCase().includes(query)
      );
    }
    
    // Tone filter
    if (toneFilter !== 'all') {
      filtered = filtered.filter(letter => letter.tone === toneFilter);
    }
    
    setFilteredLetters(filtered);
  }, [letters, searchQuery, toneFilter]);

  const loadLetters = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error } = await getAllCoverLetters();
      
      if (error) {
        setError(error);
        return;
      }
      
      setLetters(data || []);
    } catch (err) {
      setError('Failed to load cover letters');
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (letter: CoverLetter) => {
    setSelectedLetter(letter);
    setIsPreviewOpen(true);
  };

  const handleEdit = (letter: CoverLetter) => {
    setSelectedLetter(letter);
    setIsEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cover letter?')) return;
    
    try {
      const { error } = await deleteCoverLetter(id);
      
      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive'
        });
        return;
      }
      
      setLetters(prev => prev.filter(l => l.id !== id));
      toast({
        title: 'Deleted',
        description: 'Cover letter deleted successfully'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete cover letter',
        variant: 'destructive'
      });
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: 'Copied',
        description: 'Cover letter copied to clipboard'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      });
    }
  };

  const handleDownload = (letter: CoverLetter) => {
    const blob = new Blob([letter.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${letter.job_applications?.company || 'untitled'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Downloaded',
      description: 'Cover letter downloaded successfully'
    });
  };

  const handleSave = async (id: string, content: string, subject: string) => {
    try {
      setIsSaving(true);
      const { data, error } = await updateCoverLetter(id, { content, subject });
      
      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive'
        });
        return;
      }
      
      setLetters(prev => prev.map(l => l.id === id ? { ...l, content, subject } : l));
      setIsEditorOpen(false);
      toast({
        title: 'Saved',
        description: 'Cover letter updated successfully'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save cover letter',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImprove = async (id: string, feedback: string) => {
    try {
      setIsImproving(true);
      const { data, error } = await improveCoverLetter({ coverLetterId: id, feedback });
      
      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive'
        });
        return;
      }
      
      if (data) {
        setLetters(prev => prev.map(l => l.id === id ? { ...l, content: data.content } : l));
        setSelectedLetter(prev => prev ? { ...prev, content: data.content } : null);
        toast({
          title: 'Improved',
          description: 'Cover letter improved with AI'
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to improve cover letter',
        variant: 'destructive'
      });
    } finally {
      setIsImproving(false);
    }
  };

  // Stats
  const stats = {
    total: letters.length,
    professional: letters.filter(l => l.tone === 'professional').length,
    friendly: letters.filter(l => l.tone === 'friendly').length,
    formal: letters.filter(l => l.tone === 'formal').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-xl">
                  <FileText className="w-6 h-6 text-primary dark:text-primary/90" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Cover Letters
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Manage your AI-generated cover letters and templates
                  </p>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={() => router.push('/dashboard/jobs')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate New Letter
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'letters' | 'templates')} className="mt-6">
            <TabsList>
              <TabsTrigger value="letters">My Letters</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Letters</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.professional}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Professional</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.friendly}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Friendly</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.formal}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Formal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'templates' ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-12">
          <TemplatesSection />
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-1 gap-3 w-full sm:w-auto">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search letters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                  />
                </div>
                
                <Select value={toneFilter} onValueChange={setToneFilter}>
                  <SelectTrigger className="w-40 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tones</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredLetters.length} letter{filteredLetters.length !== 1 ? 's' : ''}
                </span>
                <div className="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' 
                      ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary/90' 
                      : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' 
                      ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary/90' 
                      : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">{error}</p>
                <Button 
                  onClick={loadLetters} 
                  variant="outline" 
                  className="mt-4 dark:border-slate-600 dark:text-gray-300"
                >
                  Try Again
                </Button>
              </div>
            ) : filteredLetters.length === 0 ? (
              letters.length === 0 ? (
                <EmptyLettersState onCreateNew={() => router.push('/dashboard/jobs')} />
              ) : (
                <div className="flex flex-col items-center justify-center py-20">
                  <Search className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No letters match your search</p>
                  <Button 
                    onClick={() => {
                      setSearchQuery('');
                      setToneFilter('all');
                    }} 
                    variant="outline" 
                    className="mt-4 dark:border-slate-600 dark:text-gray-300"
                  >
                    Clear Filters
                  </Button>
                </div>
              )
            ) : (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                : 'space-y-4'
              }>
                {filteredLetters.map((letter) => (
                  <LetterCard
                    key={letter.id}
                    letter={letter}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onCopy={handleCopy}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      <LetterPreview
        letter={selectedLetter}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedLetter(null);
        }}
        onEdit={handleEdit}
        onCopy={handleCopy}
        onDownload={handleDownload}
      />

      <LetterEditor
        letter={selectedLetter}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedLetter(null);
        }}
        onSave={handleSave}
        onImprove={handleImprove}
        isSaving={isSaving}
        isImproving={isImproving}
      />
    </div>
  );
}
