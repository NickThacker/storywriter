'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updatePassword } from '@/actions/auth'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

type ActionState = { error?: string; success?: boolean } | null

function SuccessState() {
  const router = useRouter()
  const [seconds, setSeconds] = useState(3)

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          router.push('/dashboard')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [router])

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-2xl font-bold text-foreground">Meridian</p>
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary">
            <Check className="h-5 w-5 text-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">Password updated</p>
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard in {seconds}...
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Continue now
          </button>
        </CardContent>
      </Card>
    </div>
  )
}

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updatePassword,
    null
  )

  if (state && 'success' in state && state.success) {
    return <SuccessState />
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-2xl font-bold text-foreground">Meridian</p>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-xl font-semibold text-center">Set New Password</h1>
          <p className="text-sm text-muted-foreground text-center">
            Enter your new password below.
          </p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </div>

            {state && 'error' in state && state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
