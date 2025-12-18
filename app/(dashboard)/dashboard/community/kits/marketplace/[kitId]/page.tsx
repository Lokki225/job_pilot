"use client"

import { useParams } from "next/navigation"
import { InterviewKitDetails } from "@/components/kits/InterviewKitDetails"

export default function MarketplaceKitDetailsPage() {
  const params = useParams()
  const kitId = params.kitId as string

  return <InterviewKitDetails kitId={kitId} />
}
