import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { Alert, AlertDescription } from './components/alert'

export function Notice({
  children,
  error = false,
  success = false,
}: {
  children: ReactNode
  error?: boolean
  success?: boolean
}) {
  const Icon = error ? CircleAlert : success ? CircleCheck : Info
  return (
    <Alert
      variant={error ? 'destructive' : 'default'}
      role={error ? 'alert' : 'status'}
      className="notice my-4 wrap-anywhere"
      data-tone={error ? 'error' : success ? 'success' : 'info'}
    >
      <Icon aria-hidden="true" />
      <AlertDescription className="text-base text-inherit">{children}</AlertDescription>
    </Alert>
  )
}
