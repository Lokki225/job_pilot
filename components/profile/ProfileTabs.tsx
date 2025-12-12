import { ReactNode } from 'react';
import { Briefcase, GraduationCap, Award, FileText } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: ReactNode;
}

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: Tab[];
}

export const ProfileTabs = ({ activeTab, onTabChange, tabs }: ProfileTabsProps) => {
  return (
    <div className="border-b border-gray-200 dark:border-slate-700">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

// Default tabs configuration
const defaultTabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
  { id: 'experience', label: 'Experience', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'education', label: 'Education', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'skills', label: 'Skills', icon: <Award className="w-4 h-4" /> },
];

ProfileTabs.defaultProps = {
  tabs: defaultTabs
};
