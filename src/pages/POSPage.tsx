import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { api } from '../services/api'

type Category = { id: number; name: string }
type Product = {
  id: number
  categoryId: number
  name: string
  price: string | number
  imageUrl: string | null
  isAvailable: boolean
  category?: Category
}
type CartItem = Product & { quantity: number; note: string }
type Order = {
  id: number
  orderNumber: number
  totalAmount: string | number
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  orderType: 'EAT_IN' | 'TAKE_AWAY'
  paymentMethod: 'CASH' | 'TRANSFER'
  createdAt: string
}
type CreateOrderResponse = Order & { items: unknown[] }

const money = (value: string | number) =>
  `${new Intl.NumberFormat('vi-VN').format(Number(value))}đ`

function ProductImage({ product }: { product: Product }) {
  if (product.imageUrl) {
    return <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
  }
  return <span className="text-5xl">🍽️</span>
}

export default function POSPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<'EAT_IN' | 'TAKE_AWAY'>('EAT_IN')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH')
  const [showOrders, setShowOrders] = useState(false)
  const [successNumber, setSuccessNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const loadMenu = useCallback(async () => {
    try {
      setLoading(true)
      const [categoryResponse, productResponse] = await Promise.all([
        api.get<Category[]>('/categories'),
        api.get<Product[]>('/products'),
      ])
      setCategories(categoryResponse.data)
      setProducts(productResponse.data)
    } catch {
      setError('Không thể tải thực đơn. Hãy kiểm tra backend và địa chỉ frontend.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadOrders = useCallback(async () => {
    if (!localStorage.getItem('accessToken')) {
      setOrders([])
      return
    }

    try {
      const response = await api.get<Order[]>('/orders/today')
      setOrders(response.data)
    } catch {
      setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại để xem đơn hàng.')
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMenu()
      void loadOrders()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadMenu, loadOrders])

  const visibleProducts = useMemo(
    () => products.filter((product) => selectedCategory === null || product.category?.id === selectedCategory || product.categoryId === selectedCategory),
    [products, selectedCategory],
  )
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const addProduct = (product: Product) => {
    setCart((current) => {
      const found = current.find((item) => item.id === product.id)
      return found
        ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { ...product, quantity: 1, note: '' }]
    })
  }

  const updateQuantity = (id: number, amount: number) => {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== id) return [item]
      const quantity = item.quantity + amount
      return quantity > 0 ? [{ ...item, quantity }] : []
    }))
  }

  const updateNote = (id: number, event: ChangeEvent<HTMLInputElement>) => {
    setCart((current) => current.map((item) => item.id === id ? { ...item, note: event.target.value } : item))
  }

  const submitOrder = async () => {
    if (!cart.length) return
    if (!localStorage.getItem('accessToken')) {
      setError('Bạn cần đăng nhập trước khi thanh toán.')
      return
    }
    try {
      setSubmitting(true)
      setError('')
      const response = await api.post<CreateOrderResponse>('/orders', {
        order_type: orderType,
        payment_method: paymentMethod,
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          ...(item.note ? { note: item.note } : {}),
        })),
      })
      setSuccessNumber(response.data.orderNumber)
      setCart([])
      await loadOrders()
    } catch (requestError) {
      if (requestError && typeof requestError === 'object' && 'response' in requestError) {
        const status = (requestError as { response?: { status?: number } }).response?.status
        setError(status === 401
          ? 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'
          : 'Thanh toán thất bại. Vui lòng kiểm tra món ăn và thử lại.')
      } else {
        setError('Thanh toán thất bại. Vui lòng kiểm tra món ăn và thử lại.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const login = async () => {
    try {
      setLoggingIn(true)
      setError('')
      const response = await api.post<{ accessToken: string }>('/auth/login', {
        username,
        password,
      })
      localStorage.setItem('accessToken', response.data.accessToken)
      setPassword('')
      await loadOrders()
    } catch {
      localStorage.removeItem('accessToken')
      setError('Tên đăng nhập hoặc mật khẩu không đúng.')
    } finally {
      setLoggingIn(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    setOrders([])
  }

  const completeOrder = async (id: number) => {
    try {
      await api.patch(`/orders/${id}/status`, { status: 'COMPLETED' })
      await loadOrders()
    } catch {
      setError('Không thể cập nhật trạng thái đơn hàng.')
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4">
          <div><p className="text-xl font-black">Canteen<span className="text-orange-500">POS</span></p><p className="text-xs text-slate-400">Quầy thu ngân</p></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowOrders(true)} className="rounded-xl bg-orange-50 px-4 py-2 text-sm font-bold text-orange-600">Đơn hàng hôm nay ({orders.length})</button>
            {localStorage.getItem('accessToken') ? <button onClick={logout} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-500">Đăng xuất</button> : <span className="rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-500">Chưa đăng nhập</span>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] p-5">
        {error && <div className="mb-4 flex justify-between rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}<button onClick={() => setError('')}>×</button></div>}
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <section>
            <div className="mb-5 flex items-end justify-between"><div><p className="text-sm font-bold text-orange-500">Bán hàng tại quầy</p><h1 className="text-3xl font-black">Thực đơn</h1></div><button onClick={() => void loadMenu()} className="text-sm font-bold text-slate-500 hover:text-orange-500">↻ Làm mới</button></div>
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setSelectedCategory(null)} className={`shrink-0 rounded-xl px-4 py-3 text-sm font-bold ${selectedCategory === null ? 'bg-orange-500 text-white' : 'bg-white text-slate-500'}`}>Tất cả</button>
              {categories.map((category) => <button key={category.id} onClick={() => setSelectedCategory(category.id)} className={`shrink-0 rounded-xl px-4 py-3 text-sm font-bold ${selectedCategory === category.id ? 'bg-orange-500 text-white' : 'bg-white text-slate-500'}`}>{category.name}</button>)}
            </div>
            {loading ? <p className="py-16 text-center text-slate-400">Đang tải thực đơn...</p> : <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
              {visibleProducts.map((product) => <article key={product.id} className="overflow-hidden rounded-2xl bg-white p-3 shadow-sm">
                <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-orange-50"><ProductImage product={product} /></div>
                <h2 className="mt-3 min-h-10 text-sm font-bold">{product.name}</h2>
                <div className="mt-3 flex items-center justify-between"><strong className="text-orange-500">{money(product.price)}</strong><button disabled={!product.isAvailable} onClick={() => addProduct(product)} className="rounded-lg bg-orange-100 px-3 py-2 text-sm font-bold text-orange-600 disabled:cursor-not-allowed disabled:opacity-40">{product.isAvailable ? 'Thêm' : 'Hết hàng'}</button></div>
              </article>)}
            </div>}
          </section>

          <aside className="flex min-h-[650px] flex-col rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex justify-between border-b pb-4"><div><h2 className="text-xl font-black">Giỏ hàng</h2><p className="text-xs text-slate-400">{itemCount} món đã chọn</p></div><button onClick={() => setCart([])} className="text-xs font-bold text-red-400">Xóa tất cả</button></div>
            <div className="flex-1 space-y-4 overflow-auto py-5">
              {!cart.length ? <div className="py-20 text-center text-slate-400"><p className="text-5xl">🛒</p><p className="mt-3 font-bold">Giỏ hàng đang trống</p></div> : cart.map((item) => <div key={item.id} className="border-b pb-4">
                <div className="flex gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-orange-50"><ProductImage product={item} /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="truncate text-sm font-bold">{item.name}</p><strong className="text-sm">{money(Number(item.price) * item.quantity)}</strong></div><div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-2"><button onClick={() => updateQuantity(item.id, -1)} className="h-7 w-7 rounded-lg bg-slate-100">−</button><span className="w-5 text-center text-sm font-bold">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="h-7 w-7 rounded-lg bg-slate-100">+</button></div><button onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))} className="text-xs text-red-400">Xóa</button></div></div></div>
                <input value={item.note} onChange={(event) => updateNote(item.id, event)} placeholder="Ghi chú món..." className="mt-3 w-full rounded-lg bg-slate-50 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-200" />
              </div>)}
            </div>
            <div className="border-t pt-4"><div className="mb-4 flex justify-between text-lg font-black"><span>Tổng cộng</span><span className="text-orange-500">{money(total)}</span></div>
              <div className="mb-4 grid grid-cols-2 gap-2">{([['EAT_IN', 'Ăn tại chỗ'], ['TAKE_AWAY', 'Mang đi']] as const).map(([value, label]) => <button key={value} onClick={() => setOrderType(value)} className={`rounded-xl border p-3 text-sm font-bold ${orderType === value ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-500'}`}>{label}</button>)}</div>
              <div className="mb-4 grid grid-cols-2 gap-2">{([['CASH', 'Tiền mặt'], ['TRANSFER', 'Chuyển khoản']] as const).map(([value, label]) => <button key={value} onClick={() => setPaymentMethod(value)} className={`rounded-xl border p-3 text-sm font-bold ${paymentMethod === value ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-500'}`}>{label}</button>)}</div>
              <button disabled={!cart.length || submitting} onClick={() => void submitOrder()} className="w-full rounded-xl bg-orange-500 py-4 font-black text-white shadow-lg shadow-orange-200 disabled:opacity-40">{submitting ? 'Đang thanh toán...' : 'Thanh toán'}</button>
            </div>
          </aside>
        </div>
      </div>

      {!localStorage.getItem('accessToken') && <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/20 p-4"><form onSubmit={(event) => { event.preventDefault(); void login() }} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-xl font-black">Đăng nhập thu ngân</h2><p className="mt-1 text-sm text-slate-500">Đăng nhập để thanh toán và quản lý đơn hàng.</p><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Tên đăng nhập" required className="mt-5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-orange-400" /><input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mật khẩu" type="password" required className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-orange-400" /><button disabled={loggingIn} className="mt-4 w-full rounded-xl bg-orange-500 py-3 font-black text-white disabled:opacity-50">{loggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}</button></form></div>}

      {showOrders && <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowOrders(false)}><div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5" onClick={(event) => event.stopPropagation()}><div className="mb-5 flex justify-between"><h2 className="text-xl font-black">Đơn hàng trong ngày</h2><button onClick={() => setShowOrders(false)} className="text-2xl text-slate-400">×</button></div>{!orders.length ? <p className="py-10 text-center text-slate-400">Chưa có đơn hàng.</p> : <div className="space-y-3">{orders.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><p className="font-black">STT #{order.orderNumber}</p><p className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleTimeString('vi-VN')} · {money(order.totalAmount)}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${order.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{order.status}</span>{order.status === 'PENDING' && <button onClick={() => void completeOrder(order.id)} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-white">Hoàn thành</button>}</div></div>)}</div>}</div></div>}
      {successNumber !== null && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4"><div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl"><p className="text-5xl">✓</p><h2 className="mt-4 text-2xl font-black">Thanh toán thành công</h2><p className="mt-2 text-slate-500">Số thứ tự của bạn là</p><p className="my-3 text-5xl font-black text-orange-500">#{successNumber}</p><button onClick={() => setSuccessNumber(null)} className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white">Đóng</button></div></div>}
    </main>
  )
}
