export type Theme = "night" | "day";
export type WorkThemeId = "sky" | "ancient" | "apocalypse" | "home";
export const workThemes = [
  { id: "sky", title: "Her", name: "Her", subtitle: "Her", description: "虚拟人物", href: "/works/themes/sky/" },
  { id: "ancient", title: "ZZZ", name: "ZZZ", subtitle: "ZZZ", description: "梦幻世界", href: "/works/themes/ancient/" },
  { id: "apocalypse", title: "FFF", name: "FFF", subtitle: "FFF", description: "机甲战斗", href: "/works/themes/apocalypse/" },
  { id: "home", title: "COS", name: "COS", subtitle: "COS", description: "COSPLAY", href: "/works/themes/home/" },
] satisfies { id: WorkThemeId; title: string; name: string; subtitle: string; description: string; href: string }[];
export type Work = {
  themeId: WorkThemeId;
  slug: string;
  number: string;
  title: string;
  subtitle: string;
  image: string;
  category: string;
  description: string;
  draft: true;
};
export const works: Work[] = [
  {
    themeId: "sky",
    slug: "sky-city",
    number: "01",
    title: "Her",
    subtitle: "虚拟人物",
    image: "/media/v2/islands/sky-day.webp",
    category: "浮岛概念 / DESIGN STUDY",
    description:
      "天空岛概念素材，用于虚拟人物作品集的布局占位。真实作品尚未提供。",
    draft: true,
  },
  {
    themeId: "ancient",
    slug: "ancient-landform",
    number: "02",
    title: "ZZZ",
    subtitle: "梦幻世界",
    image: "/media/v2/islands/ancient-day.webp",
    category: "浮岛概念 / DESIGN STUDY",
    description:
      "亚特兰蒂斯神殿、水道与遗迹概念素材，用于梦幻世界作品集的布局占位。真实作品尚未提供。",
    draft: true,
  },
  {
    themeId: "apocalypse",
    slug: "apocalypse",
    number: "03",
    title: "FFF",
    subtitle: "机甲战斗",
    image: "/media/v2/islands/apocalypse-day.webp",
    category: "浮岛概念 / DESIGN STUDY",
    description:
      "机械星壳、机器人与飞船残骸概念素材，用于机甲战斗作品集的布局占位。真实作品尚未提供。",
    draft: true,
  },
  {
    themeId: "home",
    slug: "anime-home",
    number: "04",
    title: "COS",
    subtitle: "COSPLAY",
    image: "/media/v2/islands/home-day.webp",
    category: "浮岛概念 / DESIGN STUDY",
    description:
      "无限城半剖悬浮岛概念素材，外壳与层叠内景共存，用于COSPLAY作品集的布局占位。真实作品尚未提供。",
    draft: true,
  },
];
export type Island = {
  id: string;
  themeId: WorkThemeId;
  name: string;
  channel: string;
  href: string;
  image: string;
  x: number;
  y: number;
  number: string;
};
// Each island opens its own themed work collection. Content still carries draft provenance.
export const islands: Island[] = [
  {
    id: "sky",
    themeId: "sky",
    name: "Her",
    channel: "Her / 虚拟人物",
    href: "/works/themes/sky/",
    image: works[0].image,
    x: -390,
    y: -180,
    number: "01",
  },
  {
    id: "ancient",
    themeId: "ancient",
    name: "ZZZ",
    channel: "ZZZ / 梦幻世界",
    href: "/works/themes/ancient/",
    image: works[1].image,
    x: 400,
    y: -190,
    number: "02",
  },
  {
    id: "apocalypse",
    themeId: "apocalypse",
    name: "FFF",
    channel: "FFF / 机甲战斗",
    href: "/works/themes/apocalypse/",
    image: works[2].image,
    x: -380,
    y: 290,
    number: "03",
  },
  {
    id: "home",
    themeId: "home",
    name: "COS",
    channel: "COS / COSPLAY",
    href: "/works/themes/home/",
    image: works[3].image,
    x: 390,
    y: 290,
    number: "04",
  },
];
export type GuestbookEntry = {
  id: number;
  callsign: string;
  message: string;
  createdAt: string;
};
