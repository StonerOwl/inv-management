import { useState, useEffect } from 'react'
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
        <div className="mb-12 border-b border-gray-200 dark:border-gray-700 pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-7xl font-black tracking-tighter ">Users</h1>
            <div className="text-sm font-bold tracking-normal text-primary-600 mt-2 flex items-center gap-4">
              <span>&gt; ACCESS MANAGEMENT [{users.length}]</span>
              <div className="w-32 h-[1px] bg-[#FCD535]"></div>
            </div>
          </div>
          <button
            onClick={handleOpenCreate}
            className="btn-brutal-dark px-6 py-3 flex items-center gap-2 text-sm font-black font-semibold tracking-normal"
          >
            <Plus size={16} /> ADD USER
          </button>
        </div>

        <div className="divider-striped-yellow mb-8"></div>

        {loading ? (
          <div className="text-center py-12 text-primary-600 font-black font-semibold tracking-normal text-2xl animate-pulse">Loading Users...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 font-black font-semibold tracking-normal text-2xl">{error}</div>
        ) : (
          <div className="card-brutal-dark relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap border-r border-gray-100 dark:border-gray-800">USER</th>
                    <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap border-r border-gray-100 dark:border-gray-800">ROLE</th>
                    <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap border-r border-gray-100 dark:border-gray-800">PERMISSIONS</th>
                    <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap border-r border-gray-100 dark:border-gray-800">STATUS</th>
                    <th className="py-4 px-4 text-xs font-black tracking-normal text-primary-600 whitespace-nowrap">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <tr key={u.id} className={clsx("border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:bg-gray-800 transition-colors", idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900')}>
                      <td className="py-3 px-4 text-sm font-bold border-r border-gray-100 dark:border-gray-800">
                        {u.username}
                        {u.id === currentUser.id && <span className="ml-3 text-[10px] bg-[#FCD535] text-black px-1.5 py-0.5 font-semibold tracking-normal">YOU</span>}
                      </td>
                      <td className="py-3 px-4 text-xs font-bold  border-r border-gray-100 dark:border-gray-800">
                        {u.role === 'admin' ? <span className="text-purple-400 flex items-center gap-2"><ShieldCheck size={14}/> ADMIN</span> : <span className="text-gray-500 dark:text-gray-400">USER</span>}
                      </td>
                      <td className="py-3 px-4 text-xs font-bold  border-r border-gray-100 dark:border-gray-800">
                        {u.role === 'admin' || u.can_upload ? <span className="text-emerald-500 flex items-center gap-2"><Upload size={14}/> CAN UPLOAD</span> : <span className="text-gray-600 dark:text-gray-400">READ-ONLY</span>}
                      </td>
                      <td className="py-3 px-4 text-xs font-bold  border-r border-gray-100 dark:border-gray-800">
                        {u.is_active ? <span className="text-emerald-500">ACTIVE</span> : <span className="text-red-500">INACTIVE</span>}
                      </td>
                      <td className="py-3 px-4 text-xs font-bold ">
                        <button onClick={() => handleOpenEdit(u)} className="text-primary-600 hover:text-gray-900 dark:text-gray-100 flex items-center gap-2 transition-colors">
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-800/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-[8px_8px_0px_0px_rgba(252,213,53,1)] w-full max-w-md overflow-hidden">
            <div className="p-6 border-b-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <h2 className="text-2xl font-black text-primary-600 tracking-tighter ">
                {editingUser ? 'EDIT USER' : 'CREATE USER'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 font-semibold tracking-normal mb-2">Username</label>
                <input
                  type="text"
                  disabled={!!editingUser}
                  required
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-primary-600 outline-none disabled:opacity-50 disabled:bg-gray-50 dark:bg-gray-900"
                />
              </div>
              
              {!editingUser && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 font-semibold tracking-normal mb-2">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-primary-600 outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 font-semibold tracking-normal mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    disabled={editingUser?.id === currentUser.id}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-primary-600 outline-none disabled:opacity-50 appearance-none "
                  >
                    <option value="user" className="bg-white dark:bg-gray-800">USER</option>
                    <option value="admin" className="bg-white dark:bg-gray-800">ADMIN</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 font-semibold tracking-normal mb-2">Status</label>
                  <select
                    value={formData.is_active ? 'true' : 'false'}
                    onChange={e => setFormData({...formData, is_active: e.target.value === 'true'})}
                    disabled={editingUser?.id === currentUser.id}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 focus:border-primary-600 outline-none disabled:opacity-50 appearance-none "
                  >
                    <option value="true" className="bg-white dark:bg-gray-800">ACTIVE</option>
                    <option value="false" className="bg-white dark:bg-gray-800">INACTIVE</option>
                  </select>
                </div>
              </div>

              {formData.role === 'user' && (
                <div>
                  <label className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer hover:border-primary-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.can_upload}
                      onChange={e => setFormData({...formData, can_upload: e.target.checked})}
                      className="w-5 h-5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-primary-600 focus:ring-0 checked:bg-[#FCD535]"
                    />
                    <div>
                      <span className="block text-sm font-black font-semibold tracking-normal text-gray-900 dark:text-gray-100">ALLOW UPLOADS</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 font-bold  mt-1">Can this user upload?</span>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-xs font-black font-semibold tracking-normal text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="btn-brutal-dark px-8 py-3 text-xs font-black font-semibold tracking-normal"
                >
                  {editingUser ? 'SAVE CHANGES' : 'CREATE USER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
