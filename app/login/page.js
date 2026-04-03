'use client'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const supabase = createClient()

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`
      }
    })
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#0f1117', gap: '20px'
    }}>
      <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>무르익다</div>
      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,.5)' }}>학습 관리 서비스</div>
      <button onClick={signInWithGoogle} style={{
        marginTop: '20px', padding: '14px 28px',
        background: '#fff', border: 'none', borderRadius: '10px',
        fontSize: '15px', fontWeight: '600', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '10px'
      }}>
        🔑 구글로 로그인
      </button>
    </div>
  )
}