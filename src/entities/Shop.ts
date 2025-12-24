import { IWorld } from "../types/IWorld";
import { IShop } from "../types/screen-objects/IShop";
import { loadImage } from "../utils/loadImage";
import { Shop as ShopMessage, ShopItem } from "../types/socketEvents";
import { Point2D } from "../utils/geometry/Point2D";
import { ScreenObject } from "./ScreenObject";
import * as config from "../config";
import { AudioManager } from "../utils/AudioManager";

export class Shop extends ScreenObject implements IShop {
  private _image: HTMLImageElement | null = null;
  private _layoutImage: HTMLImageElement | null = null;
  private _inventory: Record<number, ShopItem> = {};
  private _isEnteredByPlayer: boolean = false;
  private _modalOpen: boolean = false;

  constructor(
    private world: IWorld,
    shopData: ShopMessage
  ) {
    const point = new Point2D(shopData.position!.x, shopData.position!.y);
    super(point, config.SHOP_SIZE, config.SHOP_SIZE, shopData.id);

    this._inventory = shopData.inventory || {};

    // Load player sprite
    loadImage(config.TEXTURES.SHOP).then((img) => {
      this._image = img;
    });

    loadImage(config.TEXTURES.SHOP_LAYOUT).then((img) => {
      this._layoutImage = img;
    });
  }

  handlePlayerEnter(): void {
    if (this._isEnteredByPlayer) {
      return;
    }

    this._isEnteredByPlayer = true;
    AudioManager.getInstance().playSound(config.SOUNDS.ENTER_SHOP);
  }

  handlePlayerExit() {
    this._isEnteredByPlayer = false;
    this._modalOpen = false;
  }

  hasPlayer(): boolean {
    return this._isEnteredByPlayer;
  }

  openModal(): void {
    this._modalOpen = !this._modalOpen;
  }

  closeModal(): void {
    this._modalOpen = false;
  }

  get inventory(): Record<number, ShopItem> {
    return this._inventory;
  }

  get isModalOpen(): boolean {
    return this._modalOpen;
  }

