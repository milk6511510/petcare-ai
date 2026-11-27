import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Palette, Sliders, Sparkles, Upload, X } from 'lucide-react';
import {
  COLLAR_COLOR_SWATCHES,
  findBreedOption,
  getBreedsForSpecies,
  getPresetsForSpecies,
  type CoatPattern
} from '../data/petCatalog';
import { analyzePetPhoto, resolvePetVisual } from '../lib/petAppearance';
import type { Pet, PetAppearance } from '../types';
import { PetCompanion3D } from './PetCompanion3D';
import { RoundedSelect, type RoundedSelectOption } from './RoundedSelect';

export interface PetProfileSubmitPayload {
  mode: 'create' | 'edit';
  petId?: string;
  name: string;
  species: 'dog' | 'cat' | 'other';
  breed: string | null;
  weightKg: number | null;
  avatarEmoji: string;
  appearance: PetAppearance;
}

interface PetAppearanceModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialPet?: Pet | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: PetProfileSubmitPayload) => Promise<void> | void;
}

const PATTERN_OPTIONS: RoundedSelectOption[] = [
  { value: 'bicolor', label: '雙色 / 胸腹白毛（邊牧・柴犬・賓士）' },
  { value: 'solid', label: '單色均勻漸層（英短藍貓・奶油・黑貓）' },
  { value: 'pointed', label: '重點色（布偶・暹羅・耳鼻深色）' },
  { value: 'tabby', label: '虎斑條紋（美短・虎斑米克斯）' },
  { value: 'calico', label: '三花 / 拼色花紋' }
];

const SPECIES_OPTIONS: RoundedSelectOption[] = [
  { value: 'dog', label: '🐶 狗狗（含邊牧、柴犬、哈士奇、柯基、法鬥等）' },
  { value: 'cat', label: '🐱 貓咪（含英短、藍貓、賓士、虎斑、三花、布偶等）' },
  { value: 'other', label: '🐾 其他毛孩（兔兔、倉鼠、刺蝟、鸚鵡等 3D 公仔）' }
];

