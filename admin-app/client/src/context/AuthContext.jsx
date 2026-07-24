import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('sk_admin_token')) { setLoading(false); return; }
    api.get('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem('sk_admin_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const d = await api.post('/auth/login', { email, password });
    localStorage.setItem('sk_admin_token', d.token);
    setUser(d.user);
    return d.user;
  }
  function logout() {
    localStorage.removeItem('sk_admin_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
