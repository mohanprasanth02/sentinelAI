import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const API_URL = `http://${window.location.hostname}:8000/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('sentinel_token') || null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sentinel_theme') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('sentinel_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Setup user details from token
  useEffect(() => {
    if (token) {
      // Basic jwt decode
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        if (isExpired) {
          logout();
        } else {
          setUser({
            username: payload.sub,
            role: payload.role,
          });
        }
      } catch (e) {
        logout();
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  const addToast = (title, message, severity = 'Info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, title, message, severity }]);
    
    // Auto dismiss after 6 seconds
    setTimeout(() => {
      dismissToast(id);
    }, 6000);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Poll for notifications from backend
  useEffect(() => {
    if (!token) return;
    
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            // If we receive new notifications, toast them
            data.forEach(n => {
              // Check if notification is already displayed
              setToasts(prev => {
                const exists = prev.some(t => t.message === n.message);
                if (!exists) {
                  // Toast it
                  return [...prev, {
                    id: n.id,
                    title: n.title,
                    message: n.message,
                    severity: n.severity
                  }];
                }
                return prev;
              });
            });

            // Mark notifications as read so they are not fetched repeatedly
            await fetch(`${API_URL}/notifications/read`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` }
            });
          }
        }
      } catch (e) {
        console.error("Failed to fetch notifications: ", e);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const login = async (username, password, mfaCode = null) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, mfa_code: mfaCode })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }
      
      if (data.mfa_required) {
        return { mfaRequired: true, mfaSecret: data.mfa_secret };
      }
      
      localStorage.setItem('sentinel_token', data.access_token);
      setToken(data.access_token);
      
      addToast("Authentication Success", `Welcome back, ${data.username}. Secure SOC Session initialized.`, "Info");
      return { success: true, user: { username: data.username, role: data.role } };
    } catch (error) {
      addToast("Authentication Blocked", error.message, "High");
      throw error;
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        // Silent fail if network is dead or endpoint expired
      }
    }
    localStorage.removeItem('sentinel_token');
    setToken(null);
    setUser(null);
    addToast("Session Concluded", "Logged out. Access token revoked.", "Info");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, toasts, addToast, dismissToast, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
