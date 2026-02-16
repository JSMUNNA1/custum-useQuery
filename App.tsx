
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, invalidateQueries } from './hooks/useQuery';
import { useMutation } from './hooks/useMutation';
import { userService } from './services/mockApi';
import { User, PaginatedResponse } from './types';
import { Modal } from './components/Modal';
import { UserForm } from './components/UserForm';

const App: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number, message: string, type: 'success' | 'error' }[]>([]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery<PaginatedResponse<User>>({
    queryKey: ['users', page, debouncedSearch],
    queryFn: () => userService.getUsers(page, 5, debouncedSearch),
    staleTime: 0, // 1 minute
  });

  const deleteMutation = useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: () => {
      invalidateQueries(['users']);
      addToast('User deleted successfully (Simulated)');
    },
    onError: () => addToast('Failed to delete user', 'error')
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50 font-sans selection:bg-indigo-100">
      {/* Toast Container */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-right-full duration-300 pointer-events-auto ${
            toast.type === 'success' ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'
          }`}>
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        ))}
      </div>

      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md">JP</div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Admin Console</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => refetch()}
              className={`p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 ${isFetching ? 'animate-spin text-indigo-600' : ''}`}
              title="Refresh Data"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button 
              onClick={handleAdd}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Member</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search name, email, or ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
              />
            </div>
            
            <div className="flex items-center gap-3 text-sm font-medium">
              {isFetching && <span className="text-indigo-600 flex items-center gap-2 animate-pulse"><div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div> Synchronizing...</span>}
              <span className="text-slate-400">|</span>
              <span className="text-slate-500">{data?.total || 0} Total Results</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                    <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                  </div>
                  <div className="w-20 h-6 bg-slate-100 rounded-full"></div>
                  <div className="w-16 h-4 bg-slate-100 rounded"></div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-20 text-center">
              <div className="bg-rose-50 text-rose-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-900">Communication Error</h3>
              <p className="text-slate-500 text-sm mb-4">We couldn't reach the API server.</p>
              <button onClick={() => refetch()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">Try Connection Again</button>
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="p-20 text-center">
              <p className="text-slate-400 text-sm">No members match your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Team Member</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Permission</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Current Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={user.avatar} className="w-10 h-10 rounded-xl bg-slate-200 shadow-sm" alt="" loading="lazy" />
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-tight">{user.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'Admin' ? 'bg-indigo-100 text-indigo-700' : 
                          user.role === 'Editor' ? 'bg-emerald-100 text-emerald-700' : 
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            user.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'
                          }`}></div>
                          <span className={user.status === 'Active' ? 'text-slate-900 font-medium' : 'text-slate-400'}>{user.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit Member">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button onClick={() => handleDelete(user.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Remove Member">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {data && data.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
            <span className="text-sm text-slate-500">Showing page {page} of {data.totalPages}</span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1 || isFetching}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button 
                disabled={page === data.totalPages || isFetching}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 bg-indigo-600 border border-indigo-700 rounded-xl text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingUser ? 'Update Profile' : 'Invite New Member'}
      >
        <UserForm 
          user={editingUser || undefined} 
          onSuccess={() => {
            setIsModalOpen(false);
            addToast(editingUser ? 'User updated successfully' : 'User invited successfully');
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default App;
