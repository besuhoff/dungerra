import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthManager } from "../api/AuthManager";
import { useAuth } from "../contexts/AuthContext";

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const authManager = AuthManager.getInstance();
  const { isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    // If already authenticated, redirect to sessions
    if (!isLoading && isAuthenticated) {
      navigate("/sessions", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = async () => {
    if (authManager.isPerformingRequest()) {
      return;
    }

    try {
      setError("");
      await authManager.getAuthUrl();
      authManager.openAuthPage();
    } catch (err) {
      console.error("Authentication failed:", err);
      setError("Authentication failed. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div id="loginScreen" className="screen">
        <img className="logo" src="favicon.png" alt="" width="100" />
        <h1>Dungerra</h1>
        <p id="loader">Loading...</p>
      </div>
    );
  }

  return (
    <div id="loginScreen" className="screen">
      <img className="logo" src="favicon.png" alt="" width="100" />
      <h1>Dungerra</h1>
      <div className="button-container">
        <button id="loginButton" onClick={handleLogin}>
          Login with Google
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
};
