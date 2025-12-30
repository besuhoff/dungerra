import { IEnemy } from "./screen-objects/IEnemy";
import { IPlayer } from "./screen-objects/IPlayer";
import { IBonus } from "./screen-objects/IBonus";
import { IWall } from "./screen-objects/IWall";
import { IPoint } from "./geometry/IPoint";
import { IOtherPlayer } from "./screen-objects/IOtherPlayer";
import { GameStateDeltaMessage, Player as PlayerMessage } from "./socketEvents";
import { IShop } from "./screen-objects/IShop";
import { InventoryItemID } from "../config";

export interface IWorld {
  player: IPlayer | null;
  otherPlayers: IOtherPlayer[];
  walls: IWall[];
  shops: IShop[];
  enemies: IEnemy[];
  bonuses: IBonus[];
  gameOver: boolean;
  cameraPoint: IPoint;
  torchRadius: number;
  debug: boolean;
  multiplayerMode: "host" | "guest";
  toggleDebug(): void;
  toggleInventory(): void;
  openShopModal(): void;
  closeShopModal(): void;
  isPlayerInShop(): boolean;
  restart(): void;
  endGame(): void;
  update(dt: number): void;
  draw(
    ctx: CanvasRenderingContext2D,
    lightCtx: CanvasRenderingContext2D,
    uiCtx: CanvasRenderingContext2D
  ): void;
  worldToScreenCoordinates(point: IPoint): IPoint;
  addOtherPlayer(player: PlayerMessage): void;
  removeOtherPlayer(playerId: string): void;
  applyGameStateDelta(
    changeset: GameStateDeltaMessage,
    currentPlayerId: string
  ): void;
  getInventoryTexture(type: InventoryItemID): HTMLImageElement | null;
}
