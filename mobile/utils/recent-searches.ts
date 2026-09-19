import * as SecureStore from '@/utils/storage';

const RECENT_KEY = 'recent_searches';
const MAX_RECENT = 6;

// Son aramalar sunucuda değil cihazın/tarayıcının depolamasında tutulur (yalnızca o kullanıcıya kolaylık)
export async function loadRecent(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function saveRecent(term: string) {
  const next = [term, ...(await loadRecent()).filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT);
  await SecureStore.setItemAsync(RECENT_KEY, JSON.stringify(next));
}

export async function clearRecent() {
  await SecureStore.setItemAsync(RECENT_KEY, '[]');
}
