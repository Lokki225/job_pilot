"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase/client"

export default function CVUploadPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [isUploaded, setIsUploaded] = useState(false)

  // 🔥 Processing steps tracker
  const [processStep, setProcessStep] = useState(0)
  /*
      0 = Not started
      1 = Resume Uploaded
      2 = Resume Parsed
      3 = Profile Created / Updated
  */

  const is_user_connected = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please sign in to upload your resume",
        variant: "destructive",
      })
      return
    }
  }

  useEffect(() => {
    is_user_connected()
  }, [router])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }, [isDragging])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (selectedFile: File) => {
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or Word document",
        variant: "destructive",
      })
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      })
      return
    }

    setFile(selectedFile)
  }

  const uploadFile = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress(10)

    try {
      const fileExt = file.name.split('.').pop()
      const userId = (await supabase.auth.getUser()).data.user?.id
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `user-${userId}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes-files')
        .upload(filePath, file)

      if (uploadError) throw new Error(uploadError.message)

      setUploadProgress(50)

      const { data: { publicUrl } } = await supabase.storage
        .from('resumes-files')
        .getPublicUrl(filePath)

      const { data: resumeData, error: dbError } = await supabase
        .from('resumes')
        .insert([{
          userId,
          fileUrl: publicUrl,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          isActive: true
        }])
        .select()
        .single()

      if (dbError) throw dbError

      // 🔥 Step 1 — Uploaded
      setProcessStep(1)
      setUploadProgress(70)
      setIsUploaded(true)

      // 🔥 Begin parsing
      setProcessStep(1)

      const response = await fetch("/api/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: resumeData.id })
      })

      const result = await response.json()

      // 🔥 Step 2 — Parsed
      if (result) {
        setProcessStep(2)
        setUploadProgress(85)
        
        // Wait for 5 seconds before proceeding to step 3
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        setProcessStep(3)
        setUploadProgress(100)
      }

    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setTimeout(() => setIsUploading(false), 500)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (file) uploadFile()
  }

  const handleContinue = () => {
    router.push("/dashboard/onboarding/preferences")
  }

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <div className="space-y-6">

        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Upload Your Resume</h1>
          <p className="mt-2 text-muted-foreground">
            Let's help you get started by uploading your Resume
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resume Upload</CardTitle>
            <CardDescription>
              Upload your Resume to help us match you with relevant job opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>

            {/* 🚀 PROCESS TRACKER */}
            <div className="mb-8 p-4 border rounded-lg bg-muted/30">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Processing Steps</h3>

              <div className="space-y-3">

                {/* Step 1 */}
                <div className="flex items-center gap-3">
                  {processStep >= 1 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  ) : (
                    <div className="w-5 h-5 border rounded-full"></div>
                  )}
                  <span className="text-sm">Resume Uploaded</span>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-3">
                  {processStep >= 2 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : processStep === 1 ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  ) : (
                    <div className="w-5 h-5 border rounded-full"></div>
                  )}
                  <span className="text-sm">Resume Parsed</span>
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-3">
                  {processStep >= 3 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : processStep === 2 ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  ) : (
                    <div className="w-5 h-5 border rounded-full"></div>
                  )}
                  <span className="text-sm">Profile Created & Updated</span>
                </div>

              </div>
            </div>

            {/* --- ORIGINAL UPLOAD UI BELOW --- */}
            <form onSubmit={handleSubmit}>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  isDragging ? "border-blue-500 bg-blue-50/50" : "border-gray-300 dark:border-gray-700",
                  "hover:border-blue-400 hover:bg-blue-50/30 dark:hover:border-blue-500 dark:hover:bg-slate-800/50"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {!file ? (
                  <div className="space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      PDF or Word document (max 5MB)
                    </p>
                    <input
                      type="file"
                      id="cv-resume"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('cv-resume')?.click()}
                    >
                      Select File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-sm font-medium">{file.name}</p>
                    {isUploading && <Progress value={uploadProgress} className="h-2" />}
                    {!isUploading && !isUploaded && <Button type="submit">Upload Resume</Button>}
                    {isUploaded && (
                      <div className="flex items-center gap-2 text-green-500">
                        <CheckCircle className="w-4 h-4" /> Upload successful!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>

          </CardContent>

          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>

            <Button
              onClick={handleContinue}
              disabled={processStep < 3}
            >
              Continue
            </Button>
          </CardFooter>
        </Card>

      </div>
    </div>
  )
}
