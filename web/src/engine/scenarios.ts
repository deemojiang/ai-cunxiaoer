import type { Ctx, Scenario } from './types';

/** 问题类型 → 演示描述 / 摘要字段 / 派单人 */
const PROBLEM_META: Record<
  string,
  { demo: string; issue: string; place: string; notify: string }
> = {
  环境卫生: {
    demo: '村口公交站旁边的垃圾桶满了，好几天没人清了',
    issue: '垃圾桶满溢',
    place: '村口公交站旁',
    notify: '村委负责卫生的小张',
  },
  道路设施: {
    demo: '村主干道 2 组路口有个坑洼，过往车辆颠得很厉害，希望尽快修补',
    issue: '路面破损',
    place: '村主干道（2组路口）',
    notify: '村委道路管护员老周',
  },
  噪音扰民: {
    demo: '村东头建房工地晚上加班施工，噪音很大影响休息',
    issue: '夜间施工噪音',
    place: '村东头建房工地',
    notify: '村委综合治理员',
  },
  其他: {
    demo: '村口公示栏的灯坏了，晚上看不清通知',
    issue: '其他问题',
    place: '村口公示栏',
    notify: '村委值班人员',
  },
};

function problemMeta(ctx: Ctx) {
  return PROBLEM_META[ctx.category] || PROBLEM_META['其他'];
}

function problemReporter(ctx: Ctx) {
  return ctx.anon === '匿名反映' ? '匿名（不公开身份）' : '张大叔 138****1234';
}

function problemTypeLabel(ctx: Ctx) {
  const m = problemMeta(ctx);
  return `${ctx.category || '其他'} · ${m.issue}`;
}

const REPAIR_META: Record<string, { demo: string; fault: string; place: string; assignee: string }> = {
  路灯: {
    demo: '3组文化礼堂门口那盏路灯，这两天晚上都不亮了',
    fault: '夜间不亮，疑似线路故障',
    place: '3组文化礼堂门口',
    assignee: '片区电工王师傅',
  },
  健身器材: {
    demo: '文化广场的椭圆机脚踏松了，摇晃得厉害，不安全',
    fault: '脚踏松动',
    place: '文化广场',
    assignee: '文体设施维护员',
  },
  监控: {
    demo: '村口卡口监控不转动了，画面也黑屏',
    fault: '黑屏 / 云台失灵',
    place: '村口卡口',
    assignee: '平安乡村运维员',
  },
  垃圾桶: {
    demo: '2组路口的垃圾桶盖子坏了，垃圾容易被风刮散',
    fault: '桶盖损坏',
    place: '2组路口',
    assignee: '环卫管理员',
  },
};

function repairMeta(ctx: Ctx) {
  return REPAIR_META[ctx.facility] || REPAIR_META['路灯'];
}

const MED_META: Record<
  string,
  { title: string; dept: string; slots: { nm: string; st: string; label: string }[] }
> = {
  '小浦镇卫生院 · 内科': {
    title: '小浦镇卫生院 · 内科',
    dept: '内科',
    slots: [
      { nm: '明天 上午', st: 'ok', label: '余 12 号' },
      { nm: '明天 下午', st: 'few', label: '余 3 号' },
      { nm: '后天 上午', st: 'ok', label: '余 18 号' },
    ],
  },
  '小浦镇卫生院 · 中医科': {
    title: '小浦镇卫生院 · 中医科',
    dept: '中医科',
    slots: [
      { nm: '明天 上午', st: 'ok', label: '余 8 号' },
      { nm: '明天 下午', st: 'few', label: '余 2 号' },
      { nm: '后天 上午', st: 'ok', label: '余 10 号' },
    ],
  },
  '长兴县中医院': {
    title: '长兴县中医院 · 中医科',
    dept: '中医科',
    slots: [
      { nm: '明天 上午', st: 'few', label: '余 5 号' },
      { nm: '明天 下午', st: 'ok', label: '余 9 号' },
      { nm: '后天 上午', st: 'ok', label: '余 14 号' },
    ],
  },
};

function medMeta(ctx: Ctx) {
  return MED_META[ctx.hospital] || MED_META['小浦镇卫生院 · 内科'];
}

function medHospitalName(ctx: Ctx) {
  const h = ctx.hospital || '小浦镇卫生院 · 内科';
  return h.includes(' · ') ? h.split(' · ')[0] : h;
}

type InfoPanel = Extract<import('./types').SceneNode, { infoPanel: unknown }>['infoPanel'];

