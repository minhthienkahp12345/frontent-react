import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'

type Dashboard = {
  summary: {
    totalRevenue: number
    completedOrders: number
    averageOrderValue: number
  }
  categoryRevenue: { categoryId: number; categoryName: string; revenue: number }[]
  topProducts: { productId: number; productName: string; quantitySold: number; revenue: number }[]
  latestOrders: {
    id: number
    orderNumber: number
    totalAmount: string
    paymentMethod: 'CASH' | 'TRANSFER'
    createdAt: string
  }[]
}

const money = (value: number | string) =>
  `${new Intl.NumberFormat('vi-VN').format(Number(value))}đ`

const paymentLabel = (method: Dashboard['latestOrders'][number]['paymentMethod']) =>
  method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get<Dashboard>('/reports/dashboard')
      setDashboard(response.data)
      setError('')
    } catch {
      setError('Không thể tải báo cáo. Hãy đăng nhập bằng tài khoản Admin.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadDashboard])

  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm font-bold">
          <a href="/admin/products" className="rounded-xl px-4 py-2 text-slate-500 hover:bg-white">Quản lý menu</a>
          <a href="/admin/dashboard" className="rounded-xl bg-orange-500 px-4 py-2 text-white shadow-lg shadow-orange-200">Báo cáo doanh thu</a>
        </nav>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="text-sm font-bold text-orange-500">Quản trị viên</p><h1 className="text-3xl font-black">Báo cáo hôm nay</h1><p className="mt-1 text-sm text-slate-500">Chỉ tính các đơn hàng đã hoàn thành.</p></div>
          <button onClick={() => void loadDashboard()} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold hover:border-orange-300">Làm mới</button>
        </div>
        {error && <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        {loading ? <div className="rounded-2xl bg-white p-12 text-center text-slate-400">Đang tải báo cáo...</div> : dashboard && <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-orange-500 p-5 text-white shadow-lg shadow-orange-100"><p className="text-sm font-bold text-orange-100">Tổng doanh thu hôm nay</p><p className="mt-3 text-3xl font-black">{money(dashboard.summary.totalRevenue)}</p></div>
            <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm font-bold text-slate-500">Tổng số đơn thành công</p><p className="mt-3 text-3xl font-black">{dashboard.summary.completedOrders}</p></div>
            <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm font-bold text-slate-500">Trung bình / đơn</p><p className="mt-3 text-3xl font-black text-emerald-600">{money(dashboard.summary.averageOrderValue)}</p></div>
          </section>
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white shadow-sm">
              <div className="border-b px-5 py-4"><h2 className="font-black">Top 5 món bán chạy</h2></div>
              {dashboard.topProducts.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">Chưa có dữ liệu hôm nay.</p> : <div className="divide-y divide-slate-100">{dashboard.topProducts.map((product, index) => <div key={product.productId} className="flex items-center justify-between px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 font-black text-orange-500">#{index + 1}</span><div><p className="font-bold">{product.productName}</p><p className="text-xs text-slate-400">{product.quantitySold} phần đã bán</p></div></div><span className="font-bold text-orange-500">{money(product.revenue)}</span></div>)}</div>}
            </div>
            <div className="rounded-2xl bg-white shadow-sm">
              <div className="border-b px-5 py-4"><h2 className="font-black">Doanh thu theo danh mục</h2></div>
              {dashboard.categoryRevenue.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">Chưa có dữ liệu hôm nay.</p> : <div className="divide-y divide-slate-100">{dashboard.categoryRevenue.map((category) => <div key={category.categoryId} className="flex items-center justify-between px-5 py-4"><span className="font-bold">{category.categoryName}</span><span className="font-bold text-emerald-600">{money(category.revenue)}</span></div>)}</div>}
            </div>
          </section>
          <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="border-b px-5 py-4"><h2 className="font-black">10 đơn hàng hoàn thành gần nhất</h2></div>
            {dashboard.latestOrders.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">Chưa có giao dịch hoàn thành hôm nay.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-5 py-3">STT</th><th className="px-5 py-3">Thời gian</th><th className="px-5 py-3">Tổng tiền</th><th className="px-5 py-3">PTTT</th></tr></thead><tbody className="divide-y divide-slate-100">{dashboard.latestOrders.map((order) => <tr key={order.id}><td className="px-5 py-4 font-black text-orange-500">#{order.orderNumber}</td><td className="px-5 py-4 text-slate-500">{new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td><td className="px-5 py-4 font-bold">{money(order.totalAmount)}</td><td className="px-5 py-4">{paymentLabel(order.paymentMethod)}</td></tr>)}</tbody></table></div>}
          </section>
        </>}
      </div>
    </main>
  )
}
