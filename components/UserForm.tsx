
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { useMutation } from '../hooks/useMutation';
import { userService } from '../services/mockApi';
import { invalidateQueries } from '../hooks/useQuery';

interface UserFormProps {
  user?: User;
  onSuccess: () => void;
  onCancel: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({ user, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'Viewer',
    status: user?.status || 'Active' as User['status'],
  });

  const mutation = useMutation({
    mutationFn: (vars: any) => user 
      ? userService.updateUser(user.id, vars)
      : userService.createUser(vars),
    onSuccess: () => {
      invalidateQueries(['users']);
      onSuccess();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
        <input
          required
          type="text"
          value={formData.name}
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          placeholder="e.g. John Doe"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
        <input
          required
          type="email"
          value={formData.email}
          onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          placeholder="john@example.com"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
          <select
            value={formData.role}
            onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          >
            <option>Admin</option>
            <option>Editor</option>
            <option>Viewer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
          >
            <option>Active</option>
            <option>Inactive</option>
            <option>Pending</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isLoading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {mutation.isLoading && (
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {user ? 'Update User' : 'Create User'}
        </button>
      </div>
      {mutation.isError && (
        <p className="text-red-500 text-xs text-center mt-2">Error: {mutation.error?.message || 'Something went wrong'}</p>
      )}
    </form>
  );
};
