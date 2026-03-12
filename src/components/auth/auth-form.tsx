'use client'

import { useActionState, useState } from 'react'
import Image from 'next/image'
import { signIn, signUp, resetPassword } from '@/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import logo from '@/app/assets/logo.png'

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password'
type ActionState = { error?: string; success?: string } | null

// --- Sign-in form ---
function SignInForm({ initialError }: { initialError?: string }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    signIn,
    initialError ? { error: initialError } : null
  )

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="signin-email" className="text-xs uppercase tracking-widest text-muted-foreground">Email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          name="email"
          required
          className="h-10 rounded-sm border-border/50 bg-background focus-visible:ring-[color:var(--gold)]"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signin-password" className="text-xs uppercase tracking-widest text-muted-foreground">Password</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          placeholder="Min. 8 characters"
          name="password"
          required
          minLength={8}
          className="h-10 rounded-sm border-border/50 bg-background focus-visible:ring-[color:var(--gold)]"
        />
      </div>

      {state && 'error' in state && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" className="w-full h-10 rounded-sm" disabled={isPending}>
        {isPending ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}

// --- Sign-up form ---
function SignUpForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    signUp,
    null
  )

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="signup-email" className="text-xs uppercase tracking-widest text-muted-foreground">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          name="email"
          required
          className="h-10 rounded-sm border-border/50 bg-background focus-visible:ring-[color:var(--gold)]"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-password" className="text-xs uppercase tracking-widest text-muted-foreground">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          name="password"
          required
          minLength={8}
          maxLength={72}
          className="h-10 rounded-sm border-border/50 bg-background focus-visible:ring-[color:var(--gold)]"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-confirm" className="text-xs uppercase tracking-widest text-muted-foreground">Confirm Password</Label>
        <Input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm your password"
          name="confirmPassword"
          required
          minLength={8}
          className="h-10 rounded-sm border-border/50 bg-background focus-visible:ring-[color:var(--gold)]"
        />
      </div>

      {state && 'error' in state && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {state && 'success' in state && state.success && (
        <p className="text-sm text-muted-foreground">{state.success}</p>
      )}

      <Button type="submit" className="w-full h-10 rounded-sm" disabled={isPending}>
        {isPending ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  )
}

// --- Forgot password form ---
function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    resetPassword,
    null
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-[family-name:var(--font-literata)] italic text-lg text-foreground">Reset Password</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="reset-email" className="text-xs uppercase tracking-widest text-muted-foreground">Email</Label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            name="email"
            required
            className="h-10 rounded-sm border-border/50 bg-background focus-visible:ring-[color:var(--gold)]"
          />
        </div>

        {state && 'error' in state && state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        {state && 'success' in state && state.success && (
          <p className="text-sm text-muted-foreground">{state.success}</p>
        )}

        <Button type="submit" className="w-full h-10 rounded-sm" disabled={isPending}>
          {isPending ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors w-full text-center"
      >
        Back to sign in
      </button>
    </div>
  )
}

// --- Main AuthForm component ---
interface AuthFormProps {
  initialError?: string
  initialMode?: AuthMode
}

export function AuthForm({ initialError, initialMode }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode ?? 'sign-in')

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
        {mode === 'forgot-password' ? (
          <ForgotPasswordForm onBack={() => setMode('sign-in')} />
        ) : (
          <>
            <p className="text-sm text-muted-foreground text-center">
              Sign in or create an account to continue
            </p>

            <div className="flex justify-center gap-6 border-b border-border/50">
              <button
                type="button"
                onClick={() => setMode('sign-in')}
                className={`pb-2.5 text-xs uppercase tracking-widest transition-colors ${
                  mode === 'sign-in'
                    ? 'text-foreground border-b border-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode('sign-up')}
                className={`pb-2.5 text-xs uppercase tracking-widest transition-colors ${
                  mode === 'sign-up'
                    ? 'text-foreground border-b border-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Create account
              </button>
            </div>

            {mode === 'sign-in' && (
              <>
                <SignInForm initialError={initialError} />
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode('forgot-password')}
                    className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            {mode === 'sign-up' && <SignUpForm />}
          </>
        )}
      </div>
    </div>
  )
}
