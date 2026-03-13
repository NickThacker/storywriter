'use client'

import { useActionState, useState } from 'react'
import Image from 'next/image'
import { signIn, signUp, resetPassword } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import logo from '@/app/assets/logo.png'

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password'
type ActionState = { error?: string; success?: string } | null

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

// --- Sign-in form ---
function SignInForm({ initialError }: { initialError?: string }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    signIn,
    initialError ? { error: initialError } : null
  )

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <AuthLabel htmlFor="signin-email">Email</AuthLabel>
        <AuthInput
          id="signin-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          name="email"
          required
        />
      </div>

      <div className="space-y-1.5">
        <AuthLabel htmlFor="signin-password">Password</AuthLabel>
        <AuthInput
          id="signin-password"
          type="password"
          autoComplete="current-password"
          placeholder="Min. 8 characters"
          name="password"
          required
          minLength={8}
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

  const isSuccess = state && 'success' in state && state.success

  if (isSuccess) {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="mx-auto w-10 h-10 border border-[color:var(--gold)]/40 flex items-center justify-center">
          <svg className="w-5 h-5 text-[color:var(--gold)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h3
          className="font-[family-name:var(--font-literata)] text-foreground"
          style={{ fontSize: '1.0625rem', fontWeight: 400 }}
        >
          Check your email
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We sent a confirmation link to your inbox.<br />
          Click it to activate your account.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <AuthLabel htmlFor="signup-email">Email</AuthLabel>
        <AuthInput
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          name="email"
          required
        />
      </div>

      <div className="space-y-1.5">
        <AuthLabel htmlFor="signup-password">Password</AuthLabel>
        <AuthInput
          id="signup-password"
          type="password"
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          name="password"
          required
          minLength={8}
          maxLength={72}
        />
      </div>

      <div className="space-y-1.5">
        <AuthLabel htmlFor="signup-confirm">Confirm Password</AuthLabel>
        <AuthInput
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm your password"
          name="confirmPassword"
          required
          minLength={8}
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
        <h2
          className="font-[family-name:var(--font-literata)] text-foreground"
          style={{ fontSize: '1.0625rem', fontWeight: 400 }}
        >
          Reset Password
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        <div className="space-y-1.5">
          <AuthLabel htmlFor="reset-email">Email</AuthLabel>
          <AuthInput
            id="reset-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            name="email"
            required
          />
        </div>

        {state && 'error' in state && state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        {state && 'success' in state && state.success && (
          <p className="text-sm text-muted-foreground">{state.success}</p>
        )}

        <Button
          type="submit"
          variant="outline"
          className="w-full h-10 text-[0.68rem] uppercase tracking-[0.1em] cursor-pointer"
          style={{ borderRadius: 0 }}
          disabled={isPending}
        >
          {isPending ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors w-full text-center cursor-pointer"
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
    <div className="flex flex-col items-center gap-12">
      <Image
        src={logo}
        alt="Meridian"
        width={200}
        height={100}
        priority
      />

      <div className="w-full max-w-sm space-y-8">
        {mode === 'forgot-password' ? (
          <ForgotPasswordForm onBack={() => setMode('sign-in')} />
        ) : (
          <>
            <div className="flex justify-center gap-8">
              <button
                type="button"
                onClick={() => setMode('sign-in')}
                className={`pb-2 text-[0.65rem] uppercase tracking-[0.1em] transition-colors cursor-pointer ${
                  mode === 'sign-in'
                    ? 'text-[color:var(--gold)] border-b border-[color:var(--gold)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode('sign-up')}
                className={`pb-2 text-[0.65rem] uppercase tracking-[0.1em] transition-colors cursor-pointer ${
                  mode === 'sign-up'
                    ? 'text-[color:var(--gold)] border-b border-[color:var(--gold)]'
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
                    className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
