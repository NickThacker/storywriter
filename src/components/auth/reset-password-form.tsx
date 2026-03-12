'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { updatePassword } from '@/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import logo from '@/app/assets/logo.png'

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
    <div className="flex flex-col items-center gap-10">
      <Image
        src={logo}
        alt="Meridian"
        width={180}
        height={90}
        priority
        className="dark:invert-0"
      />

      <div className="w-full max-w-sm flex flex-col items-center gap-5 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/50">
          <Check className="h-5 w-5 text-foreground" />
        </div>
        <div className="space-y-1.5">
          <p className="font-[family-name:var(--font-literata)] italic text-lg text-foreground">Password updated</p>
          <p className="text-sm text-muted-foreground">
            Redirecting to dashboard in {seconds}...
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          Continue now
        </button>
      </div>
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
    <div className="flex flex-col items-center gap-10">
      <Image
        src={logo}
        alt="Meridian"
        width={180}
        height={90}
        priority
        className="dark:invert-0"
      />

      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-literata)] italic text-lg text-foreground">Set New Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your new password below.
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground">New Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Enter new password"
              autoComplete="new-password"
              className="h-10 rounded-sm border-border/50 bg-background focus-visible:ring-[color:var(--gold)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-widest text-muted-foreground">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="h-10 rounded-sm border-border/50 bg-background focus-visible:ring-[color:var(--gold)]"
            />
          </div>

          {state && 'error' in state && state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" className="w-full h-10 rounded-sm" disabled={isPending}>
            {isPending ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