export const PetAppearanceModal: React.FC<PetAppearanceModalProps> = ({
  open,
  mode,
  initialPet,
  saving = false,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'dog' | 'cat' | 'other'>('dog');
  const [selectedBreedId, setSelectedBreedId] = useState<string>('border-collie');
  const [customBreed, setCustomBreed] = useState('');
  const [weightText, setWeightText] = useState('');
  const [presetId, setPresetId] = useState<string | undefined>(undefined);
  const [primaryColor, setPrimaryColor] = useState('#262A32');
  const [secondaryColor, setSecondaryColor] = useState('#F8F7F4');
  const [pattern, setPattern] = useState<CoatPattern>('bicolor');
  const [collarColor, setCollarColor] = useState('none');
  const [showCustomSliders, setShowCustomSliders] = useState(false);

  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoMatched, setPhotoMatched] = useState(false);
  const [photoSwatches, setPhotoSwatches] = useState<string[]>([]);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhotoPreviewUrl(null);
    setPhotoNote(null);

    if (mode === 'edit' && initialPet) {
      setName(initialPet.name);
      setSpecies(initialPet.species);
      setWeightText(initialPet.weight_kg ? String(initialPet.weight_kg) : '');

      const matchedBreed = findBreedOption(initialPet.species, initialPet.breed, initialPet.appearance?.breedId);
      if (matchedBreed) {
        setSelectedBreedId(matchedBreed.id);
        setCustomBreed('');
      } else {
        setSelectedBreedId('custom');
        setCustomBreed(initialPet.breed || '');
      }

      setPresetId(initialPet.appearance?.presetId);
      setPrimaryColor(initialPet.appearance?.primaryColor || matchedBreed?.defaultPrimary || '#D88342');
      setSecondaryColor(initialPet.appearance?.secondaryColor || matchedBreed?.defaultSecondary || '#FAF6F0');
      setPattern(initialPet.appearance?.pattern || matchedBreed?.defaultPattern || 'bicolor');
      setCollarColor(initialPet.appearance?.collarColor || 'none');
      setPhotoMatched(Boolean(initialPet.appearance?.photoMatched));
      setPhotoSwatches(initialPet.appearance?.photoSwatchHexes || []);
      setShowCustomSliders(false);
    } else {
      setName('');
      setSpecies('dog');
      setSelectedBreedId('border-collie');
      setCustomBreed('');
      setWeightText('');
      setPresetId(undefined);
      setPrimaryColor('#262A32');
      setSecondaryColor('#F8F7F4');
      setPattern('bicolor');
      setCollarColor('none');
      setPhotoMatched(false);
      setPhotoSwatches([]);
      setShowCustomSliders(false);
    }
  }, [open, mode, initialPet]);

  const breedOptions: RoundedSelectOption[] = useMemo(() => {
    const list = getBreedsForSpecies(species).map((b) => ({
      value: b.id,
      label: b.label,
      group: b.group,
      swatchColor: b.defaultPrimary
    }));
    list.push({
      value: 'custom',
      label: '✏️ 自行輸入品種（自訂填寫）',
      group: '自訂',
      swatchColor: primaryColor
    });
    return list;
  }, [species, primaryColor]);

  const speciesPresets = useMemo(() => getPresetsForSpecies(species), [species]);

  const activeBreedObj = useMemo(() => {
    if (selectedBreedId === 'custom') return null;
    return getBreedsForSpecies(species).find((b) => b.id === selectedBreedId) || null;
  }, [species, selectedBreedId]);

  const effectiveBreedText =
    selectedBreedId === 'custom'
      ? customBreed.trim() || null
      : activeBreedObj?.label.split('（')[0] || activeBreedObj?.label || null;

  const previewAppearance: PetAppearance = {
    breedId: selectedBreedId !== 'custom' ? selectedBreedId : undefined,
    presetId,
    primaryColor,
    secondaryColor,
    pattern,
    collarColor,
    photoMatched,
    photoSwatchHexes: photoSwatches
  };

  const visualStatus = useMemo(
    () =>
      resolvePetVisual({
        species,
        breed: effectiveBreedText,
        appearance: previewAppearance
      }),
    [species, effectiveBreedText, previewAppearance]
  );

  function handleSpeciesChange(nextVal: string) {
    const nextSp = (nextVal === 'cat' || nextVal === 'other' ? nextVal : 'dog') as 'dog' | 'cat' | 'other';
    setSpecies(nextSp);
    setPresetId(undefined);
    const list = getBreedsForSpecies(nextSp);
    const first = list[0];
    if (first) {
      setSelectedBreedId(first.id);
      setCustomBreed('');
      setPrimaryColor(first.defaultPrimary);
      setSecondaryColor(first.defaultSecondary);
      setPattern(first.defaultPattern);
    }
  }

  function handleBreedChange(nextId: string) {
    setSelectedBreedId(nextId);
    setPresetId(undefined);
    if (nextId === 'custom') return;
    const found = getBreedsForSpecies(species).find((b) => b.id === nextId);
    if (found) {
      setPrimaryColor(found.defaultPrimary);
      setSecondaryColor(found.defaultSecondary);
      setPattern(found.defaultPattern);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') setPhotoPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);

      const res = await analyzePetPhoto(file, species);
      setPresetId(res.presetId);
      setPrimaryColor(res.primaryColor);
      setSecondaryColor(res.secondaryColor);
      setPattern(res.pattern);
      setPhotoMatched(true);
      setPhotoSwatches(res.swatchHexes);
      setPhotoNote(res.summaryNote);

      if (res.suggestedSpecies && res.suggestedBreedId) {
        setSpecies(res.suggestedSpecies);
        setSelectedBreedId(res.suggestedBreedId);
      }
    } catch {
      setPhotoNote('照片分析失敗，請改選 JPG / PNG 圖片或直接點選預設毛色。');
    } finally {
      setPhotoAnalyzing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const emoji = species === 'cat' ? '🐱' : species === 'other' ? '🐾' : '🐶';
    const parsedWeight = weightText.trim() ? Number(weightText) : null;
    await onSave({
      mode,
      petId: initialPet?.id,
      name: name.trim(),
      species,
      breed: effectiveBreedText,
      weightKg: parsedWeight && !Number.isNaN(parsedWeight) ? parsedWeight : null,
      avatarEmoji: emoji,
      appearance: {
        ...previewAppearance,
        photoMatchNote: photoNote || undefined
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="liquid-glass-strong relative my-auto w-full max-w-2xl rounded-[30px] p-5 sm:p-6 text-[var(--ink-primary)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/85 p-2 text-[var(--ink-secondary)] hover:bg-white transition"
          aria-label="關閉"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-gold)] text-white shadow-md">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">
              {mode === 'create' ? '新增毛孩・3D 公仔客製工坊' : `編輯 ${initialPet?.name} 品種與 3D 外觀`}
            </h2>
            <p className="text-xs text-[var(--ink-secondary)]">
              雙軌外觀引擎：常見毛色使用預渲染 3D 公仔零破圖呈現，並支援柔邊自訂微調與拍照自動配對
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left Column: Live 3D Figurine Stage + Keyless Photo Match */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="flex flex-col items-center justify-center rounded-[24px] border border-white/90 bg-white/65 p-4 shadow-inner">
              <PetCompanion3D
                species={species}
                breed={effectiveBreedText}
                appearance={previewAppearance}
                petName={name.trim() || '毛孩預覽'}
                pendingCount={0}
                doneCount={0}
                totalCount={0}
                previewOnly
              />
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-bold text-[var(--ink-secondary)]">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 border ${
                    visualStatus.skipFurRecolor
                      ? 'bg-[var(--status-ok-bg)] text-[var(--status-ok)] border-[var(--status-ok-border)]'
                      : 'bg-white text-[var(--brand-secondary)] border-white'
                  }`}
                >
                  {visualStatus.skipFurRecolor ? '✨ 預渲染 3D 公仔（零破圖）' : '🎨 柔邊漸層自訂毛色'}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-bold text-[var(--ink-secondary)]">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 border border-white">
                  <span className="h-2.5 w-2.5 rounded-full border border-black/15" style={{ backgroundColor: primaryColor }} />
                  主色 {primaryColor}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 border border-white">
                  <span className="h-2.5 w-2.5 rounded-full border border-black/15" style={{ backgroundColor: secondaryColor }} />
                  副色 {secondaryColor}
                </span>
              </div>
            </div>

            {/* Keyless Photo Auto-Match Box */}
            <div className="rounded-[22px] border border-[var(--brand-secondary-border)] bg-[var(--brand-secondary-light)]/75 p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--brand-secondary-hover)]">
                  <Camera className="h-3.5 w-3.5" /> 上傳毛孩照片自動配色
                </span>
                <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[var(--status-ok)]">
                  免金鑰
                </span>
              </div>

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--brand-secondary-border)] bg-white/85 px-3 py-2.5 text-xs font-bold text-[var(--ink-primary)] hover:bg-white transition">
                <Upload className="h-3.5 w-3.5 text-[var(--brand-secondary)]" />
                <span>{photoAnalyzing ? '分析毛色中...' : '選取毛孩照片自動配對'}</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>

              {photoPreviewUrl && (
                <div className="flex items-center gap-2.5 rounded-xl bg-white/85 p-2">
                  <img src={photoPreviewUrl} alt="上傳毛孩預覽" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold text-[var(--ink-secondary)]">擷取主色調色票</div>
                    <div className="mt-1 flex items-center gap-1">
                      {photoSwatches.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => {
                            setPresetId(undefined);
                            setPrimaryColor(hex);
                          }}
                          title={`點選套用 ${hex}`}
                          className="h-4 w-4 rounded-full border border-black/15 shadow-sm transition hover:scale-110"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[10px] leading-relaxed text-[var(--ink-secondary)]">
                {photoNote || '系統會在裝置端即時分析照片主毛色並優先匹配最接近的預渲染 3D 公仔；也可展開自訂調色微調。'}
              </p>
            </div>
          </div>

          {/* Right Column: Basic Info + Searchable Rounded Breed Select + Presets & Smooth Custom Colors */}
          <div className="md:col-span-7 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-[var(--ink-secondary)]">毛孩名字（必填）</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：邊邊、麻糬、波波"
                  className="w-full rounded-2xl border border-white/85 bg-white/90 px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--ink-secondary)]">體重 kg（選填）</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="120"
                  value={weightText}
                  onChange={(e) => setWeightText(e.target.value)}
                  placeholder="如 14.5"
                  className="w-full rounded-2xl border border-white/85 bg-white/90 px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink-secondary)]">物種分類</label>
              <RoundedSelect
                value={species}
                options={SPECIES_OPTIONS}
                onChange={handleSpeciesChange}
                ariaLabel="選擇物種分類"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--ink-secondary)]">
                品種選擇（支援搜尋或「自行輸入品種」）
              </label>
              <RoundedSelect
                value={selectedBreedId}
                options={breedOptions}
                onChange={handleBreedChange}
                searchable
                searchPlaceholder="輸入關鍵字，如：邊牧、黑柴、英短、賓士、兔..."
                ariaLabel="選擇毛孩品種"
              />
              {selectedBreedId === 'custom' && (
                <input
                  type="text"
                  value={customBreed}
                  onChange={(e) => setCustomBreed(e.target.value)}
                  placeholder="請自行輸入毛孩品種（例如：黑白色邊牧混雪納瑞）"
                  className="mt-2 w-full rounded-2xl border border-[var(--brand-primary-border)] bg-white px-3.5 py-2 text-xs font-semibold outline-none focus:border-[var(--brand-primary)]"
                />
              )}
            </div>

            {/* Dual-track Coat Color Selector */}
            <div className="rounded-[22px] border border-white/85 bg-white/75 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[var(--ink-primary)]">
                  預設 3D 毛色公仔（零破圖切換）
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomSliders((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-[10px] font-bold text-[var(--brand-secondary)] border border-white shadow-sm hover:bg-[var(--brand-primary-light)] transition"
                >
                  <Sliders className="h-3 w-3" />
                  {showCustomSliders ? '收合自訂色盤' : '自訂色盤微調'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {speciesPresets.map((preset) => {
                  const active =
                    (presetId === preset.id ||
                      (primaryColor.toUpperCase() === preset.primaryColor.toUpperCase() &&
                        pattern === preset.pattern));
                  const hasNative = Boolean(preset.nativeAssetBySpecies?.[species]);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setPresetId(preset.id);
                        setPrimaryColor(preset.primaryColor);
                        setSecondaryColor(preset.secondaryColor);
                        setPattern(preset.pattern);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold transition border ${
                        active
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary-hover)] shadow-sm'
                          : 'border-white bg-white/90 text-[var(--ink-secondary)] hover:bg-white'
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-black/15"
                        style={{ backgroundColor: preset.primaryColor }}
                      />
                      <span>{preset.label.split('（')[0]}</span>
                      {hasNative && (
                        <span className="text-[9px] text-[var(--status-ok)]">●</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {showCustomSliders && (
                <div className="space-y-2.5 pt-1 border-t border-white/80">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="flex items-center justify-between gap-2 rounded-2xl bg-white/90 px-3 py-2 border border-white">
                      <span className="text-[11px] font-bold text-[var(--ink-secondary)]">主毛色自訂</span>
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <span className="text-[10px] font-mono text-[var(--ink-muted)]">{primaryColor}</span>
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => {
                            setPresetId(undefined);
                            setPrimaryColor(e.target.value.toUpperCase());
                          }}
                          className="h-6 w-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-2xl bg-white/90 px-3 py-2 border border-white">
                      <span className="text-[11px] font-bold text-[var(--ink-secondary)]">胸腹 / 副色</span>
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <span className="text-[10px] font-mono text-[var(--ink-muted)]">{secondaryColor}</span>
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => {
                            setPresetId(undefined);
                            setSecondaryColor(e.target.value.toUpperCase());
                          }}
                          className="h-6 w-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-[var(--ink-secondary)]">毛色分佈花紋（柔邊混合）</label>
                    <RoundedSelect
                      value={pattern}
                      options={PATTERN_OPTIONS}
                      onChange={(v) => {
                        setPresetId(undefined);
                        setPattern(v as CoatPattern);
                      }}
                      ariaLabel="選擇毛色花紋"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1 text-[11px] font-bold text-[var(--ink-secondary)]">項圈與鈴鐺配色</div>
                <div className="flex flex-wrap gap-1.5">
                  {COLLAR_COLOR_SWATCHES.map((sw) => {
                    const active = collarColor === sw.color;
                    return (
                      <button
                        key={sw.color}
                        type="button"
                        onClick={() => setCollarColor(sw.color)}
                        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition border ${
                          active
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary-hover)]'
                            : 'border-white bg-white/90 text-[var(--ink-secondary)]'
                        }`}
                      >
                        {sw.color !== 'none' && (
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-black/15"
                            style={{ backgroundColor: sw.color }}
                          />
                        )}
                        <span>{sw.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl bg-white/85 px-4 py-2.5 text-xs font-bold text-[var(--ink-secondary)] border border-white"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-hover)] px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:brightness-105 disabled:opacity-60"
                style={{ boxShadow: '0 8px 18px var(--brand-primary-shadow)' }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {saving ? '儲存同步中...' : mode === 'create' ? '確認新增毛孩' : '儲存外觀與資料'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
