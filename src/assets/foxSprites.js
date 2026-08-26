import tier01 from '../../assets/sprites/foxes/fox-tier-01.png';
import tier02 from '../../assets/sprites/foxes/fox-tier-02.png';
import tier03 from '../../assets/sprites/foxes/fox-tier-03.png';
import tier04 from '../../assets/sprites/foxes/fox-tier-04.png';
import tier05 from '../../assets/sprites/foxes/fox-tier-05.png';
import tier06 from '../../assets/sprites/foxes/fox-tier-06.png';
import tier07 from '../../assets/sprites/foxes/fox-tier-07.png';
import tier08 from '../../assets/sprites/foxes/fox-tier-08.png';
import tier09 from '../../assets/sprites/foxes/fox-tier-09.png';
import tier10 from '../../assets/sprites/foxes/fox-tier-10.png';
import tier11 from '../../assets/sprites/foxes/fox-tier-11.png';
import tier12 from '../../assets/sprites/foxes/fox-tier-12.png';
import tier13 from '../../assets/sprites/foxes/fox-tier-13.png';
import tier14 from '../../assets/sprites/foxes/fox-tier-14.png';
import tier15 from '../../assets/sprites/foxes/fox-tier-15.png';
import fire from '../../assets/sprites/foxes/fox-element-fire.png';
import electric from '../../assets/sprites/foxes/fox-element-electric.png';
import water from '../../assets/sprites/foxes/fox-element-water.png';
import elementalProgressionAtlas from '../../assets/sprites/foxes/fox-element-progression-atlas-v2.png';

const TIER_SPRITES = [
  tier01,
  tier02,
  tier03,
  tier04,
  tier05,
  tier06,
  tier07,
  tier08,
  tier09,
  tier10,
  tier11,
  tier12,
  tier13,
  tier14,
  tier15
];

const ELEMENT_SPRITES = {
  fire,
  electric,
  water
};

export function getFoxSprite(tier, evolution) {
  if (evolution && ELEMENT_SPRITES[evolution]) {
    return ELEMENT_SPRITES[evolution];
  }

  const safeTier = Math.max(1, Math.min(TIER_SPRITES.length, Math.floor(Number(tier) || 1)));
  return TIER_SPRITES[safeTier - 1];
}

const ELEMENT_ATLAS_ROWS = {
  fire: 0,
  electric: 1,
  water: 2
};

function getElementStage(tier) {
  const safeTier = Math.max(15, Math.min(30, Math.floor(Number(tier) || 15)));
  return Math.min(5, safeTier - 15);
}

export function getFoxSpritePresentation(tier, evolution) {
  const row = ELEMENT_ATLAS_ROWS[evolution];
  if (row === undefined) {
    return { src: getFoxSprite(tier, evolution), style: null };
  }

  const column = getElementStage(tier);
  return {
    src: null,
    style: {
      backgroundImage: `url(${elementalProgressionAtlas})`,
      backgroundPosition: `${column * 20}% ${row * 50}%`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '600% 300%'
    }
  };
}
