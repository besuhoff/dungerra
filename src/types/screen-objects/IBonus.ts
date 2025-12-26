import { IWorld } from "../IWorld";
import { IDrawable } from "./IDrawable";
import { IScreenObject } from "./IScreenObject";
import { Bonus as BonusMessage } from "../../types/socketEvents";

export type BonusType = "aid_kit" | "goggles" | "chest";
export interface IBonus extends IScreenObject, IDrawable {
  type: BonusType;
  belongsToPlayer: boolean;
}

export interface IBonusFactory {
  new (world: IWorld, data: BonusMessage): IBonus;
}
