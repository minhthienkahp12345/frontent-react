import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

type SessionUser = { username: string; fullName?: string; role: 'CASHIER' | 'ADMIN' }

function readSession(): SessionUser | null {
  const savedUser = localStorage.getItem('authUser')
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser) as SessionUser
      if (user.username && user.role) return user
    } catch {
      localStorage.removeItem('authUser')
    }
  }
  const token = localStorage.getItem('accessToken')
  if (!token) return null
  try {
    const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { username?: string; role?: SessionUser['role'] }
    return payload.username && payload.role ? { username: payload.username, role: payload.role } : null
  } catch {
    return null
  }
}

export default function MainLayout({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(readSession)

  useEffect(() => {
    const refresh = () => setSession(readSession())
    window.addEventListener('auth-changed', refresh)
    return () => window.removeEventListener('auth-changed', refresh)
  }, [])

  const isAdmin = session?.role === 'ADMIN'
  const isAdminPath = window.location.pathname.startsWith('/admin/')

  if (isAdminPath && !isAdmin) {
    window.history.replaceState({}, '', '/pos')
    return null
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('authUser')
    window.dispatchEvent(new Event('auth-changed'))
    window.history.pushState({}, '', '/pos')
    window.location.reload()
  }

  return (
    <div>
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <a href="/pos" className="shrink-0">
            <p className="text-xl font-black">Canteen<span className="text-orange-500">POS</span></p>
            <p className="text-xs text-slate-400">Căng tin sinh viên</p>
          </a>
          <nav className="flex flex-wrap items-center justify-center gap-1 text-sm font-bold">
            <a href="/pos" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-orange-50 hover:text-orange-600">Bán hàng (POS)</a>
            {isAdmin && <>
              <a href="/admin/dashboard" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-orange-50 hover:text-orange-600">Báo cáo doanh thu</a>
              <a href="/admin/products" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-orange-50 hover:text-orange-600">Quản lý Menu Món</a>
              <a href="/admin/users" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-orange-50 hover:text-orange-600">Quản lý Nhân viên</a>
            </>}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            {session ? <><span className="hidden font-bold text-slate-600 sm:inline">{session.fullName ?? session.username}</span><button onClick={logout} className="rounded-lg border px-3 py-2 font-bold text-slate-500">Đăng xuất</button></> : <span className="text-xs font-bold text-red-500">Chưa đăng nhập</span>}
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
