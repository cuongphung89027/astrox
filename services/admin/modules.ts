/**
 * Single source of truth for AstroX feature modules, shared by the web app,
 * the Admin catalog, Pages Functions and the Worker. Add a module here first;
 * `gated` modules are subject to published billing status and per-user access.
 */
export type ModuleDef = {
  id: 'tuvi' | 'zodiac' | 'kinhdich' | 'batu' | 'numerology' | 'tarot' | 'compat' | 'palm' | 'lunar-calendar' | 'experts';
  name: string;
  route: string;
  /** Older slugs that still resolve to this module. */
  legacyRoutes: readonly string[];
  policy: 'profile' | 'session' | 'period';
  gated: boolean;
  description: string;
};

export const MODULES = [
  {
    id: 'tuvi',
    name: 'Tử Vi',
    route: '/tuvi',
    legacyRoutes: [],
    policy: 'profile',
    gated: true,
    description: 'Lá số & vận hạn',
  },
  {
    id: 'zodiac',
    name: 'Cung Hoàng Đạo',
    route: '/cunghoangdao',
    legacyRoutes: ['/hoangdao'],
    policy: 'profile',
    gated: true,
    description: 'Khám phá bản đồ sao',
  },
  {
    id: 'kinhdich',
    name: 'Kinh Dịch',
    route: '/kinhdich',
    legacyRoutes: [],
    policy: 'session',
    gated: true,
    description: 'Gieo quẻ & chiêm nghiệm',
  },
  {
    id: 'batu',
    name: 'Bát Tự',
    route: '/battu',
    legacyRoutes: [],
    policy: 'profile',
    gated: true,
    description: 'Tứ trụ ngũ hành',
  },
  {
    id: 'numerology',
    name: 'Thần Số Học',
    route: '/thansohoc',
    legacyRoutes: ['/thanso'],
    policy: 'profile',
    gated: true,
    description: 'Số chủ đạo & vòng năm',
  },
  {
    id: 'tarot',
    name: 'Tarot',
    route: '/tarot',
    legacyRoutes: [],
    policy: 'session',
    gated: true,
    description: 'Rút lá & lời ngỏ',
  },
  {
    id: 'compat',
    name: 'Tương Hợp',
    route: '/tuonghop',
    legacyRoutes: [],
    policy: 'profile',
    gated: false,
    description: 'Độ hợp của hai người',
  },
  { id: 'lunar-calendar', name: 'Lịch âm', route: '/licham', legacyRoutes: [], policy: 'period', gated: false, description: 'Ngày âm & ngày gia đình' },
  { id: 'palm', name: 'Chỉ tay', route: '/chitay', legacyRoutes: [], policy: 'session', gated: false, description: 'Khám phá đường tay' },
  { id: 'experts', name: 'Đặt lịch chuyên gia', route: '/chuyengia', legacyRoutes: [], policy: 'session', gated: false, description: 'Trao đổi cùng chuyên gia' },
] as const satisfies readonly ModuleDef[];

export type ModuleId = (typeof MODULES)[number]['id'];

export const MODULE_IDS: readonly ModuleId[] = MODULES.map(m => m.id);
export const GATED_MODULE_IDS: readonly ModuleId[] = MODULES.filter(m => m.gated).map(m => m.id);

export function moduleById(id: string) {
  return MODULES.find(m => m.id === id);
}

/** Maps a pathname (canonical or legacy) to its module id, or "" when it is not a module page. */
export function routeModule(pathname: string): ModuleId | '' {
  return MODULES.find(m => m.route === pathname || (m.legacyRoutes as readonly string[]).includes(pathname))?.id ?? '';
}
