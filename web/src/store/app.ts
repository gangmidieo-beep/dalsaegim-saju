// 앱 상태 — 이 기기에 저장(zustand persist). 사주 정보는 서버에도 올려 AI 사주친구·풀이·기록이 같은 기준을 쓴다.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Profile = {
  id: string;
  name: string;
  gender: 'M' | 'F';
  year: number;
  month: number;
  day: number;
  calendar: 'solar' | 'lunar';
  leap: boolean;
  hour: number | null; // 0~23, 모르면 null
  relation?: string; // 나 · 연인 · 배우자 · 가족 · 친구
  mbti?: string;
};
export type Account = { provider: 'google' | 'kakao' | 'naver' | 'mock'; id: string; name: string; token?: string };

// 입력 전 화면에 보여 주는 예시 인물
export const SAMPLE: Profile = { id: 'sample', name: '달님', gender: 'F', year: 1996, month: 4, day: 2, calendar: 'solar', leap: false, hour: 9 };

type State = {
  introSeen: boolean;
  profiles: Profile[];
  mainId: string | null;
  account: Account | null;
  lucky: { date: string; round: number };
  friendChatId: string | null;
  pass: boolean; // AI 사주친구 이용권
  setIntroSeen: () => void;
  saveProfile: (p: Profile, makeMain?: boolean) => void;
  removeProfile: (id: string) => void;
  setMain: (id: string) => void;
  setAccount: (a: Account | null) => void;
  rerollLucky: (date: string) => void;
  setFriendChat: (id: string | null) => void;
  setPass: (on: boolean) => void;
};

export const useApp = create<State>()(
  persist(
    (set) => ({
      introSeen: false,
      profiles: [],
      mainId: null,
      account: null,
      lucky: { date: '', round: 0 },
      friendChatId: null,
      pass: false,
      setIntroSeen: () => set({ introSeen: true }),
      saveProfile: (p, makeMain) =>
        set((s) => {
          const profiles = s.profiles.some((x) => x.id === p.id) ? s.profiles.map((x) => (x.id === p.id ? p : x)) : [...s.profiles, p];
          return { profiles, mainId: makeMain || !s.mainId ? p.id : s.mainId };
        }),
      removeProfile: (id) =>
        set((s) => {
          const profiles = s.profiles.filter((x) => x.id !== id);
          return { profiles, mainId: s.mainId === id ? profiles[0]?.id ?? null : s.mainId };
        }),
      setMain: (mainId) => set({ mainId }),
      setAccount: (account) => set({ account }),
      rerollLucky: (date) => set((s) => ({ lucky: { date, round: s.lucky.date === date ? Math.min(1, s.lucky.round + 1) : 1 } })),
      setFriendChat: (friendChatId) => set({ friendChatId }),
      setPass: (pass) => set({ pass }),
    }),
    { name: 'dalsaegim', version: 1 },
  ),
);

// 대표 사주(없으면 예시)
export function useMain(): { profile: Profile; isSample: boolean } {
  const { profiles, mainId } = useApp();
  const p = profiles.find((x) => x.id === mainId) ?? profiles[0];
  return p ? { profile: p, isSample: false } : { profile: SAMPLE, isSample: true };
}
export const newId = () => 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const age = (p: Profile, now = new Date()) => now.getFullYear() - p.year + 1;
