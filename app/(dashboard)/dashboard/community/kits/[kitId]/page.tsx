"use client"

import { useParams } from "next/navigation"
import { InterviewKitEditor } from "@/components/kits/InterviewKitEditor"

export default function KitEditorPage() {
  const params = useParams()
  const kitId = params.kitId as string

  return <InterviewKitEditor kitId={kitId} />
}
