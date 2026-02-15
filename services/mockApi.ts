
import { User, PaginatedResponse } from '../types';

let users: User[] = Array.from({ length: 45 }).map((_, i) => ({
  id: `user-${i + 1}`,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: i % 3 === 0 ? 'Admin' : i % 3 === 1 ? 'Editor' : 'Viewer',
  avatar: `https://picsum.photos/seed/${i + 1}/100/100`,
  status: i % 4 === 0 ? 'Inactive' : i % 5 === 0 ? 'Pending' : 'Active',
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
}));

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const userService = {
  async getUsers(page: number = 1, limit: number = 10, search: string = ''): Promise<PaginatedResponse<User>> {
    await delay(800);
    const filtered = users.filter(u => 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.email.toLowerCase().includes(search.toLowerCase())
    );
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
      data: filtered.slice(start, end),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  },

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'avatar'>): Promise<User> {
    await delay(1000);
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
      avatar: `https://picsum.photos/seed/${Date.now()}/100/100`,
    };
    users = [newUser, ...users];
    return newUser;
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    await delay(1000);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    users[index] = { ...users[index], ...updates };
    return users[index];
  },

  async deleteUser(id: string): Promise<void> {
    await delay(1000);
    users = users.filter(u => u.id !== id);
  }
};
