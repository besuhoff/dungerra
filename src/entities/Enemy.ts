import { ScreenObject } from "./ScreenObject";
import * as config from "../config";
import { IEnemy } from "../types/screen-objects/IEnemy";
import { IBullet } from "../types/screen-objects/IBullet";
import { IWall } from "../types/screen-objects/IWall";
import { IPoint } from "../types/geometry/IPoint";
import { IWorld } from "../types/IWorld";
import { loadImage } from "../utils/loadImage";
import { Point2D } from "../utils/geometry/Point2D";
import { lineIntersectsRect } from "../utils/lineIntersectsRect";
import { AudioManager } from "../utils/AudioManager";
import { Bullet } from "./Bullet";
import { Enemy as EnemyMessage } from "../types/socketEvents";

export class Enemy extends ScreenObject implements IEnemy {
  private image: HTMLImageElement | null = null;
  private bloodImage: HTMLImageElement | null = null;
  private dead: boolean = false;
  private _lives = config.ENEMY_LIVES;
  private _bullets: IBullet[] = [];
  private _rotation: number = 0;

  get lives(): number {
    return this._lives;
  }

  get wall(): IWall {
    return this._wall;
  }

  constructor(
    private world: IWorld,
    private _wall: IWall,
    enemyData: EnemyMessage
  ) {
    const size = config.ENEMY_SIZE;
    const wallSide = Math.random() < 0.5 ? 1 : -1;

    const position = enemyData.position ?? { x: 0, y: 0 };

    super(new Point2D(position.x, position.y), size, size, enemyData.id);
    this._rotation = enemyData.rotation;
    this._lives = enemyData.lives;
    this.dead = enemyData.isDead;

    // Load enemy sprite
    loadImage(config.TEXTURES.ENEMY).then((img) => {
      this.image = img;
    });

    // Load blood texture
    loadImage(config.TEXTURES.BLOOD).then((img) => {
      this.bloodImage = img;
    });
  }

  get rotation(): number {
    return this._rotation;
  }

  getGunPoint(): IPoint {
    // Get gun position
    return this.getPosition()
      .movedByPointCoordinates(config.ENEMY_TEXTURE_CENTER.inverted())
      .moveByPointCoordinates(config.ENEMY_GUN_END)
      .rotateAroundPointCoordinates(this.getPosition(), this.rotation);
  }

  draw(ctx: CanvasRenderingContext2D, uiCtx: CanvasRenderingContext2D): void {
    this._bullets.forEach((bullet) => {
      bullet.draw(ctx, uiCtx);
    });

    const currentPlayer = this.world.player;

    if (!this.image || !currentPlayer) {
      return;
    }

    let shouldDraw = false;
    if (this.world.gameOver) {
      shouldDraw = false;
    } else if (currentPlayer.isAlive() && currentPlayer.hasNightVision()) {
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

    const textureSize = !this.dead
      ? config.ENEMY_TEXTURE_SIZE
      : config.BLOOD_TEXTURE_SIZE;
    const texturePoint = !this.dead
      ? config.ENEMY_TEXTURE_CENTER.inverted()
      : new Point2D(-textureSize / 2, -textureSize / 2);

    ctx.rotate((this.rotation * Math.PI) / 180);

    if (this.dead && shouldDraw && this.bloodImage) {
      ctx.drawImage(
        this.bloodImage,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    }

    if (!this.dead && shouldDraw && this.image) {
      ctx.drawImage(
        this.image,
        texturePoint.x,
        texturePoint.y,
        textureSize,
        textureSize
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
        const gunPoint = texturePoint.movedByPointCoordinates(
          config.ENEMY_GUN_END
        );
        uiCtx.beginPath();
        uiCtx.arc(gunPoint.x, gunPoint.y, 2, 0, Math.PI * 2);
        uiCtx.fill();

        uiCtx.rotate((-this.rotation * Math.PI) / 180);
      }

      uiCtx.fillStyle = "white";
      uiCtx.font = `12px ${config.FONT_NAME}`;
      uiCtx.textAlign = "left";
      uiCtx.fillText(`Wall #${this._wall.id}`, -20, 24);
      uiCtx.fillText(`Position: ${this.getPosition()}`, -20, 36);
      uiCtx.restore();
    }
  }

  isAlive(): boolean {
    return !this.dead;
  }

  isInvulnerable(): boolean {
    return false;
  }

  applyFromGameState(enemy: EnemyMessage): void {
    this._point.setTo(enemy.position!.x, enemy.position!.y);
    this._rotation = enemy.rotation;

    if (enemy.lives < this._lives) {
      const distance = this.getPosition().distanceTo(
        this.world.player!.getPosition()
      );
      const maxDistance = this.world.torchRadius * 2;
      const volume = distance >= maxDistance ? 0 : 1 - distance / maxDistance;

      const audioManager = AudioManager.getInstance();
      audioManager.playSound(config.SOUNDS.ENEMY_HURT, { volume });
    }

    this._lives = enemy.lives;
    this.dead = enemy.isDead;
  }
}
