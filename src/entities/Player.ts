import { ScreenObject } from "./ScreenObject";
import * as config from "../config";
import { IPlayer } from "../types/screen-objects/IPlayer";
import { IBullet } from "../types/screen-objects/IBullet";
import { IPoint } from "../types/geometry/IPoint";
import { IWorld } from "../types/IWorld";
import { loadImage } from "../utils/loadImage";
import { AudioManager } from "../utils/AudioManager";
import {
  InventoryItem as InventoryItemMessage,
  Player as PlayerMessage,
} from "../types/socketEvents";
import { SessionPlayer } from "../types/session";
import { Point2D } from "../utils/geometry/Point2D";

export class Player extends ScreenObject implements IPlayer {
  private _nightVisionTimer: number = 0;
  private _rotation: number = 0;
  private _bullets: IBullet[] = [];
  private _bulletsLeft: number = config.PLAYER_MAX_BULLETS;
  private _kills: number = 0;
  private _money: number = 0;
  private _score: number = 0;
  private _selectedGunType: config.WeaponType = "blaster";
  private _inventory: InventoryItemMessage[] = [];

  private _images: Record<config.WeaponType, HTMLImageElement | null> = {
    blaster: null,
    shotgun: null,
    railgun: null,
    rocket_launcher: null,
  };
  private _imageDead: HTMLImageElement | null = null;
  private _inventoryImage: HTMLImageElement | null = null;
  private _inventoryOpen: boolean = true;

  private _invulnerableTimer: number = 0;
  // private _rechargeAccumulator: number = 0;

  private _debugData: {
    collisionHits?: { id: string; total: boolean; x: boolean; y: boolean }[];
    coordinates?: {
      dx: number;
      dy: number;
    };
  } = {};
  private _lives: number = 0;

  get money(): number {
    return this._money;
  }

  get score(): number {
    return this._score;
  }

  get kills(): number {
    return this._kills;
  }

  get bulletsLeft(): number {
    return this._bulletsLeft;
  }

  get rotation(): number {
    return this._rotation;
  }

  get nightVisionTimer(): number {
    return this._nightVisionTimer;
  }

  get selectedGunType(): config.WeaponType {
    return this._selectedGunType;
  }

  get inventory(): InventoryItemMessage[] {
    return this._inventory;
  }

  hasInventoryItem(itemType: config.InventoryItemID): boolean {
    return this._inventory.some(
      (item) => item.type === itemType && item.quantity > 0
    );
  }

  toggleInventory(): void {
    this._inventoryOpen = !this._inventoryOpen;
  }

  static createFromSessionPlayer(
    world: IWorld,
    sessionPlayer: SessionPlayer
  ): IPlayer {
    const player = new Player(
      world,
      new Point2D(sessionPlayer.position.x, sessionPlayer.position.y),
      sessionPlayer.position.rotation,
      sessionPlayer.player_id
    );

    player._lives = sessionPlayer.lives;
    player._kills = sessionPlayer.kills;
    player._money = sessionPlayer.money;
    return player;
  }

  constructor(
    private world: IWorld,
    point: IPoint,
    rotation: number,
    id: string = ""
  ) {
    super(point, config.PLAYER_SIZE, config.PLAYER_SIZE, id);

    this._rotation = rotation;

    // Load player sprite
    loadImage(config.PLAYER_TEXTURE_BY_WEAPON_TYPE.blaster).then((img) => {
      this._images.blaster = img;
    });
    loadImage(config.PLAYER_TEXTURE_BY_WEAPON_TYPE.shotgun).then((img) => {
      this._images.shotgun = img;
    });
    loadImage(config.PLAYER_TEXTURE_BY_WEAPON_TYPE.railgun).then((img) => {
      this._images.railgun = img;
    });
    loadImage(config.PLAYER_TEXTURE_BY_WEAPON_TYPE.rocket_launcher).then(
      (img) => {
        this._images.rocket_launcher = img;
      }
    );
    // Load inventory texture
    loadImage(config.TEXTURES.INVENTORY).then((img) => {
      this._inventoryImage = img;
    });

    loadImage(config.TEXTURES.BLOOD).then((img) => {
      this._imageDead = img;
    });
  }

