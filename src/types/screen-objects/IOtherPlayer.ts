import { IPoint } from "../geometry/IPoint";
import { IWorld } from "../IWorld";
import { IDrawable } from "./IDrawable";
import { IScreenObject } from "./IScreenObject";
import { IUpdatable } from "./IUpdatable";
import { IVisor } from "./IVisor";
import { Player as PlayerMessage, PlayerUpdate } from "../socketEvents";

export interface IOtherPlayer
  extends IScreenObject,
    IDrawable,
    IUpdatable,
    IVisor {
  moveTo(point: IPoint): void;
  rotate(angle: number): void;
  drawUI(ctx: CanvasRenderingContext2D): void;
  isAlive(): boolean;
  rotation: number;
  get name(): string;
  applyFromGameStateDelta(changeset: PlayerUpdate): void;
}

export interface IOtherPlayerFactory {
  new (world: IWorld, playerData: PlayerMessage): IOtherPlayer;
}
