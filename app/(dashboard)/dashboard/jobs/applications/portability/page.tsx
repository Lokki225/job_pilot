"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, Upload } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import {
  exportJobApplications,
  importJobApplications,
} from "@/lib/actions/job-applications-portability.action"

type PortabilityFormat = "json" | "csv"

function guessFormatFromFilename(name: string): PortabilityFormat {
  const lower = name.toLowerCase()
  if (lower.endsWith(".csv")) return "csv"
  return "json"
}

export default function ApplicationsPortabilityPage() {
  const router = useRouter()

  const [exportFormat, setExportFormat] = useState<PortabilityFormat>("json")
  const [isExporting, setIsExporting] = useState(false)

  const [importFormat, setImportFormat] = useState<PortabilityFormat>("json")
  const [importContent, setImportContent] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState<string>("")

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const result = await exportJobApplications(exportFormat)
      if (!result.data) {
        toast({
          title: "Export failed",
          description: result.error || "Failed to export",
          variant: "destructive",
        })
        return
      }

      const blob = new Blob([result.data.content], { type: result.data.mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = result.data.filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast({
        title: "Export ready",
        description: `Downloaded ${result.data.filename}`,
      })
    } catch (err) {
      console.error("Export error:", err)
      toast({
        title: "Export failed",
        description: "Failed to export",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleFilePicked = async (file: File | null) => {
    if (!file) return

    setSelectedFileName(file.name)
    setImportFormat(guessFormatFromFilename(file.name))

    const text = await file.text()
    setImportContent(text)
  }

  const handleImport = async () => {
    if (!importContent.trim()) {
      toast({
        title: "Nothing to import",
        description: "Paste content or choose a file first.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsImporting(true)
      const result = await importJobApplications({
        format: importFormat,
        content: importContent,
      })

      if (!result.data) {
        toast({
          title: "Import failed",
          description: result.error || "Failed to import",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Imported",
        description: `${result.data.inserted} application(s) imported.`,
      })

      setImportContent("")
      setSelectedFileName("")
    } catch (err) {
      console.error("Import error:", err)
      toast({
        title: "Import failed",
        description: "Failed to import",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/jobs/applications")}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Import / Export</h1>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Export and import your job applications (CSV/JSON)
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" />
              Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Format</div>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as PortabilityFormat)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleExport} disabled={isExporting} className="w-full">
              {isExporting ? "Preparing…" : "Download export"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" />
              Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Format</div>
                <Select value={importFormat} onValueChange={(v) => setImportFormat(v as PortabilityFormat)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Choose file</div>
                <Input
                  type="file"
                  accept=".json,.csv,application/json,text/csv,text/plain"
                  onChange={(e) => handleFilePicked(e.target.files?.[0] || null)}
                />
                {selectedFileName ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400">Selected: {selectedFileName}</div>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Paste content</div>
                <Textarea
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  placeholder={importFormat === "csv" ? "Paste CSV here…" : "Paste JSON here…"}
                  className="min-h-[180px]"
                />
              </div>

              <Button onClick={handleImport} disabled={isImporting} className="w-full">
                {isImporting ? "Importing…" : "Import applications"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
