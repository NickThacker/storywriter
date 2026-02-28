'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/actions/auth'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

type ActionState = { error?: string } | null

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updatePassword,
    null
  )

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-2xl font-bold text-foreground">StoryWriter</p>
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
