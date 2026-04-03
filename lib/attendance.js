import { createClient } from './supabase'

// 공부 시작
export async function studyStart() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인 필요' }

  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .eq('status', 'WORKING')
    .single()

  if (existing) return { error: '이미 공부 중입니다' }

  const { data, error } = await supabase
    .from('attendance_logs')
    .insert({
      user_id: user.id,
      date: today,
      check_in: new Date().toISOString(),
      status: 'WORKING'
    })
    .select()
    .single()

  return { data, error }
}

// 퇴근
export async function studyEnd() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인 필요' }

  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .eq('status', 'WORKING')
    .single()

  if (!existing) return { error: '공부 시작 기록이 없습니다' }

  const start = new Date(existing.check_in)
  const end = new Date()
  const duration = Math.floor((end - start) / 60000)

  const { data, error } = await supabase
    .from('attendance_logs')
    .update({
      check_out: end.toISOString(),
      duration_minutes: duration,
      status: 'DONE'
    })
    .eq('id', existing.id)
    .select()
    .single()

  return { data, error }
}

// 오늘 공부 현황 조회
export async function getTodaySummary() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data
}