"use client"

import { useState } from "react"
import * as Sentry from "@sentry/nextjs"
import { Button } from "@/components/ui/button"

type SendStatus = "idle" | "sending" | "sent" | "error"

export default function SentryExamplePage() {
  const [status, setStatus] = useState<SendStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")

  const sendTestEvent = async () => {
    try {
      setStatus("sending")
      setErrorMessage("")

      Sentry.captureException(new Error("Sentry verification test error Lokki"))

      const flushed = await Sentry.flush(10000)
      if (!flushed) {
        setStatus("error")
        setErrorMessage(
          "Sentry.flush timed out. If you're using an adblocker or network blocks, enable the /monitoring tunnel and retry."
        )
        return
      }

      setStatus("sent")
    } catch (err) {
      setStatus("error")
      setErrorMessage(err instanceof Error ? err.message : "Failed to send event")
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-xl font-semibold">Sentry Example Page</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Click the button to send a test error to Sentry.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={sendTestEvent} disabled={status === "sending"}>
          {status === "sending" ? "Sending..." : "Send test error"}
        </Button>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Status: <span className="font-medium">{status}</span>
        </div>
      </div>

      {status === "error" && errorMessage ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-6 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
        <div className="font-medium">Required env vars (for local verification)</div>
        <pre className="mt-2 overflow-auto text-xs text-slate-600 dark:text-slate-400">
{`NEXT_PUBLIC_SENTRY_DSN=...\nNEXT_PUBLIC_SENTRY_ENABLED=true\n\n# optional (server/edge)\nSENTRY_DSN=...\nSENTRY_ENABLED=true`}
        </pre>
      </div>
    </div>
  )
}
