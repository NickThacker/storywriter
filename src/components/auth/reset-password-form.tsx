'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { updatePassword } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import logo from '@/app/assets/logo.png'

type ActionState = { error?: string; success?: boolean } | null

function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full h-10 bg-transparent border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[color:var(--gold)]/60 transition-colors"
      style={{ borderRadius: 0 }}
    />
  )
}

function AuthLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground"
    >
      {children}
    </label>
  )
}

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
    <div className="flex flex-col items-center gap-12">
      <Image
        src={logo}
        alt="Meridian"
        width={200}
        height={100}
        priority
      />

      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <div
          className="flex h-10 w-10 items-center justify-center border border-[color:var(--gold)]/40"
          style={{ borderRadius: 0 }}
        >
          <Check className="h-4 w-4" style={{ color: 'var(--gold)' }} />
        </div>
        <div className="space-y-2">
          <p
            className="font-[family-name:var(--font-literata)] text-foreground"
            style={{ fontSize: '1.0625rem', fontWeight: 400 }}
          >
            Password updated
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting to dashboard in {seconds}...
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
    <div className="flex flex-col items-center gap-12">
      <Image
        src={logo}
        alt="Meridian"
        width={200}
        height={100}
        priority
      />

      <div className="w-full max-w-sm space-y-8">
        <div>
          <h1
            className="font-[family-name:var(--font-literata)] text-foreground"
            style={{ fontSize: '1.0625rem', fontWeight: 400 }}
          >
            Set New Password
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your new password below.
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          <div className="space-y-1.5">
            <AuthLabel htmlFor="password">New Password</AuthLabel>
            <AuthInput
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Enter new password"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5">
            <AuthLabel htmlFor="confirmPassword">Confirm Password</AuthLabel>
            <AuthInput
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

          <Button
            type="submit"
            variant="outline"
            className="w-full h-10 text-[0.68rem] uppercase tracking-[0.1em] cursor-pointer"
            style={{ borderRadius: 0 }}
            disabled={isPending}
          >
            {isPending ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
