'use client'

import { useActionState, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn, signUp, resetPassword } from '@/actions/auth'
import {
  loginSchema,
  signUpSchema,
  resetPasswordSchema,
  type LoginInput,
  type SignUpInput,
  type ResetPasswordInput,
} from '@/lib/validations/auth'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password'
type ActionState = { error?: string; success?: string } | null

// --- Sign-in form ---
function SignInForm({ initialError }: { initialError?: string }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    signIn,
    initialError ? { error: initialError } : null
  )

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        handleSubmit(() => {})(e)
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...register('email')}
          name="email"
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          placeholder="Min. 8 characters"
          {...register('password')}
          name="password"
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {state && 'error' in state && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
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

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) })

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        handleSubmit(() => {})(e)
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...register('email')}
          name="email"
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          {...register('password')}
          name="password"
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-confirm">Confirm Password</Label>
        <Input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm your password"
          {...register('confirmPassword')}
          name="confirmPassword"
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {state && 'error' in state && state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {state && 'success' in state && state.success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <p className="text-sm text-green-800">{state.success}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
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

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Reset Password</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form
        action={formAction}
        onSubmit={(e) => {
          handleSubmit(() => {})(e)
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
            name="email"
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {state && 'error' in state && state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        {state && 'success' in state && state.success && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3">
            <p className="text-sm text-green-800">{state.success}</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline w-full text-center"
      >
        Back to sign in
      </button>
    </div>
  )
}

// --- Main AuthForm component ---
interface AuthFormProps {
  initialError?: string
}

export function AuthForm({ initialError }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>('sign-in')

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-2xl font-bold text-foreground">StoryWriter</p>

      <Card className="w-full max-w-sm">
        <CardHeader className="pb-2">
          {mode === 'forgot-password' ? null : (
            <p className="text-sm text-muted-foreground text-center">
              Sign in or create an account to continue
            </p>
          )}
        </CardHeader>
        <CardContent>
          {mode === 'forgot-password' ? (
            <ForgotPasswordForm onBack={() => setMode('sign-in')} />
          ) : (
            <Tabs
              value={mode}
              onValueChange={(v) => setMode(v as AuthMode)}
            >
              <TabsList className="w-full mb-4">
                <TabsTrigger value="sign-in" className="flex-1">
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="sign-up" className="flex-1">
                  Create account
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sign-in">
                <SignInForm initialError={initialError} />
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => setMode('forgot-password')}
                    className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="sign-up">
                <SignUpForm />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
