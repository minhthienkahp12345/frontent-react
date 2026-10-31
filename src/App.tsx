import POSPage from './pages/POSPage'
import AdminProductsPage from './pages/AdminProductsPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminUsersPage from './pages/AdminUsersPage'

export default function App() {
  const page = window.location.pathname === '/admin/dashboard'
    ? <AdminDashboardPage />
    : window.location.pathname === '/admin/products'
      ? <AdminProductsPage />
      : window.location.pathname === '/admin/users'
        ? <AdminUsersPage />
        : <POSPage />
  return <MainLayout>{page}</MainLayout>
}
import MainLayout from './components/MainLayout'
