import { NextRequest } from "next/server"

export const runtime = "nodejs"

function parseDsn(dsn: string): {
  ingestUrl: string
  publicKey: string
} {
  // DSN format: https://PUBLIC_KEY@oXXXX.ingest.sentry.io/PROJECT_ID
  const url = new URL(dsn)
  const publicKey = url.username
  const projectId = url.pathname.replace("/", "")

  if (!publicKey || !projectId) {
    throw new Error("Invalid DSN")
  }

  const ingestBase = `${url.protocol}//${url.host}`
  return {
    ingestUrl: `${ingestBase}/api/${projectId}/envelope/`,
    publicKey,
  }
}

export async function POST(request: NextRequest) {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) {
    return new Response("Missing SENTRY_DSN", { status: 500 })
  }

  let ingestUrl: string
  let publicKey: string
  try {
    const parsed = parseDsn(dsn)
    ingestUrl = parsed.ingestUrl
    publicKey = parsed.publicKey
  } catch {
    return new Response("Invalid SENTRY_DSN", { status: 500 })
  }

  const body = await request.arrayBuffer()

  // Forward the envelope exactly as-is.
  let resp: Response
  try {
    resp = await fetch(ingestUrl, {
      method: "POST",
      body,
      headers: {
        "content-type":
          request.headers.get("content-type") || "application/x-sentry-envelope",
        "x-sentry-auth": `Sentry sentry_key=${publicKey}, sentry_version=7, sentry_client=job_pilot_tunnel`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream fetch failed"
    return new Response(message, {
      status: 502,
      headers: {
        "cache-control": "no-store",
      },
    })
  }

  // Sentry SDK expects 200-ish from the tunnel; we return upstream status for easier debugging.
  if (resp.status >= 400) {
    const text = await resp.text().catch(() => "")
    return new Response(text || `Upstream error (${resp.status})`, {
      status: resp.status,
      headers: {
        "cache-control": "no-store",
      },
    })
  }

  return new Response(null, {
    status: 200,
    headers: {
      "cache-control": "no-store",
    },
  })
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "cache-control": "no-store",
    },
  })
}