const VILLAGE_PANELS: Record<string, InfoPanel> = {
  村概况: {
    title: '🏘️ 龙溪村 · 村概况',
    sub: '浙江省湖州市 · 长兴县 · 小浦镇',
    body: '<b>龙溪村</b>位于长兴县小浦镇，因龙溪穿村而过得名。全村辖 6 个村民小组，常住人口约 1200 人。<br><br>📍 村委会地址：龙溪路 88 号<br>☎️ 村务热线：0572-60****88<br>🕐 办公时间：周一至周五 8:30-17:00',
  },
  班子成员: {
    title: '👥 龙溪村 · 班子成员',
    sub: '2026年度',
    cadres: [
      { av: '👨‍💼', name: '王建国', role: '村支书 · 兼村主任', phone: '138****1001' },
      { av: '👩‍💼', name: '李秀英', role: '副书记 · 分管民政', phone: '139****1002' },
      { av: '👨‍💼', name: '张强', role: '村委委员 · 分管综治', phone: '137****1003' },
      { av: '👩‍💼', name: '陈芳', role: '村委委员 · 分管财务', phone: '136****1004' },
      { av: '👨‍💼', name: '赵明', role: '村委委员 · 分管农业', phone: '135****1005' },
    ],
  },
  村社网格: {
    title: '🗺️ 龙溪村 · 村社网格',
    sub: '6 个村民小组',
    communities: [
      { name: '1组（龙溪头）', lead: '王大哥', households: '42户' },
      { name: '2组（溪南）', lead: '李大姐', households: '38户' },
      { name: '3组（溪北）', lead: '张叔', households: '45户' },
      { name: '4组（山脚）', lead: '陈婶', households: '36户' },
      { name: '5组（新村）', lead: '赵哥', households: '40户' },
      { name: '6组（龙溪尾）', lead: '刘姐', households: '35户' },
    ],
  },
  村约村规: {
    title: '📜 龙溪村 · 村约村规',
    sub: '2024年村民代表大会修订',
    body: '<b>一、环境卫生</b><br>房前屋后保持整洁，垃圾定点投放。<br><br><b>二、邻里和睦</b><br>互尊互让，矛盾先找网格长调解。<br><br><b>三、红白喜事</b><br>简办节约，使用文化礼堂需预约。<br><br><b>四、生态保护</b><br>保护龙溪水系，禁止电鱼毒鱼。<br><br><b>五、安全治理</b><br>发现安全隐患及时报告村委。',
  },
};

