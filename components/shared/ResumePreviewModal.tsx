import { Profile, ResumePreviewModalProps } from "@/lib/constants";
import { Dialog, Transition } from "@headlessui/react"
import { Mail, MapPin, Phone, X } from "lucide-react";
import { Fragment } from 'react'
import { useState } from "react"


// Add this component just before the main return statement
export const ResumePreviewModal = ({
    isPreviewOpen, 
    experiences,
    education,
    skills,
    certifications,
    languages,
    profile,
    formatDate,
    setIsPreviewOpen,

}: ResumePreviewModalProps) => {
    

    return (
        <Transition appear show={isPreviewOpen} as={Fragment}>
            <Dialog
            as="div"
            className="relative z-50"
            onClose={() => setIsPreviewOpen(false)}
            >
            <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                >
                    <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all">
                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title
                        as="h3"
                        className="text-2xl font-bold text-gray-900 dark:text-white"
                        >
                        Resume Preview
                        </Dialog.Title>
                        <button
                        type="button"
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        onClick={() => setIsPreviewOpen(false)}
                        >
                        <span className="sr-only">Close</span>
                        <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Resume Content */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-gray-200 dark:border-slate-700">
                        {/* Header */}
                        <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {profile.firstName} {profile.lastName}
                        </h1>
                        <p className="text-lg text-indigo-600 dark:text-indigo-400 mt-2">{profile.headline}</p>
                        <div className="flex justify-center gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
                            {profile.email && (
                            <span className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {profile.email}
                            </span>
                            )}
                            {profile.phone && (
                            <span className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                {profile.phone}
                            </span>
                            )}
                            {profile.location && (
                            <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {profile.location}
                            </span>
                            )}
                        </div>
                        </div>

                        {/* Bio */}
                        {profile.bio && (
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2 mb-4">
                            About Me
                            </h2>
                            <p className="text-gray-700 dark:text-gray-300">{profile.bio}</p>
                        </div>
                        )}

                        {/* Experience */}
                        {experiences.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2 mb-4">
                            Experience
                            </h2>
                            <div className="space-y-6">
                            {experiences.map((exp) => (
                                <div key={exp.id} className="border-l-2 border-indigo-200 dark:border-indigo-700 pl-4">
                                <div className="flex justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{exp.title}</h3>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                                    </div>
                                </div>
                                <p className="text-indigo-600 dark:text-indigo-400">{exp.company} • {exp.location}</p>
                                {exp.description && (
                                    <p className="mt-2 text-gray-700 dark:text-gray-300">{exp.description}</p>
                                )}
                                </div>
                            ))}
                            </div>
                        </div>
                        )}

                        {/* Education */}
                        {education.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2 mb-4">
                            Education
                            </h2>
                            <div className="space-y-4">
                            {education.map((edu) => (
                                <div key={edu.id} className="border-l-2 border-gray-200 dark:border-slate-600 pl-4">
                                <div className="flex justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{edu.degree}</h3>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatDate(edu.startDate)} - {edu.current ? 'Present' : formatDate(edu.endDate)}
                                    </div>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300">{edu.school}</p>
                                {edu.field && <p className="text-sm text-gray-600 dark:text-gray-400">{edu.field}</p>}
                                </div>
                            ))}
                            </div>
                        </div>
                        )}

                        {/* Skills */}
                        {skills.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2 mb-4">
                            Skills
                            </h2>
                            <div className="flex flex-wrap gap-2">
                            {skills.map((skill) => (
                                <span
                                key={skill.id}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300"
                                >
                                {skill.name}
                                </span>
                            ))}
                            </div>
                        </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600"
                        onClick={() => setIsPreviewOpen(false)}
                        >
                        Close
                        </button>
                        <button
                        type="button"
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                        onClick={() => {
                            // Add download functionality here
                            console.log('Downloading resume...')
                        }}
                        >
                        Download PDF
                        </button>
                    </div>
                    </Dialog.Panel>
                </Transition.Child>
                </div>
            </div>
            </Dialog>
        </Transition>
    );
}