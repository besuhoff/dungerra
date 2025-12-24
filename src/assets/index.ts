import floorTexture from "./floor.png";
import wallTexture from "./wall.jpg";
import playerTexture from "./player.png";
import playerShotgunTexture from "./player-shotgun.png";
import playerRailgunTexture from "./player-railgun.png";
import playerRocketLauncherTexture from "./player-rocket-launcher.png";
import enemyTexture from "./enemy.png";
import bloodTexture from "./blood-stain.png";
import aidKitTexture from "./aid-kit.png";
import gogglesTexture from "./goggles.png";
import heartTexture from "./heart.png";
import shopTexturne from "./shop.png";
import inventoryTexture from "./inventory.png";
import itemRailgunTexture from "./item-railgun.png";
import itemRocketLauncherTexture from "./item-rocket-launcher.png";
import itemShotgunTexture from "./item-shotgun.png";
import itemBlasterTexture from "./item-blaster.png";
import itemAmmoShotgunTexture from "./item-ammo-shotgun.png";
import itemAmmoRocketLauncherTexture from "./item-ammo-rocket-launcher.png";
import itemAmmoRailgunTexture from "./item-ammo-railgun.png";
import bulletRocketTexture from "./bullet-rocket.png";
import shopLayoutTexture from "./shop-layout.png";

import explosionAnimation from "./explosion-animation.png";

import bulletSound from "./blaster.ogg";
import torchSound from "./torch.ogg";
import gameOverSound from "./game-over.ogg";
import playerHurtSound from "./player-grunt.ogg";
import playerDeadSound from "./player-dead.ogg";
import enemyHurtSound from "./enemy-grunt.ogg";
import playerBulletRechargeSound from "./weapon-reload.ogg";
import bonusPickupSound from "./bonus.ogg";
import spawnSound from "./spawn.ogg";
import rocketLauncherSound from "./rocket-launcher.ogg";
import rocketBlastSound from "./rocket-blast.ogg";
import railgunSound from "./railgun.ogg";
import shotgunSound from "./shotgun.ogg";
import enterShopSound from "./enter-shop.ogg";
import moneySpentSound from "./money-spent.ogg";
import mistakeSound from "./mistake.ogg";

export const Assets = {
  floorTexture,
  wallTexture,
  playerTexture,
  playerShotgunTexture,
  playerRailgunTexture,
  playerRocketLauncherTexture,
  enemyTexture,
  bloodTexture,
  aidKitTexture,
  gogglesTexture,
  heartTexture,
  shopTexturne,
  inventoryTexture,
  itemRailgunTexture,
  itemRocketLauncherTexture,
  itemShotgunTexture,
  itemBlasterTexture,
  itemAmmoShotgunTexture,
  itemAmmoRocketLauncherTexture,
  itemAmmoRailgunTexture,
  bulletRocketTexture,
  shopLayoutTexture,

  explosionAnimation: {
    image: explosionAnimation,
    frameCount: 17,
    duration: 800,
  },

  bulletSound,
  torchSound,
  gameOverSound,
  playerHurtSound,
  playerDeadSound,
  enemyHurtSound,
  playerBulletRechargeSound,
  bonusPickupSound,
  spawnSound,
  rocketLauncherSound,
  rocketBlastSound,
  railgunSound,
  shotgunSound,
  enterShopSound,
  moneySpentSound,
  mistakeSound,
};