export const scenarios: Record<string, Scenario> = {
  problem: {
    key: 'problem',
    name: '反映问题',
    icon: '📋',
    tag: 'FK 问题工单',
    steps: [
      { step: 1 },
      { bot: '好的，我来帮您反映问题。请问是哪方面的情况？' },
      { opts: ['环境卫生', '道路设施', '噪音扰民', '其他'], pick: '环境卫生', as: 'category' },
      { step: 2 },
      {
        botFn: (ctx) =>
          `明白，是「${ctx.category}」类问题。请描述一下具体情况，在什么位置？`,
      },
      {
        waitText: {
          as: 'desc',
          demo: (ctx) => problemMeta(ctx).demo,
          placeholder: '说说问题和位置…',
        },
      },
      { step: 3 },
      { bot: '能拍张照片吗？方便工作人员快速定位处理。' },
      {
        opts: ['上传现场照片', '暂无照片'],
        pick: '上传现场照片',
        as: 'photo',
      },
      {
        botFn: (ctx) =>
          ctx.photo === '暂无照片'
            ? '好的，没有照片也可以。需要匿名反映吗？（默认显示您的姓名）'
            : '照片已收到。需要匿名反映吗？（默认显示您的姓名）',
      },
      { opts: ['实名反映', '匿名反映'], pick: '实名反映', as: 'anon' },
      { label: 'summary' },
      { step: 4 },
      {
        botFn: (ctx) =>
          ctx.anon === '匿名反映'
            ? '好的，将按匿名方式提交。请您核对一下信息 👇'
            : '请您核对一下信息 👇',
      },
      {
        cardFn: (ctx) => {
          const m = problemMeta(ctx);
          const photo = ctx.photo === '暂无照片' ? '未上传' : '已上传 1 张';
          return {
            title: '问题反馈工单',
            status: ['wait', '待受理'],
            rows: [
              ['类型', problemTypeLabel(ctx)],
              ['位置', m.place],
              ['情况', ctx.desc || m.demo],
              ['照片', photo],
              ['反映人', problemReporter(ctx)],
            ],
            track: ['已提交', '处理中', '已完成'],
            on: 0,
          };
        },
      },
      { opts: ['确认提交', '修改信息'], pick: '确认提交', as: 'confirm' },
      {
        goto: (ctx) => (/修改/.test(ctx.confirm || '') ? 'recollect' : 'submit'),
      },
      { label: 'recollect' },
      { bot: '好的，我们重新填写后再核对。请问是哪方面的情况？' },
      { opts: ['环境卫生', '道路设施', '噪音扰民', '其他'], pick: '环境卫生', as: 'category' },
      {
        botFn: (ctx) =>
          `明白，是「${ctx.category}」类问题。请重新描述一下具体情况，在什么位置？`,
      },
      {
        waitText: {
          as: 'desc',
          demo: (ctx) => problemMeta(ctx).demo,
          placeholder: '说说问题和位置…',
        },
      },
      { bot: '需要更新照片吗？' },
      {
        opts: ['上传现场照片', '暂无照片'],
        pick: '上传现场照片',
        as: 'photo',
      },
      { bot: '需要匿名反映吗？（默认显示您的姓名）' },
      { opts: ['实名反映', '匿名反映'], pick: '实名反映', as: 'anon' },
      { goto: 'summary' },
      { label: 'submit' },
      { step: 5 },
      {
        createOrderFn: (ctx) => {
          const m = problemMeta(ctx);
          const photo = ctx.photo === '暂无照片' ? '未上传' : '已上传 1 张';
          const type = problemTypeLabel(ctx);
          return {
            prefix: 'FK',
            cat: 'feedback',
            icon: '📋',
            title: '问题反馈',
            type,
            status: 'wait',
            statusText: '待受理',
            summary: `${m.place} · ${m.issue}`,
            rows: [
              ['类型', type],
              ['位置', m.place],
              ['情况', ctx.desc || m.demo],
              ['照片', photo],
              ['反映人', problemReporter(ctx)],
            ],
            track: ['已提交', '处理中', '已完成'],
          };
        },
      },
      {
        botFn: (ctx) =>
          `✅ 工单已生成并派单！已通知${problemMeta(ctx).notify}。`,
      },
      { step: 6 },
      {
        resultFn: (ctx) =>
          ctx.anon === '匿名反映'
            ? '📍 预计 1 个工作日内处理。您的身份不会对外公开。可随时问我「进度怎么样了」查询。'
            : '📍 预计 1 个工作日内处理。可随时问我「进度怎么样了」查询。',
      },
    ],
  },

  repair: {
    key: 'repair',
    name: '设施报修',
    icon: '🔧',
    tag: 'BX 报修工单',
    steps: [
      { step: 1 },
      { bot: '好的，帮您报修。请问是哪类设施出问题了？' },
      { opts: ['路灯', '健身器材', '监控', '垃圾桶'], pick: '路灯', as: 'facility' },
      { step: 2 },
      {
        botFn: (ctx) =>
          `收到，是「${ctx.facility}」报修。具体在什么位置？大概什么情况？`,
      },
      {
        waitText: {
          as: 'desc',
          demo: (ctx) => repairMeta(ctx).demo,
          placeholder: '说说位置和故障情况…',
        },
      },
      { step: 3 },
      {
        botFn: (ctx) => `方便拍一下「${ctx.facility}」和周边环境吗？`,
      },
      {
        opts: ['上传现场照片', '暂无照片'],
        pick: '上传现场照片',
        as: 'photo',
      },
      { label: 'summary' },
      { step: 4 },
      { bot: '请核对报修信息 👇' },
      {
        cardFn: (ctx) => {
          const m = repairMeta(ctx);
          return {
            title: '设施报修工单',
            status: ['wait', '待派单'],
            rows: [
              ['设施', `${ctx.facility}（${m.place}）`],
              ['故障', m.fault],
              ['情况', ctx.desc || m.demo],
              ['照片', ctx.photo === '暂无照片' ? '未上传' : '已上传'],
              ['报修人', '张大叔 138****1234'],
            ],
            track: ['已提交', '维修中', '已完成'],
            on: 0,
          };
        },
      },
      { opts: ['确认提交', '修改'], pick: '确认提交', as: 'confirm' },
      { goto: (ctx) => (/修改/.test(ctx.confirm || '') ? 'recollect' : 'submit') },
      { label: 'recollect' },
      { bot: '好的，我们重新填写后再核对。请问是哪类设施？' },
      { opts: ['路灯', '健身器材', '监控', '垃圾桶'], pick: '路灯', as: 'facility' },
      {
        botFn: (ctx) =>
          `收到，是「${ctx.facility}」报修。请重新说明位置和情况？`,
      },
      {
        waitText: {
          as: 'desc',
          demo: (ctx) => repairMeta(ctx).demo,
          placeholder: '说说位置和故障情况…',
        },
      },
      { bot: '需要更新照片吗？' },
      {
        opts: ['上传现场照片', '暂无照片'],
        pick: '上传现场照片',
        as: 'photo',
      },
      { goto: 'summary' },
      { label: 'submit' },
      { step: 5 },
      {
        createOrderFn: (ctx) => {
          const m = repairMeta(ctx);
          return {
            prefix: 'BX',
            cat: 'feedback',
            icon: '🔧',
            title: '设施报修',
            type: `${ctx.facility}故障 · ${m.place}`,
            status: 'wait',
            statusText: '待派单',
            summary: `${m.fault} · 已提交报修`,
            rows: [
              ['设施', `${ctx.facility}（${m.place}）`],
              ['故障', m.fault],
              ['情况', ctx.desc || m.demo],
              ['报修人', '张大叔 138****1234'],
            ],
            track: ['已提交', '维修中', '已完成'],
          };
        },
      },
      {
        botFn: (ctx) =>
          `✅ 已生成报修工单，自动派给${repairMeta(ctx).assignee}。`,
      },
      { step: 6 },
      { result: '🔧 一般 24 小时内上门。维修完成会附现场照片请您确认。' },
    ],
  },

  sell: {
    key: 'sell',
    name: '卖农产品',
    icon: '🌾',
    tag: 'SP 上架审核',
    steps: [
      { step: 1 },
      { bot: '好嘞！帮您把农产品挂到村民商城。请问您想卖什么？' },
      { user: '我家板栗熟了，想卖一些' },
      { step: 2 },
      { bot: '好的，上架「板栗」。大概有多少斤？' },
      { step: 3 },
      { waitText: { as: 'qty', demo: '200 斤左右', placeholder: '大概多少斤？' } },
      { bot: '想卖多少钱一斤？' },
      { waitText: { as: 'price', demo: '8 块', placeholder: '多少钱一斤？' } },
      { bot: '拍几张板栗的照片吧，买家看了更放心。' },
      { img: '板栗照片' },
      { label: 'summary' },
      { step: 4 },
      { bot: '帮您整理好了，请核对 👇' },
      {
        cardFn: (ctx) => ({
          title: '商品上架审核单',
          status: ['wait', '待审核'],
          rows: [
            ['商品', '新鲜板栗'],
            ['数量', `约 ${ctx.qty || '200 斤左右'}`],
            ['价格', `${ctx.price || '8 块'}/斤`.replace(' 块/斤', ' 元/斤').replace('块/斤', '元/斤')],
            ['联系人', '张大叔 138****1234'],
          ],
          track: ['已提交', '审核中', '已上架'],
          on: 0,
        }),
      },
      { opts: ['确认提交', '改一下'], pick: '确认提交', as: 'confirm' },
      {
        goto: (ctx) => (/改一下|修改/.test(ctx.confirm || '') ? 'recollect' : 'submit'),
      },
      { label: 'recollect' },
      { bot: '好的，我们重新填写一下～大概有多少斤？' },
      { waitText: { as: 'qty', demo: '150 斤左右', placeholder: '大概多少斤？' } },
      { bot: '想卖多少钱一斤？' },
      { waitText: { as: 'price', demo: '7 块', placeholder: '多少钱一斤？' } },
      { goto: 'summary' },
      { label: 'submit' },
      { step: 5 },
      {
        createOrderFn: (ctx) => {
          const qty = ctx.qty || '200 斤左右';
          const price = (ctx.price || '8 块').replace('块', '元');
          return {
            prefix: 'SP',
            cat: 'product',
            icon: '🌾',
            title: '商品上架',
            type: `新鲜板栗 · ${price}/斤`,
            status: 'wait',
            statusText: '待审核',
            summary: `约${qty} · 等待审核`,
            rows: [
              ['商品', '新鲜板栗'],
              ['数量', `约 ${qty}`],
              ['价格', `${price}/斤`],
              ['联系人', '张大叔 138****1234'],
            ],
            track: ['已提交', '审核中', '已上架'],
          };
        },
      },
      { bot: '✅ 上架申请已提交，正在等村里审核。' },
      { step: 6 },
      { result: '🛒 审核一般当天完成，通过后自动展示在「村民商城」。' },
    ],
  },

  policy: {
    key: 'policy',
    name: '政策咨询',
    icon: '📖',
    tag: '知识问答',
    steps: [
      { step: 1 },
      { bot: '您想了解哪方面的政策？可以直接把您的情况告诉我。' },
      { user: '我养了 50 只鸡，有没有什么补贴？' },
      { step: 2 },
      { bot: '您是想了解「养殖类补贴」对吗？我帮您查本村的政策。' },
      { step: 3 },
      { bot: '请问是散养还是圈养？养殖多久了？' },
      { user: '散养，生态的，养了大半年了' },
      { step: 6 },
      {
        result:
          '📖 生态养殖补贴（大白话版）\n· 条件：生态散养、规模 30 只以上\n· 标准：每只 5 元，最高补 500 只\n· 您养 50 只，预计可补贴 250 元 ✅',
      },
      { bot: '需要我帮您预约村委办理吗？' },
      { opts: ['要，帮我预约村委', '先了解材料'], pick: '要，帮我预约村委' },
      { step: 5 },
      {
        createOrder: {
          prefix: 'YY',
          cat: 'book',
          icon: '📖',
          title: '预约服务',
          type: '生态养殖补贴申请',
          status: 'doing',
          statusText: '待确认',
          summary: '预约村委便民服务窗口',
          rows: [
            ['事项', '生态养殖补贴申请'],
            ['预约点', '村委便民服务窗口'],
            ['预约人', '张大叔 138****1234'],
            ['材料', '身份证、养殖照片'],
          ],
          track: ['已预约', '已确认', '已办理'],
        },
      },
      { result: '📅 预约单已提交，村委确认时间后 AI 通知您。' },
    ],
  },

  skill: {
    key: 'skill',
    name: '技能咨询',
    icon: '🎓',
    tag: 'JN 技能咨询',
    steps: [
      { step: 1 },
      { bot: '技能方面我能帮您：查培训课程、问技能问题、匹配师傅。您想了解什么？' },
      {
        opts: ['有什么培训', '电商怎么学', '手工艺技能', '其它问题'],
        pick: '电商怎么学',
        as: 'topic',
      },
      { step: 2 },
      {
        botFn: (ctx) =>
          `好的，「${ctx.topic}」相关咨询。您目前有没有相关经验？可以说说您的情况。`,
      },
      {
        waitText: {
          as: 'desc',
          demo: (ctx) =>
            ctx.topic === '手工艺技能'
              ? '想学竹编，家里有点基础'
              : ctx.topic === '有什么培训'
                ? '想看看最近有什么免费培训'
                : '不会，想学着在网上卖板栗',
        },
      },
      { step: 3 },
      {
        resultFn: (ctx) => {
          if (ctx.topic === '手工艺技能') {
            return '🎓 手工艺技能推荐\n1. 村非遗传承人 · 竹编入门 · 周末开班\n2. 镇文化站 · 剪纸/编织兴趣班\n3. 线上微课 · 基础工具与材料';
          }
          if (ctx.topic === '有什么培训') {
            return '🎓 近期培训一览\n1. 电商入门班 · 镇电商服务站 · 免费\n2. 农机安全操作 · 农技站 · 本月\n3. 家政服务技能 · 人社窗口报名';
          }
          return '🎓 电商技能培训推荐\n1. 镇电商服务站 · 免费入门班 · 近期开班\n2. 村电商达人李姐 · 可一对一辅导\n3. 线上课程 · 短视频+直播带货基础';
        },
      },
      { bot: '需要帮您报名培训班吗？' },
      { opts: ['报名培训班', '约李姐请教', '先了解课程内容'], pick: '报名培训班', as: 'action' },
      { step: 4 },
      { label: 'summary' },
      {
        botFn: (ctx) =>
          ctx.action === '报名培训班'
            ? '好的，帮您登记培训报名，请核对 👇'
            : ctx.action === '约李姐请教'
              ? '好的，帮您登记向李姐请教，请核对 👇'
              : '好的，先帮您留个了解意向，请核对 👇',
      },
      {
        cardFn: (ctx) => {
          const train =
            ctx.topic === '手工艺技能'
              ? '竹编入门班'
              : ctx.topic === '有什么培训'
                ? '近期培训意向登记'
                : '电商入门班（短视频+直播）';
          const place =
            ctx.topic === '手工艺技能' ? '村文化礼堂' : '小浦镇电商服务站';
          return {
            title: '技能培训报名单',
            status: ['wait', '待确认'],
            rows: [
              ['培训', train],
              ['意向', ctx.action || '报名培训班'],
              ['地点', place],
              ['报名人', '张大叔 138****1234'],
            ],
            track: ['已报名', '已确认', '已结业'],
            on: 0,
          };
        },
      },
      { opts: ['确认报名', '改时间'], pick: '确认报名', as: 'confirm' },
      {
        goto: (ctx) => (/改时间|修改|再改/.test(ctx.confirm || '') ? 'recollect' : 'submit'),
      },
      { label: 'recollect' },
      { bot: '好的，我们重新选一下意向～' },
      {
        opts: ['报名培训班', '约李姐请教', '先了解课程内容'],
        pick: '约李姐请教',
        as: 'action',
      },
      { goto: 'summary' },
      { label: 'submit' },
      { step: 5 },
      {
        createOrderFn: (ctx) => {
          const train =
            ctx.topic === '手工艺技能'
              ? '竹编入门班'
              : ctx.topic === '有什么培训'
                ? '近期培训意向登记'
                : '电商入门班';
          return {
            prefix: 'PX',
            cat: 'other',
            icon: '🎓',
            title: '技能培训报名',
            type: train,
            status: 'wait',
            statusText: '待确认',
            summary: `${train} · 已报名`,
            rows: [
              ['培训', train],
              ['意向', ctx.action || '报名培训班'],
              ['报名人', '张大叔 138****1234'],
            ],
            track: ['已报名', '已确认', '已结业'],
          };
        },
      },
      { step: 6 },
      { result: '📚 报名单已提交，开班前 1 天 AI 提醒您带身份证准时参加。' },
    ],
  },

  medical: {
    key: 'medical',
    name: '医疗挂号',
    icon: '🏥',
    tag: 'GH 挂号',
    steps: [
      { step: 1 },
      { bot: '医疗方面我能帮您：预约挂号、健康咨询、查附近卫生院。请问您需要？' },
      { opts: ['预约挂号', '健康咨询', '查附近卫生院'], pick: '预约挂号' },
      { step: 2 },
      { bot: '好的，帮您挂号。请问去哪个医院？看什么科？' },
      {
        opts: ['小浦镇卫生院 · 内科', '小浦镇卫生院 · 中医科', '长兴县中医院'],
        pick: '小浦镇卫生院 · 内科',
        as: 'hospital',
      },
      { bot: '查一下最近可预约号源…' },
      {
        medSlotsFn: (ctx) => {
          const m = medMeta(ctx);
          return {
            title: `🏥 ${m.title} 号源`,
            slots: m.slots,
          };
        },
      },
      { bot: '您想预约哪个时段？' },
      { opts: ['明天 上午', '明天 下午', '后天 上午'], pick: '明天 上午', as: 'slot' },
      { step: 3 },
      { bot: '就诊人：张大叔 138****1234（已自动填充）' },
      { label: 'summary' },
      { step: 4 },
      { bot: '请核对挂号信息 👇' },
      {
        cardFn: (ctx) => {
          const m = medMeta(ctx);
          return {
            title: '预约挂号单',
            status: ['ok', '已预约'],
            rows: [
              ['医院', medHospitalName(ctx)],
              ['科室', m.dept],
              ['时间', ctx.slot || m.slots[0].nm],
              ['就诊人', '张大叔 138****1234'],
            ],
            track: ['已预约', '待就诊', '已就诊'],
            on: 0,
          };
        },
      },
      { opts: ['确认挂号', '换时段'], pick: '确认挂号', as: 'confirm' },
      {
        goto: (ctx) => (/换时段|修改|改时间/.test(ctx.confirm || '') ? 'recollect' : 'submit'),
      },
      { label: 'recollect' },
      { bot: '好的，请重新选择预约时段～' },
      { opts: ['明天 上午', '明天 下午', '后天 上午'], pick: '明天 下午', as: 'slot' },
      { goto: 'summary' },
      { label: 'submit' },
      { step: 5 },
      {
        createOrderFn: (ctx) => {
          const m = medMeta(ctx);
          const slot = ctx.slot || m.slots[0].nm;
          return {
            prefix: 'GH',
            cat: 'book',
            icon: '🏥',
            title: '医疗挂号',
            type: m.title,
            status: 'ok',
            statusText: '已预约',
            summary: `${slot} · 带好医保卡`,
            rows: [
              ['医院', medHospitalName(ctx)],
              ['科室', m.dept],
              ['时间', slot],
              ['就诊人', '张大叔 138****1234'],
            ],
            track: ['已预约', '待就诊', '已就诊'],
          };
        },
      },
      { step: 6 },
      { result: '🏥 挂号成功！请提前 15 分钟到院，带好身份证和医保卡。' },
    ],
  },

  health: {
    key: 'health',
    name: '健康咨询',
    icon: '💊',
    tag: '健康导引',
    steps: [
      { step: 1 },
      {
        bot: '健康咨询我可以帮您：了解常见症状、用药提醒、是否需要就医。请描述一下您的情况～\n（⚠️ 不能替代医生诊断，紧急情况请拨打 120）',
      },
      { user: '最近血压有点高，130多，要不要紧？' },
      { step: 2 },
      { bot: '请问您年龄多大？有没有在吃药？平时有没有头晕、胸闷？' },
      { user: '65岁，没吃药，偶尔有点头晕' },
      { step: 6 },
      {
        result:
          '💊 健康导引（仅供参考）\n· 130+ 血压对 65 岁老人偏高，建议关注\n· 建议：低盐饮食、规律作息、每天测血压\n· 若持续 ≥140/90 或头晕加重 → 建议到卫生院内科就诊\n· 紧急情况 → 立即拨打 120',
      },
      { bot: '需要帮您预约卫生院挂号吗？' },
      { opts: ['帮我挂号', '先自己观察'], pick: '帮我挂号' },
      { result: '已为您跳转「医疗挂号」流程，可快速预约号源。（可点首页医疗挂号继续）' },
    ],
  },

  village: {
    key: 'village',
    name: '村务公开',
    icon: '🏘️',
    tag: '龙溪村',
    steps: [
      { step: 1 },
      { bot: '为您展示【浙江省 · 长兴县 · 龙溪村】村务公开信息 👇\n想了解哪方面？' },
      {
        opts: ['村概况', '班子成员', '村社网格', '村约村规'],
        pick: '村概况',
        as: 'v1',
      },
      { step: 6 },
      { infoPanelFn: (ctx) => VILLAGE_PANELS[ctx.v1] || null },
      { bot: '还想了解其它公开信息吗？' },
      {
        opts: ['班子成员', '村社网格', '村约村规', '返回首页'],
        pick: '班子成员',
        as: 'v2',
      },
      {
        goto: (ctx) => (ctx.v2 === '返回首页' ? 'villageEnd' : 'villageShow2'),
      },
      { label: 'villageShow2' },
      { infoPanelFn: (ctx) => VILLAGE_PANELS[ctx.v2] || null },
      { bot: '继续查看？' },
      {
        opts: ['村社网格', '村约村规', '够了，谢谢'],
        pick: '村约村规',
        as: 'v3',
      },
      {
        goto: (ctx) =>
          /够了|谢谢/.test(ctx.v3 || '') ? 'villageDone' : 'villageShow3',
      },
      { label: 'villageShow3' },
      { infoPanelFn: (ctx) => VILLAGE_PANELS[ctx.v3] || null },
      { label: 'villageDone' },
      { result: '📋 以上信息均来自龙溪村政务公开栏，如有更新以村委最新发布为准。' },
      { goto: 'villageFinish' },
      { label: 'villageEnd' },
      { bot: '好的，已返回。有事随时再找我～' },
      { goHome: true },
      { label: 'villageFinish' },
    ],
  },

  job: {
    key: 'job',
    name: '找活干',
    icon: '💼',
    tag: 'QZ 求职登记',
    steps: [
      { step: 1 },
      { bot: '帮您找合适的活儿。为了推荐更准，问您几个问题～' },
      { step: 3 },
      { bot: '您今年多大？有什么技能或做过什么工作？' },
      { user: '58，会开车，种过地' },
      { bot: '想找全职还是兼职？' },
      { opts: ['全职', '兼职都行'], pick: '兼职都行' },
      { step: 6 },
      {
        result:
          '💼 匹配岗位（58岁·会开车·务农经验）\n1. 农家乐帮厨 · 包吃住 · 3000元/月\n2. 民宿保洁 · 可兼职 · 120元/天\n3. 农业基地管理员 · 3500元/月',
      },
      { bot: '想投递哪个？我帮您把简历发过去。' },
      { opts: ['投第 3 个', '都投'], pick: '投第 3 个' },
      { step: 5 },
      {
        createOrder: {
          prefix: 'QZ',
          cat: 'other',
          icon: '💼',
          title: '求职登记',
          type: '农业基地管理员',
          status: 'doing',
          statusText: '已推荐',
          summary: '简历已推荐给绿丰农业基地',
          rows: [
            ['求职人', '张大叔 · 58岁'],
            ['技能', '驾驶 / 务农'],
            ['意向', '农业基地管理员'],
          ],
          track: ['已登记', '已推荐', '已对接'],
        },
      },
      { step: 6 },
      { result: '📨 已把您的简历推荐给「绿丰农业基地」，进展我随时通知您。' },
    ],
  },

  meal: {
    key: 'meal',
    name: '老年订餐',
    icon: '🍚',
    tag: 'DC 订餐单',
    steps: [
      { step: 1 },
      { bot: '您好～您是想看食堂菜单，还是直接订餐？' },
      { opts: ['看菜单', '直接订明天的'], pick: '看菜单' },
      { step: 2 },
      {
        bot: '明天老年食堂菜单：\n荤菜：红烧肉、清蒸鱼\n素菜：炒青菜、豆腐汤\n主食：米饭\n（60岁以上 5 元/份）',
      },
      { bot: '需要帮您订一份吗？' },
      { opts: ['订红烧肉套餐', '不用了'], pick: '订红烧肉套餐', as: 'mealPick' },
      { goto: (ctx) => (ctx.mealPick === '不用了' ? 'mealCancel' : 'mealOrder') },
      { label: 'mealCancel' },
      { bot: '好的，不订也没关系～有需要随时跟我说，祝您今天安康！' },
      { result: '🍚 已取消订餐，未生成订单。' },
      { goto: 'mealEnd' },
      { label: 'mealOrder' },
      { step: 3 },
      { bot: '好的，订几份？需要送餐上门吗？（80岁以上免费送）' },
      { user: '一份，我自己去拿' },
      { label: 'summary' },
      { step: 4 },
      { bot: '请确认订餐信息 👇' },
      {
        card: {
          title: '订餐确认单',
          status: ['ok', '已预订'],
          rows: [
            ['日期', '明天 午餐'],
            ['套餐', '红烧肉套餐 ×1'],
            ['金额', '5 元'],
            ['取餐', '老年活动室 11:30'],
          ],
          track: ['已预订', '备餐中', '已取餐'],
          on: 0,
        },
      },
      { opts: ['确认', '取消'], pick: '确认', as: 'confirm' },
      {
        goto: (ctx) => (/取消|不用/.test(ctx.confirm || '') ? 'mealCancel' : 'submit'),
      },
      { label: 'submit' },
      { step: 5 },
      {
        createOrder: {
          prefix: 'DC',
          cat: 'book',
          icon: '🍚',
          title: '老年订餐',
          type: '明天午餐 · 红烧肉套餐',
          status: 'ok',
          statusText: '已预订',
          summary: '1份 · 老年活动室取餐',
          rows: [
            ['日期', '明天 午餐'],
            ['套餐', '红烧肉套餐 ×1'],
            ['金额', '5 元'],
          ],
          track: ['已预订', '备餐中', '已取餐'],
        },
      },
      { step: 6 },
      { result: '🍚 订餐成功！明天 11:30 到老年活动室取餐即可，我会提前提醒您～' },
      { label: 'mealEnd' },
    ],
  },

  help: {
    key: 'help',
    name: '邻里互助',
    icon: '🤝',
    tag: 'HZ 互助需求',
    steps: [
      { step: 1 },
      { bot: '需要邻居搭把手？把您的需求告诉我，我帮您发到邻里圈。' },
      { user: '明天要搬个大衣柜，一个人搬不动，想找人帮忙' },
      { step: 2 },
      { bot: '明白，是「搬运求助」。大概什么时间？在哪个位置？' },
      { step: 3 },
      {
        waitText: {
          as: 'whenWhere',
          demo: '明天上午，就在 2 组我家里',
          placeholder: '说说时间和位置…',
        },
      },
      { label: 'summary' },
      { step: 4 },
      { bot: '帮您整理好啦，确认发布 👇' },
      {
        cardFn: (ctx) => ({
          title: '邻里互助需求单',
          status: ['doing', '发布中'],
          rows: [
            ['类型', '搬运帮忙'],
            ['时间/地点', ctx.whenWhere || '明天上午 · 2组'],
            ['发起人', '张大叔 138****1234'],
          ],
          track: ['已发布', '邻居响应', '已完成'],
          on: 0,
        }),
      },
      { opts: ['确认发布', '再改改'], pick: '确认发布', as: 'confirm' },
      {
        goto: (ctx) => (/再改|修改/.test(ctx.confirm || '') ? 'recollect' : 'submit'),
      },
      { label: 'recollect' },
      { bot: '好的，我们重新填一下～大概什么时间？在哪个位置？' },
      {
        waitText: {
          as: 'whenWhere',
          demo: '明天下午，还是 2 组我家里',
          placeholder: '说说时间和位置…',
        },
      },
      { goto: 'summary' },
      { label: 'submit' },
      { step: 5 },
      {
        createOrderFn: (ctx) => ({
          prefix: 'HZ',
          cat: 'other',
          icon: '🤝',
          title: '邻里互助',
          type: '搬运帮忙 · 2组',
          status: 'doing',
          statusText: '发布中',
          summary: '已发布到邻里圈',
          rows: [
            ['类型', '搬运帮忙'],
            ['时间/地点', ctx.whenWhere || '明天上午 · 2组'],
          ],
          track: ['已发布', '邻居响应', '已完成'],
        }),
      },
      { bot: '✅ 已发布到邻里圈！AI 已推送给附近热心邻居。' },
      { step: 6 },
      { result: '🤝 完成后双方可获积分奖励。' },
    ],
  },

  hall: {
    key: 'hall',
    name: '礼堂预约',
    icon: '🏛️',
    tag: 'LT 红白事预约',
    steps: [
      { step: 1 },
      { bot: '好的，帮您预约文化礼堂办红白喜事。请问是办什么类型的宴席？' },
      { opts: ['红事（婚宴/满月/寿宴）', '白事（追悼/告别）', '其它家宴'], pick: '红事（婚宴/满月/寿宴）' },
      { step: 2 },
      { bot: '收到，是「红事宴席」。请问大概哪天办？预计多少桌？' },
      { user: '下周六，18桌左右，大概180人' },
      { step: 3 },
      { bot: '正在查询场地与厨师档期…' },
      {
        avail: {
          title: '📅 档期查询结果',
          sections: [
            {
              name: '🏛️ 文化礼堂',
              slots: [
                { nm: '中午（11:00-14:00）', st: 'ok', label: '✅ 可预约' },
                { nm: '晚上（17:00-20:00）', st: 'busy', label: '❌ 已被占用' },
              ],
            },
            {
              name: '👨‍🍳 厨师档期',
              slots: [
                { nm: '张师傅（主厨）· 中午', st: 'ok', label: '✅ 有空 · 500元/桌起' },
                { nm: '李帮厨 · 中午', st: 'ok', label: '✅ 有空 · 80元/桌' },
              ],
            },
          ],
          tip: '💡 建议：中午场地+张师傅均空闲',
        },
      },
      { bot: '晚上已被占用。您想预约哪个时段？' },
      { opts: ['中午场', '改其它日期'], pick: '中午场', as: 'slot' },
      { bot: '需要帮您预约厨师吗？' },
      { opts: ['要，约张师傅+李帮厨', '只要张师傅', '场地就行'], pick: '要，约张师傅+李帮厨' },
      { bot: '18桌红事，推荐菜单如下 👇' },
      {
        menu: {
          type: 'red',
          title: '🍽️ 红事宴席菜单推荐（18桌）',
          cats: [
            { name: '冷盘（8道）', items: '白切鸡、酱鸭、海蜇头、醉虾、凉拌木耳、皮蛋豆腐、糟货拼盘、水果拼盘' },
            { name: '热菜（12道）', items: '红烧肉、清蒸鲈鱼、白灼基围虾、笋干烧肉、时令蔬菜、菌菇汤等' },
            { name: '主食点心', items: '米饭、长寿面、水果、糖果' },
          ],
          tip: '按 500元/桌 估算 · 可换菜、加减道数',
        },
      },
      { bot: '这套菜单合适吗？' },
      { opts: ['就用这套', '换几道：不要虾，加本地土鹅'], pick: '换几道：不要虾，加本地土鹅' },
      { bot: '已调整：去掉虾，增加本地土鹅；可备注清淡桌。请核对预约信息 👇' },
      { label: 'summary' },
      { step: 4 },
      {
        cardFn: (ctx) => ({
          title: '文化礼堂预约单',
          status: ['wait', '待确认'],
          rows: [
            ['类型', '红事宴席'],
            ['时段', ctx.slot === '改其它日期' ? '其它日期（待定）' : '下周六 中午'],
            ['规模', '18桌 · 约180人'],
            ['厨师', '张师傅 + 李帮厨'],
            ['菜单', '标准套餐（去虾+加土鹅）'],
            ['联系人', '张大叔 138****1234'],
          ],
          track: ['已提交', '村委确认', '预约成功'],
          on: 0,
        }),
      },
      { opts: ['确认提交预约', '修改日期'], pick: '确认提交预约', as: 'confirm' },
      {
        goto: (ctx) => (/修改日期|修改|再改/.test(ctx.confirm || '') ? 'recollect' : 'submit'),
      },
      { label: 'recollect' },
      { bot: '好的，我们重新选一下日期和时段～' },
      { opts: ['中午场', '改其它日期'], pick: '改其它日期', as: 'slot' },
      { bot: '已按您的新选择更新，请再核对一次 👇' },
      { goto: 'summary' },
      { label: 'submit' },
      { step: 5 },
      {
        createOrderFn: (ctx) => ({
          prefix: 'LT',
          cat: 'book',
          icon: '🏛️',
          title: '文化礼堂预约',
          type: ctx.slot === '改其它日期' ? '红事宴席 · 其它日期' : '红事宴席 · 中午',
          status: 'wait',
          statusText: '待确认',
          summary: '18桌 · 张师傅+李帮厨',
          rows: [
            ['类型', '红事宴席'],
            ['时段', ctx.slot === '改其它日期' ? '其它日期（待定）' : '下周六 中午'],
            ['规模', '18桌'],
            ['厨师', '张师傅 + 李帮厨'],
          ],
          track: ['已提交', '村委确认', '预约成功'],
        }),
      },
      { bot: '✅ 预约单已提交！已通知村委礼堂管理员确认档期。' },
      { step: 6 },
      { result: '🏛️ 一般 1 个工作日内确认。确认后推送最终菜单和进场时间。' },
    ],
  },
};

export const HOME_FEATURED = ['problem', 'repair', 'sell', 'policy', 'hall', 'medical', 'village'];
