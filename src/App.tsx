import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginScreen } from "./components/LoginScreen";
import { LeaderboardScreen } from "./components/LeaderboardScreen";
import { GameScreen } from "./components/GameScreen";
import { LegendScreen } from "./components/LegendScreen";

export const App: React.FC = () => {
  return (
    <Router
      basename={process.env.NODE_ENV === "production" ? "/dungerra" : "/"}
    >
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginScreen />} />
          <Route
            path="/sessions"
            element={
              <ProtectedRoute>
                <LeaderboardScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <LeaderboardScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/legend"
            element={
              <ProtectedRoute>
                <LegendScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/:sessionId"
            element={
              <ProtectedRoute>
                <GameScreen />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};
