import { Assets } from "./assets";
import { BonusType } from "./types/screen-objects/IBonus";
import { Point2D } from "./utils/geometry/Point2D";

const ASSETS_FOLDER = "assets";

export const LOGIN_BUTTON_TEXTURE = `${ASSETS_FOLDER}/login-button.png`;
export const API_DOMAIN =
  process.env.NODE_ENV === "production"
    ? "https://dungeon-game-go.onrender.com"
    : "http://localhost:8080";
export const API_BASE_URL = `${API_DOMAIN}/api/v1`;

// Display
export const SCREEN_WIDTH = 800;
export const SCREEN_HEIGHT = 600;
export const FONT_NAME = "Texturina";
export const HEADER_FONT_NAME = "Rubik Distressed";

// World settings
export const TORCH_RADIUS = 200;
export const NIGHT_VISION_DETECTION_RADIUS = 100;
export const COLOR_LIGHT = "#ffffffff";
export const COLOR_TRANSPARENT = "#ffffff00";
export const COLOR_DARK = "#000000E6";
export const COLOR_NIGHT_VISION = "#009600a0";
export const COLOR_NIGHT_VISION_FADING = "#006000a0";

// Bullet settings
export const BULLET_DAMAGE = 1;
export const BULLET_SIZE = 8;

// Blood settings
export const BLOOD_TEXTURE_SIZE = 32;

// Player settings
export const PLAYER_SPEED = 300; // Units per second
export const PLAYER_SIZE = 24;
export const PLAYER_TEXTURE_SIZE = 64;
export const PLAYER_TEXTURE_CENTER = new Point2D(
  PLAYER_TEXTURE_SIZE / 2 - 1,
  26
);
export const PLAYER_GUN_END = new Point2D(PLAYER_TEXTURE_SIZE / 2 - 10, 56);
export const PLAYER_TORCH_POINT = new Point2D(PLAYER_TEXTURE_SIZE / 2 + 7, 47);
export const PLAYER_LIVES = 5;
export const PLAYER_INVULNERABILITY_TIME = 1; // Seconds of invulnerability after getting hit
export const PLAYER_ROTATION_SPEED = 180; // Degrees per second
export const PLAYER_SHOOT_DELAY = 0.2; // Seconds between shots
export const PLAYER_BULLET_COLOR = "#00FFFF"; // Cyan bullets for player
export const PLAYER_MAX_BULLETS = 6; // Maximum number of bullets
export const PLAYER_BULLET_RECHARGE_TIME = 1; // Seconds to recharge one bullet
export const PLAYER_BULLET_SPEED = 420; // Units per second
export const PLAYER_REWARD = 100; // Reward for killing an enemy in $

// Enemy settings
export const ENEMY_SPEED = 120; // Units per second
export const ENEMY_SIZE = 24;
export const ENEMY_LIVES = 1;
export const ENEMY_TEXTURE_SIZE = 64;
export const ENEMY_TEXTURE_CENTER = new Point2D(
  PLAYER_TEXTURE_SIZE / 2 - 1,
  26
);
export const ENEMY_GUN_END = new Point2D(ENEMY_TEXTURE_SIZE / 2 - 1, 60);
export const ENEMY_SHOOT_DELAY = 1; // Seconds between shots
export const ENEMY_BULLET_SPEED = 240; // Units per second
export const ENEMY_DEATH_TRACE_TIME = 5; // Seconds the blood stain is visible
export const ENEMY_REWARD = 10; // Reward for killing an enemy in $
export const ENEMY_BULLET_COLOR = "#FF0000"; // Red bullets for enemies
export const ENEMY_DROP_CHANCE = 0.3; // Chance to drop a bonus when enemy dies
export const ENEMY_DROP_TYPE_CHANCES: Partial<Record<BonusType, number>> = {
  aid_kit: 5,
  goggles: 1,
};

// Bonuses settings
export const BONUS_SPAWN_CHANCE = 0.3; // Chance to spawn bonus when enemy dies

export const AID_KIT_SIZE = 32;
export const AID_KIT_HEAL_AMOUNT = 2;

export const GOGGLES_SIZE = 32;
export const GOGGLES_ACTIVE_TIME = 20; // Seconds of night vision mode

// Asset paths
export const TEXTURES = {
  FLOOR: Assets.floorTexture,
  WALL: Assets.wallTexture,
  PLAYER: Assets.playerTexture,
  ENEMY: Assets.enemyTexture,
  BLOOD: Assets.bloodTexture,
  AID_KIT: Assets.aidKitTexture,
  GOGGLES: Assets.gogglesTexture,
  HEART: Assets.heartTexture,
};

export const SOUNDS = {
  BULLET: Assets.bulletSound,
  TORCH: Assets.torchSound,
  GAME_OVER: Assets.gameOverSound,
  PLAYER_HURT: Assets.playerHurtSound,
  PLAYER_DEAD: Assets.playerDeadSound,
  ENEMY_HURT: Assets.enemyHurtSound,
  PLAYER_BULLET_RECHARGE: Assets.playerBulletRechargeSound,
  BONUS_PICKUP: Assets.bonusPickupSound,
  SPAWN: Assets.spawnSound,
};

export const WEBSOCKET_ACTIONS = {
  BULLET_CREATED: "bullet:created",
  BULLET_REMOVED: "bullet:destroyed",
  ENEMY_DESTROYED: "enemy:destroyed",
  PLAYER_RESPAWNED: "player:respawned",
  BONUS_CREATED: "bonus:created",
  BONUS_DESTROYED: "bonus:destroyed",
};
