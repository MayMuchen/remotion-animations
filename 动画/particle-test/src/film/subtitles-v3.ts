// Silent-cut subtitles. Each shot carries one sentence, not the full VO
// paragraph: the picture should lead, and the text has to land inside a 4-5s
// shot without turning into reading homework. English stays as a quiet echo.
export type SilentSubtitle = {
  lines: string[];
  en: string;
};

export const SUBTITLES_V3_SILENT: Record<string, SilentSubtitle> = {
  "01_open": {
    lines: ["如果明天醒来，世界只剩声音"],
    en: "If tomorrow you woke to sound alone",
  },
  "02_keller": {
    lines: ["十九个月，她失去了光"],
    en: "At nineteen months, the light went out.",
  },
  "03_faces": {
    lines: ["第一天，长久凝视我爱的人"],
    en: "Day one: look long at the ones I love.",
  },
  "04_memory": {
    lines: ["把他们的样子，一寸寸放进记忆"],
    en: "Keep their faces, inch by inch.",
  },
  "05_ordinary": {
    lines: ["黑暗里，我用指尖辨认世界"],
    en: "In the dark, I learned the world by touch.",
  },
  ins_skin: {
    lines: ["光落在手上，像一句语言"],
    en: "Light on the hand — a language you can see.",
  },
  "06_street": {
    lines: ["阳光落在旧木桌上"],
    en: "Sunlight on an old table.",
  },
  "07_day1_end": {
    lines: ["每天经过，却从未真正看见"],
    en: "Passed each day, never truly seen.",
  },
  "08_dawn": {
    lines: ["第二天，我在黎明前起身"],
    en: "Day two: I rose before dawn.",
  },
  "09_museum": {
    lines: ["去看人类把时间刻进石头"],
    en: "To see time carved into stone.",
  },
  "10_statue": {
    lines: ["我触摸过它，却未见它被光唤醒"],
    en: "I touched it; never saw light wake it.",
  },
  "11_theater": {
    lines: ["夜晚，去剧院记住每一束光"],
    en: "At night, the theatre — every beam remembered.",
  },
  "12_city": {
    lines: ["第三天，看一座城市醒来"],
    en: "Day three: watch a city wake.",
  },
  "13_crowd": {
    lines: ["无数平凡的脸，组成一个时代"],
    en: "A thousand ordinary faces make an age.",
  },
  "14_sunset": {
    lines: ["最后的日落，把光留在眼皮后面"],
    en: "One last sunset, kept behind my eyelids.",
  },
  "15_quote": {
    lines: ["若失明几天，也许才懂得看见"],
    en: "A few days blind might teach us to see.",
  },
  "16_final": {
    lines: ["不必等到失去，才学会看见"],
    en: "We need not lose the light to learn to see.",
  },
};
