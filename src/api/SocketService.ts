import * as config from "../config";
import { AuthManager } from "./AuthManager";
import {
  GameStateDeltaMessage,
  GameMessage,
  PlayerJoinMessage,
  PlayerLeaveMessage,
} from "../types/socketEvents";

export class SocketService {
  private static instance: SocketService;
  private socket: WebSocket | null = null;
  private _gameStateDeltaHandler:
    | ((changeset: GameStateDeltaMessage) => void)
    | null = null;
  private _playerJoinedHandler: ((message: PlayerJoinMessage) => void) | null =
    null;
  private _playerLeftHandler: ((message: PlayerLeaveMessage) => void) | null =
    null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private sessionId: string | null = null;
  private messageQueue: GameMessage[] = [];
  private binaryMode: boolean = process.env.NODE_ENV === "production";

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(sessionId: string): WebSocket {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }

    this.sessionId = sessionId;
    const token = AuthManager.getInstance().getToken();
    const wsProtocol = config.API_DOMAIN.startsWith("https") ? "wss" : "ws";
    const wsUrl = config.API_DOMAIN.replace(/^https?:\/\//, "");
    const url = `${wsProtocol}://${wsUrl}/ws?sessionId=${sessionId}&token=${token}&protocol=${this.binaryMode ? "binary" : "json"}`;

    this.socket = new WebSocket(url);
    if (this.binaryMode) {
      this.socket.binaryType = "arraybuffer";
    }
    this.setupEventListeners();
    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.sessionId = null;
      this.messageQueue = [];
    }
  }

  public getSocket(): WebSocket | null {
    return this.socket;
  }

  public emit(message: GameMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("Attempting to emit without socket connection");
      this.messageQueue.push(message);
      return;
    }

    this.socket.send(
      this.binaryMode
        ? GameMessage.toBinary(message)
        : GameMessage.toJsonString(message)
    );
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      console.log("Connected to WebSocket server");
      this.reconnectAttempts = 0;

      // Send queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          this.emit(message);
        }
      }
    };

    this.socket.onclose = (event) => {
      console.log(
        "Disconnected from WebSocket server",
        event.code,
        event.reason
      );

      // Attempt to reconnect if not closed intentionally
      if (
        event.code !== 1000 &&
        this.reconnectAttempts < this.maxReconnectAttempts &&
        this.sessionId
      ) {
        this.reconnectAttempts++;
        console.log(
          `Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
        );
        setTimeout(() => {
          if (this.sessionId) {
            this.connect(this.sessionId);
          }
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.socket.onmessage = (event) => {
      try {
        const message = this.binaryMode
          ? GameMessage.fromBinary(new Uint8Array(event.data))
          : GameMessage.fromJsonString(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };
  }

  private handleMessage({ payload }: GameMessage): void {
    switch (payload.oneofKind) {
      case "gameStateDelta":
        this._gameStateDeltaHandler?.(payload.gameStateDelta);
        break;

      case "playerJoin":
        this._playerJoinedHandler?.(payload.playerJoin);
        break;

      case "playerLeave":
        this._playerLeftHandler?.(payload.playerLeave);
        break;

      default:
        console.warn("Unknown WebSocket event:", payload.oneofKind);
    }
  }

  public onGameStateDelta(
    callback: (changeset: GameStateDeltaMessage) => void
  ): void {
    this._gameStateDeltaHandler = callback;
  }

  public onPlayerJoined(callback: (message: PlayerJoinMessage) => void): void {
    this._playerJoinedHandler = callback;
  }

  public onPlayerLeft(callback: (message: PlayerLeaveMessage) => void): void {
    this._playerLeftHandler = callback;
  }
}
