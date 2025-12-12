import * as config from "../config";
import { ScreenObject } from "../entities/ScreenObject";
import { IEnemy, IEnemyFactory } from "../types/screen-objects/IEnemy";
import { IPlayerFactory } from "../types/screen-objects/IPlayer";
import { IPlayer } from "../types/screen-objects/IPlayer";
import { IBonusFactory } from "../types/screen-objects/IBonus";
import { IBonus } from "../types/screen-objects/IBonus";
import { BonusType } from "../types/screen-objects/IBonus";
import { IWallFactory } from "../types/screen-objects/IWall";
import { IWall } from "../types/screen-objects/IWall";
import { IChunk } from "../types/screen-objects/IChunk";
import { IPoint } from "../types/geometry/IPoint";
import { IWorld } from "../types/IWorld";
import { loadImage } from "./loadImage";
import { Point2D } from "./geometry/Point2D";
import { AudioManager } from "./AudioManager";
import { SessionManager } from "../api/SessionManager";
import { Player as PlayerMessage } from "../types/socketEvents";
import {
  IOtherPlayer,
  IOtherPlayerFactory,
} from "../types/screen-objects/IOtherPlayer";
import {
  InputMessage,
  GameStateDeltaMessage,
  GameStateMessage,
} from "../types/socketEvents";
import {
  IBulletManager,
  IBulletManagerFactory,
} from "../types/screen-objects/IBulletManager";
import { IBulletFactory } from "../types/screen-objects/IBullet";
import { SessionPlayer } from "../types/session";

export class World implements IWorld {
  private readonly CHUNK_SIZE = 2000; // Same as screen width for now
  private _player: IPlayer | null = null;
  private _otherPlayers: Record<string, IOtherPlayer> = {};

  private _enemies: IEnemy[] = [];
  private _walls: IWall[] = [];
  private _bonuses: IBonus[] = [];

  private _gameOver: boolean = false;
  private _paused: boolean = false;
  private floorTexture: HTMLImageElement | null = null;
  private chunks: Map<string, IChunk> = new Map();
  private generatedChunks: Set<string> = new Set();
  private _cameraPoint: IPoint = new Point2D(0, 0);
  private _torchRadius: number = config.TORCH_RADIUS;
  private _debug = false;
  private crowdednessFactor = 5;

  private _sessionManager = SessionManager.getInstance();
  private _bulletManager: IBulletManager;
  private _lastChangesetTimestamp: number = 0;

