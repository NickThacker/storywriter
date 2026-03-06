import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase as any)
    .from('user_settings')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!(settings as { is_admin?: boolean } | null)?.is_admin) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
