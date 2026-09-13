export type LanguageKey = 'en'|'ja'|'es'|'pt'|'fr'|'de'|'it'|'ko'|'zh-Hans'|'zh-Hant'|'id'|'ru';

export interface RankText { minWins:number; name:string; description:string; }
export interface LocalePack {
  tag:string; title:string; rules:[string,string,string,string]; start:string;
  defeated:string; unit:string; score:string; best:string; enemy:string; bladeSpeed:string; hint:string;
  duelEnded:string; enemiesDefeated:string; defeatedNames:string; none:string; newRecord:string; bestRecord:string;
  another:string; reward:string; loadingAd:string; bgm:string; sfx:string;
  perfect:string; great:string; cut:string; early:string; late:string;
  names:readonly string[]; ranks:readonly RankText[];
}

export interface SaveData { version:2; bestWins:number; bestScore:number; }

export interface Palette { body:string; line:string; scarf:string; hat:string; hatD:string; eye:string; }
export type FighterPose = 'idle'|'enter'|'stance'|'lunge'|'slashWin'|'whiff'|'stand2'|'fall';
export interface EnemyMeta { name:string; windowMs:number; waitMin:number; waitMax:number; radius:number; stars:number; palette:Palette; }
export interface Fighter {
  palette:Palette; facing:1|-1; radius:number; x:number; pose:FighterPose; t0:number; seed:number;
  fy:number; rot:number; vx:number; vy:number; vr:number; landed:boolean; lieRot:number; lungeDuration:number;
  xFrom:number; xTo:number; baseX:number; glow:boolean; meta?:EnemyMeta;
}
export type GameStateName = 'title'|'intro'|'wait'|'flash'|'win'|'lose'|'resultPending'|'result';
export interface LoseState { kind:'early'|'late'; t0:number; stage1?:boolean; stage2?:boolean; }
export interface Particle { x:number;y:number;vx:number;vy:number;g:number;life:number;age:number;radius:number;color:string;soft?:boolean; }
export interface FloatText { text:string;x:number;y:number;color:string;big:boolean;age:number; }
export interface HatParticle { x:number;y:number;vx:number;vy:number;rot:number;vr:number;age:number;palette:Palette;radius:number; }
export interface Trail { t0:number;x:number;y:number; }
export interface GameState {
  state:GameStateName; wins:number; score:number; defeated:string[];
  introT0:number; introEnd:number; introThud:boolean; waitT0:number; bangAt:number; bangT:number; bangOn:boolean;
  winT0:number; impactAt:number; impacted:boolean; grade:0|1|2; lose:LoseState|null;
  flashAlpha:number; flashColor:string; shake:number; freezeUntil:number;
  particles:Particle[]; floats:FloatText[]; hats:HatParticle[]; trail:Trail|null;
}

export type Unsubscribe=()=>void;

export interface YtGameSdk {
  IN_PLAYABLES_ENV?: boolean;
  system: {
    getLanguage(): Promise<string>;
    isAudioEnabled(): boolean;
    onAudioEnabledChange(cb:(enabled:boolean)=>void): Unsubscribe;
    onPause(cb:()=>void): Unsubscribe;
    onResume(cb:()=>void): Unsubscribe;
  };
  game: {
    firstFrameReady(): void;
    gameReady(): void;
    loadData(): Promise<string>;
    saveData(data:string): Promise<void>;
  };
  engagement: { sendScore(payload:{value:number}): Promise<void>; };
  ads: {
    requestInterstitialAd(): Promise<void>;
    requestRewardedAd(rewardId:string): Promise<boolean>;
  };
  health: { logWarning(): void; logError(): void; };
}

declare global {
  const ytgame: YtGameSdk | undefined;
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    __QUICK_DRAW_AD_DEBUG?: unknown;
    __QUICK_DRAW_LAYOUT_DEBUG?: unknown;
  }
}
