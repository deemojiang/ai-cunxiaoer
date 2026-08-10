const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const TERM_NAMES = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
] as const;

/** 各节气起始日（日），按年校准；缺少年份走近似表 */
const TERM_DAYS: Record<number, number[]> = {
  2024: [6, 20, 4, 19, 5, 20, 4, 19, 5, 20, 5, 21, 6, 22, 7, 22, 7, 22, 7, 23, 7, 22, 7, 21],
  2025: [5, 20, 3, 18, 5, 20, 4, 20, 5, 21, 5, 21, 7, 22, 7, 23, 7, 23, 8, 23, 7, 22, 7, 21],
  2026: [5, 20, 4, 18, 5, 20, 5, 20, 5, 21, 5, 21, 7, 23, 7, 23, 7, 23, 8, 23, 7, 22, 7, 22],
  2027: [5, 20, 3, 18, 5, 20, 4, 20, 5, 21, 5, 21, 7, 23, 7, 23, 7, 23, 8, 23, 7, 22, 7, 22],
  2028: [6, 20, 4, 19, 5, 20, 4, 19, 5, 20, 5, 21, 6, 22, 7, 22, 7, 22, 7, 23, 7, 22, 6, 21],
  2029: [5, 20, 3, 18, 5, 20, 4, 20, 5, 21, 5, 21, 7, 22, 7, 23, 7, 23, 8, 23, 7, 22, 7, 21],
  2030: [5, 20, 4, 18, 5, 20, 5, 20, 5, 21, 6, 21, 7, 23, 7, 23, 7, 23, 8, 23, 7, 22, 7, 22],
};

/** 近似起始日（月、日），覆盖缺少年份，误差通常 ±1 天 */
const TERM_APPROX: [number, number][] = [
  [1, 5], [1, 20], [2, 4], [2, 19], [3, 6], [3, 21],
  [4, 5], [4, 20], [5, 6], [5, 21], [6, 6], [6, 21],
  [7, 7], [7, 23], [8, 8], [8, 23], [9, 8], [9, 23],
  [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22],
];

const TERM_TIPS: Record<string, string> = {
  小寒: '进入一年中较冷时段，注意防寒保暖，保护越冬作物与禽畜。',
  大寒: '全年最冷阶段，做好防冻；囤贮饲料，检修棚舍。',
  立春: '春季开始，可准备春耕农具与种子，留意倒春寒。',
  雨水: '降水渐多，适宜整地育苗；注意田间排水。',
  惊蛰: '气温回升，虫害开始活动，注意防范；春播陆续展开。',
  春分: '昼夜等长，适宜春播与植树；田间管理要跟上。',
  清明: '春耕春种关键期，注意防火；适时移栽水稻、播种旱作。',
  谷雨: '雨生百谷，抓紧播种与施肥；注意防渍。',
  立夏: '进入夏季，作物旺盛生长，注意灌水与病虫害。',
  小满: '夏收作物籽粒渐满，做好田间管理与防干热风。',
  芒种: '有芒作物收获、夏种忙季，抢收抢种两不误。',
  夏至: '昼最长，注意防暑；水稻等作物加强水肥管理。',
  小暑: '天气渐热，浅水护苗；中耕除草，注意病虫害。',
  大暑: '一年中最热时段，注意防暑补水；水稻护苗，瓜果防病虫害。',
  立秋: '虽入秋仍可能「秋老虎」，早晚温差加大；晚稻加强管理。',
  处暑: '暑气渐消，适宜秋收准备与秋播蔬菜。',
  白露: '夜凉露重，注意添衣；晚稻抽穗期管好水肥。',
  秋分: '昼夜再等长，秋收秋种忙；做好晾晒与储粮。',
  寒露: '气温下降明显，抓紧秋收；注意霜冻防护。',
  霜降: '初霜将至，收完晚茬；保护大棚与越冬作物。',
  立冬: '冬季开始，做好防寒；冬小麦等查苗补苗。',
  小雪: '降水偏少、气温低，注意棚舍保温与水管防冻。',
  大雪: '农事趋闲，积肥整地；关注道路积雪与出行安全。',
  冬至: '昼最短，进补与防寒；做好越冬作物管理。',
};

