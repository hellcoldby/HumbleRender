import easingCount from "./effect/easing";

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
    /**
     *
     * @param {Number} globalTime  监控 开始更新的时间
     * @param {Number} deltaTime  监控的持续时间
     */
    nextFrame(globalTime, deltaTime) {
        if (!this._initialized) {
            this._startTime = globalTime + this._delay;
            this._initialized = true;
        }
        if (this._paused) {
            this._pausedTime += deltaTime;
            return;
        }

        let percent = (globalTime - this._startTime - this._pausedTime) / this._lifeTime;

        //还没开始
        if (percent < 0) {
            return;
        }

        //超过 100%，就停止在100%
        percent = Math.min(percent, 1);

        let easing = this.easing;
        let easingFunc = typeof easing === "string" ? easingCount[easing] : easing; //调取缓动函数

        let schedule = typeof easingFunc === "function" ? easingFunc(percent) : percent; //返回缓动的数据

        //将缓动的数据传递给 关键帧函数 onframe(target, percent)
        this.fire("frame", schedule);

        if (percent === 1) {
            // console.log(percent);
            if (this.loop) {
                this.restart(globalTime);
                return "restart";
            }
            return "destroy";
        }
        return percent;
    }

    fire(eventType, arg) {
        eventType = "on" + eventType;
        if (this[eventType]) {
            this[eventType](this._target, arg);
        }
    }
}
