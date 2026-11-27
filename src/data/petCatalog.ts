export type CoatPattern = 'bicolor' | 'solid' | 'tabby' | 'calico' | 'pointed';

export type BaseAssetId =
  | 'shiba'
  | 'shiba-black'
  | 'shiba-white'
  | 'border-collie'
  | 'husky'
  | 'corgi'
  | 'frenchie'
  | 'poodle'
  | 'poodle-white'
  | 'dog-golden'
  | 'kitty'
  | 'cat-bsh'
  | 'cat-bsh-blue'
  | 'cat-tuxedo'
  | 'cat-tabby'
  | 'cat-calico'
  | 'cat-ragdoll'
  | 'cat-black'
  | 'other-bunny'
  | 'other-hamster'
  | 'other-bird';

export interface BreedOption {
  id: string;
  label: string;
  group: string;
  baseAsset: BaseAssetId;
  defaultPrimary: string;
  defaultSecondary: string;
  defaultPattern: CoatPattern;
  keywords: string[];
}

export interface CoatColorPreset {
  id: string;
  label: string;
  primaryColor: string;
  secondaryColor: string;
  pattern: CoatPattern;
  speciesHint: 'dog' | 'cat' | 'other' | 'all';
  /** Direct pre-rendered 3D WebP asset by species so common coats render natively with zero artifacts */
  nativeAssetBySpecies?: Partial<Record<'dog' | 'cat' | 'other', BaseAssetId>>;
}

