export type Step = 1 | 2 | 3 | 4 | 5 | 6;

export type Ctx = Record<string, string>;

export type CardData = {
  title: string;
  no?: string;
  status: [string, string];
  rows: [string, string][];
  track: string[];
  on: number;
};

export type CreateOrderPayload = {
  prefix: string;
  cat: string;
  icon: string;
  title: string;
  type: string;
  status?: 'wait' | 'doing' | 'ok';
  statusText?: string;
  summary: string;
  rows: [string, string][];
  track: string[];
};

export type SceneNode =
  | { step: Step }
  | { label: string }
  | { goto: string | ((ctx: Ctx) => string | null | undefined) }
  | { bot: string }
  | { botFn: (ctx: Ctx) => string }
  | { user: string } // 仅演示自动代说（无 as 的旧脚本兼容）
  | { img: string }
  | { opts: string[]; pick: string; as?: string }
  | { waitText: { as: string; demo: string | ((ctx: Ctx) => string); placeholder?: string } }
  | { waitImg: { as: string; label: string } }
  | { result: string }
  | { resultFn: (ctx: Ctx) => string }
  | { card: CardData }
  | { cardFn: (ctx: Ctx) => CardData }
  | {
      avail: {
        title: string;
        sections: { name: string; slots: { nm: string; st: string; label: string }[] }[];
        tip?: string;
      };
    }
  | {
      menu: {
        type?: string;
        title: string;
        cats: { name: string; items: string }[];
        tip?: string;
      };
    }
  | {
      infoPanel: {
        title: string;
        sub?: string;
        body?: string;
        cadres?: { av: string; name: string; role: string; phone: string }[];
        communities?: { name: string; lead: string; households: string }[];
      };
    }
  | {
      infoPanelFn: (ctx: Ctx) =>
        | {
            title: string;
            sub?: string;
            body?: string;
            cadres?: { av: string; name: string; role: string; phone: string }[];
            communities?: { name: string; lead: string; households: string }[];
          }
        | null
        | undefined;
    }
  | {
      medSlots: {
        title: string;
        slots: { nm: string; st: string; label: string }[];
      };
    }
  | {
      medSlotsFn: (ctx: Ctx) => {
        title: string;
        slots: { nm: string; st: string; label: string }[];
      };
    }
  | { createOrder: CreateOrderPayload }
  | { createOrderFn: (ctx: Ctx) => CreateOrderPayload }
  | { goHome: true };

export type Scenario = {
  key: string;
  name: string;
  icon: string;
  tag: string;
  steps: SceneNode[];
};

export type ChatMsg =
  | { kind: 'time'; text: string }
  | { kind: 'bot'; text: string }
  | { kind: 'user'; text: string }
  | { kind: 'img'; label: string }
  | { kind: 'opts'; opts: string[]; pick?: string }
  | { kind: 'result'; text: string }
  | { kind: 'card'; card: CardData }
  | { kind: 'avail'; avail: Extract<SceneNode, { avail: unknown }>['avail'] }
  | { kind: 'menu'; menu: Extract<SceneNode, { menu: unknown }>['menu'] }
  | { kind: 'info'; info: Extract<SceneNode, { infoPanel: unknown }>['infoPanel'] }
  | { kind: 'med'; med: Extract<SceneNode, { medSlots: unknown }>['medSlots'] }
  | {
      kind: 'weather';
      loading?: boolean;
      error?: string;
      data?: {
        name: string;
        temp: number;
        condition: string;
        emoji: string;
        humidity: number;
        windLabel: string;
        high: number | null;
        low: number | null;
        tip: string;
      };
    }
  | { kind: 'searching'; text: string }
  | { kind: 'welcome' };

export function tpl(s: string, ctx: Ctx): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => ctx[k] ?? '');
}
