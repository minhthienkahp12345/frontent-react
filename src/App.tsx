import POSPage from './pages/POSPage'
import AdminProductsPage from './pages/AdminProductsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminUsersPage from './pages/AdminUsersPage'

export default function App() {
  if (window.location.pathname === '/admin/dashboard') return <AdminDashboardPage />
  if (window.location.pathname === '/admin/products') return <AdminProductsPage />
  if (window.location.pathname === '/admin/users') return <AdminUsersPage />
  return <POSPage />
}
