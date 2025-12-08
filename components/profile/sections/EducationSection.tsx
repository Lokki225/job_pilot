// components/profile/sections/EducationSection.tsx
import { GraduationCap, Calendar, MapPin, Edit2, Trash2, Plus } from 'lucide-react';
import { useState } from 'react';

interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  description: string;
  location: string;
}

interface EducationSectionProps {
  education: Education[];
  isEditing: boolean;
  expanded?: boolean;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSave?: (education: Education) => void;
  onCancel?: () => void;
}

export const EducationSection = ({
  education = [],
  isEditing,
  expanded = false,
  onAdd,
  onEdit,
  onDelete,
  onSave,
  onCancel
}: EducationSectionProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newEducation, setNewEducation] = useState<Partial<Education>>({
    school: '',
    degree: '',
    field: '',
    startDate: '',
    endDate: null,
    current: false,
    description: '',
    location: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setNewEducation(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'current' && checked ? { endDate: null } : {})
    }));
  };

  const handleSave = () => {
    if (onSave && editingId) {
      onSave({ ...newEducation, id: editingId } as Education);
      setEditingId(null);
    }
  };

  const handleAddNew = () => {
    onAdd();
    setEditingId('new');
    setNewEducation({
      school: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: null,
      current: false,
      description: '',
      location: ''
    });
  };

  const handleEdit = (edu: Education) => {
    setEditingId(edu.id);
    setNewEducation(edu);
  };

  const renderEducationItem = (edu: Education) => {
    if (editingId === edu.id) {
      return (
        <div key={edu.id} className="border-l-2 border-indigo-200 pl-4 py-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
              <input
                type="text"
                name="school"
                value={newEducation.school || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="University Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
              <input
                type="text"
                name="degree"
                value={newEducation.degree || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Bachelor of Science"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
              <input
                type="text"
                name="field"
                value={newEducation.field || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Computer Science"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                name="location"
                value={newEducation.location || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Boston, MA"
              />
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={newEducation.startDate?.toString().split('T')[0] || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={newEducation.endDate?.toString().split('T')[0] || ''}
                  onChange={handleInputChange}
                  disabled={newEducation.current}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md ${newEducation.current ? 'bg-gray-100' : ''}`}
                />
              </div>
              <div className="flex items-center mb-1">
                <input
                  type="checkbox"
                  id={`current-edu-${edu.id}`}
                  name="current"
                  checked={!!newEducation.current}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor={`current-edu-${edu.id}`} className="ml-2 block text-sm text-gray-700">
                  Currently Attending
                </label>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={newEducation.description || ''}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Additional details about your education"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setEditingId(null);
                onCancel?.();
              }}
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
      <div key={edu.id} className="border-l-2 border-gray-200 pl-4 py-4 group">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{edu.degree}</h3>
            <p className="text-indigo-600">{edu.school}</p>
            {edu.field && <p className="text-gray-600 text-sm mt-1">{edu.field}</p>}
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <Calendar className="w-4 h-4 mr-1" />
              <span>
                {new Date(edu.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })} -{' '}
                {edu.current ? 'Present' : edu.endDate ? new Date(edu.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'Present'}
              </span>
              {edu.location && (
                <>
                  <span className="mx-2">•</span>
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{edu.location}</span>
                </>
              )}
            </div>
            {edu.description && (
              <p className="mt-2 text-gray-700 whitespace-pre-line text-sm">{edu.description}</p>
            )}
          </div>
          {isEditing && (
            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleEdit(edu)}
                className="text-gray-400 hover:text-indigo-600"
                aria-label="Edit education"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(edu.id)}
                className="text-gray-400 hover:text-red-600"
                aria-label="Delete education"
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
        <h2 className="text-xl font-semibold text-gray-900">Education</h2>
        {isEditing && !editingId && (
          <button
            onClick={handleAddNew}
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Education
          </button>
        )}
      </div>

      {editingId === 'new' && (
        <div className="border-l-2 border-indigo-200 pl-4 py-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
              <input
                type="text"
                name="school"
                value={newEducation.school || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="University Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
              <input
                type="text"
                name="degree"
                value={newEducation.degree || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Bachelor of Science"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
              <input
                type="text"
                name="field"
                value={newEducation.field || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Computer Science"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                name="location"
                value={newEducation.location || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Boston, MA"
              />
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={newEducation.startDate?.toString().split('T')[0] || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={newEducation.endDate?.toString().split('T')[0] || ''}
                  onChange={handleInputChange}
                  disabled={newEducation.current}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md ${newEducation.current ? 'bg-gray-100' : ''}`}
                />
              </div>
              <div className="flex items-center mb-1">
                <input
                  type="checkbox"
                  id="current-edu-new"
                  name="current"
                  checked={!!newEducation.current}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="current-edu-new" className="ml-2 block text-sm text-gray-700">
                  Currently Attending
                </label>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={newEducation.description || ''}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Additional details about your education"
              />
            </div>
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
                  onSave({ ...newEducation, id: `edu-${Date.now()}` } as Education);
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
        {education.length > 0 ? (
          education.map(renderEducationItem)
        ) : !isEditing ? (
          <p className="text-gray-500 italic">No education history added yet.</p>
        ) : null}
      </div>
    </div>
  );
};