import { IDrawable } from "./IDrawable";
import { IWorld } from "../IWorld";
import { IDamageable } from "./IDamageable";
import { IKillable } from "./IKillable";
import { IScreenObject } from "./IScreenObject";
import { IWall } from "./IWall";
import { IPlayer } from "./IPlayer";
import { Enemy as EnemyMessage } from "../../types/socketEvents";

export interface IEnemy extends IScreenObject, IDrawable {
  applyFromGameState(enemy: EnemyMessage): void;
  rotation: number;
  wall: IWall;
}

export interface IEnemyFactory {
  new (
    world: IWorld,
    wall: IWall,
    neighboringWalls: IWall[],
    id?: string
  ): IEnemy;
}
