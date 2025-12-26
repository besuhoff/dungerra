import {
  Session,
  CreateSessionRequest,
  AddSessionChunksRequest,
  SessionChunk,
} from "../types/session";
import { HttpClient } from "./HttpClient";
import { SocketService } from "./SocketService";
import {
  GameStateMessage,
  GameStateDeltaMessage,
  InputMessage,
  MessageType,
  PlayerLeaveMessage,
  PlayerJoinMessage,
  PlayerRespawnMessage,
} from "../types/socketEvents";
import { IPlayer } from "../types/screen-objects/IPlayer";

export class SessionManager {
  private static instance: SessionManager;
  private currentSession: Session | null = null;
  private socketService: SocketService;

  private constructor() {
    this.socketService = SocketService.getInstance();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public async listSessions(): Promise<Session[]> {
    return await HttpClient.get<Session[]>("/sessions");
  }

  public async startSession(sessionName: string): Promise<Session> {
    const session = await HttpClient.post<Session>("/sessions", {
      name: sessionName,
    } as CreateSessionRequest);

    this.currentSession = session;
    this.socketService.connect(session.id);
    return session;
  }

  public async joinSession(sessionId: string): Promise<Session> {
    const session = await HttpClient.post<Session>(
      `/sessions/${sessionId}/join`
    );
    this.currentSession = session;
    this.socketService.connect(session.id);
    return session;
  }

  public async deleteSession(sessionId: string): Promise<void> {
    await HttpClient.delete(`/sessions/${sessionId}`);
    if (this.currentSession?.id === sessionId) {
      this.currentSession = null;
      this.socketService.disconnect();
    }
  }

  public async endSession(): Promise<void> {
    if (this.currentSession) {
      this.socketService.disconnect();
      this.currentSession = null;
    }
  }

  public async addSessionChunks(
    request: AddSessionChunksRequest
  ): Promise<Session> {
    if (!this.currentSession) {
      throw new Error("No active session");
    }

    // const session = await HttpClient.post<Session>(
    //   `/sessions/${this.currentSession.id}/chunks`,
    //   request
    // );

    // this.currentSession = session;
    // return session;
    return this.currentSession;
  }

  public async updateSessionChunk(chunk: SessionChunk): Promise<Session> {
    return this.addSessionChunks({
      chunks: [chunk],
    });
  }

  public async fetchSessionChunks(): Promise<Session> {
    if (!this.currentSession) {
      throw new Error("No active session");
    }

    const session = await HttpClient.get<Session>(
      `/sessions/${this.currentSession.id}/chunks`
    );

    this.currentSession = session;
    return session;
  }

  public getCurrentSession(): Session | null {
    return this.currentSession;
  }

  public notifyRespawn(): void {
    if (!this.currentSession) {
      console.warn("Attempting to notify about respawn without active session");
      return;
    }

    this.socketService.emit({
      type: MessageType.PLAYER_RESPAWN,
      payload: {
        oneofKind: "playerRespawn",
        playerRespawn: PlayerRespawnMessage.create(),
      },
    });
  }

  notifyInput(message: InputMessage): void {
    this.socketService.emit({
      type: MessageType.INPUT,
      payload: {
        oneofKind: "input",
        input: message,
      },
    });
  }

  public onGameState(callback: (changeset: GameStateMessage) => void): void {
    this.socketService.onGameState(callback);
  }

  public onGameStateDelta(
    callback: (changeset: GameStateDeltaMessage) => void
  ): void {
    this.socketService.onGameStateDelta(callback);
  }

  public onPlayerJoined(callback: (message: PlayerJoinMessage) => void): void {
    this.socketService.onPlayerJoined(callback);
  }

  public onPlayerLeft(callback: (message: PlayerLeaveMessage) => void): void {
    this.socketService.onPlayerLeft(callback);
  }
}
