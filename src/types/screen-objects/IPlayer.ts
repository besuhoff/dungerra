import { WeaponType } from "../../config";
import { IPoint } from "../geometry/IPoint";
import { IWorld } from "../IWorld";
import { SessionPlayer } from "../session";
import {
  InventoryItem as InventoryItemMessage,
  Player as PlayerMessage,
} from "../socketEvents";
import { IDamageable } from "./IDamageable";
import { IDrawable } from "./IDrawable";
import { IKillable } from "./IKillable";
import { IScreenObject } from "./IScreenObject";
import { IUpdatable } from "./IUpdatable";
import { IVisor } from "./IVisor";

export interface IPlayer
  extends IScreenObject,
    IDrawable,
    IUpdatable,
    IDamageable,
    IKillable,
    IVisor {
  recordKill(reward: number): void;
  drawUI(ctx: CanvasRenderingContext2D): void;
  rotation: number;
  money: number;
  kills: number;
  bulletsLeft: number;
  selectedGunType: WeaponType;
  inventory: InventoryItemMessage[];
  applyFromGameState(changeset: PlayerMessage): void;
}

export interface IPlayerFactory {
  new (world: IWorld, point: IPoint, rotation: number, id: string): IPlayer;
  createFromSessionPlayer(world: IWorld, player: SessionPlayer): IPlayer;
}
