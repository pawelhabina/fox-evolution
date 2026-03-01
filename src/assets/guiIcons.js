import chestT1 from '../../assets/icons/gui/icon-chest-t1.gif';
import chestT2 from '../../assets/icons/gui/icon-chest-t2.gif';
import chestT3 from '../../assets/icons/gui/icon-chest-t3.gif';
import clock1 from '../../assets/icons/gui/icon-clock-1.gif';
import clock2 from '../../assets/icons/gui/icon-clock-2.gif';
import coin from '../../assets/icons/gui/icon-coin.png';
import diamondUpgrade from '../../assets/icons/gui/icon-diamond-upgrade.gif';
import diamond from '../../assets/icons/gui/icon-diamond.gif';
import energy from '../../assets/icons/gui/icon-energy.gif';
import foxSell from '../../assets/icons/gui/icon-fox-sell.gif';
import foxUpgrade from '../../assets/icons/gui/icon-fox-upgrade.gif';
import merge from '../../assets/icons/gui/icon-merge.gif';
import pet from '../../assets/icons/gui/icon-pet.gif';
import priceDown1 from '../../assets/icons/gui/icon-price-down-1.gif';
import priceDown2 from '../../assets/icons/gui/icon-price-down-2.gif';
import quest from '../../assets/icons/gui/icon-quest.gif';
import random from '../../assets/icons/gui/icon-random.gif';
import rebirth from '../../assets/icons/gui/icon-rebirth.gif';
import settings from '../../assets/icons/gui/icon-settings.gif';
import tarcza from '../../assets/icons/gui/icon-tarcza.gif';
import time from '../../assets/icons/gui/icon-time.gif';
import upgrade from '../../assets/icons/gui/icon-upgrade.gif';

export const GUI_ICONS = {
  chestT1,
  chestT2,
  chestT3,
  clock1,
  clock2,
  coin,
  diamondUpgrade,
  diamond,
  energy,
  foxSell,
  foxUpgrade,
  merge,
  pet,
  priceDown1,
  priceDown2,
  quest,
  random,
  rebirth,
  settings,
  tarcza,
  time,
  upgrade
};

export function getGuiIcon(name) {
  return GUI_ICONS[name] || null;
}
