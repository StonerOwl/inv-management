import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { listUsers, createUser, updateUser } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit, ShieldCheck, Upload } from 'lucide-react'
import clsx from 'clsx'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user: currentUser } = useAuth()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    can_upload: false,
    is_active: true
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data } = await listUsers()
      setUsers(data)
    } catch (err) {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingUser(null)
    setFormData({ username: '', password: '', role: 'user', can_upload: false, is_active: true })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (user) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: '', // blank unless changing
      role: user.role,
      can_upload: user.can_upload,
      is_active: user.is_active
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          role: formData.role,
          can_upload: formData.can_upload,
          is_active: formData.is_active
        })
      } else {
        if (!formData.password) {
          alert('Password is required for new users')
          return
        }
        await createUser(formData)
      }
      setIsModalOpen(false)
      fetchUsers()
    } catch (err) {
      alert(err.response?.data?.detail || 'An error occurred')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col">
      
      <div className="max-w-7xl mx-auto w-full px-8 flex-1 pb-20">
        <div className="mb-12 border-b border-gray-200 dark:border-gray-800 pb-6 flex items-end justify-between mt-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Users</h1>
            <div className="text-sm font-semibold text-primary-600 dark:text-primary-400 mt-2 flex items-center gap-4">
              <span>&gt; ACCESS MANAGEMENT [{users.length}]</span>
            </div>
          </div>
          <button
            onClick={handleOpenCreate}
            className="aiq-btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> ADD USER
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-primary-600 font-semibold tracking-normal text-xl animate-pulse">Loading Users...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 font-semibold tracking-normal text-xl">{error}</div>
        ) : (
          <div className="aiq-card relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 whitespace-nowrap">USER</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 whitespace-nowrap">ROLE</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 whitespace-nowrap">PERMISSIONS</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 whitespace-nowrap">STATUS</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 whitespace-nowrap">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {users.map((u, idx) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                      <td className="py-4 px-6 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {u.username}
                        {u.id === currentUser.id && <span className="ml-3 text-[10px] bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full font-bold tracking-normal">YOU</span>}
                      </td>
                      <td className="py-4 px-6 text-sm font-medium">
                        {u.role === 'admin' ? <span className="text-purple-600 dark:text-purple-400 flex items-center gap-2"><ShieldCheck size={16}/> ADMIN</span> : <span className="text-gray-700 dark:text-gray-300">USER</span>}
                      </td>
                      <td className="py-4 px-6 text-sm font-medium">
                        {u.role === 'admin' || u.can_upload ? <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-2"><Upload size={16}/> CAN UPLOAD</span> : <span className="text-gray-700 dark:text-gray-300">READ-ONLY</span>}
                      </td>
                      <td className="py-4 px-6 text-sm font-medium">
                        {u.is_active ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">ACTIVE</span> : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">INACTIVE</span>}
                      </td>
                      <td className="py-4 px-6 text-sm font-medium">
                        <button onClick={() => handleOpenEdit(u)} className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-2 transition-colors font-bold">
                          <Edit size={14} /> EDIT
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden relative">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editingUser ? 'Edit User' : 'Create User'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wide mb-1.5">Username</label>
                <input
                  type="text"
                  disabled={!!editingUser}
                  required
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="aiq-input disabled:bg-gray-50 disabled:dark:bg-gray-800/50 disabled:text-gray-500"
                />
              </div>
              
              {!editingUser && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wide mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="aiq-input"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wide mb-1.5">Role</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    disabled={editingUser?.id === currentUser.id}
                    className="aiq-input appearance-none disabled:bg-gray-50 disabled:dark:bg-gray-800/50 disabled:text-gray-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 tracking-wide mb-1.5">Status</label>
                  <select
                    value={formData.is_active ? 'true' : 'false'}
                    onChange={e => setFormData({...formData, is_active: e.target.value === 'true'})}
                    disabled={editingUser?.id === currentUser.id}
                    className="aiq-input appearance-none disabled:bg-gray-50 disabled:dark:bg-gray-800/50 disabled:text-gray-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              {formData.role === 'user' && (
                <div>
                  <label className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.can_upload}
                      onChange={e => setFormData({...formData, can_upload: e.target.checked})}
                      className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">Allow Uploads</span>
                      <span className="block text-xs text-gray-700 dark:text-gray-300 mt-0.5">Can this user upload invoices?</span>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800 mt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="aiq-btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="aiq-btn-primary"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
