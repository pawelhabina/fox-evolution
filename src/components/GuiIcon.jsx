import { getGuiIcon } from '../assets/guiIcons';
import PixelIcon, { hasPixelIcon } from './PixelIcon';

export default function GuiIcon({ name, alt = '', className = '', size = 16 }) {
  if (hasPixelIcon(name)) {
    return <PixelIcon name={name} alt={alt} className={className} size={size} />;
  }

  const src = getGuiIcon(name);
  if (!src) {
    return null;
  }

  const responsiveSize = `clamp(${(size * 0.84).toFixed(2)}px, ${(size / 16).toFixed(3)}vw, ${(size * 1.12).toFixed(2)}px)`;

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`gui-icon inline-block shrink-0 object-contain ${className}`.trim()}
      style={{ width: responsiveSize, height: responsiveSize, imageRendering: 'pixelated' }}
      draggable={false}
    />
  );
}
