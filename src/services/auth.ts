import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export const authService = {
  async register(email: string, password: string, name?: string): Promise<{ token: string; user: AuthUser }> {
    const res = await axios.post(`${BASE_URL}/auth/register`, { email, password, name });
    return res.data.data;
  },
  async login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    return res.data.data;
  },
  saveToken(token: string) {
    localStorage.setItem('token', token);
  },
  clearToken() {
    localStorage.removeItem('token');
  },
  getToken(): string | null {
    return localStorage.getItem('token');
  }
};


