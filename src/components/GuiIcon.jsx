import { getGuiIcon } from '../assets/guiIcons';

export default function GuiIcon({ name, alt = '', className = '', size = 16 }) {
  const src = getGuiIcon(name);
  if (!src) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`inline-block shrink-0 object-contain ${className}`.trim()}
      style={{ imageRendering: 'pixelated' }}
      draggable={false}
    />
  );
}
