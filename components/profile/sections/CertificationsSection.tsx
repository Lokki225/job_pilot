// components/profile/sections/CertificationsSection.tsx
import { Award, Calendar, Edit2, ExternalLink, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expirationDate: string | null;
  credentialId?: string;
  credentialUrl?: string;
  isExpired?: boolean;
}

interface CertificationsSectionProps {
  certifications: Certification[];
  isEditing: boolean;
  expanded?: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onSave?: (certification: Certification) => void;
  onCancel?: () => void;
}

export const CertificationsSection = ({
  certifications = [],
  isEditing,
  expanded = false,
  onAdd,
  onDelete,
  onSave,
  onCancel
}: CertificationsSectionProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newCertification, setNewCertification] = useState<Partial<Certification>>({
    name: '',
    issuer: '',
    issueDate: '',
    expirationDate: null,
    credentialId: '',
    credentialUrl: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setNewCertification(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleAddCertification = () => {
    if (!newCertification.name?.trim() || !newCertification.issuer?.trim() || !newCertification.issueDate) return;
    
    if (onSave) {
      onSave({
        id: `cert-${Date.now()}`,
        name: newCertification.name,
        issuer: newCertification.issuer,
        issueDate: newCertification.issueDate,
        expirationDate: newCertification.expirationDate || null,
        credentialId: newCertification.credentialId,
        credentialUrl: newCertification.credentialUrl,
        isExpired: newCertification.expirationDate 
          ? new Date(newCertification.expirationDate) < new Date() 
          : false
      });
    }
    
    setNewCertification({
      name: '',
      issuer: '',
      issueDate: '',
      expirationDate: null,
      credentialId: '',
      credentialUrl: ''
    });
    setIsAdding(false);
  };

  const handleEdit = (cert: Certification) => {
    setEditingId(cert.id);
    setNewCertification(cert);
  };

  const handleSaveEdit = () => {
    if (onSave && editingId && newCertification.name?.trim() && newCertification.issuer?.trim() && newCertification.issueDate) {
      onSave({
        id: editingId,
        name: newCertification.name,
        issuer: newCertification.issuer,
        issueDate: newCertification.issueDate,
        expirationDate: newCertification.expirationDate || null,
        credentialId: newCertification.credentialId,
        credentialUrl: newCertification.credentialUrl,
        isExpired: newCertification.expirationDate 
          ? new Date(newCertification.expirationDate) < new Date() 
          : false
      });
      setEditingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  };

  const getExpirationStatus = (expirationDate: string | null) => {
    if (!expirationDate) return { text: 'No Expiration', color: 'text-gray-500' };
    
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: 'Expired', color: 'text-red-600' };
    } else if (diffDays <= 30) {
      return { text: `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`, color: 'text-yellow-600' };
    } else {
      return { text: `Expires ${formatDate(expirationDate)}`, color: 'text-green-600' };
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 ${!expanded ? 'mb-6' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Certifications</h2>
        {isEditing && !editingId && !isAdding && (
          <button
            onClick={() => {
              setIsAdding(true);
              setNewCertification({
                name: '',
                issuer: '',
                issueDate: '',
                expirationDate: null,
                credentialId: '',
                credentialUrl: ''
              });
            }}
            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Certification
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="mb-6 p-4 border border-dashed border-gray-200 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Certification Name*</label>
              <input
                type="text"
                name="name"
                value={newCertification.name || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. AWS Certified Solutions Architect"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Organization*</label>
              <input
                type="text"
                name="issuer"
                value={newCertification.issuer || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Amazon Web Services"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credential ID</label>
              <input
                type="text"
                name="credentialId"
                value={newCertification.credentialId || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. ABC123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date*</label>
              <input
                type="date"
                name="issueDate"
                value={newCertification.issueDate?.toString().split('T')[0] || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
              <input
                type="date"
                name="expirationDate"
                value={newCertification.expirationDate?.toString().split('T')[0] || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <div className="mt-1 flex items-center">
                <input
                  id="no-expiration"
                  type="checkbox"
                  checked={!newCertification.expirationDate}
                  onChange={() => {
                    setNewCertification(prev => ({
                      ...prev,
                      expirationDate: prev.expirationDate ? null : new Date().toISOString().split('T')[0]
                    }));
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="no-expiration" className="ml-2 block text-sm text-gray-700">
                  No expiration
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Credential URL</label>
              <input
                type="url"
                name="credentialUrl"
                value={newCertification.credentialUrl || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://example.com/verify/abc123"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => {
                if (isAdding) {
                  setIsAdding(false);
                } else {
                  setEditingId(null);
                }
                onCancel?.();
              }}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={isAdding ? handleAddCertification : handleSaveEdit}
              disabled={!newCertification.name?.trim() || !newCertification.issuer?.trim() || !newCertification.issueDate}
              className={`px-3 py-1 text-sm rounded-md ${
                newCertification.name?.trim() && newCertification.issuer?.trim() && newCertification.issueDate
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isAdding ? 'Add Certification' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {certifications.length > 0 ? (
          <div className="space-y-4">
            {certifications.map((cert) => (
              <div
                key={cert.id}
                className="group relative p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900">{cert.name}</h3>
                      {cert.isExpired && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-indigo-600">{cert.issuer}</p>
                    
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1.5 text-gray-400" />
                        <span>Issued {formatDate(cert.issueDate)}</span>
                      </div>
                      {cert.expirationDate && (
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1.5 text-gray-400" />
                          <span className={getExpirationStatus(cert.expirationDate).color}>
                            {getExpirationStatus(cert.expirationDate).text}
                          </span>
                        </div>
                      )}
                      {cert.credentialId && (
                        <div className="flex items-center">
                          <span className="font-medium">ID:</span>
                          <span className="ml-1 font-mono">{cert.credentialId}</span>
                        </div>
                      )}
                    </div>

                    {cert.credentialUrl && (
                      <a
                        href={cert.credentialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        <span>View Credential</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </a>
                    )}
                  </div>
                  {isEditing && !editingId && (
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(cert)}
                        className="text-gray-400 hover:text-indigo-600"
                        aria-label="Edit certification"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(cert.id)}
                        className="text-gray-400 hover:text-red-600"
                        aria-label="Delete certification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : !isEditing ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Award className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-gray-500 text-sm">No certifications added yet</h3>
            {isEditing && (
              <button
                onClick={() => setIsAdding(true)}
                className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Add your first certification
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};