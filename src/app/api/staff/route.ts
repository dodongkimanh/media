import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function getCallerProfile() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data
}

// POST /api/staff — tạo tài khoản mới
export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trong .env.local' }, { status: 500 })
  }

  try {
    const caller = await getCallerProfile()
    if (!caller || (caller.role !== 'admin' && caller.role !== 'lead')) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const { email, password, full_name, role, avatar_color } = await req.json()

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
    }

    if (caller.role === 'lead' && role !== 'staff') {
      return NextResponse.json({ error: 'Lead chỉ có thể thêm nhân viên' }, { status: 403 })
    }

    const admin = createAdminClient()

    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name, role: role ?? 'staff' }
    })

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? 'Không thể tạo tài khoản' }, { status: 400 })
    }

    if (avatar_color) {
      await admin.from('profiles').update({ avatar_color }).eq('id', data.user.id)
    }

    return NextResponse.json({ user: data.user }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Lỗi server không xác định'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/staff — xóa tài khoản
export async function DELETE(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trong .env.local' }, { status: 500 })
  }

  try {
    const caller = await getCallerProfile()
    if (!caller || (caller.role !== 'admin' && caller.role !== 'lead')) {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const { id, role: targetRole } = await req.json()
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

    if (caller.role === 'lead' && (targetRole === 'admin' || targetRole === 'lead')) {
      return NextResponse.json({ error: 'Lead không thể xóa admin hoặc lead' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Lỗi server không xác định'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
