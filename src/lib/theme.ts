export type ThemeId = 'caramel' | 'peach' | 'amber' | 'sand';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  subtitle: string;
  swatches: [string, string, string];
}

export const THEME_STORAGE_KEY = 'petcare_theme';
export const DEFAULT_THEME_ID: ThemeId = 'caramel';

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'caramel',
    name: '日系焦糖奶茶系',
    subtitle: '低飽和奶茶米白與焦糖暖棕',
    swatches: ['#FBF7F0', '#C47449', '#9A6E4E']
  },
  {
    id: 'peach',
    name: '奶油蜜桃珊瑚系',
    subtitle: '柔粉奶油底配蜜桃珊瑚與杏桃',
    swatches: ['#FFF9F5', '#FF7E5F', '#D4846A']
  },
  {
    id: 'amber',
    name: '陽光橘金活力系',
    subtitle: '暖蛋殼白配活力暖橘與蜂蜜金',
    swatches: ['#FFFBF2', '#F07828', '#D99B26']
  },
  {
    id: 'sand',
    name: '暖砂大地珊瑚系',
    subtitle: '燕麥米白配經典珊瑚與大地棕',
    swatches: ['#FAF7F2', '#FF7E47', '#A67554']
  }
];

export function isValidThemeId(val: unknown): val is ThemeId {
  return val === 'caramel' || val === 'peach' || val === 'amber' || val === 'sand';
}

export function getStoredThemeId(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isValidThemeId(raw) ? raw : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function applyTheme(themeId: ThemeId) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', themeId);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // ignore storage restriction
  }
}
