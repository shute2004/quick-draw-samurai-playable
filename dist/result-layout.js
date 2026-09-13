export class ResultLayoutController {
    constructor(screen, frame) {
        this.resizeObserver = null;
        this.mutationObserver = null;
        this.scheduled = false;
        this.schedule = () => {
            if (this.scheduled)
                return;
            this.scheduled = true;
            requestAnimationFrame(() => {
                this.scheduled = false;
                this.fit();
            });
        };
        this.screen = screen;
        this.frame = frame;
    }
    start() {
        addEventListener('resize', this.schedule);
        addEventListener('orientationchange', this.schedule);
        window.visualViewport?.addEventListener('resize', this.schedule);
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(this.schedule);
            this.resizeObserver.observe(this.screen);
            this.resizeObserver.observe(this.frame);
        }
        this.mutationObserver = new MutationObserver(this.schedule);
        this.mutationObserver.observe(this.screen, { attributes: true, attributeFilter: ['class'] });
    }
    clear() {
        this.screen.style.display = '';
        this.screen.style.padding = '';
        this.screen.style.overflow = '';
        Object.assign(this.frame.style, {
            position: '', left: '', top: '', margin: '', maxWidth: '', maxHeight: '', overflow: '', transform: '', transformOrigin: ''
        });
    }
    fit() {
        if (!this.screen.classList.contains('show')) {
            this.clear();
            return;
        }
        const screenRect = this.screen.getBoundingClientRect();
        const width = Math.max(1, Math.round(this.screen.clientWidth || screenRect.width));
        const height = Math.max(1, Math.round(this.screen.clientHeight || screenRect.height));
        this.clear();
        const frameWidth = Math.max(1, this.frame.scrollWidth, this.frame.offsetWidth);
        const frameHeight = Math.max(1, this.frame.scrollHeight, this.frame.offsetHeight);
        const availableWidth = Math.max(1, width - 16);
        const availableHeight = Math.max(1, height - 16);
        const scale = Math.max(.1, Math.min(1, availableWidth / frameWidth, availableHeight / frameHeight));
        if (scale < 1) {
            this.screen.style.display = 'block';
            this.screen.style.padding = '0';
            this.screen.style.overflow = 'hidden';
            Object.assign(this.frame.style, {
                position: 'absolute',
                left: '50%',
                top: '50%',
                margin: '0',
                maxWidth: 'none',
                maxHeight: 'none',
                overflow: 'visible',
                transform: `translate(-50%, -50%) scale(${scale})`,
                transformOrigin: 'center center'
            });
        }
        window.__QUICK_DRAW_LAYOUT_DEBUG = {
            screenWidth: width,
            screenHeight: height,
            cardWidth: frameWidth,
            cardHeight: frameHeight,
            scale
        };
    }
}
