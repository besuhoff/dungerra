import { IWorld } from "../IWorld";
import { IBullet } from "./IBullet";
import { IDrawable } from "./IDrawable";
import { Bullet as BulletMessage } from "../socketEvents";
export interface IBulletManager extends IDrawable {
  getBulletById(bulletId: string): IBullet | null;
  hasSoundPlayedForBullet(bulletData: BulletMessage): boolean;
  applyFromGameState(bulletData: BulletMessage, remove?: boolean): void;
}

export interface IBulletManagerFactory {
  new (world: IWorld): IBulletManager;
}
