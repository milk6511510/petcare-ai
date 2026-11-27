import {
  COAT_COLOR_PRESETS,
  findBreedOption,
  getBaseAssetPath,
  getBreedsForSpecies,
  type BreedOption,
  type CoatPattern
} from '../data/petCatalog';
import type { Pet, PetAppearance } from '../types';

export interface ResolvedPetVisual {
  baseAsset: BreedOption['baseAsset'];
  baseSrc: string | null;
  primaryColor: string;
  secondaryColor: string;
  pattern: CoatPattern;
  collarColor: string;
  breedLabel: string;
  isDefaultNativeCoat: boolean;
}

export interface PhotoMatchResult {
  primaryColor: string;
  secondaryColor: string;
  pattern: CoatPattern;
  swatchHexes: string[];
  matchedPresetLabel: string;
  suggestedSpecies?: 'dog' | 'cat' | 'other';
  suggestedBreedId?: string;
  suggestedBreedLabel?: string;
  summaryNote: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [224, 145, 75];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function resolvePetVisual(pet: Pick<Pet, 'species' | 'breed' | 'appearance'>): ResolvedPetVisual {
  const breedOpt = findBreedOption(pet.species, pet.breed, pet.appearance?.breedId);
  const fallbackAsset: BreedOption['baseAsset'] =
    pet.species === 'cat' ? 'kitty' : pet.species === 'other' ? 'other-bunny' : 'shiba';
  const baseAsset = breedOpt?.baseAsset ?? fallbackAsset;
  const baseSrc = getBaseAssetPath(baseAsset);

  const defaultPrimary = breedOpt?.defaultPrimary ?? (pet.species === 'cat' ? '#EB974A' : '#D88342');
  const defaultSecondary = breedOpt?.defaultSecondary ?? '#FAF6F0';
  const defaultPattern = breedOpt?.defaultPattern ?? 'bicolor';

  const primaryColor = pet.appearance?.primaryColor || defaultPrimary;
  const secondaryColor = pet.appearance?.secondaryColor || defaultSecondary;
  const pattern = pet.appearance?.pattern || defaultPattern;
  const collarColor = pet.appearance?.collarColor || 'none';

  // Skip canvas recolor if matching native WebP colors closely
  const nativeColorMap: Partial<Record<BreedOption['baseAsset'], [string, string, CoatPattern]>> = {
    shiba: ['#D88342', '#FBF6EE', 'bicolor'],
    'border-collie': ['#262A32', '#F8F7F4', 'bicolor'],
    corgi: ['#DC8B42', '#FBF7F0', 'bicolor'],
    poodle: ['#E3B98E', '#F8E6D2', 'solid'],
    'dog-golden': ['#E6AE5E', '#F8E5C3', 'bicolor'],
    kitty: ['#EB974A', '#FAF6F0', 'bicolor'],
    'cat-bsh': ['#EADBC8', '#FFF5EB', 'solid']
  };
  const native = nativeColorMap[baseAsset];
  const isDefaultNativeCoat =
    Boolean(native) &&
    colorDistance(hexToRgb(primaryColor), hexToRgb(native![0])) < 14 &&
    colorDistance(hexToRgb(secondaryColor), hexToRgb(native![1])) < 16 &&
    pattern === native![2] &&
    collarColor === 'none';

  return {
    baseAsset,
    baseSrc,
    primaryColor,
    secondaryColor,
    pattern,
    collarColor,
    breedLabel: pet.breed || breedOpt?.label || (pet.species === 'cat' ? '貓咪' : pet.species === 'dog' ? '狗狗' : '毛孩'),
    isDefaultNativeCoat
  };
}

const recolorCache = new Map<string, string>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function shadeTarget(
  targetRgb: [number, number, number],
  relShading: number,
  contrastLift = 0.28
): [number, number, number] {
  const factor = 0.56 + relShading * (0.62 + contrastLift);
  const spec = Math.max(0, relShading - 0.82) * 180;
  return [
    Math.min(255, targetRgb[0] * factor + spec),
    Math.min(255, targetRgb[1] * factor + spec),
    Math.min(255, targetRgb[2] * factor + spec)
  ];
}

export async function renderRecoloredFigurine(
  baseAsset: BreedOption['baseAsset'],
  baseSrc: string,
  appearance: Pick<PetAppearance, 'primaryColor' | 'secondaryColor' | 'pattern' | 'collarColor'>
): Promise<string> {
  const key = `${baseAsset}|${appearance.primaryColor}|${appearance.secondaryColor || ''}|${appearance.pattern || 'bicolor'}|${appearance.collarColor || 'none'}`;
  const hit = recolorCache.get(key);
  if (hit) return hit;

  const img = await loadImage(baseSrc);
  const w = img.naturalWidth || 384;
  const h = img.naturalHeight || 384;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return baseSrc;

  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const primaryRgb = hexToRgb(appearance.primaryColor || '#D88342');
  const secondaryRgb = hexToRgb(appearance.secondaryColor || '#FAF6F0');
  const collarRgb =
    appearance.collarColor && appearance.collarColor !== 'none'
      ? hexToRgb(appearance.collarColor)
      : null;
  const pattern = appearance.pattern || 'bicolor';

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 20) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const pxIdx = i / 4;
    const x = pxIdx % w;
    const y = Math.floor(pxIdx / w);
    const nx = x / w;
    const ny = y / h;

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;

