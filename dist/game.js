import { AudioManager } from './audio.js';
import { getGameDom } from './dom.js';
import { format, GLOBAL_TITLE, LOCALES, resolveLanguage } from './locales.js';
import { lerp, randomBetween } from './math.js';
import { PlatformService } from './platform.js';
import { SceneRenderer } from './renderer.js';
import { ResultLayoutController } from './result-layout.js';
import { ViewportController } from './viewport.js';
const START_LEVEL = 5;
const JAPANESE_TITLE = '侍の早斬り';
export class QuickDrawGame {
    constructor() {
        this.language = 'en';
        this.localeTag = 'en';
        this.platformReady = false;
        this.restartInProgress = false;
        this.rewardedContinueUsed = false;
        this.bestWins = 0;
        this.bestScore = 0;
        this.width = 360;
        this.height = 640;
        this.scale = .5;
        this.groundY = 512;
        this.player = null;
        this.enemy = null;
        this.lastTime = performance.now();
        this.frameRequest = null;
        this.state = {
            state: 'title', wins: 0, score: 0, defeated: [],
            introT0: 0, introEnd: 0, introThud: false, waitT0: 0, bangAt: 0, bangT: 0, bangOn: false,
            winT0: 0, impactAt: 0, impacted: false, grade: 2, lose: null,
            flashAlpha: 0, flashColor: '255,250,235', shake: 0, freezeUntil: 0,
            particles: [], floats: [], hats: [], trail: null
        };
        this.frame = (time) => {
            this.frameRequest = null;
            if (this.platform.paused)
                return;
            const delta = Math.min(50, time - this.lastTime);
            this.lastTime = time;
            this.update(time, delta);
            this.render(time);
            this.frameRequest = requestAnimationFrame(this.frame);
        };
        this.dom = getGameDom();
        const context = this.dom.canvas.getContext('2d');
        if (!context)
            throw new Error('Canvas 2D context unavailable');
        this.audio = new AudioManager(this.dom.bgmButton, this.dom.sfxButton);
        this.platform = new PlatformService({
            onAudioEnabledChange: enabled => this.audio.setPlatformState(enabled, this.platform.paused),
            onPause: () => {
                this.audio.setPlatformState(this.platform.audioEnabled, true);
                this.stopFrameLoop();
            },
            onResume: () => {
                this.audio.setPlatformState(this.platform.audioEnabled, false);
                this.startFrameLoop();
            }
        });
        this.renderer = new SceneRenderer(context);
        this.resultLayout = new ResultLayoutController(this.dom.result, this.dom.resultFrame);
        this.viewport = new ViewportController(this.dom.stage, this.dom.canvas, context, metrics => this.handleViewport(metrics));
        this.bindInputs();
        this.resultLayout.start();
        this.viewport.start();
    }
    async initialize() {
        if (this.platform.inPlayables)
            document.body.classList.add('playables');
        this.viewport.refresh();
        this.platform.setupCallbacks();
        this.audio.setPlatformState(this.platform.audioEnabled, this.platform.paused);
        const [localeTag, progress] = await Promise.all([this.platform.getLanguage(), this.platform.loadProgress()]);
        this.localeTag = localeTag;
        this.language = resolveLanguage(localeTag);
        this.bestWins = progress.bestWins;
        this.bestScore = progress.bestScore;
        this.initFighters();
        this.applyLanguage();
        this.updateHud();
        this.render(performance.now());
        this.platform.firstFrameReady();
        this.platformReady = true;
        this.platform.gameReady();
        this.startFrameLoop();
    }
    strings() { return LOCALES[this.language]; }
    playerBase() { return this.width * .30; }
    enemyBase() { return this.width * .68; }
    requirePlayer() { if (!this.player)
        throw new Error('Player not initialized'); return this.player; }
    requireEnemy() { if (!this.enemy)
        throw new Error('Enemy not initialized'); return this.enemy; }
    handleViewport(metrics) {
        this.width = metrics.width;
        this.height = metrics.height;
        this.scale = metrics.scale;
        this.groundY = metrics.groundY;
        this.renderer.resize(metrics);
        this.refreshFighterGeometry();
        this.resultLayout.schedule();
    }
    applyLanguage() {
        const s = this.strings();
        document.documentElement.lang = this.localeTag || this.language;
        document.title = this.language === 'ja' ? JAPANESE_TITLE : GLOBAL_TITLE;
        this.dom.hudRoundLabel.textContent = s.defeated;
        this.dom.hudRoundUnit.textContent = s.unit;
        this.dom.hudScoreLabel.textContent = s.score;
        this.dom.titleTag.textContent = '';
        this.dom.titleTag.style.display = 'none';
        this.dom.titleName.textContent = this.language === 'ja' ? JAPANESE_TITLE : GLOBAL_TITLE;
        s.rules.forEach((text, index) => { this.dom.rules[index].textContent = text; });
        this.dom.titleGo.textContent = s.start;
        this.dom.hintBar.textContent = s.hint;
        this.dom.resultTag.textContent = s.duelEnded;
        this.dom.resultWinsLabel.textContent = s.enemiesDefeated;
        this.dom.resultWinsUnit.textContent = s.unit;
        this.dom.resultScoreLabel.textContent = s.score;
        this.dom.resultGo.textContent = s.another;
        this.dom.rewardContinue.textContent = s.reward;
        this.dom.bgmButton.title = s.bgm;
        this.dom.sfxButton.title = s.sfx;
        this.updateBestText();
        this.resultLayout.schedule();
    }
    updateBestText() {
        const s = this.strings();
        const values = { wins: this.bestWins, score: this.bestScore };
        this.dom.best.textContent = this.bestWins ? format(s.best, values) : '';
        this.dom.titleBest.textContent = this.bestWins ? format(s.bestRecord, values) : '';
    }
    updateHud() {
        this.dom.wins.textContent = String(this.state.wins);
        this.dom.score.textContent = String(this.state.score);
        this.updateBestText();
    }
    saveProgress() {
        return this.platform.saveProgress({ version: 2, bestWins: this.bestWins, bestScore: this.bestScore });
    }
    makeFighter(palette, facing, radius, x) {
        return { palette, facing, radius, x, pose: 'idle', t0: 0, seed: randomBetween(0, 9), fy: 0, rot: 0, vx: 0, vy: 0, vr: 0, landed: false, lieRot: 0, lungeDuration: 200, xFrom: 0, xTo: 0, baseX: x, glow: false };
    }
    makeEnemy(index, level) {
        const hue = (index * 53 + 8) % 360;
        const names = this.strings().names;
        const fallback = names[names.length - 1] ?? 'Opponent';
        const name = index < names.length ? (names[index] ?? fallback) : `${fallback} ${index - names.length + 2}`;
        const radius = (40 + Math.min(14, index * 1.1)) * this.scale;
        const hardLevel = level + 3;
        return {
            name,
            windowMs: Math.max(155, 620 - hardLevel * 27) + randomBetween(-10, 10),
            waitMin: Math.max(.85, 1.5 - level * .04),
            waitMax: Math.min(4.4, 2.7 + level * .09),
            radius,
            stars: Math.min(6, 2 + Math.floor(index / 2)),
            palette: { body: `hsl(${hue} 16% 22%)`, line: '#0a0b12', scarf: `hsl(${hue} 72% 52%)`, hat: `hsl(${hue} 14% 16%)`, hatD: `hsl(${hue} 14% 10%)`, eye: '#cfd8ff' }
        };
    }
    initFighters() {
        this.player = this.makeFighter({ body: '#f4ead6', line: '#1a1c28', scarf: '#e8482f', hat: '#c9a25e', hatD: '#8a6a34', eye: '#1a1c28' }, 1, 42 * this.scale, this.playerBase());
        const meta = this.makeEnemy(0, START_LEVEL);
        this.enemy = this.makeFighter(meta.palette, -1, meta.radius, this.enemyBase());
        this.enemy.meta = meta;
    }
    refreshFighterGeometry() {
        if (!this.player || !this.enemy)
            return;
        this.player.radius = 42 * this.scale;
        this.player.baseX = this.playerBase();
        if (this.player.pose !== 'fall')
            this.player.x = this.player.baseX;
        const index = Math.max(0, this.state.wins);
        this.enemy.radius = (40 + Math.min(14, index * 1.1)) * this.scale;
        this.enemy.baseX = this.enemyBase();
        if (this.state.state === 'title' || this.state.state === 'wait')
            this.enemy.x = this.enemy.baseX;
    }
    beginGame() {
        this.platform.beginFreshRun();
        this.rewardedContinueUsed = false;
        Object.assign(this.state, { state: 'title', wins: 0, score: 0, defeated: [], particles: [], floats: [], hats: [], trail: null, flashAlpha: 0, shake: 0, bangOn: false, lose: null, freezeUntil: 0 });
        this.updateHud();
        this.dom.title.classList.remove('show');
        this.dom.result.classList.remove('show');
        this.dom.rewardContinue.style.display = 'none';
        this.resultLayout.clear();
        this.startIntro(performance.now(), 0);
    }
    startIntro(time, index) {
        const player = this.requirePlayer();
        const meta = this.makeEnemy(index, index + START_LEVEL);
        this.enemy = this.makeFighter(meta.palette, -1, meta.radius, this.width + 90);
        this.enemy.baseX = this.enemyBase();
        this.enemy.pose = 'enter';
        this.enemy.t0 = time;
        this.enemy.meta = meta;
        player.x = this.playerBase();
        player.fy = 0;
        player.rot = 0;
        player.landed = false;
        player.glow = false;
        this.setPose(player, 'stance', time);
        Object.assign(this.state, { state: 'intro', introT0: time, introEnd: time + 1200, introThud: false, bangOn: false, trail: null });
        const s = this.strings();
        this.dom.riCount.textContent = format(s.enemy, { n: index + 1 });
        this.dom.riMain.textContent = meta.name;
        this.dom.riHint.textContent = `${s.bladeSpeed} ${'★'.repeat(meta.stars)}${'☆'.repeat(6 - meta.stars)}`;
        this.dom.intro.classList.remove('show');
        void this.dom.intro.offsetWidth;
        this.dom.intro.classList.add('show');
        this.dom.hint.textContent = meta.name;
        this.dom.hintBar.classList.toggle('hide', index > 0);
    }
    setPose(fighter, pose, time) { fighter.pose = pose; fighter.t0 = time; }
    stamp(text, kind) { this.dom.stamp.textContent = text; this.dom.stamp.className = ''; void this.dom.stamp.offsetWidth; this.dom.stamp.className = `show ${kind}`; }
    bang(time) {
        const player = this.requirePlayer(), enemy = this.requireEnemy();
        this.state.state = 'flash';
        this.state.bangT = time;
        this.state.bangOn = true;
        this.audio.bang();
        this.state.flashAlpha = .28;
        this.state.flashColor = '255,250,235';
        enemy.glow = true;
        enemy.pose = 'lunge';
        enemy.t0 = time;
        enemy.lungeDuration = enemy.meta.windowMs;
        enemy.xFrom = enemy.x;
        enemy.xTo = player.x + (player.radius + enemy.radius) * .9;
    }
    winFight(reaction, time) {
        const player = this.requirePlayer(), enemy = this.requireEnemy();
        const windowMs = enemy.meta.windowMs, perfect = Math.min(150, windowMs * .5), great = Math.min(300, windowMs * .9);
        const grade = reaction <= perfect ? 0 : reaction <= great ? 1 : 2;
        const points = [300, 200, 100][grade] ?? 100;
        Object.assign(this.state, { state: 'win', winT0: time, impactAt: time + 110, impacted: false, grade });
        this.state.score += points;
        this.updateHud();
        this.setPose(player, 'slashWin', time);
        player.xFrom = player.x;
        player.xTo = enemy.x - (player.radius + enemy.radius) * .9;
        this.addFloat(`+${points}`, enemy.x, this.groundY - enemy.radius * 2.6, grade === 0 ? '#ffd76a' : '#f5eeda', true);
        this.addFloat(`${Math.round(reaction)}ms`, enemy.x, this.groundY - enemy.radius * 1.9, '#aeb8ea', false);
    }
    winImpact(time) {
        const enemy = this.requireEnemy();
        this.state.impacted = true;
        this.state.freezeUntil = time + 90;
        this.state.shake = this.state.grade === 0 ? 8 : 5;
        this.state.flashAlpha = .7;
        this.state.flashColor = '255,250,235';
        this.state.trail = { t0: time, x: enemy.x, y: this.groundY - enemy.radius };
        this.audio.slash();
        if (this.state.grade === 0)
            this.audio.chime();
        const s = this.strings();
        this.stamp([s.perfect, s.great, s.cut][this.state.grade] ?? s.cut, ['p', 'g', 'o'][this.state.grade]);
        this.sparks(enemy.x, this.groundY - enemy.radius, 26, this.state.grade === 0 ? ['255,214,106', '255,255,240'] : ['245,238,218', '200,205,235']);
        enemy.glow = false;
        this.setPose(enemy, 'fall', time);
        enemy.fy = 0;
        enemy.rot = 0;
        enemy.vx = randomBetween(320, 400) * this.scale;
        enemy.vy = -randomBetween(360, 440) * this.scale;
        enemy.vr = randomBetween(6, 9);
        enemy.lieRot = 1.45;
        enemy.landed = false;
        this.spawnHat(enemy);
        this.state.defeated.push(enemy.meta.name);
        this.state.wins++;
        this.updateHud();
    }
    landHit(time) {
        const player = this.requirePlayer(), enemy = this.requireEnemy();
        this.state.flashAlpha = .55;
        this.state.flashColor = '232,72,47';
        this.state.shake = 16;
        this.state.freezeUntil = time + 70;
        this.state.trail = { t0: time, x: player.x, y: this.groundY - player.radius };
        this.audio.slash();
        this.audio.lose();
        this.setPose(player, 'fall', time);
        player.fy = 0;
        player.rot = 0;
        player.vx = -randomBetween(300, 360) * this.scale;
        player.vy = -randomBetween(330, 410) * this.scale;
        player.vr = -randomBetween(6, 9);
        player.lieRot = -1.45;
        player.landed = false;
        this.spawnHat(player);
        this.sparks(player.x, this.groundY - player.radius, 22, ['255,120,90', '255,224,130']);
        enemy.glow = false;
        this.setPose(enemy, 'stand2', time);
    }
    loseEarly(time) {
        this.state.state = 'lose';
        this.state.lose = { kind: 'early', t0: time, stage1: false, stage2: false };
        this.setPose(this.requirePlayer(), 'whiff', time);
        this.audio.whoosh();
        this.stamp(this.strings().early, 'f');
    }
    async showResult() {
        if (this.state.state !== 'lose')
            return;
        this.state.state = 'resultPending';
        const wins = this.state.wins, s = this.strings(), rank = s.ranks.find(item => wins >= item.minWins) ?? s.ranks[s.ranks.length - 1];
        this.dom.resultWins.textContent = String(wins);
        this.dom.resultScore.textContent = String(this.state.score);
        this.dom.resultRank.textContent = rank.name;
        this.dom.resultRankLine.textContent = rank.description;
        const joined = this.state.defeated.slice(0, 8).join(this.language === 'ja' ? '、' : ', ') + (wins > 8 ? '…' : '');
        this.dom.resultNames.textContent = wins ? format(s.defeatedNames, { names: joined }) : s.none;
        let newRecord = false;
        if (wins > this.bestWins) {
            this.bestWins = wins;
            newRecord = true;
        }
        if (this.state.score > this.bestScore) {
            this.bestScore = this.state.score;
            newRecord = true;
        }
        this.dom.resultBest.textContent = (newRecord ? s.newRecord : '') + format(s.bestRecord, { wins: this.bestWins, score: this.bestScore });
        this.updateHud();
        await Promise.all([
            this.saveProgress(),
            this.platform.sendScore(this.bestScore)
        ]);
        await this.platform.completeRun();
        this.state.state = 'result';
        this.audio.result();
        this.dom.result.classList.add('show');
        this.dom.rewardContinue.disabled = false;
        this.dom.rewardContinue.textContent = s.reward;
        this.dom.rewardContinue.style.display = this.platform.inPlayables && !this.rewardedContinueUsed ? 'block' : 'none';
        this.resultLayout.schedule();
    }
    startFreshRunFromResult() {
        if (this.restartInProgress || this.state.state !== 'result')
            return;
        this.restartInProgress = true;
        try {
            this.beginGame();
        }
        finally {
            this.restartInProgress = false;
        }
    }
    async retryCurrentDuelWithAd() {
        if (!this.platform.inPlayables || this.platform.paused || this.state.state !== 'result' || this.rewardedContinueUsed || this.dom.rewardContinue.disabled)
            return;
        this.dom.rewardContinue.disabled = true;
        this.dom.rewardContinue.textContent = this.strings().loadingAd;
        const earned = await this.platform.requestRewardedRetry();
        if (earned) {
            this.rewardedContinueUsed = true;
            this.dom.rewardContinue.style.display = 'none';
            this.dom.result.classList.remove('show');
            this.resultLayout.clear();
            this.state.particles = [];
            this.state.floats = [];
            this.state.hats = [];
            this.state.trail = null;
            this.state.flashAlpha = 0;
            this.state.shake = 0;
            this.state.bangOn = false;
            this.startIntro(performance.now(), this.state.wins);
            return;
        }
        this.dom.rewardContinue.disabled = false;
        this.dom.rewardContinue.textContent = this.strings().reward;
    }
    action() {
        if (!this.platformReady || this.platform.paused || this.restartInProgress)
            return;
        const time = performance.now();
        if (this.state.state === 'title')
            this.beginGame();
        else if (this.state.state === 'result')
            this.startFreshRunFromResult();
        else if (this.state.state === 'wait')
            this.loseEarly(time);
        else if (this.state.state === 'flash') {
            const reaction = time - this.state.bangT;
            if (reaction <= this.requireEnemy().meta.windowMs)
                this.winFight(reaction, time);
        }
    }
    bindInputs() {
        addEventListener('keydown', event => {
            if (event.repeat || this.platform.paused)
                return;
            if (event.code === 'KeyM') {
                this.audio.unlock();
                this.audio.toggleBgm();
                return;
            }
            if (['Space', 'Enter', 'KeyZ', 'KeyJ'].includes(event.code)) {
                event.preventDefault();
                this.audio.unlock();
                this.action();
            }
            if (event.code === 'KeyR' && this.state.state === 'result') {
                this.audio.unlock();
                this.startFreshRunFromResult();
            }
        });
        addEventListener('pointerdown', event => { if (event.target?.closest('button'))
            return; event.preventDefault(); this.audio.unlock(); this.action(); }, { passive: false });
        this.dom.bgmButton.addEventListener('pointerdown', event => { event.stopPropagation(); if (this.platform.paused)
            return; this.audio.unlock(); this.audio.toggleBgm(); });
        this.dom.sfxButton.addEventListener('pointerdown', event => { event.stopPropagation(); if (this.platform.paused)
            return; this.audio.unlock(); this.audio.toggleSfx(); });
        this.dom.rewardContinue.addEventListener('pointerdown', event => event.stopPropagation());
        this.dom.rewardContinue.addEventListener('click', event => { event.stopPropagation(); if (this.platform.paused)
            return; this.audio.unlock(); void this.retryCurrentDuelWithAd(); });
    }
    startFrameLoop() {
        if (!this.platformReady || this.platform.paused || this.frameRequest !== null)
            return;
        this.lastTime = performance.now();
        this.frameRequest = requestAnimationFrame(this.frame);
    }
    stopFrameLoop() {
        if (this.frameRequest === null)
            return;
        cancelAnimationFrame(this.frameRequest);
        this.frameRequest = null;
    }
    update(time, delta) {
        this.renderer.updateAmbient(time, delta, this.state.state);
        const effective = time < this.state.freezeUntil ? 0 : delta, seconds = effective / 1000;
        this.state.shake = Math.max(0, this.state.shake - delta * .045);
        this.state.flashAlpha = Math.max(0, this.state.flashAlpha - delta * .0035);
        for (const particle of this.state.particles) {
            particle.age += seconds;
            particle.vy += particle.g * seconds;
            particle.x += particle.vx * seconds;
            particle.y += particle.vy * seconds;
        }
        this.state.particles = this.state.particles.filter(particle => particle.age < particle.life);
        for (const floating of this.state.floats)
            floating.age += seconds;
        this.state.floats = this.state.floats.filter(floating => floating.age < .95);
        for (const hat of this.state.hats) {
            hat.vy += 1200 * this.scale * seconds;
            hat.x += hat.vx * seconds;
            hat.y += hat.vy * seconds;
            hat.rot += hat.vr * seconds;
            hat.age += seconds;
        }
        this.state.hats = this.state.hats.filter(hat => hat.age < 1.4 && hat.y < this.height + 60);
        this.audio.setWindIntense(this.state.state === 'wait' || this.state.state === 'flash');
        const player = this.requirePlayer(), enemy = this.requireEnemy();
        if (this.state.state === 'intro') {
            const elapsed = time - this.state.introT0, k = Math.min(1, elapsed / 650), ease = 1 - Math.pow(1 - k, 3);
            enemy.x = lerp(this.width + 90, enemy.baseX, ease);
            if (k >= 1 && !this.state.introThud) {
                this.state.introThud = true;
                this.audio.thud();
                this.dust(enemy.x);
                this.setPose(enemy, 'stance', time);
            }
            if (time >= this.state.introEnd) {
                this.state.state = 'wait';
                this.state.waitT0 = time;
                this.state.bangAt = time + randomBetween(enemy.meta.waitMin, enemy.meta.waitMax) * 1000;
            }
        }
        else if (this.state.state === 'wait') {
            if (time >= this.state.bangAt)
                this.bang(time);
        }
        else if (this.state.state === 'flash') {
            const progress = Math.min(1, (time - this.state.bangT) / enemy.meta.windowMs);
            enemy.x = lerp(enemy.xFrom, enemy.xTo, progress);
            if (progress >= 1) {
                this.state.state = 'lose';
                this.state.lose = { kind: 'late', t0: time };
                this.landHit(time);
                this.stamp(this.strings().late, 'f');
            }
        }
        else if (this.state.state === 'win') {
            const elapsed = time - this.state.winT0;
            if (!this.state.impacted) {
                const k = Math.min(1, elapsed / 110), ease = 1 - Math.pow(1 - k, 3);
                player.x = lerp(player.xFrom, player.xTo, ease);
                if (time >= this.state.impactAt)
                    this.winImpact(time);
            }
            else {
                this.flyStep(enemy, seconds);
                if (elapsed >= 1450)
                    this.startIntro(time, this.state.wins);
            }
        }
        else if (this.state.state === 'lose' && this.state.lose) {
            const lose = this.state.lose, elapsed = time - lose.t0;
            if (lose.kind === 'early') {
                if (!lose.stage1 && elapsed >= 180) {
                    lose.stage1 = true;
                    enemy.pose = 'lunge';
                    enemy.t0 = time;
                    enemy.lungeDuration = 190;
                    enemy.xFrom = enemy.x;
                    enemy.xTo = player.x + (player.radius + enemy.radius) * .9;
                    enemy.glow = true;
                }
                if (lose.stage1) {
                    const progress = Math.min(1, (time - enemy.t0) / enemy.lungeDuration);
                    enemy.x = lerp(enemy.xFrom, enemy.xTo, progress);
                    if (!lose.stage2 && progress >= 1) {
                        lose.stage2 = true;
                        this.landHit(time);
                    }
                }
                if (lose.stage2)
                    this.flyStep(player, seconds);
                if (elapsed >= 2050)
                    void this.showResult();
            }
            else {
                this.flyStep(player, seconds);
                if (elapsed >= 1750)
                    void this.showResult();
            }
        }
    }
    addFloat(text, x, y, color, big) { this.state.floats.push({ text, x, y, color, big, age: 0 }); }
    dust(x) {
        for (let i = 0; i < 8; i++)
            this.state.particles.push({ x: x + randomBetween(-14, 14) * this.scale, y: this.groundY, vx: randomBetween(-60, 60) * this.scale, vy: randomBetween(-90, -20) * this.scale, g: -40 * this.scale, life: randomBetween(.4, .8), age: 0, radius: randomBetween(3, 7) * this.scale, color: '120,126,160', soft: true });
    }
    sparks(x, y, count, colors) {
        for (let i = 0; i < count; i++)
            this.state.particles.push({ x, y, vx: randomBetween(-340, 340) * this.scale, vy: randomBetween(-400, 60) * this.scale, g: 780 * this.scale, life: randomBetween(.3, .75), age: 0, radius: randomBetween(1.5, 4) * this.scale, color: colors[i % colors.length] ?? colors[0] ?? '255,255,255' });
    }
    spawnHat(fighter) {
        this.state.hats.push({ x: fighter.x, y: this.groundY - fighter.radius * 1.6, vx: fighter.facing * -randomBetween(60, 160) * this.scale, vy: -randomBetween(280, 360) * this.scale, rot: 0, vr: randomBetween(-8, 8), age: 0, palette: fighter.palette, radius: fighter.radius });
    }
    flyStep(fighter, seconds) {
        if (fighter.landed) {
            fighter.rot += (fighter.lieRot - fighter.rot) * Math.min(1, seconds * 9);
            return;
        }
        fighter.vy += 1500 * this.scale * seconds;
        fighter.fy += fighter.vy * seconds;
        fighter.x += fighter.vx * seconds;
        fighter.rot += fighter.vr * seconds;
        if (fighter.fy >= 0 && fighter.vy > 0) {
            fighter.fy = 0;
            if (Math.abs(fighter.vy) > 130) {
                fighter.vy *= -.32;
                fighter.vx *= .55;
                fighter.vr *= .5;
                this.dust(fighter.x);
            }
            else {
                fighter.landed = true;
                fighter.vy = 0;
            }
        }
    }
    render(time) {
        if (!this.player || !this.enemy)
            return;
        this.renderer.render(time, this.state, this.player, this.enemy);
    }
}