  getGunPoint(): IPoint {
    // Get gun position
    return this.getPosition()
      .movedByPointCoordinates(config.PLAYER_TEXTURE_CENTER.inverted())
      .moveByPointCoordinates(config.PLAYER_GUN_END)
      .rotateAroundPointCoordinates(this.getPosition(), this._rotation);
  }

  getTorchPoint(): IPoint {
    // Get gun position
    return this.getPosition()
      .movedByPointCoordinates(config.PLAYER_TEXTURE_CENTER.inverted())
      .moveByPointCoordinates(config.PLAYER_TORCH_POINT)
      .rotateAroundPointCoordinates(this.getPosition(), this._rotation);
  }

  takeDamage(amount: number): void {
    this._lives -= amount;
    AudioManager.getInstance().playSound(
      this._lives > 0 ? config.SOUNDS.PLAYER_HURT : config.SOUNDS.PLAYER_DEAD
    );
  }

  hasNightVision(): boolean {
    return this._nightVisionTimer > 0;
  }

  isNightVisionFading(): boolean {
    return this._nightVisionTimer < 2 && this._nightVisionTimer % 0.2 < 0.1;
  }

  update(dt: number): void {
    // Update timers
    if (this._invulnerableTimer > 0) {
      this._invulnerableTimer = Math.max(0, this._invulnerableTimer - dt);
    }

    if (this._nightVisionTimer > 0) {
      this._nightVisionTimer = Math.max(0, this._nightVisionTimer - dt);
    }
  }

  draw(ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D): void {
    this._bullets.forEach((bullet) => {
      bullet.draw(ctx, uiCtx);
    });

    if (!this._images[this._selectedGunType] || !this._imageDead) {
      return;
    }

    const screenPoint = this.world.worldToScreenCoordinates(this.getPosition());

    ctx.save();

    // Handle invulnerability blinking
    const blinkFactor =
      (this._invulnerableTimer * 5) / config.PLAYER_INVULNERABILITY_TIME;
    const shouldBlink = blinkFactor - Math.floor(blinkFactor) < 0.5;
    const texturePoint = config.PLAYER_TEXTURE_CENTER.inverted();

    ctx.translate(screenPoint.x, screenPoint.y);

    if ((this._invulnerableTimer <= 0 || shouldBlink) && !this.world.gameOver) {
      const image = this.isAlive()
        ? this._images[this._selectedGunType]!
        : this._imageDead;
      const imageSize = this.isAlive()
        ? config.PLAYER_TEXTURE_SIZE
        : config.BLOOD_TEXTURE_SIZE;
      // Draw player sprite
      ctx.rotate((this._rotation * Math.PI) / 180);
      ctx.drawImage(
        this.isAlive() ? this._images[this._selectedGunType]! : this._imageDead,
        texturePoint.x,
        texturePoint.y,
        imageSize,
        imageSize
      );
      ctx.rotate((-this._rotation * Math.PI) / 180);
    }

    ctx.restore();

    if (this.world.debug) {
      // Draw collision box
      uiCtx.strokeStyle = "red";
      uiCtx.strokeRect(
        -this.width / 2 + screenPoint.x,
        -this.height / 2 + screenPoint.y,
        this.width,
        this.height
      );

      // Draw center point
      uiCtx.fillStyle = "magenta";
      uiCtx.beginPath();
      uiCtx.arc(screenPoint.x, screenPoint.y, 2, 0, Math.PI * 2);
      uiCtx.fill();

      // Draw gun end point
      uiCtx.fillStyle = "magenta";
      const gunPoint = this.world.worldToScreenCoordinates(this.getGunPoint());

      uiCtx.beginPath();
      uiCtx.arc(gunPoint.x, gunPoint.y, 2, 0, Math.PI * 2);
      uiCtx.fill();

      // Draw torch point
      uiCtx.fillStyle = "cyan";
      const torchPoint = this.world.worldToScreenCoordinates(
        this.getTorchPoint()
      );

      uiCtx.beginPath();
      uiCtx.arc(torchPoint.x, torchPoint.y, 2, 0, Math.PI * 2);
      uiCtx.fill();
    }
  }

