import { api, type Knowledge } from '../api/client';
import {
  answerDateTime,
  answerSolarTerm,
  isDailyFactQuestion,
} from './calendar';

const intentMap: [string, string[]][] = [
  ['village', ['村务', '村支书', '村干部', '村规', '村约', '龙溪村', '村务公开', '网格长', '班子成员']],
  ['medical', ['挂号', '预约', '医院', '看病', '卫生院', '科室', '号源', '内科', '中医']],
  ['health', ['健康', '血压', '血糖', '头疼', '头痛', '发烧', '咳嗽', '用药', '体检', '症状']],
  ['hall', ['礼堂', '红白', '婚宴', '寿宴', '满月', '白事', '追悼', '酒席', '办酒', '厨师', '配菜', '宴席']],
  ['skill', ['技能', '培训', '电商', '手艺', '手工艺', '直播', '短视频', '学什么']],
  ['repair', ['路灯', '灯不亮', '不亮', '坏了', '故障', '报修', '健身器材', '监控', '水管']],
  ['problem', ['垃圾', '脏', '乱堆', '乱倒', '噪音', '扰民', '违建', '纠纷', '坑', '污水', '臭', '曝光']],
  ['sell', ['卖', '出售', '上架', '板栗', '蔬菜', '土鸡蛋', '农产品', '闲置', '特产']],
  ['policy', ['补贴', '政策', '低保', '医保', '扶持', '创业', '惠农', '补助']],
  ['job', ['工作', '招聘', '找活', '求职', '兼职', '上班', '用工', '招工', '打工', '岗位']],
  ['meal', ['订餐', '老年餐', '食堂', '惠餐', '送餐', '老年食堂']],
  ['help', ['帮忙', '搬', '借个', '借一下', '互助', '搭把手', '照看']],
];

export function recognizeIntent(t: string): string | null {
  // 百科/保存类问法优先于「卖农产品」（避免「板栗怎么保存」误入卖货）
  if (/(怎么保存|如何保存|怎样保存|怎么放|放多久|小知识)/.test(t)) return null;
  // 日期/时间/节气/天气等日常事实问答，不进办事场景
  if (isDailyFactQuestion(t)) return null;
  for (const [k, ws] of intentMap) {
    if (ws.some((w) => t.includes(w))) return k;
  }
  return null;
}

const weatherWords = [
  '天气',
  '气温',
  '温度',
  '下雨',
  '会不会下',
  '冷不冷',
  '热不热',
  '穿什么',
  '紫外线',
  '有没有雨',
];
const greetWords = ['你好', '您好', '在吗', '早上好', '晚上好', '谢谢', '多谢'];

export type GeneralAnswer =
  | { type: 'greet'; text: string }
  | { type: 'weather' }
  | { type: 'fact'; text: string }
  | { type: 'knowledge'; title: string; body: string; source: string }
  | { type: 'fallback' };

export async function answerGeneral(text: string): Promise<GeneralAnswer> {
  if (greetWords.some((w) => text.includes(w))) {
    return {
      type: 'greet',
      text: '您好呀！我是 AI 村小二 😊\n除了帮您办村里的事，也能陪您聊聊天、查天气、问百科常识。您想了解点什么？',
    };
  }
  if (weatherWords.some((w) => text.includes(w))) {
    return { type: 'weather' };
  }

  const dateAns = answerDateTime(text);
  if (dateAns) return { type: 'fact', text: dateAns };

  const termAns = answerSolarTerm(text);
  if (termAns) return { type: 'fact', text: termAns };

  try {
    const list: Knowledge[] = await api.knowledge(text);
    if (list.length) {
      const k = list[0];
      return {
        type: 'knowledge',
        title: `📖 ${k.title}`,
        body: k.content,
        source: '来源：村知识库 / AI 检索',
      };
    }
  } catch {
    /* ignore */
  }

  return { type: 'fallback' };
}

export const voiceSamples = [
  '村口的垃圾桶满了好几天没人清',
  '3组路灯坏了，晚上黑漆漆的',
  '我家板栗熟了想卖一些',
  '养鸡有没有什么补贴政策',
  '帮我在卫生院挂个内科号',
  '龙溪村村支书是谁',
  '7月想办寿宴，帮我约文化礼堂',
];
