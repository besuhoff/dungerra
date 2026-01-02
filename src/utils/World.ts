import * as config from "../config";
import { IEnemy, IEnemyFactory } from "../types/screen-objects/IEnemy";
import { IPlayerFactory } from "../types/screen-objects/IPlayer";
import { IPlayer } from "../types/screen-objects/IPlayer";
import { IBonusFactory } from "../types/screen-objects/IBonus";
import { IBonus } from "../types/screen-objects/IBonus";
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
import { InputMessage, GameStateDeltaMessage } from "../types/socketEvents";
import {
  IBulletManager,
  IBulletManagerFactory,
} from "../types/screen-objects/IBulletManager";
import { IBulletFactory } from "../types/screen-objects/IBullet";
import { SessionPlayer } from "../types/session";
import { IShop, IShopFactory } from "../types/screen-objects/IShop";

export class World implements IWorld {
  private readonly CHUNK_SIZE = 2000; // Same as screen width for now
  private _player: IPlayer | null = null;
  private _otherPlayers: Record<string, IOtherPlayer> = {};
  private _otherPlayerCoordinates: Record<string, IPoint> = {};

  private _enemies: IEnemy[] = [];
  private _walls: IWall[] = [];
  private _bonuses: IBonus[] = [];
  private _shops: IShop[] = [];

  private _gameOver: boolean = false;

  private floorTexture: HTMLImageElement | null = null;
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
    purchaseItemKey: {},
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

