// components/profile/sections/SkillsSection.tsx
import { Code, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface Skill {
  id: string;
  name: string;
  level: number; // 1-5 scale
  category?: string;
}

interface SkillsSectionProps {
  skills: Skill[];
  isEditing: boolean;
  expanded?: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onSave?: (skill: Skill) => void;
  onCancel?: () => void;
}

export const SkillsSection = ({
  skills = [],
  isEditing,
  expanded = false,
  onAdd,
  onDelete,
  onSave,
  onCancel
}: SkillsSectionProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState<Partial<Skill>>({
    name: '',
    level: 3,
    category: 'Technical'
  });
  const [isAdding, setIsAdding] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewSkill(prev => ({
      ...prev,
      [name]: name === 'level' ? parseInt(value, 10) : value
    }));
  };

  const handleAddSkill = () => {
    if (!newSkill.name?.trim()) return;
    
    if (onSave) {
      onSave({
        id: `skill-${Date.now()}`,
        name: newSkill.name,
        level: newSkill.level || 3,
        category: newSkill.category || 'Technical'
      });
    }
    
    setNewSkill({
      name: '',
      level: 3,
      category: 'Technical'
    });
    setIsAdding(false);
  };

  const handleEdit = (skill: Skill) => {
    setEditingId(skill.id);
    setNewSkill(skill);
  };

  const handleSaveEdit = () => {
    if (onSave && editingId && newSkill.name?.trim()) {
      onSave({
        id: editingId,
        name: newSkill.name,
        level: newSkill.level || 3,
        category: newSkill.category || 'Technical'
      });
      setEditingId(null);
    }
  };

  const renderSkillLevel = (level: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full mx-0.5 ${
              i <= level ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 ${!expanded ? 'mb-6' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Skills</h2>
        {isEditing && !editingId && !isAdding && (
          <button
            onClick={() => {
              setIsAdding(true);
              setNewSkill({
                name: '',
                level: 3,
                category: 'Technical'
              });
            }}
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Skill
          </button>
        )}
      </div>

      {isAdding && (
        <div className="mb-4 p-4 border border-dashed border-gray-200 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Skill Name</label>
              <input
                type="text"
                name="name"
                value={newSkill.name || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. JavaScript, Project Management"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={newSkill.category || 'Technical'}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="Technical">Technical</option>
                <option value="Soft Skills">Soft Skills</option>
                <option value="Languages">Languages</option>
                <option value="Tools">Tools</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Proficiency</label>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">Beginner</span>
                <input
                  type="range"
                  name="level"
                  min="1"
                  max="5"
                  value={newSkill.level || 3}
                  onChange={handleInputChange}
                  className="flex-1"
                />
                <span className="text-xs text-gray-500">Expert</span>
                <span className="text-sm font-medium w-8 text-center">
                  {newSkill.level || 3}/5
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => {
                setIsAdding(false);
                onCancel?.();
              }}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSkill}
              disabled={!newSkill.name?.trim()}
              className={`px-3 py-1 text-sm rounded-md ${
                newSkill.name?.trim()
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Add Skill
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {skills.length > 0 ? (
          <div className="space-y-4">
            {['Technical', 'Soft Skills', 'Languages', 'Tools', 'Other'].map((category) => {
              const categorySkills = skills.filter(
                (skill) => skill.category === category
              );
              
              if (categorySkills.length === 0) return null;

              return (
                <div key={category} className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categorySkills.map((skill) =>
                      editingId === skill.id ? (
                        <div
                          key={skill.id}
                          className="p-4 border border-indigo-100 rounded-lg bg-indigo-50"
                        >
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Skill Name
                              </label>
                              <input
                                type="text"
                                name="name"
                                value={newSkill.name || ''}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                autoFocus
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category
                              </label>
                              <select
                                name="category"
                                value={newSkill.category || 'Technical'}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              >
                                <option value="Technical">Technical</option>
                                <option value="Soft Skills">Soft Skills</option>
                                <option value="Languages">Languages</option>
                                <option value="Tools">Tools</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Proficiency
                              </label>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-gray-500">Beginner</span>
                                <input
                                  type="range"
                                  name="level"
                                  min="1"
                                  max="5"
                                  value={newSkill.level || 3}
                                  onChange={handleInputChange}
                                  className="flex-1"
                                />
                                <span className="text-xs text-gray-500">Expert</span>
                                <span className="text-sm font-medium w-8 text-center">
                                  {newSkill.level || 3}/5
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2 mt-4">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              disabled={!newSkill.name?.trim()}
                              className={`px-3 py-1 text-sm rounded-md ${
                                newSkill.name?.trim()
                                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={skill.id}
                          className="group relative p-4 border border-gray-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-gray-100">{skill.name}</h3>
                              <div className="mt-2">
                                {renderSkillLevel(skill.level)}
                              </div>
                            </div>
                            {isEditing && (
                              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEdit(skill)}
                                  className="text-gray-400 hover:text-indigo-600"
                                  aria-label="Edit skill"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onDelete(skill.id)}
                                  className="text-gray-400 hover:text-red-600"
                                  aria-label="Delete skill"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : !isEditing ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Code className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-gray-500 text-sm">No skills added yet</h3>
            {isEditing && (
              <button
                onClick={() => setIsAdding(true)}
                className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Add your first skill
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};