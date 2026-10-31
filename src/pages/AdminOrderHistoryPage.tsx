import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'

type Period = 'day' | 'week' | 'month'
type Status = 'PENDING' | 'COMPLETED' | 'CANCELLED'
type Order = {
  id: number
  orderNumber: number
  totalAmount: string | number
  paymentMethod: 'CASH' | 'TRANSFER'
  orderType: 'EAT_IN' | 'TAKE_AWAY'
  status: Status
  createdAt: string
  cashier?: { fullName: string }
  items: { id: number; productId: number; quantity: number; price: string | number; note: string | null; product?: { name: string } }[]
}

const money = (value: string | number) => `${new Intl.NumberFormat('vi-VN').format(Number(value))}đ`
const statusText: Record<Status, string> = { PENDING: 'Đang chờ', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy' }

export default function AdminOrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [period, setPeriod] = useState<Period>('day')
  const [status, setStatus] = useState<Status | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [editType, setEditType] = useState<Order['orderType']>('EAT_IN')
  const [editPayment, setEditPayment] = useState<Order['paymentMethod']>('CASH')
  const [editItems, setEditItems] = useState<Order['items']>([])
  const [saving, setSaving] = useState(false)

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get<Order[]>('/orders/history', { params: { period, ...(status ? { status } : {}) } })
      setOrders(response.data)
      setError('')
    } catch { setError('Không thể tải lịch sử đơn hàng.') }
    finally { setLoading(false) }
  }, [period, status])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadOrders() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadOrders])

  const updateStatus = async (id: number, nextStatus: 'COMPLETED' | 'CANCELLED') => {
    try { await api.patch(`/orders/${id}/status`, { status: nextStatus }); await loadOrders() }
    catch { setError('Không thể cập nhật trạng thái đơn hàng.') }
  }

  const openEdit = (order: Order) => {
    setEditingOrder(order)
    setEditType(order.orderType)
    setEditPayment(order.paymentMethod)
    setEditItems(order.items.map((item) => ({ ...item })))
  }

  const saveEdit = async () => {
    if (!editingOrder) return
    try {
      setSaving(true)
      await api.put(`/orders/${editingOrder.id}`, {
        order_type: editType,
        payment_method: editPayment,
        items: editItems.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          ...(item.note ? { note: item.note } : {}),
        })),
      })
      setEditingOrder(null)
      await loadOrders()
    } catch { setError('Không thể sửa đơn hàng.') }
    finally { setSaving(false) }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-bold text-orange-500">Quản trị viên</p><h1 className="text-3xl font-black">Lịch sử đơn hàng</h1><p className="mt-1 text-sm text-slate-500">Theo dõi giao dịch và xử lý trạng thái đơn.</p></div>
          <div className="flex flex-wrap gap-2"><select value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold"><option value="day">Hôm nay</option><option value="week">Tuần này</option><option value="month">Tháng này</option></select><select value={status} onChange={(event) => setStatus(event.target.value as Status | '')} className="rounded-xl border bg-white px-3 py-2 text-sm font-bold"><option value="">Tất cả trạng thái</option><option value="PENDING">Đang chờ</option><option value="COMPLETED">Hoàn thành</option><option value="CANCELLED">Đã hủy</option></select></div>
        </div>
        {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {loading ? <p className="p-10 text-center text-slate-400">Đang tải...</p> : orders.length === 0 ? <p className="p-10 text-center text-slate-400">Không có đơn hàng trong khoảng thời gian này.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-5 py-4">STT</th><th className="px-5 py-4">Ngày / giờ</th><th className="px-5 py-4">Thu ngân</th><th className="px-5 py-4">Loại đơn</th><th className="px-5 py-4">Thanh toán</th><th className="px-5 py-4">Tổng tiền</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{orders.map((order) => <tr key={order.id}><td className="px-5 py-4 font-black text-orange-500">#{order.orderNumber}</td><td className="px-5 py-4 text-slate-500">{new Date(order.createdAt).toLocaleString('vi-VN')}</td><td className="px-5 py-4">{order.cashier?.fullName ?? '—'}</td><td className="px-5 py-4">{order.orderType === 'EAT_IN' ? 'Ăn tại chỗ' : 'Mang đi'}</td><td className="px-5 py-4">{order.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}</td><td className="px-5 py-4 font-bold">{money(order.totalAmount)}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{statusText[order.status]}</span></td><td className="px-5 py-4 text-right"><button onClick={() => openEdit(order)} className="mr-3 font-bold text-blue-600">Sửa</button>{order.status === 'PENDING' && <><button onClick={() => void updateStatus(order.id, 'COMPLETED')} className="mr-3 font-bold text-emerald-600">Hoàn thành</button><button onClick={() => void updateStatus(order.id, 'CANCELLED')} className="font-bold text-red-500">Hủy</button></>}</td></tr>)}</tbody></table></div>}
        </div>
      </div>
      {editingOrder && <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4"><div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black">Sửa đơn #{editingOrder.orderNumber}</h2><button onClick={() => setEditingOrder(null)} className="text-2xl text-slate-400">×</button></div><div className="grid grid-cols-2 gap-3"><select value={editType} onChange={(event) => setEditType(event.target.value as Order['orderType'])} className="rounded-xl border p-3 text-sm font-bold"><option value="EAT_IN">Ăn tại chỗ</option><option value="TAKE_AWAY">Mang đi</option></select><select value={editPayment} onChange={(event) => setEditPayment(event.target.value as Order['paymentMethod'])} className="rounded-xl border p-3 text-sm font-bold"><option value="CASH">Tiền mặt</option><option value="TRANSFER">Chuyển khoản</option></select></div><div className="mt-5 space-y-3">{editItems.map((item, index) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><span className="font-bold">{item.product?.name ?? `Món #${item.productId}`}</span><button onClick={() => setEditItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-xs font-bold text-red-500">Xóa</button></div><div className="mt-2 flex gap-2"><input type="number" min="1" value={item.quantity} onChange={(event) => setEditItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, quantity: Math.max(1, Number(event.target.value)) } : entry))} className="w-24 rounded-lg border p-2" /><input value={item.note ?? ''} onChange={(event) => setEditItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, note: event.target.value } : entry))} placeholder="Ghi chú" className="min-w-0 flex-1 rounded-lg border p-2" /></div></div>)}</div><div className="mt-6 flex justify-end gap-3"><button onClick={() => setEditingOrder(null)} className="rounded-xl border px-4 py-3 font-bold text-slate-500">Hủy</button><button disabled={saving || !editItems.length} onClick={() => void saveEdit()} className="rounded-xl bg-orange-500 px-5 py-3 font-black text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu đơn'}</button></div></div></div>}
    </main>
  )
}
