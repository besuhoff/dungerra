import { IBonus } from "../types/screen-objects/IBonus";
import { BonusType } from "../types/screen-objects/IBonus";
import { IPoint } from "../types/geometry/IPoint";
import { IWorld } from "../types/IWorld";
import { ScreenObject } from "./ScreenObject";
import { loadImage } from "../utils/loadImage";
import * as config from "../config";
import { AudioManager } from "../utils/AudioManager";

export class Bonus extends ScreenObject implements IBonus {
  public type: BonusType;
  private image: HTMLImageElement | null = null;

  constructor(
    private world: IWorld,
    point: IPoint,
    type: BonusType,
    id?: string
  ) {
    // Load appropriate texture
    let texturePath: string = "";
    let size: number = 0;

    if (type === "aid_kit") {
      texturePath = config.TEXTURES.AID_KIT;
      size = config.AID_KIT_SIZE;
    } else if (type === "goggles") {
      texturePath = config.TEXTURES.GOGGLES;
      size = config.GOGGLES_SIZE;
    }

    super(point, size, size, id);

    this.type = type;

    loadImage(texturePath).then((img) => {
      this.image = img;
    });

    AudioManager.getInstance().loadSound(config.SOUNDS.BONUS_PICKUP);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.image || !this.world.player) {
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
