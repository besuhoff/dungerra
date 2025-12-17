import { ScreenObject } from "./ScreenObject";
import { Vector2D } from "../utils/geometry/Vector2D";
import * as config from "../config";
import { IBullet } from "../types/screen-objects/IBullet";
import { IPoint } from "../types/geometry/IPoint";
import { IWorld } from "../types/IWorld";
import { Point2D } from "../utils/geometry/Point2D";
import { Bullet as BulletMessage } from "../types/socketEvents";

export class Bullet extends ScreenObject implements IBullet {
  private _velocity: Vector2D;
  private _speed: number;
  private _active: boolean = true;
  private _damage: number;
  private _weaponType: config.WeaponType = "blaster";

  get weaponType(): config.WeaponType {
    return this._weaponType;
  }

  get active(): boolean {
    return this._active;
  }

  get velocity(): Vector2D {
    return this._velocity;
  }

  constructor(
    private world: IWorld,
    point: IPoint,
    private rotation: number,
    public readonly isEnemy: boolean,
    public readonly ownerId?: string,
    id?: string
  ) {
    super(point, config.BULLET_SIZE, config.BULLET_SIZE, id);
    this._damage = config.BULLET_DAMAGE;
    this._speed = isEnemy
      ? config.ENEMY_BULLET_SPEED
      : config.PLAYER_BULLET_SPEED;
    this._velocity = Vector2D.fromAngle((rotation * Math.PI) / 180).multiply(
      this._speed
    );
  }

  static fromGameState(world: IWorld, bulletData: BulletMessage): Bullet {
    const bullet = new Bullet(
      world,
      new Point2D(bulletData.position?.x ?? 0, bulletData.position?.y ?? 0),
      bulletData.velocity
        ? Math.atan2(bulletData.velocity.y, bulletData.velocity.x) *
          (180 / Math.PI)
        : 0,
      bulletData.isEnemy,
      bulletData.ownerId,
      bulletData.id
    );

    bullet._weaponType = bulletData.weaponType as config.WeaponType;

    if (!bulletData.isActive) {
      bullet._active = false;
    }

    if (bulletData.velocity) {
      bullet._velocity = new Vector2D(
        bulletData.velocity.x,
        bulletData.velocity.y
      );
    }

    bullet._weaponType = bulletData.weaponType as config.WeaponType;

    return bullet;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    _: CanvasRenderingContext2D,
    millisecondsPassed?: number
  ): void {
    if (!this._active && this._weaponType !== "railgun") {
      return;
    }

    const screenPoint = this.world.worldToScreenCoordinates(this.getPosition());

    ctx.save();
    ctx.translate(screenPoint.x, screenPoint.y);

    if (this._weaponType === "railgun") {
      // Draw railgun bullet as a line
      ctx.strokeStyle = this.isEnemy
        ? config.ENEMY_BULLET_COLOR
        : config.PLAYER_BULLET_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const endX = this.velocity.x;
      const endY = this.velocity.y;
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Add a glow effect
      const glowSize = 20;
      const gradient = ctx.createRadialGradient(
        endX,
        endY,
        0,
        endX,
        endY,
        glowSize
      );
      gradient.addColorStop(
        0,
        this.isEnemy ? config.ENEMY_BULLET_COLOR : config.PLAYER_BULLET_COLOR
      );
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(endX, endY, glowSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    ctx.rotate((this.rotation * Math.PI) / 180);

    // Draw bullet
    ctx.fillStyle = this.isEnemy
      ? config.ENEMY_BULLET_COLOR
      : config.PLAYER_BULLET_COLOR;
    ctx.beginPath();
    ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
