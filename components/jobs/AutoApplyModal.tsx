"use client"

import { useState, useEffect } from 'react'
import {
  Send,
  Loader2,
  Mail,
  User,
  Building2,
  FileText,
  CheckCircle,
  AlertCircle,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { sendJobApplication, checkAutoApplyStatus } from '@/lib/actions/auto-apply.action'
import { toast } from '@/components/ui/use-toast'

interface AutoApplyModalProps {
  isOpen: boolean
  onClose: () => void
  jobApplicationId: string
  jobTitle: string
  company: string
  contactEmail?: string
  contactName?: string
  coverLetter: {
    id: string
    content: string
    subject: string
  }
  onSuccess?: () => void
}

export function AutoApplyModal({
  isOpen,
  onClose,
  jobApplicationId,
  jobTitle,
  company,
  contactEmail: initialEmail,
  contactName: initialName,
  coverLetter,
  onSuccess,
}: AutoApplyModalProps) {
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  
  const [recipientEmail, setRecipientEmail] = useState(initialEmail || '')
  const [recipientName, setRecipientName] = useState(initialName || '')
  const [subject, setSubject] = useState(coverLetter.subject)
  const [emailBody, setEmailBody] = useState(coverLetter.content)
  
  const [activeTab, setActiveTab] = useState('edit')

  // Check if email service is configured
  useEffect(() => {
    if (isOpen) {
      checkAutoApplyStatus().then(status => {
        setIsConfigured(status.emailConfigured)
      })
    }
  }, [isOpen])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSent(false)
      setRecipientEmail(initialEmail || '')
      setRecipientName(initialName || '')
      setSubject(coverLetter.subject)
      setEmailBody(coverLetter.content)
      setActiveTab('edit')
    }
  }, [isOpen, initialEmail, initialName, coverLetter])

  const handleSend = async () => {
    if (!recipientEmail) {
      toast({
        title: 'Email Required',
        description: 'Please enter the recipient email address',
        variant: 'destructive',
      })
      return
    }

    setIsSending(true)
    try {
      const result = await sendJobApplication({
        jobApplicationId,
        coverLetterId: coverLetter.id,
        recipientEmail,
        recipientName: recipientName || undefined,
        subject,
        customBody: emailBody !== coverLetter.content ? emailBody : undefined,
      })

      if (result.data?.success) {
        setIsSent(true)
        toast({
          title: 'Application Sent!',
          description: `Your application has been sent to ${company}`,
        })
        onSuccess?.()
      } else {
        toast({
          title: 'Send Failed',
          description: result.error || 'Failed to send application',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('Send error:', err)
      toast({
        title: 'Error',
        description: 'Failed to send application',
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  // Success state
  if (isSent) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Application Sent!
            </h2>
            <p className="text-slate-600 mb-6">
              Your application for {jobTitle} at {company} has been sent to {recipientEmail}
            </p>
            <Button onClick={onClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            Send Application
          </DialogTitle>
          <DialogDescription>
            Send your application for {jobTitle} at {company}
          </DialogDescription>
        </DialogHeader>

        {/* Service not configured warning */}
        {isConfigured === false && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900">Email Service Not Configured</h4>
              <p className="text-sm text-amber-700">
                Add RESEND_API_KEY to your environment to enable email sending.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6 py-4">
          {/* Recipient Info */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Recipient Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="hr@company.com"
                />
              </div>
              <div>
                <Label>Recipient Name (optional)</Label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Hiring Manager"
                />
              </div>
            </div>

            <div>
              <Label>Subject Line</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Application for..."
              />
            </div>
          </div>

          {/* Email Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit" className="gap-2">
                <FileText className="w-4 h-4" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="mt-4">
              <div>
                <Label>Email Body (Cover Letter)</Label>
                <Textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="bg-white border rounded-lg p-6 space-y-4">
                <div className="border-b pb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <span className="font-medium">To:</span>
                    <span>{recipientEmail || 'recipient@company.com'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="font-medium">Subject:</span>
                    <span>{subject}</span>
                  </div>
                </div>
                
                <div className="prose prose-sm max-w-none">
                  {emailBody.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="mb-4">
                      {paragraph.split('\n').map((line, j) => (
                        <span key={j}>
                          {line}
                          {j < paragraph.split('\n').length - 1 && <br />}
                        </span>
                      ))}
                    </p>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Application Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-blue-700">
                <Building2 className="w-4 h-4" />
                <span>{company}</span>
              </div>
              <div className="flex items-center gap-2 text-blue-700">
                <FileText className="w-4 h-4" />
                <span>{jobTitle}</span>
              </div>
              <div className="flex items-center gap-2 text-blue-700">
                <Mail className="w-4 h-4" />
                <span>{recipientEmail || 'Not set'}</span>
              </div>
              <div className="flex items-center gap-2 text-blue-700">
                <User className="w-4 h-4" />
                <span>{recipientName || 'Hiring Manager'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !recipientEmail || isConfigured === false}
              className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Application
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