export const DOG_BREEDS: BreedOption[] = [
  // 牧羊與工作犬（包含邊境牧羊犬）
  {
    id: 'border-collie',
    label: '邊境牧羊犬（邊牧）',
    group: '牧羊與中大型犬',
    baseAsset: 'border-collie',
    defaultPrimary: '#262A32',
    defaultSecondary: '#F8F7F4',
    defaultPattern: 'bicolor',
    keywords: ['邊牧', '邊境牧羊犬', 'border collie', 'collie']
  },
  {
    id: 'corgi',
    label: '柯基犬（威爾斯柯基）',
    group: '牧羊與中大型犬',
    baseAsset: 'corgi',
    defaultPrimary: '#DC8B42',
    defaultSecondary: '#FBF7F0',
    defaultPattern: 'bicolor',
    keywords: ['柯基', 'corgi']
  },
  {
    id: 'shiba',
    label: '柴犬（赤柴）',
    group: '牧羊與中大型犬',
    baseAsset: 'shiba',
    defaultPrimary: '#D88342',
    defaultSecondary: '#FBF6EE',
    defaultPattern: 'bicolor',
    keywords: ['柴犬', 'shiba', '赤柴']
  },
  {
    id: 'shiba-black',
    label: '黑柴犬（四目黑柴）',
    group: '牧羊與中大型犬',
    baseAsset: 'shiba-black',
    defaultPrimary: '#24272D',
    defaultSecondary: '#E6C296',
    defaultPattern: 'bicolor',
    keywords: ['黑柴', 'black shiba']
  },
  {
    id: 'shiba-white',
    label: '白柴犬（雪白柴犬）',
    group: '牧羊與中大型犬',
    baseAsset: 'shiba-white',
    defaultPrimary: '#F5F4F0',
    defaultSecondary: '#FFFFFF',
    defaultPattern: 'solid',
    keywords: ['白柴', 'white shiba']
  },
  {
    id: 'golden-retriever',
    label: '黃金獵犬',
    group: '牧羊與中大型犬',
    baseAsset: 'dog-golden',
    defaultPrimary: '#E6AE5E',
    defaultSecondary: '#F8E5C3',
    defaultPattern: 'bicolor',
    keywords: ['黃金獵犬', 'golden']
  },
  {
    id: 'labrador',
    label: '拉布拉多犬',
    group: '牧羊與中大型犬',
    baseAsset: 'dog-golden',
    defaultPrimary: '#EAD2A8',
    defaultSecondary: '#F7ECD6',
    defaultPattern: 'solid',
    keywords: ['拉布拉多', 'labrador']
  },
  {
    id: 'husky',
    label: '哈士奇（西伯利亞雪橇犬）',
    group: '牧羊與中大型犬',
    baseAsset: 'husky',
    defaultPrimary: '#6D747E',
    defaultSecondary: '#F8F9FA',
    defaultPattern: 'bicolor',
    keywords: ['哈士奇', 'husky']
  },
  {
    id: 'samoyed',
    label: '薩摩耶犬',
    group: '牧羊與中大型犬',
    baseAsset: 'shiba-white',
    defaultPrimary: '#F5F4F0',
    defaultSecondary: '#FFFFFF',
    defaultPattern: 'solid',
    keywords: ['薩摩耶', 'samoyed']
  },
  {
    id: 'australian-shepherd',
    label: '澳洲牧羊犬',
    group: '牧羊與中大型犬',
    baseAsset: 'border-collie',
    defaultPrimary: '#63534A',
    defaultSecondary: '#F7F3EC',
    defaultPattern: 'bicolor',
    keywords: ['澳洲牧羊犬', 'aussie']
  },
  {
    id: 'sheltie',
    label: '喜樂蒂牧羊犬',
    group: '牧羊與中大型犬',
    baseAsset: 'border-collie',
    defaultPrimary: '#B86E39',
    defaultSecondary: '#FAF6EE',
    defaultPattern: 'bicolor',
    keywords: ['喜樂蒂', 'sheltie']
  },
  {
    id: 'german-shepherd',
    label: '德國牧羊犬（狼犬）',
    group: '牧羊與中大型犬',
    baseAsset: 'shiba-black',
    defaultPrimary: '#8C6239',
    defaultSecondary: '#2A2521',
    defaultPattern: 'bicolor',
    keywords: ['德國牧羊犬', '狼犬', 'shepherd']
  },
  {
    id: 'akita',
    label: '秋田犬',
    group: '牧羊與中大型犬',
    baseAsset: 'shiba',
    defaultPrimary: '#D4844A',
    defaultSecondary: '#F9F6F0',
    defaultPattern: 'bicolor',
    keywords: ['秋田', 'akita']
  },
  {
    id: 'bernese',
    label: '伯恩山犬',
    group: '牧羊與中大型犬',
    baseAsset: 'shiba-black',
    defaultPrimary: '#26282E',
    defaultSecondary: '#C8763C',
    defaultPattern: 'bicolor',
    keywords: ['伯恩山', 'bernese']
  },
  {
    id: 'pyrenees',
    label: '大白熊犬（庇里牛斯山犬）',
    group: '牧羊與中大型犬',
    baseAsset: 'shiba-white',
    defaultPrimary: '#F5F4F0',
    defaultSecondary: '#FFFFFF',
    defaultPattern: 'solid',
    keywords: ['大白熊', 'pyrenees']
  },
  {
    id: 'chow',
    label: '鬆獅犬',
    group: '牧羊與中大型犬',
    baseAsset: 'poodle',
    defaultPrimary: '#CC8246',
    defaultSecondary: '#E8B584',
    defaultPattern: 'solid',
    keywords: ['鬆獅', 'chow']
  },
  {
    id: 'doberman',
    label: '杜賓犬',
    group: '牧羊與中大型犬',
    baseAsset: 'shiba-black',
    defaultPrimary: '#282B30',
    defaultSecondary: '#A8643A',
    defaultPattern: 'bicolor',
    keywords: ['杜賓', 'doberman']
  },
  {
    id: 'rottweiler',
    label: '羅威納犬',
    group: '牧羊與中大型犬',
    baseAsset: 'shiba-black',
    defaultPrimary: '#24272D',
    defaultSecondary: '#B36B3B',
    defaultPattern: 'bicolor',
    keywords: ['羅威納', 'rottweiler']
  },
  {
    id: 'dalmatian',
    label: '大麥町（斑點狗）',
    group: '牧羊與中大型犬',
    baseAsset: 'dog-golden',
    defaultPrimary: '#F7F6F3',
    defaultSecondary: '#2A2C32',
    defaultPattern: 'calico',
    keywords: ['大麥町', '斑點狗', 'dalmatian']
  },
  {
    id: 'formosan',
    label: '台灣土狗（台灣犬）',
    group: '牧羊與中大型犬',
    baseAsset: 'shiba-black',
    defaultPrimary: '#353230',
    defaultSecondary: '#615850',
    defaultPattern: 'solid',
    keywords: ['台灣犬', '台灣土狗', '土狗']
  },
  // 小型與伴侶犬
  {
    id: 'poodle',
    label: '貴賓犬 / 泰迪（紅貴賓・奶油貴賓）',
    group: '小型與伴侶犬',
    baseAsset: 'poodle',
    defaultPrimary: '#E3B98E',
    defaultSecondary: '#F8E6D2',
    defaultPattern: 'solid',
    keywords: ['貴賓', '泰迪', 'poodle', '紅貴賓']
  },
  {
    id: 'bichon',
    label: '比熊犬 / 白貴賓',
    group: '小型與伴侶犬',
    baseAsset: 'poodle-white',
    defaultPrimary: '#F4F2EE',
    defaultSecondary: '#FFFFFF',
    defaultPattern: 'solid',
    keywords: ['比熊', '白貴賓', 'bichon']
  },
  {
    id: 'maltese',
    label: '馬爾濟斯',
    group: '小型與伴侶犬',
    baseAsset: 'poodle-white',
    defaultPrimary: '#F4F2EE',
    defaultSecondary: '#FFF9F2',
    defaultPattern: 'solid',
    keywords: ['馬爾濟斯', 'maltese']
  },
  {
    id: 'pomeranian',
    label: '博美犬',
    group: '小型與伴侶犬',
    baseAsset: 'shiba',
    defaultPrimary: '#E8A45C',
    defaultSecondary: '#FAEAD4',
    defaultPattern: 'bicolor',
    keywords: ['博美', 'pomeranian']
  },
  {
    id: 'frenchie',
    label: '法國鬥牛犬（法鬥）',
    group: '小型與伴侶犬',
    baseAsset: 'frenchie',
    defaultPrimary: '#EAD4B6',
    defaultSecondary: '#403834',
    defaultPattern: 'bicolor',
    keywords: ['法鬥', '法國鬥牛犬', 'frenchie']
  },
  {
    id: 'pug',
    label: '巴哥犬（哈巴狗）',
    group: '小型與伴侶犬',
    baseAsset: 'frenchie',
    defaultPrimary: '#EAD4B6',
    defaultSecondary: '#403834',
    defaultPattern: 'pointed',
    keywords: ['巴哥', 'pug']
  },
  {
    id: 'dachshund',
    label: '臘腸犬（迷你 / 長毛）',
    group: '小型與伴侶犬',
    baseAsset: 'dog-golden',
    defaultPrimary: '#8C4E2B',
    defaultSecondary: '#D8965A',
    defaultPattern: 'bicolor',
    keywords: ['臘腸', 'dachshund']
  },
  {
    id: 'chihuahua',
    label: '吉娃娃',
    group: '小型與伴侶犬',
    baseAsset: 'corgi',
    defaultPrimary: '#DFB684',
    defaultSecondary: '#FAF3E8',
    defaultPattern: 'bicolor',
    keywords: ['吉娃娃', 'chihuahua']
  },
  {
    id: 'schnauzer',
    label: '雪納瑞（迷你 / 標準）',
    group: '小型與伴侶犬',
    baseAsset: 'poodle',
    defaultPrimary: '#6F7780',
    defaultSecondary: '#E7EAED',
    defaultPattern: 'bicolor',
    keywords: ['雪納瑞', 'schnauzer']
  },
  {
    id: 'shih-tzu',
    label: '西施犬',
    group: '小型與伴侶犬',
    baseAsset: 'poodle-white',
    defaultPrimary: '#B8895C',
    defaultSecondary: '#F8F5EE',
    defaultPattern: 'bicolor',
    keywords: ['西施', 'shih tzu']
  },
  {
    id: 'yorkie',
    label: '約克夏梗',
    group: '小型與伴侶犬',
    baseAsset: 'poodle',
    defaultPrimary: '#987A5C',
    defaultSecondary: '#D8A66A',
    defaultPattern: 'bicolor',
    keywords: ['約克夏', 'yorkie']
  },
  {
    id: 'beagle',
    label: '米格魯（小獵犬）',
    group: '小型與伴侶犬',
    baseAsset: 'corgi',
    defaultPrimary: '#B96B3A',
    defaultSecondary: '#F8F6F2',
    defaultPattern: 'calico',
    keywords: ['米格魯', 'beagle']
  },
  {
    id: 'cocker-spaniel',
    label: '美國可卡犬',
    group: '小型與伴侶犬',
    baseAsset: 'dog-golden',
    defaultPrimary: '#C8844A',
    defaultSecondary: '#FAF4EB',
    defaultPattern: 'bicolor',
    keywords: ['可卡', 'cocker']
  },
  {
    id: 'cavalier',
    label: '查理士王小獵犬',
    group: '小型與伴侶犬',
    baseAsset: 'dog-golden',
    defaultPrimary: '#B46238',
    defaultSecondary: '#FAF6F0',
    defaultPattern: 'bicolor',
    keywords: ['查理士', 'cavalier']
  },
  {
    id: 'papillon',
    label: '蝴蝶犬',
    group: '小型與伴侶犬',
    baseAsset: 'border-collie',
    defaultPrimary: '#F7F5F0',
    defaultSecondary: '#9B5F39',
    defaultPattern: 'bicolor',
    keywords: ['蝴蝶犬', 'papillon']
  },
  {
    id: 'jack-russell',
    label: '傑克羅素梗',
    group: '小型與伴侶犬',
    baseAsset: 'corgi',
    defaultPrimary: '#F7F5F2',
    defaultSecondary: '#B96B3A',
    defaultPattern: 'bicolor',
    keywords: ['傑克羅素', 'jack russell']
  },
  {
    id: 'min-pin',
    label: '迷你杜賓犬（小鹿犬）',
    group: '小型與伴侶犬',
    baseAsset: 'shiba-black',
    defaultPrimary: '#362D2A',
    defaultSecondary: '#B86A39',
    defaultPattern: 'bicolor',
    keywords: ['迷你杜賓', '小鹿犬', 'pinscher']
  },
  {
    id: 'spitz',
    label: '狐狸犬（日本尖嘴犬）',
    group: '小型與伴侶犬',
    baseAsset: 'shiba-white',
    defaultPrimary: '#F5F4F0',
    defaultSecondary: '#FFFFFF',
    defaultPattern: 'solid',
    keywords: ['狐狸犬', '尖嘴犬', 'spitz']
  },
  {
    id: 'westie',
    label: '西高地白梗',
    group: '小型與伴侶犬',
    baseAsset: 'poodle-white',
    defaultPrimary: '#F4F2EE',
    defaultSecondary: '#FFFFFF',
    defaultPattern: 'solid',
    keywords: ['西高地', 'westie']
  },
  {
    id: 'mix-dog',
    label: '米克斯犬（混種寶貝）',
    group: '米克斯與其他犬種',
    baseAsset: 'shiba',
    defaultPrimary: '#C68852',
    defaultSecondary: '#F8EFE2',
    defaultPattern: 'bicolor',
    keywords: ['米克斯', '混種', 'mix']
  }
];

