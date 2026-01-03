import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Game } from "../utils/Game";
import { SessionManager } from "../api/SessionManager";
import { LeaderboardManager } from "../api/LeaderboardManager";
import * as config from "../config";

export const GameScreen: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const gameRef = useRef<Game | null>(null);
  const [error, setError] = useState("");
  const sessionManager = SessionManager.getInstance();
  const leaderboardManager = LeaderboardManager.getInstance();

  useEffect(() => {
    if (!sessionId) {
      navigate("/sessions");
      return;
    }

    const initGame = async () => {
      try {
        const session = await sessionManager.joinSession(sessionId);
        document.title = `Dungerra - ${session.name}`;

        const game = new Game();
        gameRef.current = game;
        await game.start(session);
      } catch (err) {
        console.error("Failed to join session:", err);
        setError("Failed to join session. Redirecting...");
        setTimeout(() => navigate("/sessions"), 2000);
      }
    };

    initGame();

    // Cleanup on unmount
    return () => {
      if (gameRef.current) {
        gameRef.current.stop();
        gameRef.current = null;
      }
      document.title = "Dungerra";
    };
  }, [sessionId, navigate]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = async () => {
      if (gameRef.current) {
        try {
          await sessionManager.endSession();
          gameRef.current.stop();

          // Refresh leaderboard data
          await leaderboardManager.getLeaderboard();
          navigate("/sessions");
        } catch (err) {
          console.error("Error ending session:", err);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate]);

  if (error) {
    return (
      <div className="screen">
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div id="gameScreen" className="screen">
      <canvas
        id="gameCanvas"
        className="gameCanvas"
        width={config.SCREEN_WIDTH}
        height={config.SCREEN_HEIGHT}
      ></canvas>
      <canvas
        id="lightCanvas"
        className="gameCanvas"
        width={config.SCREEN_WIDTH}
        height={config.SCREEN_HEIGHT}
      ></canvas>
      <canvas
        id="uiCanvas"
        className="gameCanvas"
        width={config.SCREEN_WIDTH}
        height={config.SCREEN_HEIGHT}
      ></canvas>
    </div>
  );
};
