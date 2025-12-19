import { ScreenObject } from "./ScreenObject";
import * as config from "../config";
import { IBullet } from "../types/screen-objects/IBullet";
import { IPoint } from "../types/geometry/IPoint";
import { IWorld } from "../types/IWorld";
import { loadImage } from "../utils/loadImage";
import { AudioManager } from "../utils/AudioManager";
import { IOtherPlayer } from "../types/screen-objects/IOtherPlayer";
import { Point2D } from "../utils/geometry/Point2D";
import { Player as PlayerMessage } from "../types/socketEvents";

export class OtherPlayer extends ScreenObject implements IOtherPlayer {
  private _images: Record<config.WeaponType, HTMLImageElement | null> = {
    blaster: null,
    shotgun: null,
    railgun: null,
    rocket_launcher: null,
  };
  private _bloodImage: HTMLImageElement | null = null;

  private _rotation: number = 0;
  private _bullets: IBullet[] = [];

  private _invulnerableTimer: number = 0;
  private _lives: number = config.PLAYER_LIVES;
  private _nightVisionTimer: number = 0;
  private _weaponType: config.WeaponType = "blaster";

  private dead: boolean = false;

  get rotation(): number {
    return this._rotation;
  }

  get nightVisionTimer(): number {
    return this._nightVisionTimer;
  }

  get name(): string {
    return this._name;
  }

  constructor(
    private world: IWorld,
    point: IPoint,
    rotation: number,
    id: string,
    private _name: string
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

    // Load blood texture
    loadImage(config.TEXTURES.BLOOD).then((img) => {
      this._bloodImage = img;
    });
  }

  getGunPoint(): IPoint {
    // Get gun position
    return this.getPosition()
      .movedByPointCoordinates(config.PLAYER_TEXTURE_CENTER.inverted())
      .moveByPointCoordinates(config.PLAYER_GUN_END)
      .rotateAroundPointCoordinates(this.getPosition(), this._rotation);
  }

  moveTo(point: IPoint): void {
    this._point.setToPointCoordinates(point);
  }

  rotate(angle: number): void {
    this._rotation = angle;
  }

  update(dt: number): void {
    // Update timers
    if (this._invulnerableTimer > 0) {
      this._invulnerableTimer = Math.max(0, this._invulnerableTimer - dt);
    }
  }

  draw(ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D): void {
    this._bullets.forEach((bullet) => {
      bullet.draw(ctx, uiCtx);
    });

    if (
      !this._images[this._weaponType] ||
      !this.world.player ||
      this.world.gameOver
    ) {
      return;
    }

    const screenPoint = this.world.worldToScreenCoordinates(this.getPosition());
    let shouldDraw = true;

    if (
      (!this.world.player.hasNightVision() && this.hasNightVision()) ||
      !this.isAlive()
    ) {
      const distance = this.getPosition().distanceTo(
        this.world.player.getTorchPoint()
      );
      shouldDraw = distance <= this.world.torchRadius + this.width;
    }

    if (!shouldDraw) {
      return;
    }

    this.drawUI(uiCtx);

    // Handle invulnerability blinking
    const blinkFactor =
      (this._invulnerableTimer * 5) / config.PLAYER_INVULNERABILITY_TIME;
    const shouldBlink = blinkFactor - Math.floor(blinkFactor) < 0.5;

    ctx.save();
    ctx.translate(screenPoint.x, screenPoint.y);

    if (
      (this.dead || !this._invulnerableTimer || shouldBlink) &&
      !this.world.gameOver
    ) {
      // Draw player sprite
      ctx.rotate((this._rotation * Math.PI) / 180);
      const textureSize = !this.dead
        ? config.PLAYER_TEXTURE_SIZE
        : config.BLOOD_TEXTURE_SIZE;
      const texturePoint = !this.dead
        ? config.PLAYER_TEXTURE_CENTER.inverted()
        : new Point2D(-textureSize / 2, -textureSize / 2);

      if (this.dead && this._bloodImage) {
        ctx.drawImage(
          this._bloodImage,
          -this.width / 2,
          -this.height / 2,
          this.width,
          this.height
        );
      }

      if (!this.dead && this._images[this._weaponType]) {
        ctx.drawImage(
          this._images[this._weaponType]!,
          texturePoint.x,
          texturePoint.y,
          textureSize,
          textureSize
        );
      }

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
    }
  }

  isAlive(): boolean {
    return this._lives > 0;
  }

  get lives(): number {
    return this._lives;
  }

  drawUI(ctx: CanvasRenderingContext2D): void {
    const screenPoint = this.world.worldToScreenCoordinates(this.getPosition());

    // Set font first to measure text
    ctx.font = `14px ${config.FONT_NAME}`;
    const textMetrics = ctx.measureText(this.name);

    // Draw background
    const padding = 3;
    const bgWidth = textMetrics.width + padding * 2;
    const bgHeight = textMetrics.actualBoundingBoxAscent + padding * 2; // Font size + padding

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(
      screenPoint.x - bgWidth / 2,
      screenPoint.y + this.height / 2 + 30,
      bgWidth,
      bgHeight
    );

    // Write nickname
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(
      this.name,
      screenPoint.x,
      screenPoint.y +
        this.height / 2 +
        30 +
        textMetrics.actualBoundingBoxAscent +
        padding
    );
  }

  isInvulnerable(): boolean {
    return this._invulnerableTimer > 0;
  }

  addNightVision(): void {
    this._nightVisionTimer = config.GOGGLES_ACTIVE_TIME;
  }

  hasNightVision(): boolean {
    // TODO: implement if needed
    return false;
  }

  isNightVisionFading(): boolean {
    // TODO: implement if needed
    return false;
  }

  getTorchPoint(): IPoint {
    // Get gun position
    return this.getPosition()
      .movedByPointCoordinates(config.PLAYER_TEXTURE_CENTER.inverted())
      .moveByPointCoordinates(config.PLAYER_TORCH_POINT)
      .rotateAroundPointCoordinates(this.getPosition(), this._rotation);
  }

  applyFromGameState(player: PlayerMessage): void {
    this._point.setTo(player.position!.x, player.position!.y);
    this._rotation = player.rotation;
    this._lives = player.lives;
    this.dead = !player.isAlive;
    this._invulnerableTimer = player.invulnerableTimer;
    this._nightVisionTimer = player.nightVisionTimer;
    this._weaponType = player.selectedGunType as config.WeaponType;
  }
}