export const CAT_BREEDS: BreedOption[] = [
  // 人氣短毛貓
  {
    id: 'bsh',
    label: '英國短毛貓（奶油金漸層）',
    group: '人氣短毛貓',
    baseAsset: 'cat-bsh',
    defaultPrimary: '#EADBC8',
    defaultSecondary: '#FFF5EB',
    defaultPattern: 'solid',
    keywords: ['英短', '英國短毛貓', '奶油英短', '金漸層', 'bsh']
  },
  {
    id: 'russian-blue',
    label: '英國短毛藍貓 / 俄羅斯藍貓',
    group: '人氣短毛貓',
    baseAsset: 'cat-bsh-blue',
    defaultPrimary: '#7A8A98',
    defaultSecondary: '#BAC5CF',
    defaultPattern: 'solid',
    keywords: ['藍貓', '俄藍', '俄羅斯藍貓', 'russian blue']
  },
  {
    id: 'ash',
    label: '美國短毛貓（銀灰虎斑）',
    group: '人氣短毛貓',
    baseAsset: 'cat-tabby',
    defaultPrimary: '#8A9098',
    defaultSecondary: '#F6F5F2',
    defaultPattern: 'tabby',
    keywords: ['美短', '美國短毛貓', 'ash']
  },
  {
    id: 'scottish-fold',
    label: '蘇格蘭折耳貓',
    group: '人氣短毛貓',
    baseAsset: 'cat-bsh',
    defaultPrimary: '#EADBC8',
    defaultSecondary: '#FFF5EB',
    defaultPattern: 'solid',
    keywords: ['折耳', '蘇格蘭折耳', 'fold']
  },
  {
    id: 'munchkin',
    label: '曼赤肯（短腿貓）',
    group: '人氣短毛貓',
    baseAsset: 'kitty',
    defaultPrimary: '#EB974A',
    defaultSecondary: '#FAF6F0',
    defaultPattern: 'bicolor',
    keywords: ['曼赤肯', '短腿貓', 'munchkin']
  },
  {
    id: 'siamese',
    label: '暹羅貓（重點色）',
    group: '人氣短毛貓',
    baseAsset: 'cat-ragdoll',
    defaultPrimary: '#F6F0E6',
    defaultSecondary: '#665246',
    defaultPattern: 'pointed',
    keywords: ['暹羅', 'siamese']
  },
  {
    id: 'bengal',
    label: '孟加拉豹貓',
    group: '人氣短毛貓',
    baseAsset: 'cat-tabby',
    defaultPrimary: '#CC8A45',
    defaultSecondary: '#5B3E22',
    defaultPattern: 'tabby',
    keywords: ['豹貓', '孟加拉', 'bengal']
  },
  {
    id: 'exotic-shorthair',
    label: '異國短毛貓（加菲貓）',
    group: '人氣短毛貓',
    baseAsset: 'cat-bsh',
    defaultPrimary: '#E7964B',
    defaultSecondary: '#F9E7D2',
    defaultPattern: 'bicolor',
    keywords: ['加菲貓', '異國短毛貓', 'exotic']
  },
  {
    id: 'abyssinian',
    label: '阿比西尼亞貓',
    group: '人氣短毛貓',
    baseAsset: 'kitty',
    defaultPrimary: '#BD6E3E',
    defaultSecondary: '#E7BA8D',
    defaultPattern: 'solid',
    keywords: ['阿比西尼亞', 'abyssinian']
  },
  {
    id: 'burmese',
    label: '緬甸貓',
    group: '人氣短毛貓',
    baseAsset: 'cat-ragdoll',
    defaultPrimary: '#7B5F4D',
    defaultSecondary: '#C3A894',
    defaultPattern: 'solid',
    keywords: ['緬甸貓', 'burmese']
  },
  {
    id: 'egyptian-mau',
    label: '埃及貓',
    group: '人氣短毛貓',
    baseAsset: 'cat-tabby',
    defaultPrimary: '#8A9098',
    defaultSecondary: '#F6F5F2',
    defaultPattern: 'tabby',
    keywords: ['埃及貓', 'mau']
  },
  {
    id: 'american-curl',
    label: '美國捲耳貓',
    group: '人氣短毛貓',
    baseAsset: 'kitty',
    defaultPrimary: '#E8D5C0',
    defaultSecondary: '#FFF8F0',
    defaultPattern: 'bicolor',
    keywords: ['捲耳貓', 'curl']
  },
  {
    id: 'selkirk-rex',
    label: '賽爾凱克捲毛貓（羊咩咩貓）',
    group: '人氣短毛貓',
    baseAsset: 'cat-bsh',
    defaultPrimary: '#EADBC8',
    defaultSecondary: '#FFF5EB',
    defaultPattern: 'solid',
    keywords: ['賽爾凱克', '捲毛貓', 'selkirk']
  },
  {
    id: 'sphynx',
    label: '無毛貓（斯芬克斯貓）',
    group: '人氣短毛貓',
    baseAsset: 'cat-bsh',
    defaultPrimary: '#EAD0C3',
    defaultSecondary: '#D8B7A7',
    defaultPattern: 'solid',
    keywords: ['無毛貓', '斯芬克斯', 'sphynx']
  },
  {
    id: 'devon-rex',
    label: '德文捲毛貓',
    group: '人氣短毛貓',
    baseAsset: 'cat-bsh',
    defaultPrimary: '#E3D5C5',
    defaultSecondary: '#F8F4EE',
    defaultPattern: 'bicolor',
    keywords: ['德文', 'devon']
  },
  // 長毛仙女貓
  {
    id: 'ragdoll',
    label: '布偶貓（雙色 / 重點色）',
    group: '長毛與仙女貓',
    baseAsset: 'cat-ragdoll',
    defaultPrimary: '#F6F0E6',
    defaultSecondary: '#665246',
    defaultPattern: 'pointed',
    keywords: ['布偶', 'ragdoll']
  },
  {
    id: 'birman',
    label: '伯曼貓（緬甸聖貓）',
    group: '長毛與仙女貓',
    baseAsset: 'cat-ragdoll',
    defaultPrimary: '#F6F0E6',
    defaultSecondary: '#665246',
    defaultPattern: 'pointed',
    keywords: ['伯曼', 'birman']
  },
  {
    id: 'himalayan',
    label: '喜馬拉雅貓',
    group: '長毛與仙女貓',
    baseAsset: 'cat-ragdoll',
    defaultPrimary: '#F6F0E6',
    defaultSecondary: '#665246',
    defaultPattern: 'pointed',
    keywords: ['喜馬拉雅', 'himalayan']
  },
  {
    id: 'maine-coon',
    label: '緬因貓',
    group: '長毛與仙女貓',
    baseAsset: 'cat-tabby',
    defaultPrimary: '#8C745D',
    defaultSecondary: '#EDE6DD',
    defaultPattern: 'tabby',
    keywords: ['緬因', 'maine coon']
  },
  {
    id: 'persian',
    label: '波斯貓',
    group: '長毛與仙女貓',
    baseAsset: 'cat-bsh',
    defaultPrimary: '#F7F5F2',
    defaultSecondary: '#FFFFFF',
    defaultPattern: 'solid',
    keywords: ['波斯', 'persian']
  },
  {
    id: 'chinchilla',
    label: '金吉拉貓（銀漸層）',
    group: '長毛與仙女貓',
    baseAsset: 'cat-bsh',
    defaultPrimary: '#EAECEE',
    defaultSecondary: '#FFFFFF',
    defaultPattern: 'solid',
    keywords: ['金吉拉', 'chinchilla']
  },
  {
    id: 'norwegian-forest',
    label: '挪威森林貓',
    group: '長毛與仙女貓',
    baseAsset: 'cat-tabby',
    defaultPrimary: '#A98A6C',
    defaultSecondary: '#F8F5F0',
    defaultPattern: 'bicolor',
    keywords: ['挪威森林', 'norwegian']
  },
  {
    id: 'siberian',
    label: '西伯利亞森林貓',
    group: '長毛與仙女貓',
    baseAsset: 'cat-tabby',
    defaultPrimary: '#BD9B78',
    defaultSecondary: '#FAF6F0',
    defaultPattern: 'tabby',
    keywords: ['西伯利亞', 'siberian']
  },
  // 台灣常見米克斯貓
  {
    id: 'mix-cat-orange',
    label: '米克斯橘貓（白底橘 / 橘虎斑）',
    group: '台灣米克斯貓',
    baseAsset: 'kitty',
    defaultPrimary: '#EB974A',
    defaultSecondary: '#FAF6F0',
    defaultPattern: 'bicolor',
    keywords: ['橘貓', '米克斯', 'mikan', 'orange']
  },
  {
    id: 'mix-cat-tuxedo',
    label: '米克斯賓士貓（黑白雙色）',
    group: '台灣米克斯貓',
    baseAsset: 'cat-tuxedo',
    defaultPrimary: '#2A2E36',
    defaultSecondary: '#F8F8F7',
    defaultPattern: 'bicolor',
    keywords: ['賓士貓', '黑白貓', 'tuxedo']
  },
  {
    id: 'mix-cat-calico',
    label: '米克斯三花貓',
    group: '台灣米克斯貓',
    baseAsset: 'cat-calico',
    defaultPrimary: '#EA9244',
    defaultSecondary: '#2E3036',
    defaultPattern: 'calico',
    keywords: ['三花', 'calico']
  },
  {
    id: 'mix-cat-tabby',
    label: '米克斯虎斑貓（白底虎斑 / 銀灰虎斑）',
    group: '台灣米克斯貓',
    baseAsset: 'cat-tabby',
    defaultPrimary: '#8A9098',
    defaultSecondary: '#F6F5F2',
    defaultPattern: 'tabby',
    keywords: ['虎斑', 'tabby']
  },
  {
    id: 'mix-cat-black',
    label: '米克斯黑貓',
    group: '台灣米克斯貓',
    baseAsset: 'cat-black',
    defaultPrimary: '#2C3038',
    defaultSecondary: '#4A505C',
    defaultPattern: 'solid',
    keywords: ['黑貓', 'black']
  },
  {
    id: 'mix-cat-white',
    label: '米克斯白貓',
    group: '台灣米克斯貓',
    baseAsset: 'cat-bsh',
    defaultPrimary: '#F7F6F3',
    defaultSecondary: '#FFE4E7',
    defaultPattern: 'solid',
    keywords: ['白貓', 'white']
  },
  {
    id: 'mix-cat-tortie',
    label: '米克斯玳瑁貓',
    group: '台灣米克斯貓',
    baseAsset: 'cat-calico',
    defaultPrimary: '#463830',
    defaultSecondary: '#C87C40',
    defaultPattern: 'calico',
    keywords: ['玳瑁', 'tortie']
  }
];

