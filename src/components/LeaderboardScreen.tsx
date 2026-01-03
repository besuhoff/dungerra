import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AuthManager } from "../api/AuthManager";
import { LeaderboardManager } from "../api/LeaderboardManager";
import { SessionManager } from "../api/SessionManager";
import { LeaderboardEntry } from "../types/leaderboard";
import { Session } from "../types/session";

function generateFunnySessionName(): string {
  const adjectives = [
    "Silly",
    "Crazy",
    "Brave",
    "Sneaky",
    "Mighty",
    "Clumsy",
    "Epic",
    "Fancy",
    "Grumpy",
    "Happy",
    "Sleepy",
    "Dancing",
    "Flying",
    "Invisible",
    "Legendary",
    "Mysterious",
    "Chaotic",
    "Funky",
    "Bizarre",
    "Magical",
  ];

  const nouns = [
    "Dragon",
    "Goblin",
    "Wizard",
    "Knight",
    "Potato",
    "Unicorn",
    "Troll",
    "Ninja",
    "Pirate",
    "Skeleton",
    "Chicken",
    "Banana",
    "Mushroom",
    "Phoenix",
    "Penguin",
    "Donut",
    "Cactus",
    "Platypus",
    "Waffle",
    "Pickles",
  ];

  const places = [
    "Dungeon",
    "Castle",
    "Cave",
    "Tower",
    "Forest",
    "Swamp",
    "Mountain",
    "Island",
    "Kingdom",
    "Realm",
    "Lair",
    "Temple",
    "Abyss",
    "Palace",
    "Fortress",
  ];

  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomPlace = places[Math.floor(Math.random() * places.length)];

  return `${randomAdjective} ${randomNoun} ${randomPlace}`;
}

export const LeaderboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authManager = AuthManager.getInstance();
  const leaderboardManager = LeaderboardManager.getInstance();
  const sessionManager = SessionManager.getInstance();

  const activeTab =
    location.pathname === "/leaderboard" ? "leaderboard" : "sessions";
  const [sessions, setSessions] = useState<Session[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [sessionName, setSessionName] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const userData = authManager.getUserData();
        if (!userData) {
          console.error("No user data available");
          setError("Failed to load user data. Please try logging in again.");
          return;
        }
        setUsername(userData.username);

        const [leaderboardData, sessionsData] = await Promise.all([
          leaderboardManager.getLeaderboard(),
          sessionManager.listSessions(),
        ]);

        setLeaderboard(leaderboardData);
        setSessions(sessionsData);
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Failed to load data. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleJoinSession = async (sessionId: string) => {
    try {
      setError("");
      const session = await sessionManager.joinSession(sessionId);
      navigate(`/${sessionId}`);
    } catch (err) {
      console.error("Failed to join session:", err);
      setError("Failed to join session. Please try again.");
    }
  };

  const handleDeleteSession = async (
    sessionId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this session?")) {
      return;
    }

    try {
      await sessionManager.deleteSession(sessionId);
      const sessionsData = await sessionManager.listSessions();
      setSessions(sessionsData);
    } catch (err) {
      console.error("Failed to delete session:", err);
      setError("Failed to delete session. Please try again.");
    }
  };

  const handleStartGame = () => {
    setSessionName(generateFunnySessionName());
    setShowModal(true);
  };

  const handleCreateSession = async () => {
    const trimmedName = sessionName.trim();
    if (!trimmedName) {
      return;
    }

    setShowModal(false);

    try {
      const session = await sessionManager.startSession(trimmedName);
      navigate(`/${session.id}`);
    } catch (err) {
      console.error("Failed to create session:", err);
      setError("There's a problem on our end. Please try again later.");
    }
  };

  const currentUserId = authManager.getUserData()?.id;

  return (
    <>
      <div id="leaderboardScreen" className="screen">
        <img className="logo" src="favicon.png" alt="" width="100" />
        <h1>Dungerra</h1>
        <div style={{ textAlign: "center" }}>
          <p style={{ marginBottom: "1em" }}>
            Welcome, <span id="username">{username}</span>!
          </p>
          <p>
            <Link
              to="/legend"
              style={{ color: "#fff", textDecoration: "underline" }}
            >
              What?! Where am I?
            </Link>
          </p>
        </div>

        <div className="tabs">
          <button
            className={`tab-button ${activeTab === "sessions" ? "active" : ""}`}
            onClick={() => navigate("/sessions")}
          >
            Sessions
          </button>
          <button
            className={`tab-button ${activeTab === "leaderboard" ? "active" : ""}`}
            onClick={() => navigate("/leaderboard")}
          >
            Leaderboard
          </button>
        </div>

        {activeTab === "sessions" && (
          <div id="sessions">
            <ul className="sessions-list">
              {sessions.length === 0 ? (
                <li className="sessions-empty">
                  {isLoading ? "Loading sessions..." : "No active sessions"}
                </li>
              ) : (
                sessions.map((session) => {
                  const playerCount = Object.keys(session.players).length;
                  const maxPlayers = session.max_players || 4;
                  const isHost = session.host.id === currentUserId;

                  return (
                    <li
                      key={session.id}
                      className="session-item"
                      onClick={() => handleJoinSession(session.id)}
                    >
                      <div className="session-info">
                        <span className="session-name">
                          "{session.name}"
                          <span className="session-host">
                            {isHost ? "You" : session.host.username}
                          </span>
                        </span>
                        <span className="session-players">
                          {playerCount}/{maxPlayers}
                        </span>
                      </div>
                      <button
                        className="session-delete"
                        disabled={!isHost}
                        title={
                          !isHost
                            ? "You must be the host to delete this session"
                            : ""
                        }
                        onClick={(e) => handleDeleteSession(session.id, e)}
                      >
                        🗑️
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div id="leaderboard">
            <ul className="leaderboard-list">
              {leaderboard.length === 0 ? (
                <li className="leaderboard-empty">
                  {isLoading
                    ? "Loading leaderboard..."
                    : "No scores yet. Be the first!"}
                </li>
              ) : (
                leaderboard.slice(0, 10).map((entry, index) => (
                  <li key={index} className="leaderboard-item">
                    <span className="rank">#{index + 1}</span>
                    <span className="username">{entry.username}</span>
                    <span className="session">
                      For the battle at {entry.sessionName}
                    </span>
                    <span className="score">{entry.score}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        <div className="button-container">
          <button id="startGameButton" onClick={handleStartGame}>
            New Game
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      </div>

      {showModal && (
        <div className="modal show">
          <div className="modal-content">
            <h2>Create New Game</h2>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCreateSession()}
              placeholder="Enter session name..."
              maxLength={50}
              autoFocus
            />
            <div className="modal-buttons">
              <button
                className="button-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button onClick={handleCreateSession}>Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
