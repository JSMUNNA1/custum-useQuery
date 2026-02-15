
import React, { useState, useMemo } from 'react';
import { useQuery, invalidateQueries } from './hooks/useQuery';
import { useMutation } from './hooks/useMutation';
import { userService } from './services/mockApi';
import { User, PaginatedResponse } from './types';
import { Modal } from './components/Modal';
import { UserForm } from './components/UserForm';

const App: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // useQuery for fetching paginated users
  const { data, isLoading, isFetching, isError, refetch } = useQuery<PaginatedResponse<User>>({
    queryKey: ['users', page, searchTerm],
    queryFn: () => userService.getUsers(page, 10, searchTerm),
    staleTime: 30000, // 30 seconds
  });

  // useMutation for deleting a user
  const deleteMutation = useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: () => {
      invalidateQueries(['users']);
    }
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
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">Q</div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">QueryMaster</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => refetch()}
              className={`p-2 rounded-lg hover:bg-slate-50 transition-colors text-slate-500 ${isFetching ? 'animate-spin' : ''}`}
              title="Force Refresh"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button 
              onClick={handleAdd}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Member</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Controls */}
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
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all sm:text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {isFetching && (
                <span className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-medium animate-pulse">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                  Syncing...
                </span>
              )}
              <span>Found {data?.total || 0} results</span>
            </div>
          </div>
        </div>

        {/* Table/List Area */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading || (!data && !isError) ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium">Loading your team...</p>
            </div>
          ) : isError ? (
            <div className="p-20 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Failed to load data</h3>
                <p className="text-slate-500 max-w-xs mx-auto">There was an issue connecting to the server. Please check your connection.</p>
              </div>
              <button 
                onClick={() => refetch()} 
                className="px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">No members found</h3>
              <p className="text-slate-500">Try adjusting your search filters or add a new member.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" alt={user.name} />
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">{user.name}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'Admin' ? 'bg-indigo-100 text-indigo-700' : 
                          user.role === 'Editor' ? 'bg-amber-100 text-amber-700' : 
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'Active' ? 'text-emerald-700 bg-emerald-50' : 
                          user.status === 'Inactive' ? 'text-slate-500 bg-slate-50' : 
                          'text-amber-700 bg-amber-50'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            user.status === 'Active' ? 'bg-emerald-500' : 
                            user.status === 'Inactive' ? 'bg-slate-400' : 
                            'bg-amber-500'
                          }`}></span>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            disabled={deleteMutation.isLoading}
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <p className="text-sm text-slate-500 font-medium">
              Showing <span className="text-slate-900">{((page-1)*10) + 1}</span> to <span className="text-slate-900">{Math.min(page*10, data.total)}</span> of <span className="text-slate-900">{data.total}</span>
            </p>
            <div className="flex gap-2">
              <button 
                disabled={page === 1 || isFetching}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: data.totalPages }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`w-10 h-10 rounded-xl font-bold transition-all ${
                      page === i + 1 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-400'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                disabled={page === data.totalPages || isFetching}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-600 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 text-center">
        <p className="text-slate-400 text-sm">Powered by Custom Query Hooks & React 18</p>
      </footer>

      {/* Modals */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingUser ? 'Edit Team Member' : 'Add New Member'}
      >
        <UserForm 
          user={editingUser || undefined} 
          onSuccess={() => setIsModalOpen(false)}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default App;
