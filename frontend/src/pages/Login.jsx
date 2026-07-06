import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { login as apiLogin, getCurrentUser } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // OAuth2 requires form data
      const formData = new URLSearchParams()
      formData.append('username', username)
      formData.append('password', password)

      const tokenResponse = await apiLogin(formData)
      const token = tokenResponse.data.access_token

      // Set token temporarily to fetch user info
      localStorage.setItem('token', token)
      
      const userResponse = await getCurrentUser()
      login(token, userResponse.data)
      
      navigate(from, { replace: true })
    } catch (err) {
      localStorage.removeItem('token')
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl">
        <div>
          <div className="flex justify-center mb-4">
            <svg width="46" height="36" viewBox="0 0 46 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="22" height="22" rx="4" fill="#2563EB" />
              <rect x="12" y="14" width="22" height="22" rx="4" fill="#0D9488" />
              <rect x="24" y="0" width="22" height="22" rx="4" fill="#3B82F6" />
            </svg>
          </div>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            AIQ Platform
          </h2>
          <p className="mt-2 text-center text-sm text-gray-700 dark:text-gray-300">
            Integrated with Inventory Management
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center font-medium">
              {error}
            </div>
          )}
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="sr-only" htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="aiq-input"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="sr-only" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="aiq-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="aiq-btn-primary w-full flex justify-center text-base"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