export const OTHER_BREEDS: BreedOption[] = [
  {
    id: 'bunny-lop',
    label: '荷蘭垂耳兔 / 侏儒兔',
    group: '小動物與特殊寵物',
    baseAsset: 'other-bunny',
    defaultPrimary: '#F7ECE0',
    defaultSecondary: '#FFFAF6',
    defaultPattern: 'bicolor',
    keywords: ['兔', '垂耳兔', 'bunny', 'rabbit']
  },
  {
    id: 'hamster',
    label: '黃金鼠 / 三線倉鼠',
    group: '小動物與特殊寵物',
    baseAsset: 'other-hamster',
    defaultPrimary: '#E8AE6C',
    defaultSecondary: '#FCF4E8',
    defaultPattern: 'bicolor',
    keywords: ['倉鼠', '黃金鼠', 'hamster']
  },
  {
    id: 'guinea-pig',
    label: '天竺鼠',
    group: '小動物與特殊寵物',
    baseAsset: 'other-hamster',
    defaultPrimary: '#C47A4B',
    defaultSecondary: '#FAF4EC',
    defaultPattern: 'calico',
    keywords: ['天竺鼠', 'guinea']
  },
  {
    id: 'hedgehog',
    label: '非洲迷你刺蝟',
    group: '小動物與特殊寵物',
    baseAsset: 'other-hamster',
    defaultPrimary: '#947B64',
    defaultSecondary: '#F8F2EA',
    defaultPattern: 'bicolor',
    keywords: ['刺蝟', 'hedgehog']
  },
  {
    id: 'sugar-glider',
    label: '蜜袋鼯',
    group: '小動物與特殊寵物',
    baseAsset: 'other-hamster',
    defaultPrimary: '#A5AAB0',
    defaultSecondary: '#F7F8FA',
    defaultPattern: 'bicolor',
    keywords: ['蜜袋鼯']
  },
  {
    id: 'parrot',
    label: '玄鳳 / 虎皮鸚鵡',
    group: '小動物與特殊寵物',
    baseAsset: 'other-bird',
    defaultPrimary: '#F8D65C',
    defaultSecondary: '#FFF8E0',
    defaultPattern: 'bicolor',
    keywords: ['鸚鵡', '鳥', 'parrot']
  }
];

