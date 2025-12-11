// components/profile/sections/ExperienceSection.tsx
import { Briefcase, Calendar, MapPin, Edit2, Trash2, Plus, X, Save } from 'lucide-react';
import { useState } from 'react';

interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  description: string;
}

interface ExperienceSectionProps {
  experiences: Experience[];
  isEditing: boolean;
  expanded?: boolean;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSave?: (experience: Experience) => void;
  onCancel?: () => void;
}

export const ExperienceSection = ({
  experiences = [],
  isEditing,
  expanded = false,
  onAdd,
  onEdit,
  onDelete,
  onSave,
  onCancel
}: ExperienceSectionProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newExperience, setNewExperience] = useState<Partial<Experience>>({
    title: '',
    company: '',
    location: '',
    startDate: '',
    endDate: null,
    current: false,
    description: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setNewExperience(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'current' && checked ? { endDate: null } : {})
    }));
  };

  const handleSave = () => {
    if (onSave && editingId) {
      onSave({ ...newExperience, id: editingId } as Experience);
      setEditingId(null);
    }
  };

  const handleAddNew = () => {
    onAdd();
    setEditingId('new');
    setNewExperience({
      title: '',
      company: '',
      location: '',
      startDate: '',
      endDate: null,
      current: false,
      description: ''
    });
  };

  const handleEdit = (exp: Experience) => {
    setEditingId(exp.id);
    setNewExperience(exp);
  };

  const renderExperienceItem = (exp: Experience) => {
    if (editingId === exp.id) {
      return (
        <div key={exp.id} className="border-l-2 border-indigo-200 pl-4 py-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input
                type="text"
                name="title"
                value={newExperience.title || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Senior Developer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                name="company"
                value={newExperience.company || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Company Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                name="location"
                value={newExperience.location || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. New York, NY"
              />
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={newExperience.startDate?.toString().split('T')[0] || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={newExperience.endDate?.toString().split('T')[0] || ''}
                  onChange={handleInputChange}
                  disabled={newExperience.current}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md ${newExperience.current ? 'bg-gray-100' : ''}`}
                />
              </div>
              <div className="flex items-center mb-1">
                <input
                  type="checkbox"
                  id={`current-${exp.id}`}
                  name="current"
                  checked={!!newExperience.current}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor={`current-${exp.id}`} className="ml-2 block text-sm text-gray-700">
                  Current
                </label>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={newExperience.description || ''}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Describe your role and responsibilities"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setEditingId(null)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
            >
              Save
            </button>
          </div>
        </div>
      );
    }

    return (
      <div key={exp.id} className="border-l-2 border-gray-200 pl-4 py-4 group">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{exp.title}</h3>
            <p className="text-indigo-600">{exp.company}</p>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <Calendar className="w-4 h-4 mr-1" />
              <span>
                {new Date(exp.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })} -{' '}
                {exp.current ? 'Present' : exp.endDate ? new Date(exp.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'Present'}
              </span>
              {exp.location && (
                <>
                  <span className="mx-2">•</span>
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{exp.location}</span>
                </>
              )}
            </div>
            {exp.description && (
              <p className="mt-2 text-gray-700 whitespace-pre-line">{exp.description}</p>
            )}
          </div>
          {isEditing && (
            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleEdit(exp)}
                className="text-gray-400 hover:text-indigo-600"
                aria-label="Edit experience"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(exp.id)}
                className="text-gray-400 hover:text-red-600"
                aria-label="Delete experience"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm p-6 ${!expanded ? 'mb-6' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Experience</h2>
        {isEditing && !editingId && (
          <button
            onClick={handleAddNew}
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Experience
          </button>
        )}
      </div>

      {editingId === 'new' && (
        <div className="border-l-2 border-indigo-200 pl-4 py-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input
                type="text"
                name="title"
                value={newExperience.title || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Senior Developer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                name="company"
                value={newExperience.company || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Company Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                name="location"
                value={newExperience.location || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. New York, NY"
              />
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={newExperience.startDate?.toString().split('T')[0] || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={newExperience.endDate?.toString().split('T')[0] || ''}
                  onChange={handleInputChange}
                  disabled={newExperience.current}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md ${newExperience.current ? 'bg-gray-100' : ''}`}
                />
              </div>
              <div className="flex items-center mb-1">
                <input
                  type="checkbox"
                  id="current-new"
                  name="current"
                  checked={!!newExperience.current}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="current-new" className="ml-2 block text-sm text-gray-700">
                  Current
                </label>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={newExperience.description || ''}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Describe your role and responsibilities"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setEditingId(null)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (onSave) {
                  onSave({ ...newExperience, id: `exp-${Date.now()}` } as Experience);
                  setEditingId(null);
                }
              }}
              className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {experiences.length > 0 ? (
          experiences.map(renderExperienceItem)
        ) : !isEditing ? (
          <p className="text-gray-500 italic">No experience added yet.</p>
        ) : null}
      </div>
    </div>
  );
};