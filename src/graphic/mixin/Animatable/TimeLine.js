import eadingFuncs from "./effect/easing";

/**
 * @class qrenderer.animation.Timeline
 * Timeline，时间线，用来计算元素上的某个属性在指定时间点的数值。
 *
 */

export default class Timeline {
    constructor(options) {
        this._target = options.target;
        this._lifeTime = options.lifeTime || 1000;
        this._delay = options.delay || 0;
        this._initialized = false;
        this.loop = options.loop == null ? false : options.loop;
        this.gap = options.gap || 0;
        this.easing = options.easing || "Linear";
        this.onframe = options.onframe;
        this.ondestroy = options.ondestroy;
        this.onrestart = options.onrestart;

        this._pausedTime = 0;
        this._paused = false;
    }
}
