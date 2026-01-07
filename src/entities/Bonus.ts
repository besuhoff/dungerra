import { IBonus } from "../types/screen-objects/IBonus";
import { BonusType } from "../types/screen-objects/IBonus";
import { IWorld } from "../types/IWorld";
import { ScreenObject } from "./ScreenObject";
import * as config from "../config";
import { Bonus as BonusMessage } from "../types/socketEvents";
import { Point2D } from "../utils/geometry/Point2D";
import { ImageManager } from "../utils/ImageManager";

export class Bonus extends ScreenObject implements IBonus {
  private _type: BonusType;
  private _belongsToPlayer: boolean = false;
  private image: HTMLImageElement | null = null;

  get type(): BonusType {
    return this._type;
  }

  get belongsToPlayer(): boolean {
    return this._belongsToPlayer;
  }

  constructor(
    private world: IWorld,
    data: BonusMessage
  ) {
    // Load appropriate texture
    let texturePath: string = "";
    let size: number = 0;

    if (data.type === "aid_kit") {
      texturePath = config.TEXTURES.AID_KIT;
      size = config.AID_KIT_SIZE;
    } else if (data.type === "goggles") {
      texturePath = config.TEXTURES.GOGGLES;
      size = config.GOGGLES_SIZE;
    } else if (data.type === "chest") {
      texturePath = config.TEXTURES.CHEST;
      size = config.CHEST_SIZE;
    }

    const point = new Point2D(data.position!.x, data.position!.y);

    super(point, size, size, data.id);

    this._type = data.type as BonusType;
    this._belongsToPlayer = data.droppedBy === world.player?.id;

    const imageManager = ImageManager.getInstance();
    imageManager.loadImage(texturePath).then((img) => {
      this.image = img;
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.image || !this.world.player || this.world.gameOver) {
      return;
    }

    const player = this.world.player;
    const distance = this.getPosition().distanceTo(player.getPosition());
    let shouldDraw =
      (distance <= this.world.torchRadius + this.width ||
        player.hasNightVision()) &&
      !this.world.gameOver;

    for (const otherPlayer of this.world.otherPlayers) {
      if (otherPlayer.hasNightVision()) {
        continue;
      }

      const distToOther = this.getPosition().distanceTo(
        otherPlayer.getPosition()
      );
      if (distToOther <= this.world.torchRadius + this.width) {
        shouldDraw = true;
        break;
      }
    }

    if (!shouldDraw) {
      return;
    }

    const screenPoint = this.world.worldToScreenCoordinates(this.getPosition());

    ctx.save();
    ctx.translate(screenPoint.x, screenPoint.y);
    ctx.drawImage(
      this.image,
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height
    );
    ctx.restore();
  }
}