export const COAT_COLOR_PRESETS: CoatColorPreset[] = [
  {
    id: 'warm-orange',
    label: '焦糖橘 / 赤柴（橘白經典）',
    primaryColor: '#D88342',
    secondaryColor: '#FBF6EE',
    pattern: 'bicolor',
    speciesHint: 'all',
    nativeAssetBySpecies: { dog: 'shiba', cat: 'kitty', other: 'other-hamster' }
  },
  {
    id: 'classic-bw',
    label: '經典黑白（邊牧・賓士貓）',
    primaryColor: '#262A32',
    secondaryColor: '#F8F7F4',
    pattern: 'bicolor',
    speciesHint: 'all',
    nativeAssetBySpecies: { dog: 'border-collie', cat: 'cat-tuxedo' }
  },
  {
    id: 'black-tan-shiba',
    label: '四目黑柴（黑底焦糖眉）',
    primaryColor: '#24272D',
    secondaryColor: '#E6C296',
    pattern: 'bicolor',
    speciesHint: 'dog',
    nativeAssetBySpecies: { dog: 'shiba-black' }
  },
  {
    id: 'snow-white',
    label: '純淨雪白（白柴・薩摩・白貴賓）',
    primaryColor: '#F5F4F0',
    secondaryColor: '#FFFFFF',
    pattern: 'solid',
    speciesHint: 'all',
    nativeAssetBySpecies: { dog: 'shiba-white', cat: 'cat-bsh', other: 'other-bunny' }
  },
  {
    id: 'husky-wolf',
    label: '狼灰雪白（哈士奇・銀漸層）',
    primaryColor: '#6D747E',
    secondaryColor: '#F8F9FA',
    pattern: 'bicolor',
    speciesHint: 'all',
    nativeAssetBySpecies: { dog: 'husky', cat: 'cat-tabby' }
  },
  {
    id: 'bsh-cream',
    label: '奶油香草（英短奶油・黃金）',
    primaryColor: '#EADBC8',
    secondaryColor: '#FFF5EB',
    pattern: 'solid',
    speciesHint: 'all',
    nativeAssetBySpecies: { dog: 'dog-golden', cat: 'cat-bsh', other: 'other-bunny' }
  },
  {
    id: 'bsh-blue',
    label: '藍灰色（英短藍貓・俄藍）',
    primaryColor: '#7A8A98',
    secondaryColor: '#BAC5CF',
    pattern: 'solid',
    speciesHint: 'cat',
    nativeAssetBySpecies: { cat: 'cat-bsh-blue' }
  },
  {
    id: 'tabby-silver',
    label: '銀灰虎斑（美短・米克斯虎斑）',
    primaryColor: '#8A9098',
    secondaryColor: '#F6F5F2',
    pattern: 'tabby',
    speciesHint: 'cat',
    nativeAssetBySpecies: { cat: 'cat-tabby' }
  },
  {
    id: 'calico-tri',
    label: '三花 / 拼色花紋',
    primaryColor: '#EA9244',
    secondaryColor: '#2E3036',
    pattern: 'calico',
    speciesHint: 'all',
    nativeAssetBySpecies: { cat: 'cat-calico' }
  },
  {
    id: 'pointed-seal',
    label: '海豹重點色（布偶・暹羅・法鬥）',
    primaryColor: '#F6F0E6',
    secondaryColor: '#665246',
    pattern: 'pointed',
    speciesHint: 'all',
    nativeAssetBySpecies: { dog: 'frenchie', cat: 'cat-ragdoll' }
  },
  {
    id: 'choco-brown',
    label: '紅貴賓 / 焦糖可可',
    primaryColor: '#E3B98E',
    secondaryColor: '#F8E6D2',
    pattern: 'solid',
    speciesHint: 'all',
    nativeAssetBySpecies: { dog: 'poodle' }
  },
  {
    id: 'obsidian-black',
    label: '曜石純黑（黑貓・黑犬）',
    primaryColor: '#2C3038',
    secondaryColor: '#4A505C',
    pattern: 'solid',
    speciesHint: 'all',
    nativeAssetBySpecies: { dog: 'shiba-black', cat: 'cat-black' }
  }
];

