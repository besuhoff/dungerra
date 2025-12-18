import { IWorld } from "../IWorld";
import { IBullet } from "./IBullet";
import { IDrawable } from "./IDrawable";
import { IUpdatable } from "./IUpdatable";

export interface IBulletManager extends IDrawable {
  registerShot(bullet: IBullet): void;
  unregisterShot(bulletId: string, deactivate: boolean): void;
  getBulletById(bulletId: string): IBullet | null;
  hasSoundPlayedForBullet(bulletId: string): boolean;
}

export interface IBulletManagerFactory {
  new (world: IWorld): IBulletManager;
}
