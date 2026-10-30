import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../services/api'

type Category = { id: number; name: string }
type Product = {
  id: number
  categoryId: number
  name: string
  price: string
  imageUrl: string | null
  isAvailable: boolean
  category?: Category
}
type ProductForm = {
  category_id: string
  name: string
  price: string
  image_url: string
  is_available: boolean
}

const emptyForm: ProductForm = {
  category_id: '',
  name: '',
  price: '',
  image_url: '',
  is_available: true,
}

const money = (value: string | number) =>
  `${new Intl.NumberFormat('vi-VN').format(Number(value))}đ`

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [productsResponse, categoriesResponse] = await Promise.all([
        api.get<Product[]>('/products'),
        api.get<Category[]>('/categories'),
      ])
      setProducts(productsResponse.data)
      setCategories(categoriesResponse.data)
    } catch {
      setError('Không thể tải dữ liệu menu.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadData])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, category_id: categories[0] ? String(categories[0].id) : '' })
    setModalOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditingId(product.id)
    setForm({
      category_id: String(product.categoryId),
      name: product.name,
      price: String(Number(product.price)),
      image_url: product.imageUrl ?? '',
      is_available: product.isAvailable,
    })
    setModalOpen(true)
  }

  const updateForm = (field: keyof ProductForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setSaving(true)
      setError('')
      const payload = {
        category_id: Number(form.category_id),
        name: form.name,
        price: Number(form.price),
        image_url: form.image_url || undefined,
        is_available: form.is_available,
      }
      if (editingId === null) await api.post('/products', payload)
      else await api.put(`/products/${editingId}`, payload)
      setModalOpen(false)
      await loadData()
    } catch {
      setError('Không thể lưu món ăn. Hãy kiểm tra dữ liệu nhập vào.')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (id: number) => {
    try {
      await api.patch(`/products/${id}/toggle-status`)
      await loadData()
    } catch {
      setError('Không thể cập nhật trạng thái món ăn.')
    }
  }

  const remove = async (product: Product) => {
    if (!window.confirm(`Bạn có chắc muốn xóa món "${product.name}" không?`)) return
    try {
      await api.delete(`/products/${product.id}`)
      await loadData()
    } catch {
      setError('Không thể xóa món ăn. Món có thể đang được sử dụng trong đơn hàng.')
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm font-bold">
          <a href="/admin/products" className="rounded-xl bg-orange-500 px-4 py-2 text-white shadow-lg shadow-orange-200">Quản lý menu</a>
          <a href="/admin/dashboard" className="rounded-xl px-4 py-2 text-slate-500 hover:bg-white">Báo cáo doanh thu</a>
        </nav>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-bold text-orange-500">Quản trị viên</p><h1 className="text-3xl font-black">Quản lý menu</h1><p className="mt-1 text-sm text-slate-500">Thêm, chỉnh sửa và cập nhật trạng thái món ăn.</p></div>
          <button onClick={openCreate} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-200">+ Thêm món mới</button>
        </div>
        {error && <div className="mb-4 flex justify-between rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}<button onClick={() => setError('')}>×</button></div>}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-5 py-4"><h2 className="font-black">Danh sách món ăn ({products.length})</h2></div>
          {loading ? <p className="p-10 text-center text-slate-400">Đang tải...</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-5 py-4">Món ăn</th><th className="px-5 py-4">Danh mục</th><th className="px-5 py-4">Giá</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{products.map((product) => <tr key={product.id} className="hover:bg-orange-50/30"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-orange-50">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <span className="text-2xl">🍽️</span>}</div><span className="font-bold">{product.name}</span></div></td><td className="px-5 py-4 text-slate-500">{product.category?.name ?? categories.find((category) => category.id === product.categoryId)?.name ?? '—'}</td><td className="px-5 py-4 font-bold text-orange-500">{money(product.price)}</td><td className="px-5 py-4"><button onClick={() => void toggleStatus(product.id)} className={`rounded-full px-3 py-1 text-xs font-bold ${product.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{product.isAvailable ? 'Còn hàng' : 'Hết hàng'}</button></td><td className="px-5 py-4 text-right"><button onClick={() => openEdit(product)} className="mr-3 font-bold text-blue-600">Sửa</button><button onClick={() => void remove(product)} className="font-bold text-red-500">Xóa</button></td></tr>)}</tbody></table></div>}
        </div>
      </div>

      {modalOpen && <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4"><form onSubmit={save} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black">{editingId === null ? 'Thêm món mới' : 'Chỉnh sửa món'}</h2><button type="button" onClick={() => setModalOpen(false)} className="text-2xl text-slate-400">×</button></div><div className="space-y-4"><label className="block text-sm font-bold">Tên món<input required value={form.name} onChange={(event) => updateForm('name', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-orange-400" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold">Danh mục<select required value={form.category_id} onChange={(event) => updateForm('category_id', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-orange-400"><option value="">Chọn danh mục</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="block text-sm font-bold">Giá<input required min="0" step="0.01" type="number" value={form.price} onChange={(event) => updateForm('price', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-orange-400" /></label></div><label className="block text-sm font-bold">URL hình ảnh<input type="url" value={form.image_url} onChange={(event) => updateForm('image_url', event.target.value)} placeholder="https://..." className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-orange-400" /></label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_available} onChange={(event) => updateForm('is_available', event.target.checked)} /> Còn hàng</label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-500">Hủy</button><button disabled={saving} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu món'}</button></div></form></div>}
    </main>
  )
}