export const COLLAR_COLOR_SWATCHES = [
  { label: '無項圈', color: 'none' },
  { label: '暖焦糖', color: '#C47449' },
  { label: '蜜桃珊瑚', color: '#FF7E5F' },
  { label: '森林鼠尾草', color: '#52784D' },
  { label: '晴空藍', color: '#4E87A8' },
  { label: '奶油金', color: '#D89C4A' },
  { label: '櫻花粉', color: '#E8889E' }
];

export function getBreedsForSpecies(species: 'dog' | 'cat' | 'other'): BreedOption[] {
  if (species === 'cat') return CAT_BREEDS;
  if (species === 'other') return OTHER_BREEDS;
  return DOG_BREEDS;
}

export function getPresetsForSpecies(species: 'dog' | 'cat' | 'other'): CoatColorPreset[] {
  return COAT_COLOR_PRESETS.filter(
    (p) => p.speciesHint === 'all' || p.speciesHint === species
  );
}

export function findBreedOption(
  species: 'dog' | 'cat' | 'other',
  breedText?: string | null,
  breedId?: string | null
): BreedOption | null {
  const list = getBreedsForSpecies(species);
  if (breedId) {
    const byId = list.find((b) => b.id === breedId);
    if (byId) return byId;
  }
  const q = (breedText || '').trim().toLowerCase();
  if (!q) return null;
  const exact = list.find((b) => b.label.toLowerCase() === q);
  if (exact) return exact;
  return list.find((b) => b.keywords.some((k) => q.includes(k.toLowerCase()))) ?? null;
}

