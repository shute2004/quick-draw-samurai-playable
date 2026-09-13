import { clamp } from './math.js';
export class ViewportController {
    constructor(stage, canvas, context, onChange) {
        this.probeTimer = null;
        this.resizeObserver = null;
        this.started = false;
        this.lastKey = '';
        this.refresh = () => {
            const measured = this.measureViewport();
            const width = measured?.width ?? 360;
            const height = measured?.height ?? 640;
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            const scale = clamp(height >= width ? Math.min(width / 520, height / 760) : Math.min(width / 900, height / 640), .35, 1.4);
            const groundY = height * (height >= width ? .78 : .80);
            const key = `${width}x${height}@${dpr}:${scale.toFixed(5)}`;
            if (key !== this.lastKey) {
                this.lastKey = key;
                this.canvas.width = Math.max(2, Math.round(width * dpr));
                this.canvas.height = Math.max(2, Math.round(height * dpr));
                this.canvas.style.width = `${width}px`;
                this.canvas.style.height = `${height}px`;
                this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
                this.onChange({ width, height, scale, groundY, dpr });
            }
            if (measured)
                this.cancelProbe();
            else
                this.scheduleProbe();
        };
        this.scheduleRefresh = () => { requestAnimationFrame(this.refresh); };
        this.stage = stage;
        this.canvas = canvas;
        this.context = context;
        this.onChange = onChange;
    }
    start() {
        if (this.started)
            return;
        this.started = true;
        addEventListener('resize', this.scheduleRefresh);
        addEventListener('orientationchange', this.scheduleRefresh);
        window.visualViewport?.addEventListener('resize', this.scheduleRefresh);
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(this.scheduleRefresh);
            this.resizeObserver.observe(document.documentElement);
        }
        this.refresh();
    }
    measureViewport() {
        const root = document.documentElement;
        const stageRect = this.stage.getBoundingClientRect();
        const visual = window.visualViewport;
        const pairs = [
            [root.clientWidth, root.clientHeight],
            [stageRect.width, stageRect.height],
            [window.innerWidth, window.innerHeight],
            [visual?.width, visual?.height]
        ];
        for (const [candidateWidth, candidateHeight] of pairs) {
            if (Number.isFinite(candidateWidth) && Number.isFinite(candidateHeight) && (candidateWidth ?? 0) > 1 && (candidateHeight ?? 0) > 1) {
                return { width: Math.round(candidateWidth), height: Math.round(candidateHeight) };
            }
        }
        return null;
    }
    scheduleProbe() {
        if (this.probeTimer !== null)
            return;
        this.probeTimer = window.setTimeout(() => {
            this.probeTimer = null;
            this.refresh();
            if (!this.measureViewport())
                this.scheduleProbe();
        }, 100);
    }
    cancelProbe() {
        if (this.probeTimer === null)
            return;
        clearTimeout(this.probeTimer);
        this.probeTimer = null;
    }
}
