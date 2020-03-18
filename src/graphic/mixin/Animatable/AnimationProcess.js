import { inheritProperties, mixin } from "../../../tools/data_util";
import Eventful from "../../../tools/EventEmitter";
import Track from "./Track";
/**
 * 每个元素element 实例中都有一个列表，用来存储实例上的动画过程。
 * 列表中的动画按照顺序获得运行机会，  在特定的时间点上只有一个 AnimationPrcoss 处于运行状态，运行的过程由
 * GlobalAnimationMgr 来进行调度。
 *
 * AinmationPrcoss 运行完成后会触发 done 事件， Element 监听done事件后，把对应的动画过程从列表中删除。
 * 如果 Element 实例的动画过程列表中存在多个实例，其中某个过程是无限循环运行的，那么后续所有动画过程都不会获得到运行机会
 *
 * @class AnimationProcess
 */

class AnimationProcess {
    constructor(target) {
        this._trackCacheMap = new Map();
        this._target = target; // shape={}  or style={}
        this._delay = 0;
        this._running = false;
        this._paused = false;
        inheritProperties(this, Eventful, this.opts);
    }

    when(time, props) {
        for (let name in props) {
            if (!props.hasOwnProperty(name)) {
                continue;
            }

            let value = this._target[name];
            if (value === null || value === undefined) {
                continue;
            }

            let track = this._trackCacheMap.get(name);
            if (!track) {
                track = new Track({
                    _target: this._target,
                    _delay: this._delay
                });
            }

            if (time !== 0) {
                track.addKeyFrame({
                    time: 0,
                    value: value
                });
            }

            track.addKeyFrame({
                time: time,
                value: props[name]
            });

            this._trackCacheMap.set(name, track);
            return this;
        }
    }

    start(loop = false, easing = "", forceAnima = false) {
        this._running = true;
        this._paused = false;

        let self = this;
        let keys = [...this._trackCacheMap.keys()];
        if (!keys.length) {
            this.trigger("done");
            return this;
        }
        keys.forEach((name, index) => {
            let track = this._trackCacheMap.get(name);
            track && track.start(name, loop, easing, forceAnima);
        });
        return this;
    }

    /**
     * 进入到下一帧
     *
     * @param {Number} time 当前时间
     * @param {Number} delta 时间的偏移量
     * @memberof AnimationProcess
     */
    nextFrame(time, delta) {
        this._running = true;
        this._paused = false;
    }

    during(cb) {
        this.on("during", cb);
        return this;
    }
}

mixin(AnimationProcess.prototype, Eventful.prototype);

export default AnimationProcess;
