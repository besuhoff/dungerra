import * as config from "../config";
import { IWorld } from "../types/IWorld";
import { IBullet } from "../types/screen-objects/IBullet";
import { IBulletManager } from "../types/screen-objects/IBulletManager";
import { AudioManager } from "./AudioManager";

export class BulletManager implements IBulletManager {
  private _bullets: Map<string, IBullet> = new Map();
  private _bulletsSoundCache: Set<string> = new Set();
  private _inactiveBulletsCache: {
    bullet: IBullet;
    lifetime: number;
    addedAt: number;
  }[] = [];
  private _inactiveBulletsDrawnCache: Set<string> = new Set();

  get bullets(): IBullet[] {
    return Array.from(this._bullets.values());
  }

  constructor(private world: IWorld) {}

  registerShot(bullet: IBullet): void {
    this._bullets.set(bullet.id, bullet);

    if (this._bulletsSoundCache.has(bullet.id)) {
      return;
    }

    // Play sound
    const distance = bullet
      .getPosition()
      .distanceTo(this.world.player!.getPosition());
    const maxDistance = this.world.torchRadius * 2;
    const volume = distance >= maxDistance ? 0 : 1 - distance / maxDistance;

    this._bulletsSoundCache.add(bullet.id);
    AudioManager.getInstance().playSound(
      config.BULLET_SOUND_BY_WEAPON_TYPE[
        bullet.weaponType as config.WeaponType
      ] || config.SOUNDS.BULLET,
      volume
    );
  }

  unregisterShot(bulletId: string): void {
    if (this._bullets.has(bulletId)) {
      const bullet = this._bullets.get(bulletId)!;
      if (!bullet.active && !this._inactiveBulletsDrawnCache.has(bulletId)) {
        this._inactiveBulletsCache.push({
          bullet,
          lifetime: 200,
          addedAt: Date.now(),
        });
      }
      this._bullets.delete(bulletId);
    }
  }

  getBulletById(bulletId: string): IBullet | null {
    return this._bullets.get(bulletId) || null;
  }

  hasSoundPlayedForBullet(bulletId: string): boolean {
    return this._bulletsSoundCache.has(bulletId);
  }

  draw(ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D): void {
    this.bullets.forEach((bullet) => bullet.draw(ctx, uiCtx));
    const inactiveBullets = [...this._inactiveBulletsCache];
    inactiveBullets.forEach(({ bullet, addedAt, lifetime }) => {
      const millisecondsPassed = Date.now() - addedAt;
      bullet.draw(ctx, uiCtx, millisecondsPassed);
      if (millisecondsPassed >= lifetime) {
        this._inactiveBulletsCache = this._inactiveBulletsCache.filter(
          (b) => b.bullet.id !== bullet.id
        );
        this._inactiveBulletsDrawnCache.add(bullet.id);
      }
    });
  }
}