  drawUI(ctx: CanvasRenderingContext2D): void {
    // Draw inventory UI in the center bottom
    if (this._inventoryImage && !this.world.gameOver && this._inventoryOpen) {
      ctx.save();
      ctx.globalAlpha = 0.7;
      const inventoryPanelWidth = this._inventoryImage.width;
      const inventoryPanelHeight = this._inventoryImage.height;
      const inventoryPanelMarginBottom = config.INVENTORY_MARGIN_BOTTOM;
      const inventoryPanelCellSize = 42;

      ctx.drawImage(
        this._inventoryImage,
        config.SCREEN_WIDTH / 2 - inventoryPanelWidth / 2,
        config.SCREEN_HEIGHT -
          inventoryPanelHeight -
          inventoryPanelMarginBottom,
        inventoryPanelWidth,
        inventoryPanelHeight
      );

      if (this._inventory) {
        this._inventory.forEach((item) => {
          if (!item.quantity) {
            return;
          }

          const itemTexture = this.world.getInventoryTexture(
            item.type as config.InventoryItemID
          );

          if (!itemTexture) {
            return;
          }

          const isAmmo = config.AMMO_ITEM_IDS.includes(
            item.type as config.InventoryItemID
          );
          const itemCenterX =
            (isAmmo ? item.type - inventoryPanelCellSize / 2 : item.type) *
              inventoryPanelCellSize -
            inventoryPanelCellSize / 2;
          const itemCenterY = isAmmo
            ? inventoryPanelCellSize / 2
            : inventoryPanelCellSize * 1.5;

          ctx.drawImage(
            itemTexture,
            config.SCREEN_WIDTH / 2 -
              inventoryPanelWidth / 2 +
              itemCenterX -
              itemTexture.width / 2,
            config.SCREEN_HEIGHT -
              inventoryPanelHeight -
              inventoryPanelMarginBottom +
              itemCenterY -
              itemTexture.height / 2,
            itemTexture.width,
            itemTexture.height
          );

          if (item.quantity > 1) {
            // Draw a background for better readability
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(
              config.SCREEN_WIDTH / 2 -
                inventoryPanelWidth / 2 +
                itemCenterX -
                inventoryPanelCellSize / 2,
              config.SCREEN_HEIGHT -
                inventoryPanelHeight -
                inventoryPanelMarginBottom +
                itemCenterY +
                inventoryPanelCellSize / 2 -
                16,
              itemTexture.width,
              16
            );

            // Draw quantity
            ctx.fillStyle = "white";
            ctx.font = `16px ${config.FONT_NAME}`;
            ctx.textAlign = "right";
            ctx.fillText(
              `x${item.quantity}`,
              config.SCREEN_WIDTH / 2 -
                inventoryPanelWidth / 2 +
                itemCenterX +
                inventoryPanelCellSize / 2 -
                4,
              config.SCREEN_HEIGHT -
                inventoryPanelHeight -
                inventoryPanelMarginBottom +
                itemCenterY +
                inventoryPanelCellSize / 2 -
                4
            );
          }

          if (
            item.type ===
            config.WEAPON_INVENTORY_ID_BY_WEAPON_TYPE[this._selectedGunType]
          ) {
            // Highlight the selected weapon in the inventory
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 2;
            ctx.strokeRect(
              config.SCREEN_WIDTH / 2 -
                inventoryPanelWidth / 2 +
                itemCenterX -
                inventoryPanelCellSize / 2,
              config.SCREEN_HEIGHT -
                inventoryPanelHeight -
                inventoryPanelMarginBottom +
                itemCenterY -
                inventoryPanelCellSize / 2,
              inventoryPanelCellSize,
              inventoryPanelCellSize
            );
          }
        });
      }

      ctx.restore();
    }

    if (this.world.debug) {
      // Draw debug data
      ctx.fillStyle = "white";
      ctx.font = `12px ${config.FONT_NAME}`;
      ctx.textAlign = "left";
      ctx.fillText(
        `Collision hits: ${this._debugData.collisionHits}`,
        10,
        ctx.canvas.height - 38
      );
      ctx.fillText(
        `Player position: ${this.getPosition()}`,
        10,
        ctx.canvas.height - 24
      );
      ctx.fillText(`Rotation: ${this._rotation}`, 10, ctx.canvas.height - 10);
    }
  }