  private _previousInputState: InputMessage = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    shoot: false,
  };
  private _inputStateSubmitTimestamp: number = 0;

  get debug(): boolean {
    return this._debug;
  }

  toggleDebug(): void {
    this._debug = !this._debug;
  }

  get gameOver(): boolean {
    return this._gameOver;
  }

  get paused(): boolean {
    return this._paused;
  }

  get player(): IPlayer | null {
    return this._player;
  }

  get otherPlayers(): IOtherPlayer[] {
    return Object.values(this._otherPlayers);
  }

  getOtherPlayerById(id: string): IOtherPlayer | null {
    return this._otherPlayers[id] || null;
  }

  get walls(): IWall[] {
    return this._walls;
  }

  get enemies(): IEnemy[] {
    return this._enemies;
  }

  get bonuses(): IBonus[] {
    return this._bonuses;
  }

  get cameraPoint(): IPoint {
    return this._cameraPoint;
  }

  get torchRadius(): number {
    return this._torchRadius;
  }

  get multiplayerMode(): "host" | "guest" {
    return this._multiplayerMode;
  }

  constructor(
    private _Player: IPlayerFactory,
    private _Enemy: IEnemyFactory,
    private _Wall: IWallFactory,
    private _Bonus: IBonusFactory,
    private _OtherPlayer: IOtherPlayerFactory,
    private _Bullet: IBulletFactory,
    private _BulletManager: IBulletManagerFactory,
    private _multiplayerMode: "host" | "guest"
  ) {
    // Load sounds
    const audioManager = AudioManager.getInstance();
    audioManager.loadSound(config.SOUNDS.TORCH).then(() => {
      // Start playing torch sound in a loop
      audioManager.playSound(config.SOUNDS.TORCH, 1, true);
    });

    // Load floor texture
    loadImage(config.TEXTURES.FLOOR).then((img) => {
      this.floorTexture = img;
    });

    this._bulletManager = new this._BulletManager(this);
  }

  initPlayerFromSession(player: SessionPlayer): void {
    this._player = this._Player.createFromSessionPlayer(this, player);
  }

  addOtherPlayer(player: PlayerMessage): void {
    const point = new Point2D(player.position!.x, player.position!.y);
    const otherPlayer = new this._OtherPlayer(
      this,
      point,
      player.rotation,
      player.id,
      player.username
    );

    this._otherPlayers[player.id] = otherPlayer;
    otherPlayer.applyFromGameState(player);
  }

  removeOtherPlayer(playerId: string): void {
    delete this._otherPlayers[playerId];
  }

  private getChunkKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  private getChunkLeftTop(worldPoint: IPoint): IPoint {
    return new Point2D(
      Math.floor(worldPoint.x / this.CHUNK_SIZE),
      Math.floor(worldPoint.y / this.CHUNK_SIZE)
    );
  }

  private getPlayerChunkLeftTop(): IPoint {
    if (!this._player) {
      return new Point2D(0, 0);
    }

    return this.getChunkLeftTop(this._player.getPosition());
  }

  private generateWallsForChunk(chunkPoint: IPoint): void {
    if (!this._player) {
      return;
    }

    const chunkKey = this.getChunkKey(chunkPoint.x, chunkPoint.y);
    // Mark chunk as generated
    this.generatedChunks.add(chunkKey);

    // Calculate chunk boundaries
    const chunkStartX = chunkPoint.x * this.CHUNK_SIZE;
    const chunkStartY = chunkPoint.y * this.CHUNK_SIZE;
    const newWalls: IWall[] = [];
    const newEnemies: IEnemy[] = [];

    // Generate random walls in this chunk, corresponding to the crowdedness factor
    const numWalls =
      Math.floor(Math.random() * this.crowdednessFactor) +
      this.crowdednessFactor;
    const neighboringWalls = this._walls;
    const safePaddingAroundPlayer = this.torchRadius + 40;

    for (let i = 0; i < numWalls; i++) {
      // Randomly decide wall orientation
      const orientation = Math.random() < 0.5 ? "vertical" : "horizontal";
      let x: number, y: number, width: number, height: number;

      if (orientation === "vertical") {
        x = Math.floor(
          Math.random() * (this.CHUNK_SIZE - 200) + chunkStartX + 100
        );
        y = Math.floor(
          Math.random() * (this.CHUNK_SIZE - 300) + chunkStartY + 100
        );
        width = 30;
        height = Math.floor(Math.random() * 101) + 200; // 200-300
      } else {
        x = Math.floor(
          Math.random() * (this.CHUNK_SIZE - 300) + chunkStartX + 100
        );
        y = Math.floor(
          Math.random() * (this.CHUNK_SIZE - 200) + chunkStartY + 100
        );
        width = Math.floor(Math.random() * 101) + 200; // 200-300
        height = 30;
      }

      const newNeighbors = neighboringWalls.concat(newWalls);
      // Check if the wall overlaps with existing walls
      let overlaps = false;
      for (const wall of newNeighbors) {
        const rect1 = wall.getCollisionRect();
        const rect2 = {
          left: x - width / 2,
          top: y - height / 2,
          width,
          height,
        };

        // Add padding to prevent walls from being too close
        const padding = 40;
        if (
          rect1.left < rect2.left + rect2.width + padding &&
          rect1.left + rect1.width + padding > rect2.left &&
          rect1.top < rect2.top + rect2.height + padding &&
          rect1.top + rect1.height + padding > rect2.top
        ) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        const wall = new this._Wall(
          this,
          new Point2D(x, y),
          width,
          height,
          orientation
        );

        if (
          wall.checkCollision(
            this._player.x - safePaddingAroundPlayer,
            this._player.y - safePaddingAroundPlayer,
            safePaddingAroundPlayer * 2,
            safePaddingAroundPlayer * 2
          )
        ) {
          continue;
        }

        newWalls.push(wall);

        // Create enemy for each wall
        const enemy = new this._Enemy(this, wall, neighboringWalls);
        newEnemies.push(enemy);
      }
    }

    // Store chunk data
    this.chunks.set(chunkKey, {
      x: chunkPoint.x,
      y: chunkPoint.y,
      walls: newWalls,
      enemies: newEnemies,
      bonuses: [],
    });
  }

  update(dt: number): void {
    if (this.gameOver || this.paused) return;

    // Update player
    if (this._player) {
      this._player.update(dt);

      // Update camera position
      this._cameraPoint = this._player.getPosition().clone();
    }

    for (const otherPlayer of Object.values(this._otherPlayers)) {
      otherPlayer.update(dt);
    }
  }

  endGame(): void {
    if (!this._gameOver) {
      this._gameOver = true;
      AudioManager.getInstance().playSound(config.SOUNDS.GAME_OVER);
    }
  }

  drawFloor(ctx: CanvasRenderingContext2D): void {
    // Draw floor texture
    if (this.floorTexture) {
      const resultingFloorWidth = this.floorTexture.width / 2;
      const resultingFloorHeight = this.floorTexture.height / 2;

      const textureX =
        (this.cameraPoint.x % resultingFloorWidth) - resultingFloorWidth;
      const textureY =
        (this.cameraPoint.y % resultingFloorHeight) - resultingFloorHeight;

      for (
        let y = -config.SCREEN_HEIGHT / resultingFloorHeight - 1;
        y < config.SCREEN_HEIGHT / resultingFloorHeight + 2;
        y++
      ) {
        for (
          let x = -config.SCREEN_WIDTH / resultingFloorWidth - 1;
          x < config.SCREEN_WIDTH / resultingFloorWidth + 2;
          x++
        ) {
          ctx.drawImage(
            this.floorTexture,
            -textureX - x * resultingFloorWidth,
            -textureY - y * resultingFloorHeight,
            resultingFloorWidth,
            resultingFloorHeight
          );
        }
      }
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    lightCtx: CanvasRenderingContext2D,
    uiCtx: CanvasRenderingContext2D
  ): void {
    // Clear the canvas
    ctx.clearRect(0, 0, config.SCREEN_WIDTH, config.SCREEN_HEIGHT);

    this.drawFloor(ctx);

    // Draw walls
    this._walls.forEach((wall) => wall.draw(ctx, uiCtx));

    // Draw enemies
    this._enemies.forEach((enemy) => enemy.draw(ctx, uiCtx));

    // Draw bullets
    this._bulletManager.draw(ctx, uiCtx);

    // Draw bonuses
    this._bonuses.forEach((bonus) => bonus.draw(ctx, uiCtx));

    Object.values(this._otherPlayers).forEach((otherPlayer) => {
      otherPlayer.draw(ctx, uiCtx);
    });

    // Draw player
    if (this._player) {
      this._player.draw(ctx, uiCtx);
    }

    // Draw darkness overlay
    this.drawDarknessOverlay(lightCtx);

    // Draw UI
    this.drawUI(uiCtx);
  }

  private drawDarknessOverlay(ctx: CanvasRenderingContext2D): void {
    if (!this._player || !this._player.isAlive()) {
      ctx.fillStyle = config.COLOR_DARK;
      ctx.fillRect(0, 0, config.SCREEN_WIDTH, config.SCREEN_HEIGHT);
      return;
    }

    if (this._player.hasNightVision()) {
      ctx.fillStyle = this._player.isNightVisionFading()
        ? config.COLOR_NIGHT_VISION_FADING
        : config.COLOR_NIGHT_VISION;
      ctx.fillRect(0, 0, config.SCREEN_WIDTH, config.SCREEN_HEIGHT);
      return;
    }

    const players = [
      this._player,
      ...this.otherPlayers.filter((p) => p.isAlive() && !p.hasNightVision()),
    ];

    const torchRadius =
      this._torchRadius * 0.97 + Math.random() * this._torchRadius * 0.06;

    ctx.fillStyle = config.COLOR_DARK;
    ctx.fillRect(0, 0, config.SCREEN_WIDTH, config.SCREEN_HEIGHT);
    ctx.globalCompositeOperation = "destination-out";

    players.forEach((player) => {
      const torchPoint = this.worldToScreenCoordinates(player.getTorchPoint());

      const gradient = ctx.createRadialGradient(
        torchPoint.x,
        torchPoint.y,
        0,
        torchPoint.x,
        torchPoint.y,
        torchRadius
      );
      gradient.addColorStop(0, config.COLOR_LIGHT);
      gradient.addColorStop(1, config.COLOR_TRANSPARENT);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, config.SCREEN_WIDTH, config.SCREEN_HEIGHT);
      ctx.fillRect(0, 0, config.SCREEN_WIDTH, config.SCREEN_HEIGHT);
    });
    ctx.globalCompositeOperation = "source-over";
  }

  public worldToScreenCoordinates(point: IPoint): IPoint {
    return point.movedBy(
      config.SCREEN_WIDTH / 2 - this._cameraPoint.x,
      config.SCREEN_HEIGHT / 2 - this._cameraPoint.y
    );
  }

  handleInput(keys: Set<string>, dt: number): void {
    if (!this._player) {
      return;
    }

    const forward = keys.has("KeyW") || keys.has("ArrowUp");
    const backward = keys.has("KeyS") || keys.has("ArrowDown");
    const left = keys.has("KeyA") || keys.has("ArrowLeft");
    const right = keys.has("KeyD") || keys.has("ArrowRight");
    const shoot = keys.has("Space");
    const now = Date.now();

    if (
      forward !== this._previousInputState.forward ||
      backward !== this._previousInputState.backward ||
      left !== this._previousInputState.left ||
      right !== this._previousInputState.right ||
      shoot !== this._previousInputState.shoot ||
      now - this._inputStateSubmitTimestamp > 1000
    ) {
      this._sessionManager.notifyInput({
        forward,
        backward,
        left,
        right,
        shoot,
      });
      this._previousInputState = { forward, backward, left, right, shoot };
      this._inputStateSubmitTimestamp = now;
    }
  }

  togglePause(): void {
    this._paused = !this.paused;
  }

  restart(): void {
    this._sessionManager.notifyRespawn(this._player!);
  }

  private drawUI(ctx: CanvasRenderingContext2D): void {
    if (!this._player) {
      return;
    }

    ctx.textAlign = "left";

    if (this.gameOver) {
      ctx.fillStyle = "white";
      ctx.font = `48px ${config.HEADER_FONT_NAME}`;
      ctx.textAlign = "center";
      ctx.fillText(
        "Game Over",
        config.SCREEN_WIDTH / 2,
        config.SCREEN_HEIGHT / 2
      );
      ctx.font = `24px ${config.FONT_NAME}`;
      ctx.fillStyle = "yellow";
      ctx.fillText(
        `Your posthumous royalties: ${this._player.money.toFixed(0)}$`,
        config.SCREEN_WIDTH / 2,
        config.SCREEN_HEIGHT / 2 + 40
      );
      ctx.fillStyle = "magenta";
      ctx.fillText(
        "Press R to Restart",
        config.SCREEN_WIDTH / 2,
        config.SCREEN_HEIGHT / 2 + 80
      );
    } else {
      ctx.fillStyle = "white";
      ctx.font = `22px ${config.FONT_NAME}`;
      ctx.fillText(
        `Lives: ${Array(this._player.lives).fill("❤️").join(" ")}`,
        10,
        30
      );
      ctx.fillStyle = "yellow";
      ctx.fillText(`Rewards: ${this._player.money.toFixed(0)}$`, 10, 60);
      ctx.fillStyle = "cyan";
      ctx.fillText(
        `Bullets: ${Array(this._player.bulletsLeft).fill("⏽").join("")}`,
        10,
        90
      );
      if (this._player.hasNightVision()) {
        ctx.fillStyle = "#90ff90";
        ctx.fillText(
          `Night Vision: ${this._player.nightVisionTimer.toFixed(0)}`,
          10,
          120
        );
      }
    }

    this._player.drawUI(ctx);

    if (this.debug) {
      ctx.fillStyle = "white";
      ctx.font = `12px ${config.FONT_NAME}`;
      ctx.fillText(
        `Chunk: ${this.getChunkLeftTop(this.cameraPoint)}`,
        10,
        config.SCREEN_HEIGHT - 52
      );
      ctx.fillText(
        `Number of world objects: ${ScreenObject.objectCount}`,
        10,
        config.SCREEN_HEIGHT - 66
      );
      ctx.fillText(
        `Camera position: ${this.cameraPoint}`,
        10,
        config.SCREEN_HEIGHT - 80
      );
      ctx.fillText(
        `Number of chunks: ${this.chunks.size}`,
        10,
        config.SCREEN_HEIGHT - 94
      );
      ctx.fillText(
        `Host: ${this._sessionManager.getCurrentSession()?.host.username}`,
        10,
        config.SCREEN_HEIGHT - 108
      );
      ctx.fillText(
        `Session ID: ${this._sessionManager.getCurrentSession()?.id}`,
        10,
        config.SCREEN_HEIGHT - 122
      );
      ctx.fillText(
        `Session: ${this._sessionManager.getCurrentSession()?.name}`,
        10,
        config.SCREEN_HEIGHT - 136
      );
    }
  }

  applyGameState(state: GameStateMessage): void {
    for (const playerData of Object.values(state.players)) {
      if (playerData.id === this._player?.id) {
        this._player.applyFromGameState(playerData);
        continue;
      }

      if (!this._otherPlayers[playerData.id]) {
        this.addOtherPlayer(playerData);
      }
    }

    for (const wallData of Object.values(state.walls)) {
      const wall = this._walls.find((w) => w.id === wallData.id);
      if (!wall) {
        this._walls.push(
          new this._Wall(
            this,
            new Point2D(wallData.position!.x, wallData.position!.y),
            wallData.width,
            wallData.height,
            wallData.orientation as "horizontal" | "vertical",
            wallData.id
          )
        );
      }
    }

    for (const enemyData of Object.values(state.enemies)) {
      const enemy = this._enemies.find((e) => e.id === enemyData.id);
      if (enemy) {
        enemy.applyFromGameState(enemyData);
      } else {
        this._enemies.push(
          new this._Enemy(
            this,
            this._walls.find((wall) => wall.id === enemyData.wallId)!,
            [],
            enemyData.id
          )
        );
      }
    }

    for (const bonusData of Object.values(state.bonuses)) {
      const bonus = this._bonuses.find((b) => b.id === bonusData.id);
      if (!bonus) {
        this._bonuses.push(
          new this._Bonus(
            this,
            new Point2D(bonusData.position!.x, bonusData.position!.y),
            bonusData.type as BonusType,
            bonusData.id
          )
        );
      }
    }
  }

  applyGameStateDelta(changeset: GameStateDeltaMessage): void {
    if (changeset.timestamp <= this._lastChangesetTimestamp) {
      console.log(
        `Ignoring out-of-order changeset. Last: ${this._lastChangesetTimestamp}, Received: ${changeset.timestamp}`,
        changeset
      );
      return;
    }

    this._lastChangesetTimestamp = Number(changeset.timestamp);
    const hadNoBullets = this._player ? this._player.bulletsLeft === 0 : false;

    for (const updatedPlayer of Object.values(changeset.updatedPlayers)) {
      if (updatedPlayer.id === this._player?.id) {
        if (updatedPlayer.isAlive && !this._player.isAlive()) {
          AudioManager.getInstance().playSound(config.SOUNDS.SPAWN);
          this._gameOver = false;
        }
        this._player.applyFromGameState(updatedPlayer);
        continue;
      }

      if (!this._otherPlayers[updatedPlayer.id]) {
        this.addOtherPlayer(updatedPlayer);
        continue;
      }

      this._otherPlayers[updatedPlayer.id].applyFromGameState(updatedPlayer);
    }

    for (const removedPlayerId of changeset.removedPlayers) {
      this.removeOtherPlayer(removedPlayerId);
    }

    for (const updatedWall of Object.values(changeset.updatedWalls)) {
      const wall = this._walls.find((w) => w.id === updatedWall.id);
      if (!wall) {
        this._walls.push(
          new this._Wall(
            this,
            new Point2D(updatedWall.position!.x, updatedWall.position!.y),
            updatedWall.width,
            updatedWall.height,
            updatedWall.orientation as "horizontal" | "vertical",
            updatedWall.id
          )
        );
      }
    }

    for (const removedWallId of changeset.removedWalls) {
      this._walls = this._walls.filter((w) => w.id !== removedWallId);
    }

    for (const updatedEnemy of Object.values(changeset.updatedEnemies)) {
      const enemy = this._enemies.find((e) => e.id === updatedEnemy.id);
      if (enemy) {
        enemy.applyFromGameState(updatedEnemy);
      } else {
        const wall = this._walls.find(
          (wall) => wall.id === updatedEnemy.wallId
        );
        if (!wall) {
          console.log(
            `Error: Wall ${updatedEnemy.wallId} is undefined for Enemy ${updatedEnemy.id}`
          );
          continue;
        }

        this._enemies.push(new this._Enemy(this, wall!, [], updatedEnemy.id));
      }
    }

    for (const removedEnemyId of changeset.removedEnemies) {
      this._enemies = this._enemies.filter((e) => e.id !== removedEnemyId);
    }

    for (const updatedBonus of Object.values(changeset.updatedBonuses)) {
      if (updatedBonus.pickedUpBy) {
        this._bonuses = this._bonuses.filter((b) => b.id !== updatedBonus.id);
        if (updatedBonus.pickedUpBy === this._player?.id) {
          AudioManager.getInstance().playSound(config.SOUNDS.BONUS_PICKUP);
        }

        continue;
      }

      const bonus = this._bonuses.find((b) => b.id === updatedBonus.id);
      if (!bonus) {
        this._bonuses.push(
          new this._Bonus(
            this,
            new Point2D(updatedBonus.position!.x, updatedBonus.position!.y),
            updatedBonus.type as BonusType,
            updatedBonus.id
          )
        );
        continue;
      }
    }

    for (const bulletData of Object.values(changeset.updatedBullets)) {
      const existingBullet = this._bulletManager.getBulletById(bulletData.id);
      if (existingBullet) {
        existingBullet
          .getPosition()
          .setTo(bulletData.position!.x, bulletData.position!.y);
        continue;
      }

      if (
        bulletData.ownerId === this._player?.id &&
        hadNoBullets &&
        this._player.bulletsLeft === 0
      ) {
        // Player has just recharged their bullets
        AudioManager.getInstance().playSound(
          config.SOUNDS.PLAYER_BULLET_RECHARGE,
          0.5
        );
      }

      this._bulletManager.registerShot(
        new this._Bullet(
          this,
          new Point2D(bulletData.position!.x, bulletData.position!.y),
          0,
          bulletData.isEnemy,
          bulletData.ownerId,
          bulletData.id
        )
      );
    }

    for (const bulletData of Object.values(changeset.removedBullets)) {
      if (!this._bulletManager.getBulletById(bulletData.id)) {
        AudioManager.getInstance().playSound(config.SOUNDS.BULLET);
        if (
          bulletData.ownerId === this._player?.id &&
          hadNoBullets &&
          this._player.bulletsLeft === 0
        ) {
          // Player has just recharged their bullets
          AudioManager.getInstance().playSound(
            config.SOUNDS.PLAYER_BULLET_RECHARGE,
            0.5
          );
        }
        continue;
      }

      this._bulletManager.unregisterShot(bulletData.id);
    }
  }
}
