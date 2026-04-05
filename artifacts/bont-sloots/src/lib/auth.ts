import { useState, useEffect } from "react";

export function useAuth() {
  const [token, setToken] = useState<string | null>(
    sessionStorage.getItem("adminToken")
  );

  const login = (newToken: string) => {
    sessionStorage.setItem("adminToken", newToken);
    setToken(newToken);
  };

  const logout = () => {
    sessionStorage.removeItem("adminToken");
    setToken(null);
  };

  return { token, login, logout, isAuthenticated: !!token };
}