import * as config from "../config";

export class ImageManager {
  private static instance: ImageManager;
  private images: Map<string, HTMLImageElement>;
  private loadingPromises: Map<string, Promise<void>>;
  private inventoryItemTextures: Partial<
    Record<config.InventoryItemID, HTMLImageElement>
  > = {};
  private playerTextures: Record<config.WeaponType, HTMLImageElement | null> = {
    blaster: null,
    shotgun: null,
    railgun: null,
    rocket_launcher: null,
  };

  private constructor() {
    this.images = new Map();
    this.loadingPromises = new Map();
  }

  static getInstance(): ImageManager {
    if (!ImageManager.instance) {
      ImageManager.instance = new ImageManager();
    }
    return ImageManager.instance;
  }

  async loadImage(imagePath: string): Promise<HTMLImageElement> {
    if (this.images.has(imagePath)) {
      return this.images.get(imagePath)!;
    }

    if (this.loadingPromises.has(imagePath)) {
      await this.loadingPromises.get(imagePath);
      return this.images.get(imagePath)!;
    }

    const loadingPromise = new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.src = imagePath;
      img.onload = () => {
        this.images.set(imagePath, img);
        resolve();
      };
      img.onerror = (err) => {
        reject(err);
      };
    });

    this.loadingPromises.set(imagePath, loadingPromise);
    await loadingPromise;
    this.loadingPromises.delete(imagePath);
    return this.images.get(imagePath)!;
  }

  getImage(imagePath: string): HTMLImageElement | undefined {
    return this.images.get(imagePath);
  }

  loadPlayerTextures() {
    Object.entries(config.PLAYER_TEXTURE_BY_WEAPON_TYPE).forEach(
      ([weaponType, texturePath]) => {
        this.loadImage(texturePath).then((img) => {
          this.playerTextures[weaponType as config.WeaponType] = img;
        });
      }
    );
  }

  getPlayerTexture(type: config.WeaponType): HTMLImageElement | null {
    return this.playerTextures[type] || null;
  }

  loadInventoryTextures() {
    Object.entries(config.INVENTORY_ITEM_TEXTURES).forEach(
      ([key, texturePath]) => {
        this.loadImage(texturePath).then((img) => {
          this.inventoryItemTextures[Number(key) as config.InventoryItemID] =
            img;
        });
      }
    );
  }

  getInventoryTexture(type: config.InventoryItemID): HTMLImageElement | null {
    return this.inventoryItemTextures[type] || null;
  }
}