    // 1. Protect eyes, pupils, nose, and specular eye highlights
    const inEyeRegion =
      ny > 0.24 && ny < 0.48 && ((nx > 0.27 && nx < 0.46) || (nx > 0.54 && nx < 0.73));
    if (lum < 0.085 || (inEyeRegion && lum < 0.28)) {
      continue;
    }

    // Protect cute pink nose / tongue / rosy blush cheeks on cat-bsh & dog-golden
    const isPinkFeature =
      r > g + 26 && r > b + 24 && sat > 0.22 && ny > 0.34 && ny < 0.58 && nx > 0.26 && nx < 0.74;
    if (isPinkFeature && (baseAsset === 'cat-bsh' || baseAsset === 'dog-golden')) {
      continue;
    }

    // 2. Collar detection (Border Collie sage collar / neck band region)
    if (baseAsset === 'border-collie' && g > r + 14 && g > b + 14 && ny > 0.44 && ny < 0.68) {
      if (collarRgb) {
        const [cr, cg, cb] = shadeTarget(collarRgb, Math.min(1, lum * 1.15), 0.18);
        data[i] = cr;
        data[i + 1] = cg;
        data[i + 2] = cb;
      }
      continue;
    }

    // 3. Determine whether pixel belongs to primary fur or white/cream markings
    const isPinkInner = r > g + 22 && r > b + 12 && sat > 0.18 && ny < 0.52 && lum > 0.58;
    if (
      isPinkInner &&
      baseAsset !== 'shiba' &&
      baseAsset !== 'corgi' &&
      baseAsset !== 'kitty' &&
      baseAsset !== 'dog-golden'
    ) {
      continue;
    }

    let isPrimaryCoat = false;
    let isWhiteMarking = false;

    if (baseAsset === 'border-collie') {
      if (lum < 0.52 && sat < 0.3) {
        isPrimaryCoat = true;
      } else if (lum >= 0.68 && sat < 0.18) {
        isWhiteMarking = true;
      }
    } else if (baseAsset === 'poodle' || baseAsset === 'cat-bsh') {
      // Uniform sculpted plush coat; chest/muzzle can be distinguished spatially for bicolor
      if (lum > 0.16) {
        const isBshChestOrMuzzle =
          baseAsset === 'cat-bsh' &&
          ((ny > 0.56 && ny < 0.88 && nx > 0.36 && nx < 0.64) ||
            (ny > 0.44 && ny < 0.56 && nx > 0.41 && nx < 0.59));
        if (isBshChestOrMuzzle && pattern !== 'solid') {
          isWhiteMarking = true;
        } else {
          isPrimaryCoat = true;
        }
      }
    } else if (baseAsset === 'dog-golden') {
      // Golden coat vs lighter cream chest/muzzle blaze
      const isChestOrMuzzle =
        (ny > 0.56 && ny < 0.88 && nx > 0.36 && nx < 0.64) ||
        (ny > 0.28 && ny < 0.52 && nx > 0.41 && nx < 0.59 && lum > 0.72);
      if (isChestOrMuzzle && lum > 0.62) {
        isWhiteMarking = true;
      } else if (r > b + 8 && lum > 0.16) {
        isPrimaryCoat = true;
      }
    } else {
      // Shiba, Corgi, Kitty: orange/warm coat vs cream-white muzzle/chest/paws
      if (r > b + 10 && sat > 0.13 && lum > 0.16) {
        isPrimaryCoat = true;
      } else if (lum >= 0.68 && sat < 0.16) {
        isWhiteMarking = true;
      }
    }

