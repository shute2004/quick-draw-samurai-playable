const SAVE_KEY = 'setsuna-no-migiri-save-v1';
const REWARD_RETRY_ID = 'retry-current-duel-v1';
const INTERSTITIAL_EVERY_N_RUNS = 2;
function sdk() {
    return typeof ytgame !== 'undefined' ? ytgame : undefined;
}
export class PlatformService {
    constructor(hooks) {
        this.audioEnabled = true;
        this.paused = false;
        this.cloudLoadSucceeded = false;
        this.runsSinceInterstitial = 0;
        this.currentRunAlreadyCounted = false;
        this.interstitialRequestCount = 0;
        this.hooks = hooks;
        this.inPlayables = sdk()?.IN_PLAYABLES_ENV === true;
        window.__QUICK_DRAW_AD_DEBUG = { cadence: INTERSTITIAL_EVERY_N_RUNS, runsSinceInterstitial: 0, pending: false, requestCount: 0, requestAfterRuns: [], lastRequestStatus: 'none' };
    }
    warn() { try {
        if (this.inPlayables)
            sdk()?.health.logWarning();
    }
    catch { } }
    error() { try {
        if (this.inPlayables)
            sdk()?.health.logError();
    }
    catch { } }
    setupCallbacks() {
        if (!this.inPlayables)
            return;
        try {
            const yt = sdk();
            if (!yt)
                return;
            this.audioEnabled = yt.system.isAudioEnabled();
            yt.system.onAudioEnabledChange(enabled => {
                this.audioEnabled = enabled;
                this.hooks.onAudioEnabledChange(enabled);
            });
            yt.system.onPause(() => {
                this.paused = true;
                this.hooks.onPause();
            });
            yt.system.onResume(() => {
                this.paused = false;
                this.hooks.onResume();
            });
        }
        catch {
            this.warn();
        }
    }
    async getLanguage() {
        if (!this.inPlayables)
            return 'en';
        try {
            return await sdk().system.getLanguage();
        }
        catch {
            this.warn();
            return 'en';
        }
    }
    async loadProgress() {
        try {
            let raw = '';
            if (this.inPlayables) {
                raw = await sdk().game.loadData();
                this.cloudLoadSucceeded = true;
            }
            else {
                raw = localStorage.getItem(SAVE_KEY) ?? '';
            }
            if (!raw)
                return { version: 2, bestWins: 0, bestScore: 0 };
            const parsed = JSON.parse(raw);
            return {
                version: 2,
                bestWins: Number.isInteger(parsed.bestWins) && Number(parsed.bestWins) >= 0 ? Number(parsed.bestWins) : 0,
                bestScore: Number.isInteger(parsed.bestScore) && Number(parsed.bestScore) >= 0 ? Number(parsed.bestScore) : 0
            };
        }
        catch {
            this.cloudLoadSucceeded = false;
            this.warn();
            return { version: 2, bestWins: 0, bestScore: 0 };
        }
    }
    async saveProgress(data) {
        if (this.inPlayables && !this.cloudLoadSucceeded)
            return;
        const raw = JSON.stringify(data);
        try {
            if (this.inPlayables)
                await sdk().game.saveData(raw);
            else
                localStorage.setItem(SAVE_KEY, raw);
        }
        catch {
            this.warn();
        }
    }
    async sendScore(value) {
        if (!this.inPlayables)
            return;
        try {
            await sdk().engagement.sendScore({ value: Math.max(0, Math.trunc(value)) });
        }
        catch {
            this.warn();
        }
    }
    firstFrameReady() { if (this.inPlayables)
        try {
            sdk().game.firstFrameReady();
        }
        catch {
            this.error();
        } }
    gameReady() { if (this.inPlayables)
        try {
            sdk().game.gameReady();
        }
        catch {
            this.error();
        } }
    beginFreshRun() { this.currentRunAlreadyCounted = false; }
    async completeRun() {
        if (this.currentRunAlreadyCounted)
            return;
        this.currentRunAlreadyCounted = true;
        this.runsSinceInterstitial++;
        if (this.runsSinceInterstitial < INTERSTITIAL_EVERY_N_RUNS || !this.inPlayables) {
            this.syncAdDebug('none');
            return;
        }
        const runsAtRequest = this.runsSinceInterstitial;
        this.runsSinceInterstitial = 0;
        this.interstitialRequestCount++;
        this.syncAdDebug('pending', runsAtRequest);
        try {
            await sdk().ads.requestInterstitialAd();
            this.syncAdDebug('resolved');
        }
        catch {
            this.syncAdDebug('rejected');
            this.warn();
        }
    }
    async requestRewardedRetry() {
        if (!this.inPlayables)
            return false;
        try {
            return await sdk().ads.requestRewardedAd(REWARD_RETRY_ID);
        }
        catch {
            this.warn();
            return false;
        }
    }
    syncAdDebug(status, runsAtRequest) {
        const current = (window.__QUICK_DRAW_AD_DEBUG ?? {});
        current.cadence = INTERSTITIAL_EVERY_N_RUNS;
        current.runsSinceInterstitial = this.runsSinceInterstitial;
        current.pending = status === 'pending';
        current.requestCount = this.interstitialRequestCount;
        current.requestAfterRuns ?? (current.requestAfterRuns = []);
        if (runsAtRequest !== undefined)
            current.requestAfterRuns.push(runsAtRequest);
        current.lastRequestStatus = status;
        window.__QUICK_DRAW_AD_DEBUG = current;
    }
}
