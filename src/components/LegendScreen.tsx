import React from "react";
import { Link } from "react-router-dom";

// Import all legend assets
import wallImage from "../assets/wall.jpg";
import playerImage from "../assets/player.png";
import enemyImage from "../assets/enemy.png";
import enemyLieutenantImage from "../assets/enemy-lieutenant.png";
import towerTurretImage from "../assets/tower-turret.png";
import aidKitImage from "../assets/aid-kit.png";
import gogglesImage from "../assets/goggles.png";
import chestImage from "../assets/chest.png";
import inventoryImage from "../assets/inventory.png";
import itemBlasterImage from "../assets/item-blaster.png";
import itemShotgunImage from "../assets/item-shotgun.png";
import itemAmmoShotgunImage from "../assets/item-ammo-shotgun.png";
import shopImage from "../assets/shop.png";
import shopExampleImage from "../assets/shop-example.png";
import playerRailgunImage from "../assets/player-railgun.png";

export const LegendScreen: React.FC = () => {
  return (
    <div id="legendScreen" className="screen">
      <img className="logo" src="favicon.png" alt="" width="100" />
      <h1>Legend of Dungerra</h1>

      <div className="text" id="legend">
        <p>
          You can't remember your name, or how you got here, but you know you
          must survive. There are dangers lurking in every shadow of this
          freezing wasteland. There are others like you, lost and fighting for
          their lives. Stay alert and trust no one.
        </p>

        <p className="center">
          <img
            src={wallImage}
            width="300"
            style={{ maxWidth: "100%", height: "auto" }}
            alt="Wall"
          />
        </p>

        <p>
          This is you, the lone survivor. Use arrow keys or A W S D to move.
        </p>
        <p className="light">
          <img
            src={playerImage}
            style={{ transform: "rotate(-25deg)" }}
            alt="Player"
          />
        </p>

        <p>
          You are equipped with basic blaster to start your journey. Use
          spacebar to shoot.
        </p>
        <div className="bullets bullets1">
          <div className="bullet bullet-player"></div>
          <div className="bullet bullet-player"></div>
        </div>

        <p>You will meet the enemies to oppose you.</p>
        <div className="bullets bullets2">
          <div className="bullet"></div>
          <div className="bullet bullet-lt"></div>
          <div className="bullet bullet-lt"></div>
          <div className="bullet bullet-lt"></div>
          <div className="bullet bullet-rocket"></div>
        </div>
        <p>
          <img
            src={enemyImage}
            style={{ transform: "rotate(180deg)" }}
            alt="Enemy"
          />{" "}
          <img
            src={enemyLieutenantImage}
            style={{ transform: "rotate(150deg)" }}
            alt="Lieutenant"
          />
          <span className="tower">
            <img
              src={towerTurretImage}
              style={{ transform: "rotate(169deg)" }}
              alt="Tower"
            />
          </span>
        </p>

        <p>
          Eliminate them to earn rewards and improve your skills. There's a
          slight chance they might drop rare items.
        </p>

        <p>
          <img src={aidKitImage} alt="Aid Kit" />{" "}
          <img src={gogglesImage} alt="Goggles" />{" "}
          <img src={chestImage} alt="Chest" />
        </p>

        <p>
          Your <strong>inventory</strong> contains the items you have collected
          on your journey. Press ~ or E to toggle the inventory panel. Press
          1..8 to use items. Yellow border indicates current weapon.
        </p>
        <p className="inventory">
          <img src={inventoryImage} alt="Inventory" />{" "}
          <img src={aidKitImage} alt="Aid Kit" />{" "}
          <img src={gogglesImage} alt="Goggles" />{" "}
          <img src={itemBlasterImage} alt="Blaster" />{" "}
          <img src={itemShotgunImage} alt="Shotgun" />{" "}
          <img src={itemAmmoShotgunImage} alt="Shotgun Ammo" /> <span>x7</span>{" "}
          <span>x10</span>
        </p>

        <p>
          Your health is shown by the set of hearts. Keep an eye on it!
          <br />
          ❤️ ❤️ ❤️ ❤️ ❤️ ❤️
        </p>

        <p>
          The world is endlessly spreading under your feet. Each new chunk of it
          has an oasis of peace and comfort &ndash; a rifle store. Exchange your
          hard-earned rewards for better gear and supplies to aid your survival.
        </p>

        <div style={{ marginBottom: "1em" }}>
          <figure>
            <img src={shopImage} alt="Shop" />
            <figcaption>Rifle Store</figcaption>
          </figure>
        </div>

        <p>Once you're around, press Enter to visit the shop.</p>

        <p className="shop">
          <img
            src={shopExampleImage}
            width="400"
            style={{ display: "block", maxWidth: "100%" }}
            alt="Shop Example"
          />
        </p>

        <p className="shop-description">
          Press keys 1..9 and 0 to buy items from the shop.{" "}
          <span className="yellow">Yellow</span> rows are items available for
          purchase. <span className="red">Red</span> rows indicate items you
          cannot afford. <span className="green">Green</span> ones are the
          weapons you already have, so you can't buy them again.
        </p>

        <p>
          Once you die, you lose all your items and respawn in a random shop.
          The green arrow will guide you to the part of your lost inventory, but
          you must hurry before someone else finds it.{" "}
          <span className="arrow"></span>{" "}
          <img
            src={chestImage}
            style={{ transform: "translate(40px, 10px)" }}
            alt="Chest"
          />
        </p>

        <div className="other-player">
          When there are others stomping around, be cautious and stay alert. You
          will see the yellow arrow indicating their presence.{" "}
          <span className="arrow arrow-yellow"></span>{" "}
          <figure>
            <img
              src={playerRailgunImage}
              style={{ transform: "rotate(90deg)" }}
              alt="Player with railgun"
            />
            <figcaption>railgun.sniper</figcaption>
          </figure>
        </div>

        <p>Good luck...</p>

        <div style={{ marginTop: "2rem" }}>
          <Link
            to="/sessions"
            style={{ color: "#fff", textDecoration: "underline" }}
          >
            Back to Sessions
          </Link>
        </div>
      </div>
    </div>
  );
};