export function getBaseAssetPath(baseAsset: BaseAssetId): string {
  switch (baseAsset) {
    case 'shiba-black':
      return '/assets/pets/dog-shiba-black.webp';
    case 'shiba-white':
      return '/assets/pets/dog-shiba-white.webp';
    case 'border-collie':
      return '/assets/pets/dog-border-collie.webp';
    case 'husky':
      return '/assets/pets/dog-husky.webp';
    case 'corgi':
      return '/assets/pets/dog-corgi.webp';
    case 'frenchie':
      return '/assets/pets/dog-frenchie.webp';
    case 'poodle':
      return '/assets/pets/dog-poodle.webp';
    case 'poodle-white':
      return '/assets/pets/dog-poodle-white.webp';
    case 'dog-golden':
      return '/assets/pets/dog-golden.webp';
    case 'kitty':
      return '/assets/pets/kitty-mikan.webp';
    case 'cat-bsh':
      return '/assets/pets/cat-bsh.webp';
    case 'cat-bsh-blue':
      return '/assets/pets/cat-bsh-blue.webp';
    case 'cat-tuxedo':
      return '/assets/pets/cat-tuxedo.webp';
    case 'cat-tabby':
      return '/assets/pets/cat-tabby.webp';
    case 'cat-calico':
      return '/assets/pets/cat-calico.webp';
    case 'cat-ragdoll':
      return '/assets/pets/cat-ragdoll.webp';
    case 'cat-black':
      return '/assets/pets/cat-black.webp';
    case 'other-bunny':
      return '/assets/pets/other-bunny.webp';
    case 'other-hamster':
      return '/assets/pets/other-hamster.webp';
    case 'other-bird':
      return '/assets/pets/other-bird.webp';
    case 'shiba':
    default:
      return '/assets/pets/shiba-bobo.webp';
  }
}