    if (!isPrimaryCoat && !isWhiteMarking) continue;

    // 4. Pattern mixing
    let target = primaryRgb;
    let relShade = Math.min(1, Math.max(0.18, (lum - 0.1) / 0.78));

    if (pattern === 'solid') {
      target = isWhiteMarking
        ? [
            primaryRgb[0] * 0.78 + secondaryRgb[0] * 0.22,
            primaryRgb[1] * 0.78 + secondaryRgb[1] * 0.22,
            primaryRgb[2] * 0.78 + secondaryRgb[2] * 0.22
          ]
        : primaryRgb;
      if (baseAsset === 'border-collie' && isPrimaryCoat) {
        relShade = Math.min(1, Math.max(0.28, (lum - 0.08) / 0.38));
      }
    } else if (pattern === 'pointed') {
      const isEarOrPawOrMask =
        ny < 0.28 || ny > 0.82 || (ny > 0.31 && ny < 0.49 && nx > 0.3 && nx < 0.7);
      target = isEarOrPawOrMask ? secondaryRgb : primaryRgb;
    } else if (pattern === 'tabby') {
      const stripe = Math.sin(nx * 28 + Math.cos(ny * 18) * 1.4);
      if (isWhiteMarking) {
        target = secondaryRgb;
      } else if (stripe > 0.42) {
        target = [
          primaryRgb[0] * 0.62 + secondaryRgb[0] * 0.38,
          primaryRgb[1] * 0.62 + secondaryRgb[1] * 0.38,
          primaryRgb[2] * 0.62 + secondaryRgb[2] * 0.38
        ];
      } else {
        target = primaryRgb;
      }
    } else if (pattern === 'calico') {
      const patch = Math.sin(nx * 9.5 + ny * 7.2) + Math.cos(nx * 5.1 - ny * 8.4);
      if (isWhiteMarking) {
        target = [250, 248, 244];
      } else if (patch > 0.55) {
        target = secondaryRgb;
      } else {
        target = primaryRgb;
      }
    } else {
      target = isWhiteMarking ? secondaryRgb : primaryRgb;
      if (baseAsset === 'border-collie' && isPrimaryCoat) {
        relShade = Math.min(1, Math.max(0.28, (lum - 0.08) / 0.38));
      }
    }

    const [nr, ng, nb] = shadeTarget(target, relShade, isWhiteMarking ? 0.14 : 0.26);
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
  }

  ctx.putImageData(imageData, 0, 0);

  // Decorative collar & gold bell for assets without a baked collar
  if (collarRgb && baseAsset !== 'border-collie') {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.585, w * 0.16, h * 0.036, 0, 0.15, Math.PI - 0.15);
    ctx.strokeStyle = rgbToHex(collarRgb[0], collarRgb[1], collarRgb[2]);
    ctx.lineWidth = Math.max(7, w * 0.028);
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.625, Math.max(5, w * 0.022), 0, Math.PI * 2);
    ctx.fillStyle = '#F2B84B';
    ctx.fill();
    ctx.strokeStyle = '#C68928';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  const outUrl = canvas.toDataURL('image/png');
  if (recolorCache.size >= 48) {
    const oldest = recolorCache.keys().next().value;
    if (oldest) recolorCache.delete(oldest);
  }
  recolorCache.set(key, outUrl);
  return outUrl;
}

