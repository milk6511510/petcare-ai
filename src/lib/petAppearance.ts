import {
  COAT_COLOR_PRESETS,
  findBreedOption,
  getBaseAssetPath,
  getPresetsForSpecies,
  getBreedsForSpecies,
  type BaseAssetId,
  type CoatPattern
} from '../data/petCatalog';
import type { Pet, PetAppearance } from '../types';

export interface ResolvedPetVisual {
  baseAsset: BaseAssetId;
  baseSrc: string;
  primaryColor: string;
  secondaryColor: string;
  pattern: CoatPattern;
  collarColor: string;
  breedLabel: string;
  isDefaultNativeCoat: boolean;
  skipFurRecolor: boolean;
}

export interface PhotoMatchResult {
  presetId: string;
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

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 === edge0) return x >= edge1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const NATIVE_ASSET_COATS: Record<BaseAssetId, [string, string, CoatPattern]> = {
  shiba: ['#D88342', '#FBF6EE', 'bicolor'],
  'shiba-black': ['#24272D', '#E6C296', 'bicolor'],
  'shiba-white': ['#F5F4F0', '#FFFFFF', 'solid'],
  'border-collie': ['#262A32', '#F8F7F4', 'bicolor'],
  husky: ['#6D747E', '#F8F9FA', 'bicolor'],
  corgi: ['#DC8B42', '#FBF7F0', 'bicolor'],
  frenchie: ['#EAD4B6', '#403834', 'bicolor'],
  poodle: ['#E3B98E', '#F8E6D2', 'solid'],
  'poodle-white': ['#F4F2EE', '#FFFFFF', 'solid'],
  'dog-golden': ['#E6AE5E', '#F8E5C3', 'bicolor'],
  kitty: ['#EB974A', '#FAF6F0', 'bicolor'],
  'cat-bsh': ['#EADBC8', '#FFF5EB', 'solid'],
  'cat-bsh-blue': ['#7A8A98', '#BAC5CF', 'solid'],
  'cat-tuxedo': ['#2A2E36', '#F8F8F7', 'bicolor'],
  'cat-tabby': ['#8A9098', '#F6F5F2', 'tabby'],
  'cat-calico': ['#EA9244', '#2E3036', 'calico'],
  'cat-ragdoll': ['#F6F0E6', '#665246', 'pointed'],
  'cat-black': ['#2C3038', '#4A505C', 'solid'],
  'other-bunny': ['#F7ECE0', '#FFFAF6', 'bicolor'],
  'other-hamster': ['#E8AE6C', '#FCF4E8', 'bicolor'],
  'other-bird': ['#F8D65C', '#FFF8E0', 'bicolor']
};

function matchesNativeCoat(
  asset: BaseAssetId,
  primaryColor: string,
  secondaryColor: string,
  pattern: CoatPattern
): boolean {
  const native = NATIVE_ASSET_COATS[asset];
  if (!native) return false;
  return (
    colorDistance(hexToRgb(primaryColor), hexToRgb(native[0])) < 20 &&
    colorDistance(hexToRgb(secondaryColor), hexToRgb(native[1])) < 24 &&
    pattern === native[2]
  );
}

/**
 * Dual-track resolver:
 * 1. If breed + chosen coat/preset matches any pre-rendered 3D WebP figurine, serve that exact static asset directly (zero artifacts).
 * 2. Otherwise fall back to the smooth continuous-ramp recoloring engine for custom colors.
 */
