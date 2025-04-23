import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create the authentication context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component that wraps the app and makes auth object available to any child component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenRefreshTimer, setTokenRefreshTimer] = useState(null);

  // Check if token is expired or about to expire
  const isTokenExpired = useCallback(() => {
    const expiresAt = localStorage.getItem('authTokenExpires');
    if (!expiresAt) return true;

    // Consider token expired if less than 5 minutes remaining
    const expiryTime = parseInt(expiresAt, 10);
    const now = Date.now();
    return now > expiryTime - 5 * 60 * 1000; // 5 minutes buffer
  }, []);

  // Function to refresh the token
  const refreshToken = useCallback(async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) return false;

      // Call the refresh token endpoint
      const response = await fetch('/api/passkey/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          // Update token in localStorage
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('authTokenExpires', data.expiresAt);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, []);

  // Check if user is authenticated on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Get the auth token from localStorage
        const authToken = localStorage.getItem('authToken');

        // If no token, user is not authenticated
        if (!authToken) {
          setUser(null);
          setLoading(false);
          return;
        }

        // Check if token is expired
        if (isTokenExpired()) {
          // Try to refresh the token
          const refreshed = await refreshToken();
          if (!refreshed) {
            // If refresh failed, clear auth data and redirect to login
            localStorage.removeItem('authToken');
            localStorage.removeItem('authTokenExpires');
            localStorage.removeItem('authUser');
            document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            setUser(null);
            setLoading(false);
            return;
          }
        }

        // Try to get user from localStorage first for faster UI rendering
        const storedUser = localStorage.getItem('authUser');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            console.error('Error parsing stored user:', e);
          }
        }

        // Add the token to the Authorization header
        const response = await fetch('/api/user', {
          credentials: 'include', // Important for cookies
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          // Update stored user data
          localStorage.setItem('authUser', JSON.stringify(userData));
        } else {
          // If the API returns 401, the token is invalid or expired
          if (response.status === 401) {
            // Clear the invalid token
            localStorage.removeItem('authToken');
            localStorage.removeItem('authTokenExpires');
            localStorage.removeItem('authUser');
            // Clear the cookie
            document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          }
          setUser(null);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();

    // Set up token refresh timer
    const refreshInterval = setInterval(() => {
      if (isTokenExpired()) {
        refreshToken().catch(err => {
          console.error('Background token refresh failed:', err);
        });
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    setTokenRefreshTimer(refreshInterval);

    // Clean up timer on unmount
    return () => {
      if (tokenRefreshTimer) {
        clearInterval(tokenRefreshTimer);
      }
    };
  }, [isTokenExpired, refreshToken]);

  // Function to handle logout
  const logout = useCallback(async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        // Call the logout API to invalidate the token on the server
        await fetch('/api/passkey/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        }).catch(err => console.error('Logout API call failed:', err));
      }

      // Clear auth data from localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('authTokenExpires');
      localStorage.removeItem('authUser');

      // Clear the cookie
      document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      // Reset the user state
      setUser(null);

      // Redirect to login page
      window.location.href = '/login.html';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);

  // Auth context value
  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    logout,
    refreshToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