export async function analyzePetPhoto(
  file: File,
  currentSpecies: 'dog' | 'cat' | 'other'
): Promise<PhotoMatchResult> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await loadImage(dataUrl);
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('無法讀取照片畫布');
  }
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const bins = new Map<string, { rSum: number; gSum: number; bSum: number; weight: number }>();

  for (let y = 12; y < size - 12; y++) {
    for (let x = 12; x < size - 12; x++) {
      const idx = (y * size + x) * 4;
      const a = data[idx + 3];
      if (a < 120) continue;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;

      if (lum > 0.96 || lum < 0.04) continue;
      if (g > r + 45 && g > b + 45) continue;

      const distFromCenter = Math.hypot((x - size / 2) / (size / 2), (y - size / 2) / (size / 2));
      const weight = Math.max(0.25, 1.5 - distFromCenter) * (sat > 0.08 ? 1.15 : 0.85);

      const qr = Math.floor(r / 24);
      const qg = Math.floor(g / 24);
      const qb = Math.floor(b / 24);
      const key = `${qr}-${qg}-${qb}`;
      const prev = bins.get(key) || { rSum: 0, gSum: 0, bSum: 0, weight: 0 };
      prev.rSum += r * weight;
      prev.gSum += g * weight;
      prev.bSum += b * weight;
      prev.weight += weight;
      bins.set(key, prev);
    }
  }

  const clusters = Array.from(bins.values())
    .map((b) => ({
      rgb: [b.rSum / b.weight, b.gSum / b.weight, b.bSum / b.weight] as [number, number, number],
      weight: b.weight
    }))
    .sort((a, b) => b.weight - a.weight);

  const primaryRgb: [number, number, number] = clusters[0]?.rgb ?? [224, 152, 84];
  let secondaryRgb: [number, number, number] = [248, 245, 240];
  for (let i = 1; i < clusters.length; i++) {
    if (colorDistance(primaryRgb, clusters[i].rgb) > 42) {
      secondaryRgb = clusters[i].rgb;
      break;
    }
  }

  const swatchHexes = [rgbToHex(primaryRgb[0], primaryRgb[1], primaryRgb[2])];
  for (const c of clusters.slice(1, 10)) {
    const hex = rgbToHex(c.rgb[0], c.rgb[1], c.rgb[2]);
    if (swatchHexes.every((s) => colorDistance(hexToRgb(s), c.rgb) > 36)) {
      swatchHexes.push(hex);
    }
    if (swatchHexes.length >= 4) break;
  }

  let bestPreset = COAT_COLOR_PRESETS[0];
  let bestDist = Infinity;
  for (const preset of COAT_COLOR_PRESETS) {
    const d = colorDistance(primaryRgb, hexToRgb(preset.primaryColor));
    if (d < bestDist) {
      bestDist = d;
      bestPreset = preset;
    }
  }

  const fname = file.name.toLowerCase();
  let suggestedSpecies: 'dog' | 'cat' | 'other' | undefined;
  let suggestedBreedId: string | undefined;
  let suggestedBreedLabel: string | undefined;

  const allSpecies: Array<'dog' | 'cat' | 'other'> = [currentSpecies, 'dog', 'cat', 'other'];
  for (const sp of allSpecies) {
    const list = getBreedsForSpecies(sp);
    const match = list.find((b) => b.keywords.some((k) => fname.includes(k.toLowerCase())));
    if (match) {
      suggestedSpecies = sp;
      suggestedBreedId = match.id;
      suggestedBreedLabel = match.label;
      break;
    }
  }

  const primaryHex = rgbToHex(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  const secondaryHex = rgbToHex(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
  const hasStrongContrast = colorDistance(primaryRgb, secondaryRgb) > 78;
  const pattern: CoatPattern = hasStrongContrast ? 'bicolor' : bestPreset.pattern;

  return {
    primaryColor: primaryHex,
    secondaryColor: secondaryHex,
    pattern,
    swatchHexes,
    matchedPresetLabel: bestPreset.label,
    suggestedSpecies,
    suggestedBreedId,
    suggestedBreedLabel,
    summaryNote: `已免金鑰擷取照片主色調（近似「${bestPreset.label}」），並即時套用至 3D 公仔；未來接上專屬生圖 API 即可一鍵生成寫實個人化公仔。`
  };
}
