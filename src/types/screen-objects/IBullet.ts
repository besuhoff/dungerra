import { IScreenObject } from "./IScreenObject";
import { IPoint } from "../geometry/IPoint";
import { IWorld } from "../IWorld";
import { IDrawable } from "./IDrawable";
import { IUpdatable } from "./IUpdatable";
import { Vector2D } from "../../utils/geometry/Vector2D";
import { Bullet as BulletMessage } from "../socketEvents";
import * as config from "../../config";
export interface IBullet extends IScreenObject, IDrawable {
  active: boolean;
  inactiveMs: number;
  velocity: Vector2D;
  isEnemy: boolean;
  ownerId?: string;
  weaponType: config.WeaponType;
}

export interface IBulletFactory {
  new (
    world: IWorld,
    point: IPoint,
    rotation: number,
    isEnemy: boolean,
    enemyType: config.EnemyType,
    ownerId?: string,
    id?: string
  ): IBullet;

  fromGameState(world: IWorld, bulletData: BulletMessage): IBullet;
}
