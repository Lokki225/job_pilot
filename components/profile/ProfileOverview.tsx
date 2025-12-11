// components/profile/ProfileOverview.tsx
import { ReactNode } from 'react';
import { AboutSection } from './sections/AboutSection';
import { ExperienceSection } from './sections/ExperienceSection';
import { EducationSection } from './sections/EducationSection';
import { SkillsSection } from './sections/SkillsSection';
import { CertificationsSection } from './sections/CertificationsSection';

interface ProfileOverviewProps {
  activeTab: string;
  profile: any;
  experiences: any[];
  education: any[];
  skills: any[];
  certifications: any[];
  isEditing: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSave: () => void;
  onCancel: () => void;
  onAddItem: (type: string) => void;
  onEditItem: (type: string, id: string) => void;
  onDeleteItem: (type: string, id: string) => void;
  onSaveSkill?: (skill: any) => void;
  onSaveExperience?: (experience: any) => void;
  onSaveEducation?: (education: any) => void;
  onSaveCertification?: (certification: any) => void;
}

export const ProfileOverview = ({
  activeTab,
  profile,
  experiences,
  education,
  skills,
  certifications,
  isEditing,
  onInputChange,
  onSave,
  onCancel,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onSaveSkill,
  onSaveExperience,
  onSaveEducation,
  onSaveCertification
}: ProfileOverviewProps) => {
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <AboutSection
              profile={profile}
              isEditing={isEditing}
              onInputChange={(e) => onInputChange(e)}
            />
            <ExperienceSection
              experiences={experiences}
              isEditing={isEditing}
              onAdd={() => onAddItem('experience')}
              onEdit={(id) => onEditItem('experience', id)}
              onDelete={(id) => onDeleteItem('experience', id)}
              onSave={onSaveExperience}
            />
            <EducationSection
              education={education}
              isEditing={isEditing}
              onAdd={() => onAddItem('education')}
              onEdit={(id) => onEditItem('education', id)}
              onDelete={(id) => onDeleteItem('education', id)}
              onSave={onSaveEducation}
            />
            <SkillsSection
              skills={skills}
              isEditing={isEditing}
              onAdd={() => onAddItem('skill')}
              onDelete={(id) => onDeleteItem('skill', id)}
              onSave={onSaveSkill}
            />
            <CertificationsSection
              certifications={certifications}
              isEditing={isEditing}
              onAdd={() => onAddItem('certification')}
              onDelete={(id) => onDeleteItem('certification', id)}
              onSave={onSaveCertification}
            />
          </div>
        );
      case 'experience':
        return (
          <ExperienceSection
            experiences={experiences}
            isEditing={isEditing}
            onAdd={() => onAddItem('experience')}
            onEdit={(id) => onEditItem('experience', id)}
            onDelete={(id) => onDeleteItem('experience', id)}
            onSave={onSaveExperience}
            expanded
          />
        );
      case 'education':
        return (
          <EducationSection
            education={education}
            isEditing={isEditing}
            onAdd={() => onAddItem('education')}
            onEdit={(id) => onEditItem('education', id)}
            onDelete={(id) => onDeleteItem('education', id)}
            onSave={onSaveEducation}
            expanded
          />
        );
      case 'skills':
        return (
          <SkillsSection
            skills={skills}
            isEditing={isEditing}
            onAdd={() => onAddItem('skill')}
            onDelete={(id) => onDeleteItem('skill', id)}
            onSave={onSaveSkill}
            expanded
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      {renderContent()}
    </div>
  );
};