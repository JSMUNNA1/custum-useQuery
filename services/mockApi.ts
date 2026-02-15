
import { User, PaginatedResponse } from '../types';

const BASE_URL = 'https://jsonplaceholder.typicode.com';

const mapUser = (jsonUser: any): User => {
  const idAsNumber = Number(jsonUser.id);
  const date = (idAsNumber > 1000) 
    ? new Date() 
    : new Date(2023, 0, idAsNumber);

  return {
    id: jsonUser.id.toString(),
    name: jsonUser.name,
    email: jsonUser.email,
    role: idAsNumber % 3 === 0 ? 'Admin' : idAsNumber % 3 === 1 ? 'Editor' : 'Viewer',
    avatar: `https://i.pravatar.cc/150?u=${jsonUser.id}`,
    status: idAsNumber % 4 === 0 ? 'Inactive' : idAsNumber % 5 === 0 ? 'Pending' : 'Active',
    createdAt: date.toISOString(),
  };
};

export const userService = {
  async getUsers(page: number = 1, limit: number = 10, search: string = ''): Promise<PaginatedResponse<User>> {
    const url = new URL(`${BASE_URL}/users`);
    url.searchParams.append('_page', page.toString());
    url.searchParams.append('_limit', limit.toString());
    
    // Only append 'q' if search is not empty to avoid API quirks
    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      url.searchParams.append('q', trimmedSearch);
    }

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to fetch users');

    // JSONPlaceholder uses 'x-total-count' header for pagination
    const totalCount = parseInt(response.headers.get('x-total-count') || '10', 10);
    const data = await response.json();

    return {
      data: data.map(mapUser),
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  },

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'avatar'>): Promise<User> {
    const response = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      body: JSON.stringify(user),
      headers: { 'Content-type': 'application/json; charset=UTF-8' },
    });
    if (!response.ok) throw new Error('Failed to create user');
    const data = await response.json();
    return mapUser({ ...data, id: Date.now() });
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const response = await fetch(`${BASE_URL}/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      headers: { 'Content-type': 'application/json; charset=UTF-8' },
    });
    if (!response.ok) throw new Error('Failed to update user');
    const data = await response.json();
    return mapUser(data);
  },

  async deleteUser(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/users/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete user');
  }
};