function termStartDate(year: number, index: number): Date {
  const days = TERM_DAYS[year];
  if (days) {
    const month = TERM_APPROX[index][0];
    return new Date(year, month - 1, days[index]);
  }
  const [m, d] = TERM_APPROX[index];
  return new Date(year, m - 1, d);
}

export type SolarTermInfo = {
  current: string;
  since: Date;
  next: string;
  nextDate: Date;
  tip: string;
};

export function getSolarTerm(now = new Date()): SolarTermInfo {
  const y = now.getFullYear();
  const today = new Date(y, now.getMonth(), now.getDate());

  const starts: { name: string; date: Date; tip: string }[] = [];
  for (let i = 0; i < 24; i++) {
    starts.push({
      name: TERM_NAMES[i],
      date: termStartDate(y, i),
      tip: TERM_TIPS[TERM_NAMES[i]],
    });
  }
  // 年初可能仍处在上一年冬至
  starts.unshift({
    name: '冬至',
    date: termStartDate(y - 1, 23),
    tip: TERM_TIPS['冬至'],
  });
  starts.push({
    name: '小寒',
    date: termStartDate(y + 1, 0),
    tip: TERM_TIPS['小寒'],
  });

  let curIdx = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i].date.getTime() <= today.getTime()) curIdx = i;
    else break;
  }
  const current = starts[curIdx];
  const next = starts[curIdx + 1];
  return {
    current: current.name,
    since: current.date,
    next: next.name,
    nextDate: next.date,
    tip: current.tip,
  };
}

export function formatChineseDate(now = new Date()): string {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const w = WEEKDAYS[now.getDay()];
  return `${y}年${m}月${d}日，星期${w}`;
}

export function formatChineseTime(now = new Date()): string {
  const h = now.getHours();
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${min}:${sec}`;
}

export function answerDateTime(text: string, now = new Date()): string | null {
  const askTime = /(现在几点|几点了|几点钟|现在什么时候|现在的时间|报时)/.test(text);
  const askWeekday = /(星期几|周几|礼拜几)/.test(text);
  const askDate =
    /(今天几号|今天是几号|几号了|几月几|今天日期|今天是什么日子|日期是多少|今天是几月|几号)/.test(
      text,
    ) || /^(日期|今天)$/.test(text.trim());

  if (!askTime && !askWeekday && !askDate) return null;

  const dateStr = formatChineseDate(now);
  if (askTime && !askDate && !askWeekday) {
    return `现在是 ${formatChineseTime(now)}（${dateStr}）。`;
  }
  if (askTime) {
    return `今天是 ${dateStr}，现在 ${formatChineseTime(now)}。`;
  }
  if (askWeekday && !askDate) {
    return `今天是星期${WEEKDAYS[now.getDay()]}（${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日）。`;
  }
  return `今天是 ${dateStr}。`;
}

export function answerSolarTerm(text: string, now = new Date()): string | null {
  if (!/(节气|二十四节气)/.test(text) && !/现在是什么节气|当前节气|什么节气/.test(text)) {
    return null;
  }
  const info = getSolarTerm(now);
  const since = `${info.since.getMonth() + 1}月${info.since.getDate()}日`;
  const next = `${info.nextDate.getMonth() + 1}月${info.nextDate.getDate()}日`;
  return (
    `今天是 ${formatChineseDate(now)}。\n` +
    `当前节气是「${info.current}」（自 ${since} 起）。\n` +
    `下一个节气是「${info.next}」（约 ${next}）。\n` +
    `农事小贴士：${info.tip}`
  );
}

export function isDailyFactQuestion(text: string): boolean {
  return (
    answerDateTime(text) != null ||
    answerSolarTerm(text) != null ||
    /(天气|气温|温度|下雨|冷不冷|热不热|穿什么|紫外线)/.test(text)
  );
}
