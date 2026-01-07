import * as config from "../config";
import { Bonus } from "../entities/Bonus";
import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";
import { Wall } from "../entities/Wall";
import { AudioManager } from "./AudioManager";
import { World } from "./World";
import { SessionManager } from "../api/SessionManager";
import { AuthManager } from "../api/AuthManager";
import { Shop } from "../entities/Shop";
import { Session } from "../types/session";
import { OtherPlayer } from "../entities/OtherPlayer";
import { BulletManager } from "./BulletManager";
import { ImageManager } from "./ImageManager";
export class Game {
  private _ctx: CanvasRenderingContext2D;
  private _lightCtx: CanvasRenderingContext2D;
  private _uiCtx: CanvasRenderingContext2D;
  private _lastTime: number = 0;
  private _world: World | null = null;
  private _activeKeys: Set<string> = new Set();
  private _authManager: AuthManager;
  private _sessionManager: SessionManager;
  private _started: boolean = false;

  public get world(): World | null {
    return this._world;
  }

  constructor(
    private _canvas: HTMLCanvasElement,
    private _lightCanvas: HTMLCanvasElement,
    private _uiCanvas: HTMLCanvasElement
  ) {
    [this._canvas, this._lightCanvas, this._uiCanvas].forEach((canvas) => {
      canvas.width = config.SCREEN_WIDTH;
      canvas.height = config.SCREEN_HEIGHT;
    });

    this._ctx = this._canvas.getContext("2d")!;
    this._lightCtx = this._lightCanvas.getContext("2d")!;
    this._uiCtx = this._uiCanvas.getContext("2d")!;

    this._authManager = AuthManager.getInstance();
    this._sessionManager = SessionManager.getInstance();

    this.setupEventListeners();
  }

  public static async loadResources(): Promise<void> {
    const audioManager = AudioManager.getInstance();
    const imageManager = ImageManager.getInstance();

    await Promise.all([
      imageManager.loadImage(config.TEXTURES.FLOOR),
      imageManager.loadPlayerTextures(),
      imageManager.loadImage(config.TEXTURES.ENEMY),
      imageManager.loadImage(config.TEXTURES.WALL),
      audioManager.loadSound(config.SOUNDS.PLAYER_HURT),
      audioManager.loadSound(config.SOUNDS.PLAYER_DEAD),
      audioManager.loadSound(config.SOUNDS.ENEMY_HURT),
      audioManager.loadSound(config.SOUNDS.TOWER_HIT),
      audioManager.loadSound(config.SOUNDS.TORCH),
    ]);

    // Load non-critical resources asynchronously
    audioManager.loadSound(config.SOUNDS.PLAYER_BULLET_RECHARGE);
    audioManager.loadSound(config.SOUNDS.BONUS_PICKUP);
    audioManager.loadSound(config.SOUNDS.GAME_OVER);
    audioManager.loadSound(config.SOUNDS.BULLET);
    audioManager.loadSound(config.SOUNDS.SHOTGUN);
    audioManager.loadSound(config.SOUNDS.RAILGUN);
    audioManager.loadSound(config.SOUNDS.ROCKET_LAUNCHER);
    audioManager.loadSound(config.SOUNDS.ROCKET_BLAST);
    audioManager.loadSound(config.SOUNDS.SPAWN);
    audioManager.loadSound(config.SOUNDS.ENTER_SHOP);
    audioManager.loadSound(config.SOUNDS.MONEY_SPENT);
    audioManager.loadSound(config.SOUNDS.MISTAKE);
    audioManager.loadSound(config.SOUNDS.TOWER_CRASH);
    imageManager.loadImage(config.TEXTURES.BLOOD);
    imageManager.loadImage(config.TEXTURES.AID_KIT);
    imageManager.loadImage(config.TEXTURES.GOGGLES);
    imageManager.loadImage(config.TEXTURES.CHEST);
    imageManager.loadImage(config.TEXTURES.SHOP);
    imageManager.loadInventoryTextures();
  }

  private setupEventListeners(): void {
    window.addEventListener("keydown", (e) => {
      this._activeKeys.add(e.code);
      this.handleKeyDown(e);
    });

    window.addEventListener("keyup", (e) => {
      this._activeKeys.delete(e.code);
    });

    window.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    window.addEventListener("mousedown", (e) => this.handleMouseDown(e));

    this._sessionManager.onGameStateDelta((changeset) => {
      if (this._world) {
        const userData = this._authManager.getUserData();
        this._world.applyGameStateDelta(changeset, userData!.id);
      }
    });

    this._sessionManager.onPlayerJoined(({ player }) => {
      if (player && this._world) {
        this._world.addOtherPlayer(player);
      }
    });

    this._sessionManager.onPlayerLeft(({ playerId }) => {
      if (this._world) {
        this._world.removeOtherPlayer(playerId);
      }
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "F3") {
      this._world?.toggleDebug();
    }
    if (e.code === "KeyR" && this._world?.gameOver) {
      this._world?.restart();
    }
    if (e.code === "KeyE" || e.code === "Backquote") {
      this._world?.toggleInventory();
    }
    if (e.code === "Enter") {
      this._world?.openShopModal();
    }
    if (e.code === "Escape") {
      this._world?.closeShopModal();
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this._canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Mouse position handling will be used for player rotation
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      // Left click
      const rect = this._canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Shooting will be handled here
    }
  }

  public async start(session: Session): Promise<void> {
    if (session) {
      const userData = this._authManager.getUserData();
      const multiplayerMode =
        session.host && userData && session.host.id === userData.id
          ? "host"
          : "guest";
      this._world = new World(
        Player,
        Enemy,
        Wall,
        Bonus,
        OtherPlayer,
        Shop,
        BulletManager,
        multiplayerMode
      );

      this._started = true;
      requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
  }

  private gameLoop(timestamp: number): void {
    if (!this._started) {
      return;
    }

    const dt = (timestamp - this._lastTime) / 1000;
    this._lastTime = timestamp;

    this._world?.handleInput(this._activeKeys, dt);
    this._world?.update(dt);
    this.draw();

    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }

  public stop(): void {
    this._started = false;
    AudioManager.getInstance().stopAllSounds();
  }

  private draw(): void {
    // Clear the canvas
    [this._ctx, this._uiCtx, this._lightCtx].forEach((ctx) => {
      ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    });

    // Draw the world
    this._world?.draw(this._ctx, this._lightCtx, this._uiCtx);
  }
}