  isAlive(): boolean {
    return this._lives > 0;
  }

  die(): void {}

  get lives(): number {
    return this._lives;
  }

  recordKill(reward: number): void {
    this._kills++;
    this._money += reward;
  }

  isInvulnerable(): boolean {
    return this._invulnerableTimer > 0;
  }

  static fromGameState(world: IWorld, playerData: PlayerMessage): IPlayer {
    const position = new Point2D(
      playerData.position!.x,
      playerData.position!.y
    );
    const player = new Player(
      world,
      position,
      playerData.rotation,
      playerData.id
    );
    player.applyFromGameState(playerData);
    return player;
  }

  applyFromGameState(changeset: PlayerMessage): void {
    this._score = changeset.score;

    if (changeset.position) {
      this.getPosition().setTo(changeset.position.x, changeset.position.y);

      this._rotation = changeset.rotation;
    }

    if (this._lives > changeset.lives) {
      this.takeDamage(this._lives - changeset.lives);
    } else if (this._lives < changeset.lives) {
      this._lives = changeset.lives;
    }

    // Check win/lose conditions
    if (!this.isAlive()) {
      this.world.endGame();
    }

    this._money = changeset.money;
    this._kills = changeset.kills;

    if (
      changeset.selectedGunType === this._selectedGunType &&
      !config.WEAPON_TYPES_LOADED_DIRECTLY_FROM_INVENTORY.includes(
        changeset.selectedGunType as config.WeaponType
      ) &&
      this._bulletsLeft <
        changeset.bulletsLeftByWeaponType[changeset.selectedGunType]
    ) {
      AudioManager.getInstance().playSound(
        config.SOUNDS.PLAYER_BULLET_RECHARGE,
        { volume: 0.5 }
      );
    }

    if (
      config.WEAPON_TYPES_LOADED_DIRECTLY_FROM_INVENTORY.includes(
        changeset.selectedGunType as config.WeaponType
      )
    ) {
      const inventoryItemId =
        config.AMMO_INVENTORY_ID_BY_WEAPON_TYPE[
          changeset.selectedGunType as keyof typeof config.AMMO_INVENTORY_ID_BY_WEAPON_TYPE
        ];
      const inventoryItem = changeset.inventory.find(
        (item) => item.type === inventoryItemId
      );
      this._bulletsLeft = inventoryItem?.quantity ?? 0;
    } else {
      this._bulletsLeft =
        changeset.bulletsLeftByWeaponType[changeset.selectedGunType] ?? 0;
    }

    this._selectedGunType = changeset.selectedGunType as config.WeaponType;
    this._invulnerableTimer = changeset.invulnerableTimer;
    this._nightVisionTimer = changeset.nightVisionTimer;

    if (this.world.isPlayerInShop()) {
      changeset.inventory.forEach((item) => {
        const existingItem = this._inventory.find(
          (invItem) => invItem.type === item.type
        );

        if (!existingItem || item.quantity > existingItem.quantity) {
          AudioManager.getInstance().playSound(config.SOUNDS.MONEY_SPENT);
        }
      });
    } else {
      this._inventory
        .filter((item) => config.INVENTORY_ITEM_BONUS.includes(item.type))
        .forEach((item) => {
          const updatedItem = changeset.inventory.find(
            (newItem) => newItem.type === item.type
          );
          if (!updatedItem || updatedItem.quantity < item.quantity) {
            AudioManager.getInstance().playSound(config.SOUNDS.BONUS_PICKUP);
          }
        });
    }

    this._inventory = changeset.inventory;
  }
}
