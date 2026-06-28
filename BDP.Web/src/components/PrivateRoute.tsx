import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function PrivateRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  // Wait until we've restored any session from localStorage before deciding. Without
  // this, hard-reloading/bookmarking a deep link (e.g. /clients/1) redirects an
  // authenticated user to login (and then to the dashboard), losing the deep link.
  if (!isInitialized) return null

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
