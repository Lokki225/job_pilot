import * as Sentry from '@sentry/nextjs'

function isEnabledFlag(value: string | undefined): boolean {
  return value === '1' || value === 'true'
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tunnel: '/monitoring',
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  enabled:
    (!!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production') ||
    (!!process.env.NEXT_PUBLIC_SENTRY_DSN && isEnabledFlag(process.env.NEXT_PUBLIC_SENTRY_ENABLED)),
  tracesSampleRate: 0.1,
})
