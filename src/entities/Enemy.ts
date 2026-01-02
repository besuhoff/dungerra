import { ScreenObject } from "./ScreenObject";
import * as config from "../config";
import { IEnemy } from "../types/screen-objects/IEnemy";
import { IWall } from "../types/screen-objects/IWall";
import { IPoint } from "../types/geometry/IPoint";
import { IWorld } from "../types/IWorld";
import { loadImage } from "../utils/loadImage";
import { Point2D } from "../utils/geometry/Point2D";
import { AudioManager } from "../utils/AudioManager";
import { Enemy as EnemyMessage, EnemyUpdate } from "../types/socketEvents";

export class Enemy extends ScreenObject implements IEnemy {
  private _enemyTowerBg: HTMLImageElement | null = null;
  private _image: HTMLImageElement | null = null;
  private deadImage: HTMLImageElement | null = null;
  private dead: boolean = false;
  private _lives = config.ENEMY_LIVES;
  private _rotation: number = 0;
  private _type: config.EnemyType;

  get lives(): number {
    return this._lives;
  }

  get wall(): IWall | undefined {
    return this._wall;
  }

  constructor(
    private world: IWorld,
    enemyData: EnemyMessage,
    private _wall?: IWall | undefined
  ) {
    const size = config.ENEMY_SIZE_BY_TYPE[enemyData.type as config.EnemyType];

    const position = enemyData.position ?? { x: 0, y: 0 };

    super(new Point2D(position.x, position.y), size, size, enemyData.id);
    this._rotation = enemyData.rotation;
    this._lives = enemyData.lives;
    this.dead = !enemyData.isAlive;
    this._type = enemyData.type as config.EnemyType;

    // Load enemy sprite
    loadImage(config.ENEMY_TEXTURE_BY_TYPE[this._type]).then((img) => {
      this._image = img;
    });

    loadImage(config.TEXTURES.ENEMY_TOWER_BACK).then((img) => {
      this._enemyTowerBg = img;
    });

    // Load blood texture
    loadImage(config.ENEMY_DEAD_TEXTURE_BY_TYPE[this._type]).then((img) => {
      this.deadImage = img;
    });
  }

  get rotation(): number {
    return this._rotation;
  }

  getGunPoint(): IPoint {
    // Get gun position
    return this.getPosition()
      .movedByPointCoordinates(config.ENEMY_GUN_END_BY_TYPE[this._type])
      .rotateAroundPointCoordinates(this.getPosition(), this.rotation);
  }

  draw(ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D): void {
    if (this.world.gameOver) {
      return;
    }

    const currentPlayer = this.world.player;

    if (!this._image || !currentPlayer) {
      return;
    }

    let shouldDraw = false;
    if (currentPlayer.isAlive() && currentPlayer.hasNightVision()) {
      shouldDraw = true;
    } else {
      const players = [
        currentPlayer,
        ...this.world.otherPlayers.filter(
          (p) => p.isAlive() && !p.hasNightVision()
        ),
      ];
      for (const player of players) {
        const distance = this.getPosition().distanceTo(player.getTorchPoint());
        shouldDraw =
          shouldDraw || distance <= this.world.torchRadius + this.width;
      }
    }
    const screenPoint = this.world.worldToScreenCoordinates(this.getPosition());

    ctx.save();
    ctx.translate(screenPoint.x, screenPoint.y);

    let textureSize = !this.dead
      ? config.ENEMY_TEXTURE_SIZE
      : config.BLOOD_TEXTURE_SIZE;
    let texturePoint = !this.dead
      ? config.ENEMY_SOLDIER_TEXTURE_CENTER.inverted()
      : new Point2D(-textureSize / 2, -textureSize / 2);

    const towerType = config.ENEMY_TYPES.TOWER;

    if (this._type === towerType) {
      textureSize = config.ENEMY_TOWER_TEXTURE_SIZE;
      texturePoint = config.ENEMY_TOWER_TEXTURE_CENTER.inverted();
    }

    if (this.dead && shouldDraw && this.deadImage) {
      ctx.drawImage(
        this.deadImage,
        texturePoint.x,
        texturePoint.y,
        textureSize,
        textureSize
      );
    }

    if (!this.dead && shouldDraw) {
      if (this._type === towerType && this._enemyTowerBg) {
        ctx.drawImage(
          this._enemyTowerBg,
          texturePoint.x,
          texturePoint.y,
          textureSize,
          textureSize
        );
      }

      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.drawImage(
        this._image,
        texturePoint.x,
        texturePoint.y,
        textureSize,
        textureSize
      );

      // Draw lives bar
      ctx.rotate((-this.rotation * Math.PI) / 180);
      const barWidth = this.width;
      const barHeight = 5;
      const livesRatio = this._lives / config.ENEMY_LIVES_BY_TYPE[this._type];

      ctx.fillStyle = "red";
      ctx.fillRect(
        -barWidth / 2,
        this.height / 2 + barHeight + 6,
        barWidth,
        barHeight
      );

      ctx.fillStyle = "lime";
      ctx.fillRect(
        -barWidth / 2,
        this.height / 2 + barHeight + 6,
        barWidth * livesRatio,
        barHeight
      );
    }

    ctx.restore();

    if (this.world.debug) {
      uiCtx.save();
      uiCtx.translate(screenPoint.x, screenPoint.y);
      // Draw debug information
      uiCtx.strokeStyle = "#00ff00";
      uiCtx.strokeRect(
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );

      if (!this.dead) {
        // Draw gun end point
        uiCtx.rotate((this.rotation * Math.PI) / 180);

        uiCtx.fillStyle = "magenta";
        const gunPoint = config.ENEMY_GUN_END_BY_TYPE[this._type];
        uiCtx.beginPath();
        uiCtx.arc(gunPoint.x, gunPoint.y, 2, 0, Math.PI * 2);
        uiCtx.fill();

        uiCtx.rotate((-this.rotation * Math.PI) / 180);
      }

      if (this._wall) {
        uiCtx.fillStyle = "white";
        uiCtx.font = `12px ${config.FONT_NAME}`;
        uiCtx.textAlign = "left";
        uiCtx.fillText(`Wall #${this._wall.id}`, -20, 24);
        uiCtx.fillText(`Position: ${this.getPosition()}`, -20, 36);
      }

      uiCtx.restore();
    }
  }

  isAlive(): boolean {
    return !this.dead;
  }

  isInvulnerable(): boolean {
    return false;
  }

  applyFromGameStateDelta(enemyDelta: EnemyUpdate): void {
    if (enemyDelta.position) {
      this._point.setTo(enemyDelta.position.x, enemyDelta.position.y);
      this._rotation = enemyDelta.position.rotation;
    }

    if (enemyDelta.lives) {
      if (enemyDelta.lives.lives < this._lives) {
        const distance = this.getPosition().distanceTo(
          this.world.player!.getPosition()
        );
        const maxDistance = this.world.torchRadius * 2;
        const volume = distance >= maxDistance ? 0 : 1 - distance / maxDistance;

        const audioManager = AudioManager.getInstance();
        const sound =
          this._type === config.ENEMY_TYPES.TOWER
            ? enemyDelta.lives.isAlive
              ? config.SOUNDS.TOWER_HIT
              : config.SOUNDS.TOWER_CRASH
            : config.SOUNDS.ENEMY_HURT;
        audioManager.playSound(sound, { volume });
      }

      this._lives = enemyDelta.lives.lives;
      this.dead = !enemyDelta.lives.isAlive;
    }
  }
}