  draw(ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D): void {
    if (!this._image || !this.world.player) {
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
      this._image,
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height
    );
    ctx.restore();

    if (this.world.debug) {
      uiCtx.save();
      uiCtx.translate(screenPoint.x, screenPoint.y);
      uiCtx.strokeStyle = "turquoise";
      uiCtx.strokeRect(
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
      uiCtx.restore();
    }
  }

  drawUI(uiCtx: CanvasRenderingContext2D): void {
    if (!this._isEnteredByPlayer) {
      return;
    }

    if (!this._modalOpen) {
      uiCtx.save();

      // Draw hint to open shop modal on Enter key
      uiCtx.fillStyle = "white";
      uiCtx.textAlign = "center";
      uiCtx.font = `14px ${config.FONT_NAME}`;
      uiCtx.fillText(
        "Press Enter to visit the Shop",
        uiCtx.canvas.width / 2,
        uiCtx.canvas.height - 30
      );
      uiCtx.restore();
    } else {
      // Draw shop modal
      if (!this._layoutImage) {
        return;
      }

      uiCtx.save();
      const modalWidth = this._layoutImage.width;
      const modalHeight = this._layoutImage.height;
      const modalX = (uiCtx.canvas.width - modalWidth) / 2;
      const modalY = (uiCtx.canvas.height - modalHeight) / 2;
      uiCtx.drawImage(
        this._layoutImage,
        modalX,
        modalY,
        modalWidth,
        modalHeight
      );

      // Draw instructions background
      const padding = 5;
      const bgWidth = 320;
      const bgHeight = 48;
      uiCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
      uiCtx.fillRect(
        (uiCtx.canvas.width - bgWidth) / 2 - padding,
        uiCtx.canvas.height - 76 - padding,
        bgWidth + padding * 2,
        bgHeight + padding * 2
      );

      const purchaseKeyCount = Object.values(this._inventory).filter(
        (item) => item.quantity > 0
      ).length;

      const hint =
        purchaseKeyCount > 9
          ? `Press buttons from 1 through 9 and 0 to make a purchase.`
          : purchaseKeyCount === 0
            ? "No items available for purchase."
            : purchaseKeyCount === 1
              ? "Press button 1 to make a purchase."
              : `Press button from 1 through ${purchaseKeyCount} to make a purchase.`;

      // Draw instructions text
      uiCtx.fillStyle = "white";
      uiCtx.textAlign = "center";
      uiCtx.font = `14px ${config.FONT_NAME}`;
      uiCtx.fillText(hint, uiCtx.canvas.width / 2, uiCtx.canvas.height - 60);
      uiCtx.fillText(
        "Press Escape to close the Shop.",
        uiCtx.canvas.width / 2,
        uiCtx.canvas.height - 38
      );

      // Draw inventory items
      const startX = modalX + 148;
      const startY = modalY + 72;
      const itemSpacingY = 53;
      let index = 0;

      uiCtx.fillStyle = "#f7e78cff";
      uiCtx.font = `20px ${config.FONT_NAME}`;

      uiCtx.textAlign = "center";
      // Add text shadow for better visibility
      uiCtx.shadowColor = "black";
      uiCtx.shadowOffsetX = 2;
      uiCtx.shadowOffsetY = 2;
      uiCtx.shadowBlur = 4;

      uiCtx.fillText("Item", startX + 28, startY - 20);
      uiCtx.fillText("Pack Size", startX + 140, startY - 20);
      uiCtx.fillText("Price", startX + 290, startY - 20);
      uiCtx.fillText("Stock", startX + 400, startY - 20);

      uiCtx.restore();

      for (const [type, item] of Object.entries(this._inventory)) {
        if (item.quantity <= 0) {
          continue;
        }

        const itemX = startX;
        const itemY = startY + index * itemSpacingY;

        // Draw item icon
        const icon = this.world.getInventoryTexture(
          Number(type) as config.InventoryItemID
        );
        if (icon) {
          uiCtx.drawImage(
            icon,
            itemX - icon.width / 2 + itemSpacingY / 2,
            itemY - icon.height / 2 + itemSpacingY / 2,
            icon.width,
            icon.height
          );
        }

        uiCtx.save();
        uiCtx.fillStyle = "#f7e78cff";

        const player = this.world.player;
        const itemId = Number(type) as config.InventoryItemID;
        const isWeapon = Object.values(
          config.WEAPON_INVENTORY_ID_BY_WEAPON_TYPE
        ).includes(itemId);

        if (player && player.money < item.price * item.packSize) {
          uiCtx.fillStyle = "#ff4d4dff";
        }

        uiCtx.font = `20px ${config.FONT_NAME}`;

        uiCtx.textAlign = "right";
        // Add text shadow for better visibility
        uiCtx.shadowColor = "black";
        uiCtx.shadowOffsetX = 2;
        uiCtx.shadowOffsetY = 2;
        uiCtx.shadowBlur = 4;

        // Draw pack size
        uiCtx.fillText(
          `${item.packSize}`,
          itemX + 174,
          itemY + itemSpacingY / 2 + 5
        );

        // Draw item price
        uiCtx.fillText(
          `$${item.price * item.packSize}`,
          itemX + 328,
          itemY + itemSpacingY / 2 + 5
        );

        // Draw item stock
        uiCtx.fillText(
          `${item.quantity}`,
          itemX + 418,
          itemY + itemSpacingY / 2 + 5
        );

        // Draw purchase button hint
        uiCtx.fillText(
          `${(index + 1) % 10}`,
          itemX - 10,
          itemY + itemSpacingY / 2 + 5
        );

        uiCtx.restore();

        index++;
      }
    }
  }

  applyFromGameState(shopData: ShopMessage): void {
    this._inventory = shopData.inventory || {};
  }
}
