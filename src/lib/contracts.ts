export type Theme = "night" | "day";
export type WorkThemeId = "sky" | "ancient" | "apocalypse" | "home";
export const workThemes = [
  { id: "sky", title: "蓬莱", name: "蓬莱", subtitle: "蓬莱", description: "虚拟人物", href: "/works/themes/sky/" },
  { id: "ancient", title: "瀛洲", name: "瀛洲", subtitle: "瀛洲", description: "梦幻世界", href: "/works/themes/ancient/" },
  { id: "apocalypse", title: "方壶", name: "方壶", subtitle: "方壶", description: "机甲战斗", href: "/works/themes/apocalypse/" },
  { id: "home", title: "岱舆", name: "岱舆", subtitle: "岱舆", description: "COSPLAY", href: "/works/themes/home/" },
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
  media: WorkMedia[];
  processMedia?: WorkMedia[];
};
export type WorkMedia = { src: string; alt: string; caption: string; kind?: "image" | "video"; poster?: string; assetId?: string };
export const works: Work[] = [
  {
    themeId: "ancient",
    slug: "yixuan-football",
    number: "01",
    title: "仪玄｜球场幻想",
    subtitle: "仪玄主题人物视觉",
    image: "/media/v3/works/yixuan-football/01-cover.webp",
    category: "同人视觉创作 · 非官方",
    description:
      "以仪玄为主角的球场主题人物视觉系列。银发、运动服和夜色球场构成同一组画面的节奏；本组为个人同人创作，与游戏官方无关联。",
    media: Array.from({ length: 8 }, (_, index) => ({
      src: `/media/v3/works/yixuan-football/${String(index + 1).padStart(2, "0")}${index === 0 ? "-cover" : ""}.webp`,
      alt: `仪玄球场主题人物视觉第 ${index + 1} 张`,
      caption: `人物视觉 ${String(index + 1).padStart(2, "0")}`,
    })),
    processMedia: [
      { src: "/media/v3/works/yixuan-football/09-reference.webp", alt: "仪玄人物设定参考图", caption: "人物设定参考" },
      { src: "/media/v3/works/yixuan-football/10-contact-sheet.webp", alt: "仪玄球场系列构图合集", caption: "系列构图合集" },
    ],
  },
  {
    themeId: "home",
    slug: "mist-exit-ten-shots",
    number: "02",
    title: "雾尽之处｜十镜",
    subtitle: "30 秒奇幻短片分镜静帧",
    image: "/media/v3/works/mist-exit-ten-shots/07-cover.webp",
    category: "奇幻短片分镜 · 静帧概念",
    description:
      "两人在被巨树与浓雾围住的世界里寻找出口。花朵逼近时，她们选择为彼此开路；风穿过最后一层雾，故事留下一个被注视的结尾。这组内容是十镜静帧与短片方案，尚无完成的视频。",
    media: [
      ["01", "走回原处"], ["02", "光落在眼底"], ["03", "花在看她们"],
      ["04", "退路收紧"], ["05", "不再后退"], ["06", "为彼此开路"],
      ["07-cover", "借你一会儿"], ["08", "风知道出口"],
      ["09", "穿过最后一层雾"], ["10", "她也在凝视"],
    ].map(([file, caption], index) => ({
      src: `/media/v3/works/mist-exit-ten-shots/${file}.webp`,
      alt: `雾尽之处第 ${index + 1} 镜：${caption}`,
      caption: `第 ${String(index + 1).padStart(2, "0")} 镜 · ${caption}`,
    })),
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
// The islands retain their approved environment art; work covers are separate assets.
export const islands: Island[] = [
  {
    id: "sky",
    themeId: "sky",
    name: "蓬莱",
    channel: "蓬莱",
    href: "/works/themes/sky/",
    image: "/media/v2/islands/sky-day.webp",
    x: -390,
    y: -180,
    number: "01",
  },
  {
    id: "ancient",
    themeId: "ancient",
    name: "瀛洲",
    channel: "瀛洲",
    href: "/works/themes/ancient/",
    image: "/media/v2/islands/ancient-day.webp",
    x: 400,
    y: -190,
    number: "02",
  },
  {
    id: "apocalypse",
    themeId: "apocalypse",
    name: "方壶",
    channel: "方壶",
    href: "/works/themes/apocalypse/",
    image: "/media/v2/islands/apocalypse-day.webp",
    x: -380,
    y: 290,
    number: "03",
  },
  {
    id: "home",
    themeId: "home",
    name: "岱舆",
    channel: "岱舆",
    href: "/works/themes/home/",
    image: "/media/v2/islands/home-day.webp",
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
