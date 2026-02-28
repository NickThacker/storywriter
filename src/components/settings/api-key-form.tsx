'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { saveApiKey, testApiKey, deleteApiKey } from '@/actions/settings'
import { toast } from 'sonner'

interface ApiKeyFormProps {
  initialKeyStatus: {
    hasKey: boolean
    keyHint: string | null
    subscriptionTier: string
  }
}

type TestResult = 'idle' | 'testing' | 'valid' | 'invalid'

export function ApiKeyForm({ initialKeyStatus }: ApiKeyFormProps) {
  const [hasKey, setHasKey] = useState(initialKeyStatus.hasKey)
  const [keyHint, setKeyHint] = useState(initialKeyStatus.keyHint)
  const [isEditing, setIsEditing] = useState(!initialKeyStatus.hasKey)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testResult, setTestResult] = useState<TestResult>('idle')
  const [testError, setTestError] = useState<string | null>(null)

  const [isSavePending, startSaveTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()

  function handleStartEditing() {
    setIsEditing(true)
    setApiKeyInput('')
    setTestResult('idle')
    setTestError(null)
  }

  function handleCancelEditing() {
    setIsEditing(false)
    setApiKeyInput('')
    setTestResult('idle')
    setTestError(null)
  }

  async function handleTest() {
    if (!apiKeyInput.trim()) return

    setTestResult('testing')
    setTestError(null)

    const result = await testApiKey(apiKeyInput.trim())

    if (result.valid) {
      setTestResult('valid')
    } else {
      setTestResult('invalid')
      setTestError(result.error ?? 'Key test failed')
    }
  }

  function handleSave() {
    startSaveTransition(async () => {
      const formData = new FormData()
      formData.append('apiKey', apiKeyInput.trim())

      const result = await saveApiKey(null, formData)

      if ('error' in result) {
        toast.error(result.error)
        return
      }

      // After save, extract last 4 chars locally so we can show the hint
      // (server never sends the full key back)
      const hint = apiKeyInput.trim().slice(-4)
      setHasKey(true)
      setKeyHint(hint)
      setIsEditing(false)
      setApiKeyInput('')
      setTestResult('idle')
      toast.success('API key saved')
    })
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteApiKey()

      if ('error' in result) {
        toast.error(result.error)
        return
      }

      setHasKey(false)
      setKeyHint(null)
      setIsEditing(true)
      toast.success('API key removed')
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          OpenRouter API Key
          {hasKey && !isEditing && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              <CheckCircle className="h-3 w-3" />
              Connected
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Your API key is stored securely and is never exposed in browser requests.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {hasKey && !isEditing ? (
          // ── Key exists — masked display ──────────────────────────────────
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <code className="rounded bg-muted px-3 py-2 font-mono text-sm tracking-widest">
                {'•'.repeat(12)}{keyHint}
              </code>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleStartEditing}>
                Change key
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeletePending}
              >
                {isDeletePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Remove key
              </Button>
            </div>
          </div>
        ) : (
          // ── No key or editing — input form ───────────────────────────────
          <div className="space-y-3">
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="sk-or-..."
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value)
                  setTestResult('idle')
                  setTestError(null)
                }}
                className="pr-10 font-mono"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowKey((v) => !v)}
                tabIndex={-1}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Test result feedback */}
            {testResult === 'valid' && (
              <p className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Key is valid
              </p>
            )}
            {testResult === 'invalid' && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                {testError ?? 'Invalid API key'}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={!apiKeyInput.trim() || testResult === 'testing'}
              >
                {testResult === 'testing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test connection'
                )}
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={!apiKeyInput.trim() || isSavePending}
                title={testResult !== 'valid' ? 'Consider testing the key before saving' : undefined}
              >
                {isSavePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save key
                {testResult !== 'valid' && apiKeyInput.trim() && (
                  <span className="ml-1.5 text-xs opacity-70">(untested)</span>
                )}
              </Button>

              {hasKey && (
                <Button variant="ghost" size="sm" onClick={handleCancelEditing}>
                  Cancel
                </Button>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Need a key?{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
              >
                Get an OpenRouter API key
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
