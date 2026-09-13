export class AudioManager {
    constructor(bgmButton, sfxButton) {
        this.context = null;
        this.seOn = true;
        this.bgmOn = true;
        this.masterGain = null;
        this.musicGain = null;
        this.windGain = null;
        this.windSource = null;
        this.musicTimer = null;
        this.nextStep = 0;
        this.stepIndex = 0;
        this.melodyDegree = 2;
        this.audioEnabled = true;
        this.paused = false;
        this.windIntense = false;
        this.stepDuration = .30;
        this.scale = [0, 1, 5, 7, 10];
        this.baseFrequency = 293.66;
        this.pluckSteps = new Set([0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30]);
        this.bgmButton = bgmButton;
        this.sfxButton = sfxButton;
    }
    setPlatformState(audioEnabled, paused) {
        this.audioEnabled = audioEnabled;
        this.paused = paused;
        this.syncMasterGain();
        this.syncMusicGain();
        this.syncMusicTimer();
        const ac = this.context;
        if (!ac)
            return;
        if (paused) {
            if (ac.state === 'running')
                void ac.suspend().catch(() => { });
            return;
        }
        if (audioEnabled) {
            this.nextStep = ac.currentTime + .05;
            if (ac.state === 'suspended')
                void ac.resume().catch(() => { });
        }
    }
    setWindIntense(value) {
        if (this.windIntense === value)
            return;
        this.windIntense = value;
        this.syncWindGain();
    }
    unlock() {
        try {
            if (!this.context) {
                const Ctor = window.AudioContext ?? window.webkitAudioContext;
                if (!Ctor)
                    return null;
                this.context = new Ctor();
                this.initMasterNode();
                this.initMusicNodes();
                this.syncMasterGain();
                this.syncMusicGain();
                this.syncMusicTimer();
            }
            if (this.audioEnabled && !this.paused && this.context.state === 'suspended')
                void this.context.resume().catch(() => { });
        }
        catch {
            return null;
        }
        return this.context;
    }
    toggleBgm() { this.setBgm(!this.bgmOn); }
    toggleSfx() { this.setSfx(!this.seOn); }
    setBgm(on) { this.bgmOn = on; this.bgmButton.classList.toggle('off', !on); this.syncMusicGain(); }
    setSfx(on) { this.seOn = on; this.sfxButton.classList.toggle('off', !on); }
    bang() { this.tone('square', 2200, 1400, .07, .22); this.tone('sine', 3000, 0, .05, .16); this.noise(.07, .35, 3500, 'highpass'); }
    slash() { this.noise(.16, .5, 2600, 'bandpass'); this.tone('sine', 1900, 3200, .12, .15, .02); }
    whoosh() { this.noise(.13, .35, 1400, 'bandpass'); }
    thud() { this.noise(.09, .3, 260); this.tone('sine', 140, 60, .12, .3); }
    chime() { this.tone('triangle', 1046, 0, .15, .18); this.tone('triangle', 1568, 0, .25, .18, .1); }
    lose() { this.tone('sine', 120, 42, .5, .5); this.noise(.4, .45, 300); }
    result() { [392, 311, 262, 196].forEach((f, i) => this.tone('triangle', f, 0, .22, .14, i * .16)); }
    canPlayEffects() { return Boolean(this.context && this.masterGain && this.seOn && this.audioEnabled && !this.paused); }
    noiseBuffer(seconds) {
        const ac = this.context;
        const length = Math.floor(ac.sampleRate * seconds);
        const buffer = ac.createBuffer(1, length, ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++)
            data[i] = Math.random() * 2 - 1;
        return buffer;
    }
    tone(type, f0, f1, duration, volume, delay = 0) {
        if (!this.canPlayEffects())
            return;
        const ac = this.context, master = this.masterGain;
        const t = ac.currentTime + delay;
        const oscillator = ac.createOscillator();
        const gain = ac.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(f0, t);
        if (f1 > 0)
            oscillator.frequency.exponentialRampToValueAtTime(f1, t + duration);
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(.001, t + duration);
        oscillator.connect(gain).connect(master);
        oscillator.start(t);
        oscillator.stop(t + duration + .05);
    }
    noise(duration, volume, frequency = 800, type = 'lowpass', delay = 0) {
        if (!this.canPlayEffects())
            return;
        const ac = this.context, master = this.masterGain;
        const t = ac.currentTime + delay;
        const source = ac.createBufferSource();
        source.buffer = this.noiseBuffer(duration);
        const filter = ac.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = frequency;
        const gain = ac.createGain();
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(.001, t + duration);
        source.connect(filter).connect(gain).connect(master);
        source.start(t);
    }
    initMasterNode() {
        const ac = this.context;
        if (!ac || this.masterGain)
            return;
        this.masterGain = ac.createGain();
        this.masterGain.gain.value = this.audioEnabled && !this.paused ? 1 : 0;
        this.masterGain.connect(ac.destination);
    }
    initMusicNodes() {
        const ac = this.context, master = this.masterGain;
        if (!ac || !master || this.musicGain)
            return;
        this.musicGain = ac.createGain();
        this.musicGain.gain.value = this.bgmOn ? 1 : 0;
        this.musicGain.connect(master);
        this.windSource = ac.createBufferSource();
        this.windSource.buffer = this.noiseBuffer(2);
        this.windSource.loop = true;
        const bandPass = ac.createBiquadFilter();
        bandPass.type = 'bandpass';
        bandPass.frequency.value = 420;
        bandPass.Q.value = .6;
        this.windGain = ac.createGain();
        this.windGain.gain.value = 0;
        const lfo = ac.createOscillator();
        lfo.frequency.value = .08;
        const lfoGain = ac.createGain();
        lfoGain.gain.value = .014;
        lfo.connect(lfoGain).connect(this.windGain.gain);
        this.windSource.connect(bandPass).connect(this.windGain).connect(this.musicGain);
        this.windSource.start();
        lfo.start();
        this.syncWindGain();
        this.syncMusicTimer();
    }
    syncMasterGain() {
        const ac = this.context, master = this.masterGain;
        if (!ac || !master)
            return;
        master.gain.cancelScheduledValues(ac.currentTime);
        master.gain.setValueAtTime(this.audioEnabled && !this.paused ? 1 : 0, ac.currentTime);
    }
    syncMusicGain() {
        const ac = this.context;
        if (this.musicGain && ac)
            this.musicGain.gain.setTargetAtTime(this.bgmOn ? 1 : 0, ac.currentTime, .08);
        this.syncWindGain();
    }
    syncWindGain() {
        const ac = this.context;
        if (!ac || !this.windGain)
            return;
        const target = !this.bgmOn ? 0 : (this.windIntense ? .055 : .032);
        this.windGain.gain.setTargetAtTime(target, ac.currentTime, .6);
    }
    syncMusicTimer() {
        const shouldRun = Boolean(this.context && this.audioEnabled && !this.paused);
        if (shouldRun && this.musicTimer === null) {
            this.musicTimer = window.setInterval(() => this.musicTick(), 90);
        }
        else if (!shouldRun && this.musicTimer !== null) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
    }
    pluck(frequency, volume, time) {
        const ac = this.context, master = this.musicGain;
        if (!ac || !master)
            return;
        const oscillator = ac.createOscillator(), gain = ac.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + .006);
        gain.gain.exponentialRampToValueAtTime(.0008, time + .55);
        oscillator.connect(gain).connect(master);
        oscillator.start(time);
        oscillator.stop(time + .6);
        const sub = ac.createOscillator(), subGain = ac.createGain();
        sub.type = 'sine';
        sub.frequency.value = frequency / 2;
        subGain.gain.setValueAtTime(volume * .4, time);
        subGain.gain.exponentialRampToValueAtTime(.0008, time + .4);
        sub.connect(subGain).connect(master);
        sub.start(time);
        sub.stop(time + .45);
    }
    musicTone(type, f0, f1, duration, volume, time) {
        const ac = this.context, master = this.musicGain;
        if (!ac || !master)
            return;
        const oscillator = ac.createOscillator(), gain = ac.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(f0, time);
        if (f1 > 0)
            oscillator.frequency.exponentialRampToValueAtTime(f1, time + duration);
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(.001, time + duration);
        oscillator.connect(gain).connect(master);
        oscillator.start(time);
        oscillator.stop(time + duration + .05);
    }
    scheduleStep(index, time) {
        if (index % 16 === 0) {
            this.musicTone('sine', 72, 44, .45, .10, time);
            this.musicTone('sine', this.baseFrequency / 4, 0, 2.2, .06, time);
        }
        if (this.pluckSteps.has(index) && Math.random() < .85) {
            const delta = [-2, -1, 0, 0, 1, 1, 2][Math.floor(Math.random() * 7)] ?? 0;
            this.melodyDegree = Math.max(0, Math.min(this.scale.length - 1, this.melodyDegree + delta));
            const degree = this.scale[this.melodyDegree] ?? 0;
            const octave = Math.random() < .18 ? 2 : 1;
            const frequency = this.baseFrequency * Math.pow(2, degree / 12) * octave;
            this.pluck(frequency, index % 16 === 0 ? .10 : .065, time);
            if (Math.random() < .25)
                this.pluck(frequency * 2, .026, time + this.stepDuration / 2);
        }
    }
    musicTick() {
        const ac = this.context;
        if (!ac || ac.state !== 'running')
            return;
        if (!this.bgmOn || !this.audioEnabled || this.paused) {
            this.nextStep = ac.currentTime + .1;
            return;
        }
        if (this.nextStep < ac.currentTime)
            this.nextStep = ac.currentTime + .05;
        while (this.nextStep < ac.currentTime + .35) {
            this.scheduleStep(this.stepIndex, this.nextStep);
            this.nextStep += this.stepDuration;
            this.stepIndex = (this.stepIndex + 1) % 32;
        }
    }
}
