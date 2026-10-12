export type Theme = "night" | "day";
export type Work = {
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
  name: string;
  channel: string;
  href: string;
  image: string;
  x: number;
  y: number;
  number: string;
};
// Draft-only binding. Asset identity and destination remain separate.
export const islands: Island[] = [
  {
    id: "sky",
    name: "天空之城",
    channel: "WORKS",
    href: "/works/",
    image: works[0].image,
    x: -390,
    y: -180,
    number: "01",
  },
  {
    id: "ancient",
    name: "远古地貌",
    channel: "ABOUT",
    href: "/about/",
    image: works[1].image,
    x: 400,
    y: -190,
    number: "02",
  },
  {
    id: "apocalypse",
    name: "末日星球",
    channel: "STORY",
    href: "/story/",
    image: works[2].image,
    x: -380,
    y: 290,
    number: "03",
  },
  {
    id: "home",
    name: "二次元宅岛",
    channel: "BOARD",
    href: "/board/",
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
