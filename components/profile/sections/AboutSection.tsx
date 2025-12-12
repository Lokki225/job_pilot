import { Edit2, Save, X } from 'lucide-react';
import { useState } from 'react';

interface AboutSectionProps {
  profile: {
    bio?: string;
    website?: string;
    linkedin?: string;
    github?: string;
  };
  isEditing: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSave?: () => void;
  onCancel?: () => void;
}

export const AboutSection = ({
  profile,
  isEditing,
  onInputChange,
  onSave,
  onCancel
}: AboutSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const showReadMore = profile.bio && profile.bio.length > 200 && !isExpanded;
  
  const displayBio = showReadMore ? `${profile.bio?.substring(0, 200)}...` : profile.bio;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">About</h2>
        {isEditing && (
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={profile.bio || ''}
              onChange={onInputChange}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Tell us about yourself..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Website
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={profile.website || ''}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                LinkedIn
              </label>
              <input
                type="url"
                id="linkedin"
                name="linkedin"
                value={profile.linkedin || ''}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div>
              <label htmlFor="github" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                GitHub
              </label>
              <input
                type="url"
                id="github"
                name="github"
                value={profile.github || ''}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://github.com/username"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {profile.bio ? (
            <div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {displayBio}
                {showReadMore && (
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="text-indigo-600 hover:text-indigo-800 ml-1"
                  >
                    Read more
                  </button>
                )}
              </p>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">No bio added yet.</p>
          )}
          
          {(profile.website || profile.linkedin || profile.github) && (
            <div className="flex flex-wrap gap-4 pt-2">
              {profile.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-600"></span>
                  Website
                </a>
              )}
              {profile.linkedin && (
                <a
                  href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-600"></span>
                  LinkedIn
                </a>
              )}
              {profile.github && (
                <a
                  href={profile.github.startsWith('http') ? profile.github : `https://github.com/${profile.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-600"></span>
                  GitHub
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