export function resolvePetVisual(pet: Pick<Pet, 'species' | 'breed' | 'appearance'>): ResolvedPetVisual {
  const species: 'dog' | 'cat' | 'other' =
    pet.species === 'cat' || pet.species === 'other' ? pet.species : 'dog';
  const breedOpt = findBreedOption(species, pet.breed, pet.appearance?.breedId);
  const fallbackAsset: BaseAssetId =
    species === 'cat' ? 'kitty' : species === 'other' ? 'other-bunny' : 'shiba';
  let baseAsset: BaseAssetId = breedOpt?.baseAsset ?? fallbackAsset;

  const defaultPrimary = breedOpt?.defaultPrimary ?? (species === 'cat' ? '#EB974A' : '#D88342');
  const defaultSecondary = breedOpt?.defaultSecondary ?? '#FAF6F0';
  const defaultPattern = breedOpt?.defaultPattern ?? 'bicolor';

  const primaryColor = pet.appearance?.primaryColor || defaultPrimary;
  const secondaryColor = pet.appearance?.secondaryColor || defaultSecondary;
  const pattern = pet.appearance?.pattern || defaultPattern;
  const collarColor = pet.appearance?.collarColor || 'none';

  // Preserve breed-family silhouette when picking common coat variants
  if (species === 'dog') {
    if ((baseAsset === 'poodle' || baseAsset === 'poodle-white') && colorDistance(hexToRgb(primaryColor), hexToRgb('#F4F2EE')) < 24) {
      baseAsset = 'poodle-white';
    } else if ((baseAsset === 'poodle' || baseAsset === 'poodle-white') && colorDistance(hexToRgb(primaryColor), hexToRgb('#E3B98E')) < 26) {
      baseAsset = 'poodle';
    }
  }

  // Check if user selected a curated preset OR colors matching a pre-rendered 3D WebP asset for this species
  let matchedNativeCoat = matchesNativeCoat(baseAsset, primaryColor, secondaryColor, pattern);
  if (!matchedNativeCoat) {
    if (pet.appearance?.presetId) {
      const presetObj = COAT_COLOR_PRESETS.find((p) => p.id === pet.appearance?.presetId);
      const nativeCandidate = presetObj?.nativeAssetBySpecies?.[species];
      if (
        presetObj &&
        nativeCandidate &&
        colorDistance(hexToRgb(primaryColor), hexToRgb(presetObj.primaryColor)) < 20 &&
        colorDistance(hexToRgb(secondaryColor), hexToRgb(presetObj.secondaryColor)) < 24 &&
        pattern === presetObj.pattern
      ) {
        baseAsset = nativeCandidate;
        matchedNativeCoat = true;
      }
    }
    if (!matchedNativeCoat) {
      const speciesPresets = getPresetsForSpecies(species);
      for (const preset of speciesPresets) {
        const candidate = preset.nativeAssetBySpecies?.[species];
        if (
          candidate &&
          colorDistance(hexToRgb(primaryColor), hexToRgb(preset.primaryColor)) < 18 &&
          colorDistance(hexToRgb(secondaryColor), hexToRgb(preset.secondaryColor)) < 22 &&
          pattern === preset.pattern
        ) {
          baseAsset = candidate;
          matchedNativeCoat = true;
          break;
        }
      }
    }
  }

  const baseSrc = getBaseAssetPath(baseAsset);
  const isDefaultNativeCoat = matchedNativeCoat && collarColor === 'none';

  return {
    baseAsset,
    baseSrc,
    primaryColor,
    secondaryColor,
    pattern,
    collarColor,
    breedLabel:
      pet.breed || breedOpt?.label || (species === 'cat' ? '貓咪' : species === 'dog' ? '狗狗' : '毛孩'),
    isDefaultNativeCoat,
    skipFurRecolor: matchedNativeCoat
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
  contrastLift = 0.22
): [number, number, number] {
  const factor = 0.48 + relShading * (0.66 + contrastLift);
  const spec = Math.max(0, relShading - 0.82) * 115;
  return [
    Math.max(0, Math.min(255, targetRgb[0] * factor + spec)),
    Math.max(0, Math.min(255, targetRgb[1] * factor + spec)),
    Math.max(0, Math.min(255, targetRgb[2] * factor + spec))
  ];
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const k = Math.max(0, Math.min(1, t));
  return [
    a[0] * (1 - k) + b[0] * k,
    a[1] * (1 - k) + b[1] * k,
    a[2] * (1 - k) + b[2] * k
  ];
}

function radialGaussian(nx: number, ny: number, cx: number, cy: number, rx: number, ry: number): number {
  const dx = (nx - cx) / rx;
  const dy = (ny - cy) / ry;
  return Math.exp(-(dx * dx + dy * dy));
}

export async function renderRecoloredFigurine(
  baseAsset: BaseAssetId,
  baseSrc: string,
  appearance: Pick<PetAppearance, 'primaryColor' | 'secondaryColor' | 'pattern' | 'collarColor'> & {
    skipFurRecolor?: boolean;
  }
): Promise<string> {
  const skipFur = Boolean(appearance.skipFurRecolor);
  const key = `${baseAsset}|${skipFur ? 'native' : appearance.primaryColor}|${skipFur ? '' : appearance.secondaryColor || ''}|${skipFur ? '' : appearance.pattern || 'bicolor'}|${appearance.collarColor || 'none'}`;
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

  const primaryRgb = hexToRgb(appearance.primaryColor || '#D88342');
  const secondaryRgb = hexToRgb(appearance.secondaryColor || '#FAF6F0');
  const collarRgb =
    appearance.collarColor && appearance.collarColor !== 'none'
      ? hexToRgb(appearance.collarColor)
      : null;
  const pattern = appearance.pattern || 'bicolor';

  const hasBakedGreenCollar = baseAsset === 'border-collie';
  const hasBakedOrangeCollar =
    baseAsset === 'kitty' || baseAsset === 'cat-tuxedo' || baseAsset === 'cat-tabby' || baseAsset === 'cat-calico';

  if (!skipFur || (collarRgb && (hasBakedGreenCollar || hasBakedOrangeCollar))) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 10) continue;

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
      const warmth = (r - b) / 255;

      // 1. Baked collar handling (Border Collie sage collar / Kitty neck band)
      if (hasBakedGreenCollar && ny > 0.44 && ny < 0.68) {
        const greenness = (g - Math.max(r, b)) / 255;
        const collarW = smoothstep(0.03, 0.10, greenness);
        if (collarW > 0.05) {
          if (collarRgb) {
            const [cr, cg, cb] = shadeTarget(collarRgb, Math.min(1, lum * 1.15), 0.18);
            const [mr, mg, mb] = mixRgb([r, g, b], [cr, cg, cb], collarW);
            data[i] = mr;
            data[i + 1] = mg;
            data[i + 2] = mb;
          }
          if (collarW > 0.6) continue;
        }
      }

      if (hasBakedOrangeCollar) {
        const collarBand = radialGaussian(nx, ny, 0.5, 0.545, 0.22, 0.055);
        const isGoldBell = radialGaussian(nx, ny, 0.5, 0.60, 0.075, 0.065) > 0.4 && warmth > 0.16;
        if (isGoldBell) continue;
        if (collarBand > 0.35 && warmth > 0.14) {
          if (collarRgb) {
            const [cr, cg, cb] = shadeTarget(collarRgb, Math.min(1, lum * 1.1), 0.18);
            const [mr, mg, mb] = mixRgb([r, g, b], [cr, cg, cb], smoothstep(0.35, 0.72, collarBand));
            data[i] = mr;
            data[i + 1] = mg;
            data[i + 2] = mb;
          }
          continue;
        }
      }

      if (skipFur) continue;

      // 2. Smooth protection masks for eyes, pupils, eye catchlights, nose & rosy blush
      const eyeL = ((nx - 0.37) / 0.085) ** 2 + ((ny - 0.36) / 0.095) ** 2;
      const eyeR = ((nx - 0.63) / 0.085) ** 2 + ((ny - 0.36) / 0.095) ** 2;
      const inEye = Math.max(1 - smoothstep(0.55, 1.15, eyeL), 1 - smoothstep(0.55, 1.15, eyeR));

      // Keep dark pupils, glossy white eye highlights, and dark nose area
      const noseRegion = radialGaussian(nx, ny, 0.5, 0.435, 0.085, 0.065);
      const darkEyeOrNose = Math.max(inEye, noseRegion) * (1 - smoothstep(0.14, 0.32, lum));
      const eyeSparkle = inEye * smoothstep(0.70, 0.90, lum);
      const pinkFeature =
        smoothstep(20, 44, r - g) *
        smoothstep(18, 42, r - b) *
        (1 - smoothstep(0.54, 0.68, ny));
      const protect = Math.max(darkEyeOrNose, eyeSparkle, pinkFeature * 0.92);
      if (protect >= 0.98) continue;

      // 3. Smooth continuous coat-weight (0 = secondary/white marking, 1 = primary coat)
      let primaryWeight = 1.0;
      let relShade = Math.max(0.12, Math.min(1.02, (lum - 0.10) / 0.78));

      if (
        baseAsset === 'border-collie' ||
        baseAsset === 'shiba-black' ||
        baseAsset === 'husky' ||
        baseAsset === 'cat-tuxedo'
      ) {
        // Dark-and-white dual-tone coats: continuous luminance ramp (ZERO mid-gray dead zone!)
        primaryWeight = 1 - smoothstep(0.32, 0.68, lum);
        // Remap dark fur luminance range smoothly so black fur recolors cleanly without black holes
        const darkShade = Math.max(0.22, Math.min(1.0, (lum - 0.02) / 0.44));
        const lightShade = Math.max(0.28, Math.min(1.0, (lum - 0.20) / 0.68));
        relShade = darkShade * primaryWeight + lightShade * (1 - primaryWeight);
      } else if (
        baseAsset === 'shiba' ||
        baseAsset === 'corgi' ||
        baseAsset === 'kitty' ||
        baseAsset === 'dog-golden' ||
        baseAsset === 'cat-tabby' ||
        baseAsset === 'cat-calico' ||
        baseAsset === 'frenchie' ||
        baseAsset === 'other-hamster'
      ) {
        // Warm coat vs cream/white markings: smooth warmth * saturation ramp
        primaryWeight = smoothstep(0.04, 0.21, warmth) * smoothstep(0.06, 0.22, sat);
      } else {
        // Uniform plush figurines (cat-bsh, cat-bsh-blue, cat-black, cat-ragdoll, poodle, poodle-white, shiba-white, other-bunny, other-bird)
        const chestOrMuzzle = Math.max(
          radialGaussian(nx, ny, 0.5, 0.70, 0.20, 0.18),
          radialGaussian(nx, ny, 0.5, 0.48, 0.14, 0.09)
        );
        primaryWeight = pattern === 'solid' ? 1.0 : 1 - smoothstep(0.35, 0.75, chestOrMuzzle);
        if (baseAsset === 'cat-black') {
          relShade = Math.max(0.22, Math.min(1.0, (lum - 0.02) / 0.46));
        }
      }

      // 4. Smooth pattern color blending (ZERO hard rectangular boxes or jagged sine steps!)
      let target: [number, number, number];
      if (pattern === 'solid') {
        const blendedSecondary = mixRgb(primaryRgb, secondaryRgb, 0.18);
        target = mixRgb(blendedSecondary, primaryRgb, primaryWeight);
      } else if (pattern === 'pointed') {
        const earL = radialGaussian(nx, ny, 0.29, 0.17, 0.12, 0.12);
        const earR = radialGaussian(nx, ny, 0.71, 0.17, 0.12, 0.12);
        const mask = radialGaussian(nx, ny, 0.5, 0.41, 0.16, 0.10) * 0.8;
        const paws = radialGaussian(nx, ny, 0.5, 0.89, 0.26, 0.08) * 0.85;
        const pointWeight = Math.min(1, Math.max(earL, earR, mask, paws));
        target = mixRgb(primaryRgb, secondaryRgb, pointWeight);
      } else if (pattern === 'tabby') {
        const stripe = smoothstep(0.28, 0.72, 0.5 + 0.5 * Math.sin(nx * 24 + Math.cos(ny * 16) * 1.2));
        const furTone = mixRgb(primaryRgb, secondaryRgb, stripe * 0.46);
        target = mixRgb(secondaryRgb, furTone, primaryWeight);
      } else if (pattern === 'calico') {
        const p1 = radialGaussian(nx, ny, 0.30, 0.22, 0.15, 0.15);
        const p2 = radialGaussian(nx, ny, 0.68, 0.68, 0.16, 0.16);
        const p3 = radialGaussian(nx, ny, 0.18, 0.74, 0.13, 0.14);
        const patchW = smoothstep(0.38, 0.68, Math.max(p1, p2, p3));
        const colored = mixRgb(primaryRgb, secondaryRgb, patchW);
        target = mixRgb([248, 246, 242], colored, primaryWeight);
      } else {
        target = mixRgb(secondaryRgb, primaryRgb, primaryWeight);
      }

      const shaded = shadeTarget(target, relShade, primaryWeight < 0.5 ? 0.12 : 0.22);
      // Softly preserve anti-aliased semi-transparent outer edge (avoid fringe tearing)
      const edgeKeep = (1 - smoothstep(45, 220, a)) * 0.55;
      const keepOriginal = Math.min(1, Math.max(protect, edgeKeep));
      const [fr, fg, fb] = mixRgb(shaded, [r, g, b], keepOriginal);
      data[i] = fr;
      data[i + 1] = fg;
      data[i + 2] = fb;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // Decorative collar & gold bell for assets without a baked neck collar
  if (collarRgb && !hasBakedGreenCollar && !hasBakedOrangeCollar) {
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

  const targetSp = suggestedSpecies || currentSpecies;
  const candidatePresets = getPresetsForSpecies(targetSp);
  let bestPreset = candidatePresets[0] || COAT_COLOR_PRESETS[0];
  let bestDist = Infinity;
  for (const preset of candidatePresets) {
    const dPrimary = colorDistance(primaryRgb, hexToRgb(preset.primaryColor));
    const dSecondary = colorDistance(secondaryRgb, hexToRgb(preset.secondaryColor)) * 0.35;
    const score = dPrimary + dSecondary;
    if (score < bestDist) {
      bestDist = score;
      bestPreset = preset;
    }
  }

  const primaryHex = rgbToHex(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  const secondaryHex = rgbToHex(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
  const useNativePreset = Boolean(bestPreset.nativeAssetBySpecies?.[targetSp]) && bestDist < 85;

  return {
    presetId: bestPreset.id,
    primaryColor: useNativePreset ? bestPreset.primaryColor : primaryHex,
    secondaryColor: useNativePreset ? bestPreset.secondaryColor : secondaryHex,
    pattern: useNativePreset ? bestPreset.pattern : colorDistance(primaryRgb, secondaryRgb) > 78 ? 'bicolor' : bestPreset.pattern,
    swatchHexes,
    matchedPresetLabel: bestPreset.label,
    suggestedSpecies,
    suggestedBreedId,
    suggestedBreedLabel,
    summaryNote: useNativePreset
      ? `已自動配對預渲染 3D 公仔「${bestPreset.label}」（零破圖呈現），也可在下方自由微調毛色或項圈。`
      : `已擷取照片主色調並透過柔邊漸層即時配色；也可點選上方預渲染預設毛色獲得最精緻質感。`
  };
}
