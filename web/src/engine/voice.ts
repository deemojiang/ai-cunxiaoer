/**
 * Web Speech API voice input (zh-CN).
 * Works on Chrome/Edge over HTTPS. Safari has limited SpeechRecognition support.
 */

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export type VoiceCallbacks = {
  onStart?: () => void;
  onInterim?: (text: string) => void;
  onEnd?: (finalText: string) => void;
  onError?: (message: string) => void;
};

export type VoiceRecognizer = {
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export function isSpeechRecognitionSupported(): boolean {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function mapSpeechError(error: string): string {
  switch (error) {
    case 'not-allowed':
      return '麦克风权限被拒绝，请在浏览器设置中允许麦克风';
    case 'no-speech':
      return '';
    case 'aborted':
      return '';
    case 'network':
      return '网络异常，语音识别暂不可用';
    case 'service-not-allowed':
      return '当前浏览器不支持语音输入，请改用文字';
    default:
      return '语音识别出错，请重试';
  }
}

export function createVoiceRecognizer(callbacks: VoiceCallbacks): VoiceRecognizer {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) throw new Error('SpeechRecognition unsupported');

  const rec = new Ctor();
  rec.lang = 'zh-CN';
  rec.continuous = false;
  rec.interimResults = true;

  let finalTranscript = '';
  let interimTranscript = '';
  let ended = false;

  rec.onstart = () => callbacks.onStart?.();

  rec.onresult = (event) => {
    interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const chunk = result[0]?.transcript ?? '';
      if (result.isFinal) finalTranscript += chunk;
      else interimTranscript += chunk;
    }
    callbacks.onInterim?.((finalTranscript + interimTranscript).trim());
  };

  rec.onerror = (event) => {
    const msg = mapSpeechError(event.error);
    if (msg) callbacks.onError?.(msg);
  };

  rec.onend = () => {
    if (ended) return;
    ended = true;
    const text = (finalTranscript + interimTranscript).trim();
    callbacks.onEnd?.(text);
  };

  return {
    start() {
      ended = false;
      finalTranscript = '';
      interimTranscript = '';
      try {
        rec.start();
      } catch {
        callbacks.onError?.('语音识别启动失败，请重试');
      }
    },
    stop() {
      try {
        rec.stop();
      } catch {
        if (!ended) {
          ended = true;
          callbacks.onEnd?.((finalTranscript + interimTranscript).trim());
        }
      }
    },
    abort() {
      ended = true;
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    },
  };
}
