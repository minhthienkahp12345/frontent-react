import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../services/api'

type UserRole = 'CASHIER' | 'ADMIN'
type User = { id: number; username: string; full_name: string; role: UserRole; created_at: string | null }
type UserForm = { username: string; full_name: string; password: string; role: UserRole }

const emptyForm: UserForm = { username: '', full_name: '', password: '', role: 'CASHIER' }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [form, setForm] = useState(emptyForm)
  const [password, setPassword] = useState('')
  const [modal, setModal] = useState<'create' | 'password' | null>(null)
  const [selected, setSelected] = useState<User | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      setUsers((await api.get<User[]>('/users')).data)
      setError('')
    } catch { setError('Không thể tải danh sách tài khoản.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadUsers() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadUsers])

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault()
    try {
      setSaving(true)
      if (editingId === null) await api.post('/users', { ...form, full_name: form.full_name })
      else await api.put(`/users/${editingId}`, { full_name: form.full_name, role: form.role })
      setModal(null)
      setForm(emptyForm)
      await loadUsers()
    } catch { setError('Không thể tạo tài khoản. Tên đăng nhập có thể đã tồn tại.') }
    finally { setSaving(false) }
  }

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected) return
    try {
      setSaving(true)
      await api.patch(`/users/${selected.id}/reset-password`, { password })
      setModal(null)
      setPassword('')
    } catch { setError('Không thể đổi mật khẩu.') }
    finally { setSaving(false) }
  }

  const remove = async (user: User) => {
    if (!window.confirm(`Xóa tài khoản "${user.username}"?`)) return
    try { await api.delete(`/users/${user.id}`); await loadUsers() }
    catch { setError('Không thể xóa tài khoản. Tài khoản có thể đang có đơn hàng.') }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-8 flex flex-wrap gap-2 text-sm font-bold">
          <a href="/admin/dashboard" className="rounded-xl px-4 py-2 text-slate-500 hover:bg-white">Báo cáo doanh thu</a>
          <a href="/admin/products" className="rounded-xl px-4 py-2 text-slate-500 hover:bg-white">Quản lý menu</a>
          <a href="/admin/users" className="rounded-xl bg-orange-500 px-4 py-2 text-white shadow-lg shadow-orange-200">Tài khoản nhân viên</a>
        </nav>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-bold text-orange-500">Quản trị viên</p><h1 className="text-3xl font-black">Tài khoản & phân quyền</h1><p className="mt-1 text-sm text-slate-500">Quản lý nhân viên thu ngân và quản trị viên.</p></div>
          <button onClick={() => { setEditingId(null); setForm(emptyForm); setModal('create') }} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-200">+ Thêm nhân viên</button>
        </div>
        {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {loading ? <p className="p-10 text-center text-slate-400">Đang tải...</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-5 py-4">Họ tên</th><th className="px-5 py-4">Tên đăng nhập</th><th className="px-5 py-4">Vai trò</th><th className="px-5 py-4">Ngày tạo</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.id}><td className="px-5 py-4 font-bold">{user.full_name}</td><td className="px-5 py-4 text-slate-500">{user.username}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.role === 'ADMIN' ? 'ADMIN' : 'CASHIER'}</span></td><td className="px-5 py-4 text-slate-500">{user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '—'}</td><td className="px-5 py-4 text-right"><button onClick={() => { setEditingId(user.id); setForm({ username: user.username, full_name: user.full_name, password: '', role: user.role }); setModal('create') }} className="mr-4 font-bold text-emerald-600">Sửa</button><button onClick={() => { setSelected(user); setPassword(''); setModal('password') }} className="mr-4 font-bold text-blue-600">Đổi mật khẩu</button><button onClick={() => void remove(user)} className="font-bold text-red-500">Xóa</button></td></tr>)}</tbody></table></div>}
        </div>
      </div>
      {modal && <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4"><form onSubmit={modal === 'create' ? submitCreate : submitPassword} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black">{modal === 'create' ? (editingId === null ? 'Thêm nhân viên mới' : 'Chỉnh sửa tài khoản') : `Đổi mật khẩu: ${selected?.username}`}</h2><button type="button" onClick={() => setModal(null)} className="text-2xl text-slate-400">×</button></div>{modal === 'create' ? <div className="space-y-4">{editingId === null && <><label className="block text-sm font-bold">Tên đăng nhập<input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="block text-sm font-bold">Mật khẩu ban đầu<input required minLength={6} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label></>}<label className="block text-sm font-bold">Họ tên<input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="block text-sm font-bold">Vai trò<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className="mt-1 w-full rounded-xl border p-3 font-normal"><option value="CASHIER">CASHIER - Thu ngân</option><option value="ADMIN">ADMIN - Quản trị viên</option></select></label></div> : <label className="block text-sm font-bold">Mật khẩu mới<input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>}<button disabled={saving} className="mt-6 w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></form></div>}
    </main>
  )
}
