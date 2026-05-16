export interface NoaSession {
  name?: string;
  businessType?: string;
  messages: Array<{ role: string; content: string }>;
  minimized: boolean;
  lastUpdated: string;
}

const STORAGE_KEY = 'noa_session';
const MAX_MESSAGES = 20;

export function saveNoaSession(data: NoaSession): void {
  try {
    const toSave: NoaSession = { ...data, messages: data.messages.slice(-MAX_MESSAGES) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
  }
}

export function loadNoaSession(): NoaSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NoaSession;
  } catch {
    clearNoaSession();
    return null;
  }
}

export function clearNoaSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}
