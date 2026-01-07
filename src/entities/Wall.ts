import { ScreenObject } from "./ScreenObject";
import * as config from "../config";
import { IWall } from "../types/screen-objects/IWall";
import { IPoint } from "../types/geometry/IPoint";
import { IWorld } from "../types/IWorld";
import { ImageManager } from "../utils/ImageManager";

export class Wall extends ScreenObject implements IWall {
  private image: HTMLImageElement | null = null;

  constructor(
    private world: IWorld,
    point: IPoint,
    width: number,
    height: number,
    private _orientation: "vertical" | "horizontal",
    id?: string
  ) {
    super(point, width, height, id);
    const imageManager = ImageManager.getInstance();
    imageManager.loadImage(config.TEXTURES.WALL).then((img) => {
      this.image = img;
    });
  }

  get orientation(): "vertical" | "horizontal" {
    return this._orientation;
  }

  draw(ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D): void {
    if (!this.image) {
      return;
    }

    const screenLeftTop = this.world.worldToScreenCoordinates(
      this.getLeftTopCorner()
    );

    uiCtx.save();
    uiCtx.translate(screenLeftTop.x, screenLeftTop.y);
    ctx.save();
    ctx.translate(screenLeftTop.x, screenLeftTop.y);

    let [width, height] = [this._width, this._height];

    if (this._orientation === "vertical") {
      [width, height] = [this._height, this._width];
    }

    // Draw wall sprite with correct orientation
    if (this._orientation === "vertical") {
      ctx.rotate(Math.PI / 2);
      ctx.translate(0, -this.width);
      uiCtx.rotate(Math.PI / 2);
      uiCtx.translate(0, -this.width);
    }

    ctx.drawImage(this.image, 0, 0, width, height);

    if (this.world.debug) {
      uiCtx.strokeStyle = "red";
      uiCtx.strokeRect(0, 0, width, height);
      uiCtx.fillStyle = "white";
      uiCtx.font = `12px ${config.FONT_NAME}`;
      uiCtx.fillText(`#${this.id} ${this.getPosition()}`, 2, 12);
      uiCtx.fillText(`Width: ${this.width}, Height: ${this.height}`, 2, 24);
    }

    ctx.restore();
    uiCtx.restore();

    if (this.world.debug) {
      const screenPoint = this.world.worldToScreenCoordinates(
        this.getPosition()
      );

      // Draw initial point
      uiCtx.fillStyle = "magenta";
      uiCtx.beginPath();
      uiCtx.arc(screenPoint.x, screenPoint.y, 2, 0, Math.PI * 2);
      uiCtx.fill();
    }
  }

  getCollisionRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } {
    const { x: left, y: top } = this.getLeftTopCorner();
    return {
      left,
      top,
      width: this._width,
      height: this.height,
    };
  }

  getLeftTopCorner(): IPoint {
    let correction_w = 0;
    let correction_h = 0;
    if (this.orientation == "vertical") {
      correction_w = this._width / 2;
    } else {
      correction_h = this.height / 2;
    }

    return this.getPosition().movedBy(-correction_w, -correction_h);
  }
}
