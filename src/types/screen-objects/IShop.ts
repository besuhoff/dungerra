import { IDrawable } from "./IDrawable";
import { IScreenObject } from "./IScreenObject";
import { Shop as ShopMessage } from "../../types/socketEvents";
import { IWorld } from "../IWorld";

export interface IShop extends IScreenObject, IDrawable {
  handlePlayerEnter(): void;
  handlePlayerExit(): void;
  hasPlayer(): boolean;
  drawUI(uiCtx: CanvasRenderingContext2D): void;
  openModal(): void;
  closeModal(): void;
  isModalOpen: boolean;
  inventory: ShopMessage["inventory"];
  applyFromGameState(shopData: ShopMessage): void;
}

export interface IShopFactory {
  new (world: IWorld, shopData: ShopMessage): IShop;
}
