import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Game } from "../utils/Game";
import { SessionManager } from "../api/SessionManager";
import { LeaderboardManager } from "../api/LeaderboardManager";
import * as config from "../config";

export const GameScreen: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const gameRef = useRef<Game | null>(null);
  const initializingRef = useRef(false);
  const [error, setError] = useState("");

  // Memoize manager instances to prevent re-creation on every render
  const sessionManager = useMemo(() => SessionManager.getInstance(), []);
  const leaderboardManager = useMemo(
    () => LeaderboardManager.getInstance(),
    []
  );

  useEffect(() => {
    if (!sessionId) {
      navigate("/sessions");
      return;
    }

    // Prevent multiple initializations
    if (initializingRef.current || gameRef.current) {
      return;
    }

    initializingRef.current = true;

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
      } finally {
        initializingRef.current = false;
      }
    };

    initGame();

    // Cleanup on unmount
    return () => {
      if (gameRef.current) {
        sessionManager.endSession().catch((err) => {
          console.error("Error ending session:", err);
        });
        gameRef.current.stop();
        gameRef.current = null;
      }
      initializingRef.current = false;
      document.title = "Dungerra";
    };
  }, [sessionId, navigate, sessionManager]);

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

// Memoize component to prevent re-renders from parent
export default React.memo(GameScreen);
