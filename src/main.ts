import { Game } from "./utils/Game";
import { AuthManager } from "./api/AuthManager";
import { LeaderboardManager } from "./api/LeaderboardManager";
import { SessionManager } from "./api/SessionManager";
import { Session } from "./types/session";
import { LeaderboardEntry } from "./types/leaderboard";

const authManager = AuthManager.getInstance();
const leaderboardManager = LeaderboardManager.getInstance();
const sessionManager = SessionManager.getInstance();

let game: Game | null = null;

function getElement<T extends HTMLElement>(elementId: string): T | null {
  return document.getElementById(elementId) as T;
}

function getSessionIdFromUrl(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/([a-f0-9-]+)$/i);
  return match ? match[1] : null;
}

function navigateToSession(sessionId: string): void {
  window.history.pushState({}, "", `/${sessionId}`);
}

function navigateToHome(): void {
  window.history.pushState({}, "", "/");
}

function hideElement(elementId: string) {
  const element = getElement(elementId);
  if (element) {
    element.style.setProperty("display", "none");
  }
}

function showElement(elementId: string) {
  const element = getElement(elementId);
  if (element) {
    element.style.setProperty("display", "flex");
  }
}

function showScreen(screenId: string) {
  document.querySelectorAll<HTMLDivElement>(".screen").forEach((screen) => {
    screen.style.setProperty("display", "none");
  });
  getElement(screenId + "Screen")?.style.setProperty("display", "flex");
}

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

window.onload = async () => {
  try {
    authManager.initToken();
    await authManager.checkAuthStatus();
    await Game.loadResources();

    // Check if accessing a session directly via URL
    const sessionId = getSessionIdFromUrl();
    if (sessionId) {
      try {
        game = new Game();
        const session = await sessionManager.joinSession(sessionId);
        await game.start(session);
        showScreen("game");
        return;
      } catch (error) {
        console.error("Failed to join session from URL:", error);
        // Fall through to show leaderboard
        navigateToHome();
      }
    }

    const [leaderboard, sessions] = await Promise.all([
      leaderboardManager.getLeaderboard(),
      sessionManager.listSessions(),
    ]);
    updateLeaderboard(leaderboard);
    updateSessions(sessions);
    showScreen("leaderboard");
    getElement("username")!.textContent = authManager.getUserData()!.username;
  } catch (error) {
    console.error(error);
    hideElement("loader");
    showElement("loginButton");
  }
};

function updateLeaderboard(leaderboard: LeaderboardEntry[]) {
  const leaderboardList = getElement("leaderboardList");
  if (!leaderboardList) return;

  if (leaderboard.length === 0) {
    leaderboardList.innerHTML =
      '<li class="leaderboard-empty">No scores yet. Be the first!</li>';
    return;
  }

  leaderboardList.innerHTML = leaderboard
    .slice(0, 10) // Show top 10
    .map(
      (entry, index) => `
            <li class="leaderboard-item">
                <span class="rank">#${index + 1}</span> 
                <span class="username">${entry.username}</span> 
                <span class="session">For the battle at ${entry.sessionName}</span>
                <span class="score">${entry.score}</span>
            </li>
        `
    )
    .join("");
}

function updateSessions(sessions: Session[]) {
  const sessionsList = getElement("sessionsList");
  if (!sessionsList) return;

  if (sessions.length === 0) {
    sessionsList.innerHTML =
      '<li class="sessions-empty">No active sessions</li>';
    return;
  }

  const currentUserId = authManager.getUserData()?.id;

  sessionsList.innerHTML = sessions
    .map((session) => {
      const playerCount = Object.keys(session.players).length;
      const maxPlayers = session.max_players || 4;
      const isHost = session.host.id === currentUserId;
      const deleteButton = `<button ${isHost ? "" : 'disabled title="You must be the host to delete this session"'} class="session-delete" data-session-id="${session.id}" onclick="event.stopPropagation()">🗑️</button>`;
      return `
                <li class="session-item" data-session-id="${session.id}">
                    <div class="session-info">
                        <span class="session-name">"${session.name}"<span class="session-host">${isHost ? "You" : session.host.username}</span></span>
                        <span class="session-players">${playerCount}/${maxPlayers}</span>
                    </div>
                    ${deleteButton}
                </li>
            `;
    })
    .join("");

  // Add click handlers to session items
  sessionsList
    .querySelectorAll<HTMLLIElement>(".session-item")
    .forEach((item) => {
      item.addEventListener("click", async () => {
        const sessionId = item.dataset.sessionId;
        if (!sessionId) return;

        game = new Game();
        try {
          const session = await sessionManager.joinSession(sessionId);
          navigateToSession(sessionId);
          await game.start(session);
          showScreen("game");
        } catch (error) {
          console.error("Failed to join session:", error);
          const errorElement = document.querySelector<HTMLParagraphElement>(
            "#leaderboardScreen .error"
          );
          if (errorElement) {
            errorElement.textContent =
              "Failed to join session. Please try again.";
            errorElement.style.setProperty("display", "block");
          }
        }
      });
    });

  // Add click handlers to delete buttons
  sessionsList
    .querySelectorAll<HTMLButtonElement>(".session-delete")
    .forEach((button) => {
      button.addEventListener("click", async (e) => {
        e.stopPropagation();
        const sessionId = button.dataset.sessionId;
        if (!sessionId) return;

        if (confirm("Are you sure you want to delete this session?")) {
          try {
            await sessionManager.deleteSession(sessionId);
            // Refresh the sessions list
            const sessions = await sessionManager.listSessions();
            updateSessions(sessions);
          } catch (error) {
            console.error("Failed to delete session:", error);
            const errorElement = document.querySelector<HTMLParagraphElement>(
              "#leaderboardScreen .error"
            );
            if (errorElement) {
              errorElement.textContent =
                "Failed to delete session. Please try again.";
              errorElement.style.setProperty("display", "block");
            }
          }
        }
      });
    });
}