  get shops(): IShop[] {
    return this._shops;
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
    private _Shop: IShopFactory,
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

  addOtherPlayer(player: PlayerMessage): void {
    const point = new Point2D(player.position!.x, player.position!.y);
    const otherPlayer = new this._OtherPlayer(this, player);

    this._otherPlayers[player.id] = otherPlayer;
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
      AudioManager.getInstance().playSound(config.SOUNDS.GAME_OVER, {
        when: 1.5,
      });
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

          // Draw diagonals
          ctx.beginPath();
          ctx.moveTo(screenPoint.x, screenPoint.y);
          ctx.lineTo(
            screenPoint.x + this.CHUNK_SIZE,
            screenPoint.y + this.CHUNK_SIZE
          );
          ctx.moveTo(screenPoint.x + this.CHUNK_SIZE, screenPoint.y);
          ctx.lineTo(screenPoint.x, screenPoint.y + this.CHUNK_SIZE);
          ctx.closePath();
          ctx.stroke();
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

    // Draw shops
    this._shops.forEach((shop) => shop.draw(ctx, uiCtx));

    // Draw walls
    this._walls.forEach((wall) => wall.draw(ctx, uiCtx));

    // Draw enemies
    this._enemies.forEach((enemy) => enemy.draw(ctx, uiCtx));

    Object.values(this._otherPlayers).forEach((otherPlayer) => {
      otherPlayer.draw(ctx, uiCtx);
    });

    // Draw bonuses
    this._bonuses.forEach((bonus) => bonus.draw(ctx, uiCtx));

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

  private drawArrowToPoint(
    ctx: CanvasRenderingContext2D,
    point: IPoint,
    padding: number,
    color: string,
    fadeWhenOnScreen: boolean = false
  ): void {
    const screenPoint = this.worldToScreenCoordinates(point);
    const isOnScreen =
      screenPoint.x >= 0 &&
      screenPoint.x <= config.SCREEN_WIDTH &&
      screenPoint.y >= 0 &&
      screenPoint.y <= config.SCREEN_HEIGHT;

    if (isOnScreen && fadeWhenOnScreen) {
      return;
    }

    const centerScreenPoint = new Point2D(
      config.SCREEN_WIDTH / 2,
      config.SCREEN_HEIGHT / 2
    );
    const direction = screenPoint.subtracted(centerScreenPoint);
    const arrowLength = 10;

    const bonusRadius = padding;

    const distance = Math.sqrt(
      direction.x * direction.x + direction.y * direction.y
    );
    const normalizedDirection = new Point2D(
      direction.x / distance,
      direction.y / distance
    );
    const arrowEndPoint = new Point2D(
      centerScreenPoint.x +
        normalizedDirection.x *
          Math.min(
            distance - bonusRadius,
            config.SCREEN_WIDTH / 2 - arrowLength
          ),
      centerScreenPoint.y +
        normalizedDirection.y *
          Math.min(
            distance - bonusRadius,
            config.SCREEN_HEIGHT / 2 - arrowLength
          )
    );

    // Add a light bouncing animation to the arrow
    const time = Date.now() / 200;
    const bounceOffset = Math.sin(time) * 3;
    arrowEndPoint.moveBy(
      normalizedDirection.x * bounceOffset,
      normalizedDirection.y * bounceOffset
    );

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    // Draw a triangle arrowhead
    ctx.beginPath();
    ctx.moveTo(arrowEndPoint.x, arrowEndPoint.y);
    ctx.lineTo(
      arrowEndPoint.x -
        normalizedDirection.x * arrowLength +
        normalizedDirection.y * (arrowLength / 3),
      arrowEndPoint.y -
        normalizedDirection.y * arrowLength -
        normalizedDirection.x * (arrowLength / 3)
    );
    ctx.lineTo(
      arrowEndPoint.x -
        normalizedDirection.x * arrowLength -
        normalizedDirection.y * (arrowLength / 3),
      arrowEndPoint.y -
        normalizedDirection.y * arrowLength +
        normalizedDirection.x * (arrowLength / 3)
    );
    ctx.lineTo(arrowEndPoint.x, arrowEndPoint.y);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }

  private drawUI(ctx: CanvasRenderingContext2D): void {
    if (!this._player) {
      return;
    }

    if (!this.gameOver) {
      const playersBonuses = this._bonuses.filter(
        (bonus) => bonus.belongsToPlayer
      );

      for (const bonus of playersBonuses) {
        // Draw a green arrow pointing to the bonus
        // If a bonus is off-screen, draw the arrow at the edge of the screen
        this.drawArrowToPoint(
          ctx,
          bonus.getPosition(),
          (bonus.width * Math.SQRT2) / 2 + 10,
          "lime"
        );
      }

      for (const position of Object.values(this._otherPlayerCoordinates)) {
        this.drawArrowToPoint(
          ctx,
          position,
          (config.PLAYER_SIZE * Math.SQRT2) / 2 + 10,
          "yellow",
          true
        );
      }
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
        `Your Posthumous Score: ${this._player.score.toFixed(0)}`,
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
        `Lives: ${Array(Math.ceil(this._player.lives)).fill("❤️").join(" ")}`,
        10,
        30
      );
      ctx.fillStyle = "yellow";
      ctx.fillText(`Money: ${this._player.money.toFixed(0)}$`, 10, 60);
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

    this._player.drawUI(ctx);

    this._shops.forEach((shop) => shop.drawUI(ctx));

    if (this.debug) {
      const worldObjectsCount =
        this._enemies.length +
        this._walls.length +
        this._bonuses.length +
        this._shops.length +
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
    const purchaseItemKey: { [key: number]: boolean } = {};
    for (let i = 0; i <= 9; i++) {
      if (keys.has(`Digit${i}`)) {
        const playerShop = this.shops.find(
          (shop) => shop.hasPlayer() && shop.isModalOpen
        );

        if (playerShop) {
          const inventory = playerShop.inventory;
          const key =
            Number(
              Object.keys(inventory).filter(
                (key) => inventory[Number(key)].quantity > 0
              )[i == 0 ? 9 : i - 1]
            ) ?? null;

          purchaseItemKey[key] = true;
        } else {
          itemKey[i] = true;
        }
      }
    }

    if (this._previousInputState) {
      for (const key of Object.keys(this._previousInputState.purchaseItemKey)) {
        if (!purchaseItemKey[Number(key)]) {
          this.handleShoppingAttempt(Number(key) as config.InventoryItemID);
        }
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
      JSON.stringify(purchaseItemKey) !==
        JSON.stringify(this._previousInputState.purchaseItemKey) ||
      now - this._inputStateSubmitTimestamp > 1000
    ) {
      this._sessionManager.notifyInput({
        forward,
        backward,
        left,
        right,
        shoot,
        itemKey,
        purchaseItemKey,
      });
      this._previousInputState = {
        forward,
        backward,
        left,
        right,
        shoot,
        itemKey,
        purchaseItemKey,
      };
      this._inputStateSubmitTimestamp = now;
    }
  }

  handleShoppingAttempt(itemId: config.InventoryItemID): void {
    const isWeapon = Object.values(
      config.WEAPON_INVENTORY_ID_BY_WEAPON_TYPE
    ).includes(itemId);

    if (isWeapon && this._player?.hasInventoryItem(itemId)) {
      AudioManager.getInstance().playSound(config.SOUNDS.MISTAKE);
      return;
    }

    const playerShop = this.shops.find(
      (shop) => shop.hasPlayer() && shop.isModalOpen
    );

    if (playerShop && playerShop.inventory[itemId]) {
      const item = playerShop.inventory[itemId];
      const totalPrice = item.price * item.packSize;

      if (this._player && this._player.money <= totalPrice) {
        AudioManager.getInstance().playSound(config.SOUNDS.MISTAKE);
      }
    }
  }

  restart(): void {
    this._sessionManager.notifyRespawn();
  }

  getInventoryTexture(type: config.InventoryItemID): HTMLImageElement | null {
    return this.inventoryItemTextures[type] || null;
  }

  applyGameStateDelta(
    changeset: GameStateDeltaMessage,
    currentPlayerId: string
  ): void {
    if (changeset.timestamp <= this._lastChangesetTimestamp) {
      console.log(
        `Ignoring out-of-order changeset. Last: ${this._lastChangesetTimestamp}, Received: ${changeset.timestamp}`,
        changeset
      );
      return;
    }

    this._lastChangesetTimestamp = Number(changeset.timestamp);
    const hadNoBullets = this._player ? this._player.bulletsLeft === 0 : false;

    for (const addedPlayer of Object.values(changeset.addedPlayers)) {
      if (addedPlayer.id === currentPlayerId) {
        this._player = this._Player.fromGameState(this, addedPlayer);
        continue;
      }

      if (!this._otherPlayers[addedPlayer.id]) {
        this.addOtherPlayer(addedPlayer);
      }
    }

    for (const [updatedPlayerId, updatedPlayer] of Object.entries(
      changeset.updatedPlayers
    )) {
      if (updatedPlayerId === currentPlayerId) {
        if (updatedPlayer.lives?.isAlive && !this._player?.isAlive()) {
          const audioManager = AudioManager.getInstance();
          audioManager.playSound(config.SOUNDS.SPAWN);
          audioManager.stopSound(config.SOUNDS.GAME_OVER);
          this._gameOver = false;
        }

        this._player?.applyFromGameStateDelta(updatedPlayer);
        continue;
      }

      const otherPlayer = this._otherPlayers[updatedPlayerId];
      if (otherPlayer) {
        otherPlayer.applyFromGameStateDelta(updatedPlayer);
      }
    }

    for (const removedPlayerId of changeset.removedPlayers) {
      this.removeOtherPlayer(removedPlayerId);
    }

    for (const addedWall of Object.values(changeset.addedWalls)) {
      const wall = this._walls.find((w) => w.id === addedWall.id);
      if (!wall) {
        this._walls.push(
          new this._Wall(
            this,
            new Point2D(addedWall.position!.x, addedWall.position!.y),
            addedWall.width,
            addedWall.height,
            addedWall.orientation as "horizontal" | "vertical",
            addedWall.id
          )
        );
      }
    }

    for (const removedWallId of changeset.removedWalls) {
      this._walls = this._walls.filter((w) => w.id !== removedWallId);
    }

    for (const addedEnemy of Object.values(changeset.addedEnemies)) {
      let enemy = this._enemies.find((e) => e.id === addedEnemy.id);
      const wall = addedEnemy.wallId
        ? this._walls.find((wall) => wall.id === addedEnemy.wallId)
        : undefined;

      enemy = new this._Enemy(this, addedEnemy, wall);
      this._enemies = this._enemies
        .filter((e) => e.id !== addedEnemy.id)
        .concat([enemy]);
    }

    for (const [updatedEnemyId, updatedEnemy] of Object.entries(
      changeset.updatedEnemies
    )) {
      const enemy = this._enemies.find((e) => e.id === updatedEnemyId);
      if (enemy) {
        enemy.applyFromGameStateDelta(updatedEnemy);
      }
    }

    for (const removedEnemyId of changeset.removedEnemies) {
      this._enemies = this._enemies.filter((e) => e.id !== removedEnemyId);
    }

    for (const addedBonus of Object.values(changeset.addedBonuses)) {
      if (addedBonus.pickedUpBy) {
        continue;
      }

      const bonus = this._bonuses.find((b) => b.id === addedBonus.id);
      if (!bonus) {
        this._bonuses.push(new this._Bonus(this, addedBonus));
      }
    }

    for (const [updatedBonusId, updatedBonus] of Object.entries(
      changeset.updatedBonuses
    )) {
      if (updatedBonus.pickedUpBy) {
        this._bonuses = this._bonuses.filter((b) => b.id !== updatedBonusId);
        if (
          updatedBonus.pickedUpBy === this._player?.id &&
          !this._bonusPickupCache.has(updatedBonusId)
        ) {
          AudioManager.getInstance().playSound(config.SOUNDS.BONUS_PICKUP);
          this._bonusPickupCache.add(updatedBonusId);
        }
      }
    }

    for (const removedBonusId of changeset.removedBonuses) {
      this._bonuses = this._bonuses.filter((b) => b.id !== removedBonusId);
    }

    for (const addedBullet of Object.values(changeset.addedBullets)) {
      if (
        addedBullet.ownerId === this._player?.id &&
        hadNoBullets &&
        this._player.bulletsLeft === 0 &&
        !this._bulletManager.hasSoundPlayedForBullet(addedBullet) &&
        !config.WEAPON_TYPES_LOADED_DIRECTLY_FROM_INVENTORY.includes(
          addedBullet.weaponType as config.WeaponType
        )
      ) {
        // Player has just recharged their bullets
        AudioManager.getInstance().playSound(
          config.SOUNDS.PLAYER_BULLET_RECHARGE,
          { volume: 0.5 }
        );
      }

      this._bulletManager.applyFromGameState(addedBullet);
    }

    for (const [bulletId, bulletData] of Object.entries(
      changeset.updatedBullets
    )) {
      const existingBullet = this._bulletManager.getBulletById(bulletId);
      if (existingBullet) {
        existingBullet.getPosition().setTo(bulletData.x, bulletData.y);
      }
    }

    for (const bulletData of Object.values(changeset.removedBullets)) {
      const bullet = this._bulletManager.getBulletById(bulletData.id);
      if (!bullet) {
        if (
          bulletData.ownerId === this._player?.id &&
          hadNoBullets &&
          this._player.bulletsLeft === 0 &&
          !this._bulletManager.hasSoundPlayedForBullet(bulletData) &&
          !config.WEAPON_TYPES_LOADED_DIRECTLY_FROM_INVENTORY.includes(
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

    for (const addedShopData of Object.values(changeset.addedShops)) {
      const shop = this._shops.find((s) => s.id === addedShopData.id);
      if (!shop) {
        this._shops.push(new this._Shop(this, addedShopData));
      }
    }

    for (const [updatedShopId, updatedShop] of Object.entries(
      changeset.updatedShops
    )) {
      const shop = this._shops.find((s) => s.id === updatedShopId);
      if (shop) {
        shop.applyFromGameStateDelta(updatedShop);
      }
    }

    for (const removedShopId of changeset.removedShops) {
      this._shops = this._shops.filter((s) => s.id !== removedShopId);
    }

    for (const addedPlayerShopId of changeset.addedPlayersShops) {
      const shop = this._shops.find((s) => s.id === addedPlayerShopId);
      shop?.handlePlayerEnter();
    }

    for (const removedPlayerShopId of changeset.removedPlayersShops) {
      const shop = this._shops.find((s) => s.id === removedPlayerShopId);
      shop?.handlePlayerExit();
    }

    for (const [id, coordinates] of Object.entries(
      changeset.updatedOtherPlayerPositions
    )) {
      this._otherPlayerCoordinates[id] = new Point2D(
        coordinates.x,
        coordinates.y
      );
    }

    for (const id of changeset.removedOtherPlayerPositions) {
      delete this._otherPlayerCoordinates[id];
    }
  }

  toggleInventory(): void {
    this._player?.toggleInventory();
  }

  openShopModal(): void {
    this._shops.forEach((shop) => {
      if (shop.hasPlayer() && !shop.isModalOpen) {
        shop.openModal();
      }
    });
  }

  closeShopModal(): void {
    this._shops.forEach((shop) => {
      if (shop.hasPlayer() && shop.isModalOpen) {
        shop.closeModal();
      }
    });
  }

  isPlayerInShop(): boolean {
    return this._shops.some((shop) => shop.hasPlayer() && shop.isModalOpen);
  }
}
