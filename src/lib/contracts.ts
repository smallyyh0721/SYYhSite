export type Theme = "night" | "day";
export type WorkThemeId = "sky" | "ancient" | "apocalypse" | "home";
export const workThemes = [
  { id: "sky", title: "天空与建筑", name: "天空之城", subtitle: "SKY & ARCHITECTURE", description: "云端空间、建筑与奇想。", href: "/works/themes/sky/" },
  { id: "ancient", title: "自然与地貌", name: "远古地貌", subtitle: "NATURE & LANDSCAPE", description: "大地、时间与自然的纹理。", href: "/works/themes/ancient/" },
  { id: "apocalypse", title: "科幻与末日", name: "末日星球", subtitle: "SCI-FI & APOCALYPSE", description: "未来世界、废墟与重建的想象。", href: "/works/themes/apocalypse/" },
  { id: "home", title: "二次元与日常", name: "二次元宅岛", subtitle: "ANIME & EVERYDAY", description: "角色、创作与小小的日常。", href: "/works/themes/home/" },
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
    title: "天空之城",
    subtitle: "A SIGNAL ABOVE THE CLOUDS",
    image: "/media/01-sky-city.webp",
    category: "浮岛概念 / DESIGN STUDY",
    description:
      "高塔、桥与悬空的花园。用纵向轮廓描绘一个可以抵达的天空频道。这是本站的设计研究，并非真实客户项目。",
    draft: true,
  },
  {
    themeId: "ancient",
    slug: "ancient-landform",
    number: "02",
    title: "远古地貌",
    subtitle: "TIME LEAVES A TRACE",
    image: "/media/02-ancient-landform.webp",
    category: "浮岛概念 / DESIGN STUDY",
    description:
      "层叠岩台、石环与青绿色水面。探索时间留下的纹理与沉默。正式分层素材将在阶段3补充。",
    draft: true,
  },
  {
    themeId: "apocalypse",
    slug: "apocalypse",
    number: "03",
    title: "末日星球",
    subtitle: "AFTER THE LAST TRANSMISSION",
    image: "/media/03-apocalypse.webp",
    category: "浮岛概念 / DESIGN STUDY",
    description:
      "破碎星球、废弃天线与裂隙里的微光。一张关于失去和重连的概念画面。",
    draft: true,
  },
  {
    themeId: "home",
    slug: "anime-home",
    number: "04",
    title: "二次元宅岛",
    subtitle: "A PLACE TO CREATE",
    image: "/media/04-anime-home.webp",
    category: "浮岛概念 / DESIGN STUDY",
    description:
      "一座放着书、屏幕与小小灵感的空中创作宅。它是原创环境概念，正式个人作品待录入。",
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
    name: "天空之城",
    channel: "SKY WORKS",
    href: "/works/themes/sky/",
    image: works[0].image,
    x: -390,
    y: -180,
    number: "01",
  },
  {
    id: "ancient",
    themeId: "ancient",
    name: "远古地貌",
    channel: "NATURE WORKS",
    href: "/works/themes/ancient/",
    image: works[1].image,
    x: 400,
    y: -190,
    number: "02",
  },
  {
    id: "apocalypse",
    themeId: "apocalypse",
    name: "末日星球",
    channel: "SCI-FI WORKS",
    href: "/works/themes/apocalypse/",
    image: works[2].image,
    x: -380,
    y: 290,
    number: "03",
  },
  {
    id: "home",
    themeId: "home",
    name: "二次元宅岛",
    channel: "ANIME WORKS",
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
