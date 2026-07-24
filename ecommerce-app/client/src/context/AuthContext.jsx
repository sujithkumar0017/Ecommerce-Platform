import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sk_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem('sk_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const d = await api.post('/auth/login', { email, password }, { auth: false });
    localStorage.setItem('sk_token', d.token);
    setUser(d.user);
    return d.user;
  }

  async function signup(payload) {
    const d = await api.post('/auth/signup', payload, { auth: false });
    localStorage.setItem('sk_token', d.token);
    setUser(d.user);
    return d.user;
  }

  function logout() {
    localStorage.removeItem('sk_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