getElement("loginButton")?.addEventListener("click", async () => {
  if (authManager.isPerformingRequest()) {
    return;
  }

  try {
    const authUrl = await authManager.getAuthUrl();
    authManager.openAuthPage();
  } catch (error) {
    console.error("Authentication failed:", error);
    // You might want to show an error message to the user
  }
});

// Tab switching
getElement("sessionsTab")?.addEventListener("click", () => {
  getElement("sessionsTab")?.classList.add("active");
  getElement("leaderboardTab")?.classList.remove("active");

  const sessionsEl = getElement("sessions");
  const leaderboardEl = getElement("leaderboard");

  if (sessionsEl) sessionsEl.style.display = "block";
  if (leaderboardEl) leaderboardEl.style.display = "none";
});

getElement("leaderboardTab")?.addEventListener("click", () => {
  getElement("leaderboardTab")?.classList.add("active");
  getElement("sessionsTab")?.classList.remove("active");

  const sessionsEl = getElement("sessions");
  const leaderboardEl = getElement("leaderboard");

  if (sessionsEl) sessionsEl.style.display = "none";
  if (leaderboardEl) leaderboardEl.style.display = "block";
});

getElement("startGameButton")?.addEventListener("click", async () => {
  const modal = getElement("sessionNameModal");
  const input = getElement<HTMLInputElement>("sessionNameInput");

  if (modal && input) {
    input.value = generateFunnySessionName();
    modal.classList.add("show");
    input.focus();
    input.select();
  }
});

getElement("cancelSessionButton")?.addEventListener("click", () => {
  const modal = getElement("sessionNameModal");
  if (modal) {
    modal.classList.remove("show");
  }
});

getElement("createSessionButton")?.addEventListener("click", async () => {
  const modal = getElement("sessionNameModal");
  const input = getElement<HTMLInputElement>("sessionNameInput");
  const sessionName = input?.value.trim() || "";

  if (!sessionName) {
    return;
  }

  if (modal) {
    modal.classList.remove("show");
  }

  if (game) {
    game.stop();
  }

  game = new Game();
  try {
    const session = await sessionManager.startSession(sessionName);
    navigateToSession(session.id);
    await game.start(session);
    showScreen("game");
  } catch (error) {
    console.error("Game initialization failed:", error);
    if (
      typeof error === "object" &&
      error &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      const errorElement = document.querySelector<HTMLParagraphElement>(
        "#leaderboardScreen .error"
      );
      if (errorElement) {
        errorElement.textContent =
          "There's a problem on our end. Please try again later.";
        errorElement.style.setProperty("display", "block");
      }
    }
  }
});

// Allow Enter key to create session
getElement("sessionNameInput")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    getElement("createSessionButton")?.click();
  }
});

// Allow Escape key to close modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = getElement("sessionNameModal");
    if (modal?.classList.contains("show")) {
      modal.classList.remove("show");
    }
  }
});

// Handle browser back button
window.addEventListener("popstate", async () => {
  const sessionId = getSessionIdFromUrl();

  if (!sessionId) {
    // User navigated back to home, show leaderboard screen
    const currentScreen = document.querySelector<HTMLDivElement>(
      ".screen[style*='display: flex']"
    );

    if (currentScreen?.id === "gameScreen") {
      // Coming from game, disconnect and show leaderboard
      try {
        await sessionManager.endSession();
        game?.stop();
      } catch (error) {
        console.error("Error ending session:", error);
      }

      // Refresh both sessions list and leaderboard
      const [leaderboard, sessions] = await Promise.all([
        leaderboardManager.getLeaderboard(),
        sessionManager.listSessions(),
      ]);
      updateLeaderboard(leaderboard);
      updateSessions(sessions);
      
      // Update username
      const userData = authManager.getUserData();
      if (userData) {
        getElement("username")!.textContent = userData.username;
      }
      
      showScreen("leaderboard");
    }
  } else {
    // User navigated to a session URL
    try {
      if (game) {
        game.stop();
      }
      game = new Game();
      const session = await sessionManager.joinSession(sessionId);
      await game.start(session);
      showScreen("game");
    } catch (error) {
      console.error("Failed to join session from URL:", error);
      navigateToHome();
      showScreen("leaderboard");
    }
  }
});
