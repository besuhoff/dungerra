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
import { InventoryItem, Player as PlayerMessage } from "../types/socketEvents";
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
  private _inventoryOpen: boolean = true;

  private floorTexture: HTMLImageElement | null = null;
  private inventoryTexture: HTMLImageElement | null = null;
  private inventoryItemTextures: Partial<
    Record<config.InventoryItemID, HTMLImageElement>
  > = {};

  private chunks: Map<string, IChunk> = new Map();
  private _cameraPoint: IPoint = new Point2D(0, 0);
  private _torchRadius: number = config.TORCH_RADIUS;
  private _debug = false;

  private _sessionManager = SessionManager.getInstance();
  private _bulletManager: IBulletManager;
  private _lastChangesetTimestamp: number = 0;
  private _bonusPickupCache: Set<string> = new Set();

  private _previousInputState: InputMessage = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    shoot: false,
    itemKey: {},
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
      audioManager.playSound(config.SOUNDS.TORCH, { volume: 1, loop: true });
    });

    // Load floor texture
    loadImage(config.TEXTURES.FLOOR).then((img) => {
      this.floorTexture = img;
    });

    // Load inventory texture
    loadImage(config.TEXTURES.INVENTORY).then((img) => {
      this.inventoryTexture = img;
    });

    Object.entries(config.INVENTORY_ITEM_TEXTURES).forEach(
      ([key, texturePath]) => {
        loadImage(texturePath).then((img) => {
          this.inventoryItemTextures[Number(key) as config.InventoryItemID] =
            img;
        });
      }
    );

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

  private getChunkLeftTop(worldPoint: IPoint): IPoint {
    return new Point2D(
      Math.floor(worldPoint.x / this.CHUNK_SIZE),
      Math.floor(worldPoint.y / this.CHUNK_SIZE)
    );
  }

  update(dt: number): void {
    if (this.gameOver) return;

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

    // Draw neighboring chunk boundaries for debugging
    if (this.debug) {
      const chunkLeftTop = this.getChunkLeftTop(this.cameraPoint);

      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 1;

      for (let y = -1; y <= 1; y++) {
        for (let x = -1; x <= 1; x++) {
          const chunkX = (chunkLeftTop.x + x) * this.CHUNK_SIZE;
          const chunkY = (chunkLeftTop.y + y) * this.CHUNK_SIZE;

          const screenPoint = this.worldToScreenCoordinates(
            new Point2D(chunkX, chunkY)
          );

          ctx.strokeRect(
            screenPoint.x,
            screenPoint.y,
            this.CHUNK_SIZE,
            this.CHUNK_SIZE
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

    // Draw bonuses
    this._bonuses.forEach((bonus) => bonus.draw(ctx, uiCtx));

    Object.values(this._otherPlayers).forEach((otherPlayer) => {
      otherPlayer.draw(ctx, uiCtx);
    });

    // Draw player
    if (this._player) {
      this._player.draw(ctx, uiCtx);
    }

    // Draw bullets
    this._bulletManager.draw(ctx, uiCtx);

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

    const itemKey: { [key: number]: boolean } = {};
    for (let i = 1; i <= 9; i++) {
      if (keys.has(`Digit${i}`)) {
        itemKey[i] = true;
      }
    }

    if (
      forward !== this._previousInputState.forward ||
      backward !== this._previousInputState.backward ||
      left !== this._previousInputState.left ||
      right !== this._previousInputState.right ||
      shoot !== this._previousInputState.shoot ||
      JSON.stringify(itemKey) !==
        JSON.stringify(this._previousInputState.itemKey) ||
      now - this._inputStateSubmitTimestamp > 1000
    ) {
      this._sessionManager.notifyInput({
        forward,
        backward,
        left,
        right,
        shoot,
        itemKey,
      });
      this._previousInputState = {
        forward,
        backward,
        left,
        right,
        shoot,
        itemKey,
      };
      this._inputStateSubmitTimestamp = now;
    }
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
        `Lives: ${Array(Math.floor(this._player.lives)).fill("❤️").join(" ")}`,
        10,
        30
      );
      ctx.fillStyle = "yellow";
      ctx.fillText(`Rewards: ${this._player.money.toFixed(0)}$`, 10, 60);
      ctx.fillStyle = "cyan";

      const symbol = config.BULLET_SYMBOL[this._player.selectedGunType];
      const bulletsLeft = this._player.bulletsLeft;
      const bulletsDisplay =
        bulletsLeft === 0
          ? "-"
          : bulletsLeft < 6
            ? Array(bulletsLeft).fill(symbol).join("")
            : `${symbol} x ${bulletsLeft}`;
      ctx.fillText(`Bullets: ${bulletsDisplay}`, 10, 90);
      if (this._player.hasNightVision()) {
        ctx.fillStyle = "#90ff90";
        ctx.fillText(
          `Night Vision: ${this._player.nightVisionTimer.toFixed(0)}`,
          10,
          120
        );
      }
    }

    // Draw inventory UI in the center bottom
    if (this.inventoryTexture && !this.gameOver && this._inventoryOpen) {
      const width = this.inventoryTexture.width;
      const height = this.inventoryTexture.height;

      ctx.drawImage(
        this.inventoryTexture,
        config.SCREEN_WIDTH / 2 - width / 2,
        config.SCREEN_HEIGHT - height - 50,
        width,
        height
      );

      const player = this._player;

      if (player.inventory) {
        player.inventory.forEach((item) => {
          const isAmmo = config.AMMO_ITEM_IDS.includes(
            item.type as config.InventoryItemID
          );
          const itemX = (isAmmo ? item.type - 20 : item.type) * 41 - 18;
          const itemY = isAmmo ? 22 : 64;

          const texture =
            this.inventoryItemTextures[item.type as config.InventoryItemID];

          if (!texture) {
            return;
          }

          ctx.drawImage(
            texture,
            config.SCREEN_WIDTH / 2 - width / 2 + itemX - texture.width / 2,
            config.SCREEN_HEIGHT - height - 50 + itemY - texture.height / 2,
            texture.width,
            texture.height
          );

          if (item.quantity > 1) {
            // Draw a background for better readability
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(
              config.SCREEN_WIDTH / 2 - width / 2 + itemX - texture.width / 2,
              config.SCREEN_HEIGHT -
                height -
                50 +
                itemY +
                texture.height / 2 -
                16,
              texture.width,
              16
            );

            // Draw quantity
            ctx.fillStyle = "white";
            ctx.font = `16px ${config.FONT_NAME}`;
            ctx.textAlign = "right";
            ctx.fillText(
              `x${item.quantity}`,
              config.SCREEN_WIDTH / 2 - width / 2 + itemX + texture.width / 2,
              config.SCREEN_HEIGHT - height - 50 + itemY + texture.height / 2
            );
          }

          if (
            item.type ===
            config.WEAPON_INVENTORY_ID_BY_WEAPON_TYPE[player.selectedGunType]
          ) {
            // Highlight the selected weapon in the inventory
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 2;
            ctx.strokeRect(
              config.SCREEN_WIDTH / 2 - width / 2 + itemX - texture.width / 2,
              config.SCREEN_HEIGHT - height - 50 + itemY - texture.height / 2,
              texture.width,
              texture.height
            );
          }
        });
      }
    }

    this._player.drawUI(ctx);

    if (this.debug) {
      const worldObjectsCount =
        this._enemies.length +
        this._walls.length +
        this._bonuses.length +
        Object.values(this._otherPlayers).length +
        (this._player ? 1 : 0);

      ctx.fillStyle = "white";
      ctx.font = `12px ${config.FONT_NAME}`;
      ctx.fillText(
        `Chunk: ${this.getChunkLeftTop(this.cameraPoint)}`,
        10,
        config.SCREEN_HEIGHT - 52
      );
      ctx.fillText(
        `Number of world objects: ${worldObjectsCount}`,
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
            enemyData
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
      let enemy = this._enemies.find((e) => e.id === updatedEnemy.id);
      if (!enemy) {
        const wall = this._walls.find(
          (wall) => wall.id === updatedEnemy.wallId
        );
        if (!wall) {
          console.log(
            `Error: Wall ${updatedEnemy.wallId} is undefined for Enemy ${updatedEnemy.id}`
          );
          continue;
        }

        enemy = new this._Enemy(this, wall!, updatedEnemy);
        this._enemies.push(enemy);
      } else {
        enemy.applyFromGameState(updatedEnemy);
      }
    }

    for (const removedEnemyId of changeset.removedEnemies) {
      this._enemies = this._enemies.filter((e) => e.id !== removedEnemyId);
    }

    for (const updatedBonus of Object.values(changeset.updatedBonuses)) {
      if (updatedBonus.pickedUpBy) {
        this._bonuses = this._bonuses.filter((b) => b.id !== updatedBonus.id);
        if (
          updatedBonus.pickedUpBy === this._player?.id &&
          !this._bonusPickupCache.has(updatedBonus.id)
        ) {
          AudioManager.getInstance().playSound(config.SOUNDS.BONUS_PICKUP);
          this._bonusPickupCache.add(updatedBonus.id);
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
        this._player.bulletsLeft === 0 &&
        !this._bulletManager.hasSoundPlayedForBullet(bulletData) &&
        !config.WEAPON_TYPES_FROM_INVENTORY.includes(
          bulletData.weaponType as config.WeaponType
        )
      ) {
        // Player has just recharged their bullets
        AudioManager.getInstance().playSound(
          config.SOUNDS.PLAYER_BULLET_RECHARGE,
          { volume: 0.5 }
        );
      }

      this._bulletManager.applyFromGameState(bulletData);
    }

    for (const bulletData of Object.values(changeset.removedBullets)) {
      const bullet = this._bulletManager.getBulletById(bulletData.id);
      if (!bullet) {
        if (
          bulletData.ownerId === this._player?.id &&
          hadNoBullets &&
          this._player.bulletsLeft === 0 &&
          !this._bulletManager.hasSoundPlayedForBullet(bulletData) &&
          !config.WEAPON_TYPES_FROM_INVENTORY.includes(
            bulletData.weaponType as config.WeaponType
          )
        ) {
          // Player has just recharged their bullets
          AudioManager.getInstance().playSound(
            config.SOUNDS.PLAYER_BULLET_RECHARGE,
            { volume: 0.5 }
          );
        }
      }

      this._bulletManager.applyFromGameState(bulletData, true);
    }
  }

  toggleInventory(): void {
    this._inventoryOpen = !this._inventoryOpen;
  }
}
