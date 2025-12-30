import { WeaponType, InventoryItemID } from "../../config";
import { IPoint } from "../geometry/IPoint";
import { IWorld } from "../IWorld";
import {
  InventoryItem as InventoryItemMessage,
  Player as PlayerMessage,
  PlayerUpdate,
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
  score: number;
  kills: number;
  bulletsLeft: number;
  selectedGunType: WeaponType;
  inventory: InventoryItemMessage[];
  hasInventoryItem(itemType: InventoryItemID): boolean;
  toggleInventory(): void;
  applyFromGameStateDelta(changeset: PlayerUpdate): void;
}

export interface IPlayerFactory {
  new (world: IWorld, point: IPoint, rotation: number, id: string): IPlayer;
  fromGameState(world: IWorld, player: PlayerMessage): IPlayer;
}
