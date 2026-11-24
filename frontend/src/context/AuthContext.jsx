import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { reconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('codeswap_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await authApi.getMe();
        if (res.success && res.data?.user) {
          setUser(res.data.user);
          reconnectSocket();
        } else {
          localStorage.removeItem('codeswap_token');
          setUser(null);
        }
      } catch (err) {
        console.error('Session restoration failed:', err);
        localStorage.removeItem('codeswap_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const loginOrganizer = async (credentials) => {
    const res = await authApi.loginOrganizer(credentials);
    if (res.success && res.data?.token) {
      localStorage.setItem('codeswap_token', res.data.token);
      setUser(res.data.user);
      reconnectSocket();
      return res.data.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const registerOrganizer = async (data) => {
    const res = await authApi.registerOrganizer(data);
    if (res.success && res.data?.token) {
      localStorage.setItem('codeswap_token', res.data.token);
      setUser(res.data.user);
      reconnectSocket();
      return res.data.user;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const loginParticipant = async (credentials) => {
    const res = await authApi.loginParticipant(credentials);
    if (res.success && res.data?.token) {
      localStorage.setItem('codeswap_token', res.data.token);
      setUser(res.data.user);
      reconnectSocket();
      return res.data.user;
    }
    throw new Error(res.message || 'Participant login failed');
  };

  const loginAdmin = async (credentials) => {
    const res = await authApi.loginAdmin(credentials);
    if (res.success && res.data?.token) {
      localStorage.setItem('codeswap_token', res.data.token);
      setUser(res.data.user);
      reconnectSocket();
      return res.data.user;
    }
    throw new Error(res.message || 'Admin login failed');
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (_) {}
    localStorage.removeItem('codeswap_token');
    setUser(null);
    reconnectSocket();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isOrganizer: user?.role === 'organizer',
        isParticipant: user?.role === 'participant',
        isAdmin: user?.role === 'admin',
        loginOrganizer,
        registerOrganizer,
        loginParticipant,
        loginAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
