const PALETTE = [
  { bg: '#2D4660', text: '#FFFFFF', border: '#1D3144' },
  { bg: '#1E5461', text: '#FFFFFF', border: '#133742' },
  { bg: '#C89212', text: '#FFFFFF', border: '#A67810' },
  { bg: '#173B65', text: '#FFFFFF', border: '#0F2844' },
  { bg: '#2E5A8F', text: '#FFFFFF', border: '#1F4468' },
  { bg: '#4A6A8F', text: '#FFFFFF', border: '#3D5A7D' },
  { bg: '#5479A1', text: '#FFFFFF', border: '#4A6A8F' },
  { bg: '#6B8FBF', text: '#FFFFFF', border: '#5479A1' },
  { bg: '#3D7BAD', text: '#FFFFFF', border: '#2E5A8F' },
  { bg: '#258799', text: '#FFFFFF', border: '#145668' },
  { bg: '#36849B', text: '#FFFFFF', border: '#2A7489' },
  { bg: '#4098B3', text: '#FFFFFF', border: '#36849B' },
  { bg: '#2B9BAD', text: '#FFFFFF', border: '#1E7A89' },
  { bg: '#1FA3B5', text: '#FFFFFF', border: '#178290' },
  { bg: '#2D7A4E', text: '#FFFFFF', border: '#1E5A38' },
  { bg: '#3A9B5C', text: '#FFFFFF', border: '#2D7A4E' },
  { bg: '#52B876', text: '#FFFFFF', border: '#3A9B5C' },
  { bg: '#6FD492', text: '#FFFFFF', border: '#52B876' },
  { bg: '#4CAF7A', text: '#FFFFFF', border: '#3A9B5C' },
  { bg: '#7CB342', text: '#FFFFFF', border: '#689F38' },
  { bg: '#9CCC65', text: '#111827', border: '#7CB342' },
  { bg: '#E0A925', text: '#111827', border: '#C89212' },
  { bg: '#F4B729', text: '#111827', border: '#E0A925' },
  { bg: '#FFC940', text: '#111827', border: '#F4B729' },
  { bg: '#D4A017', text: '#FFFFFF', border: '#B8890F' },
  { bg: '#D87A35', text: '#FFFFFF', border: '#C4681F' },
  { bg: '#E88F3A', text: '#FFFFFF', border: '#D87A35' },
  { bg: '#FF9F4A', text: '#FFFFFF', border: '#E88F3A' },
  { bg: '#FF8C42', text: '#FFFFFF', border: '#E88F3A' },
  { bg: '#B83A2F', text: '#FFFFFF', border: '#9F2A21' },
  { bg: '#D44638', text: '#FFFFFF', border: '#B83A2F' },
  { bg: '#E85240', text: '#FFFFFF', border: '#D44638' },
  { bg: '#591D0F', text: '#FFFFFF', border: '#3C130A' },
  { bg: '#8A3420', text: '#FFFFFF', border: '#6F2818' },
  { bg: '#6B4C9A', text: '#FFFFFF', border: '#573A7F' },
  { bg: '#8E6BB5', text: '#FFFFFF', border: '#7556A1' },
  { bg: '#9B7AC7', text: '#FFFFFF', border: '#8E6BB5' },
  { bg: '#5D3F7A', text: '#FFFFFF', border: '#4A2F61' },
  { bg: '#492434', text: '#FFFFFF', border: '#311823' },
  { bg: '#5D2F43', text: '#FFFFFF', border: '#492434' },
  { bg: '#8B3A62', text: '#FFFFFF', border: '#6F2A4D' },
  { bg: '#A14A76', text: '#FFFFFF', border: '#8B3A62' },
  { bg: '#6A4234', text: '#FFFFFF', border: '#4B2D23' },
  { bg: '#8B5A3C', text: '#FFFFFF', border: '#6A4234' },
  { bg: '#A0694B', text: '#FFFFFF', border: '#8B5A3C' },
  { bg: '#7D5A3A', text: '#FFFFFF', border: '#6A4234' },
  { bg: '#3A3638', text: '#FFFFFF', border: '#2A2628' },
  { bg: '#4A4548', text: '#FFFFFF', border: '#3A3638' },
  { bg: '#5C5A5D', text: '#FFFFFF', border: '#4A4548' },
  { bg: '#7A8590', text: '#FFFFFF', border: '#5F6A74' },
  { bg: '#8F959B', text: '#111827', border: '#72777C' },
];

const normalize = (value?: string | null) => {
  if (!value) return '';
  return value.trim().toLowerCase();
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeHexColor = (value?: string | null) => {
  if (!value) return null;
  let hex = value.trim();
  if (!hex) return null;
  if (!hex.startsWith('#')) {
    hex = `#${hex}`;
  }
  if (hex.length === 4) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  if (hex.length !== 7) {
    return null;
  }
  return hex.toUpperCase();
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const num = parseInt(normalized, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
};

const getLuminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const a = [r, g, b].map((v) => {
    const channel = v / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
};

const getContrastText = (hex: string) => {
  const luminance = getLuminance(hexToRgb(hex));
  return luminance > 0.6 ? '#111827' : '#FFFFFF';
};

const shadeHexColor = (hex: string, percent: number) => {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 + percent / 100;
  const newR = clamp(Math.round(r * factor), 0, 255);
  const newG = clamp(Math.round(g * factor), 0, 255);
  const newB = clamp(Math.round(b * factor), 0, 255);
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB
    .toString(16)
    .padStart(2, '0')}`.toUpperCase();
};

const rgbaFromHex = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
};

export const getProductColor = (productName?: string | null, customHex?: string | null) => {
  const normalizedCustom = normalizeHexColor(customHex);

  if (normalizedCustom) {
    const text = getContrastText(normalizedCustom);
    return {
      background: normalizedCustom,
      text,
      border: shadeHexColor(normalizedCustom, -20),
      badgeBackground: rgbaFromHex(normalizedCustom, 0.15),
      badgeText: text,
      hoverBackground: shadeHexColor(normalizedCustom, -5),
      hoverText: text
    };
  }

  const normalized = normalize(productName);
  const paletteIndex = normalized ? hashString(normalized) % PALETTE.length : 0;
  const colors = PALETTE[paletteIndex];

  return {
    background: colors.bg,
    text: colors.text,
    border: colors.border,
    badgeBackground: `${colors.bg}1A`,
    badgeText: colors.text,
    hoverBackground: colors.bg,
    hoverText: colors.text
  };
};