import { IDrawable } from "./IDrawable";
import { IWorld } from "../IWorld";
import { IScreenObject } from "./IScreenObject";
import { IWall } from "./IWall";
import { EnemyUpdate, Enemy as EnemyMessage } from "../../types/socketEvents";

export interface IEnemy extends IScreenObject, IDrawable {
  applyFromGameStateDelta(enemy: EnemyUpdate): void;
  rotation: number;
  wall: IWall;
}

export interface IEnemyFactory {
  new (world: IWorld, wall: IWall, enemyData: EnemyMessage): IEnemy;
}
