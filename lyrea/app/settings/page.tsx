import { createClient } from '@/lib/supabase/server'
import BrandVoiceForm from '@/components/settings/BrandVoiceForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: brandVoice } = await supabase
    .from('brand_voices')
    .select('*')
    .eq('user_id', user!.id)
    .is('project_id', null)
    .single()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-gray-500 mb-8">Configure your default brand voice and AI preferences.</p>

      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Brand Voice</h2>
          <p className="text-sm text-gray-500 mb-6">This will be used as default context for all article generation.</p>
          <BrandVoiceForm existing={brandVoice} userId={user!.id} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Account</h2>
          <p className="text-sm text-gray-500 mb-4">Logged in as <strong>{user?.email}</strong></p>
        </div>
      </div>
    </div>
  )
}
