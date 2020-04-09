/**
 * 动画控制系统，为动画设置关键帧
 * 引用: Track.js  为每个属性建立各自的动画轨道
 *
 * 每个元素element 实例中都有一个列表，用来存储实例上的动画过程。
 * 列表中的动画按照顺序获得运行机会，  在特定的时间点上只有一个 AnimationPrcoss 处于运行状态，运行的过程由
 * GlobalAnimationMgr 来进行调度。
 *
 * AinmationPrcoss 运行完成后会触发 done 事件， Element 监听done事件后，把对应的动画过程从列表中删除。
 * 如果 Element 实例的动画过程列表中存在多个实例，其中某个过程是无限循环运行的，那么后续所有动画过程都不会获得到运行机会
 *
 * @class AnimationProcess
 */
import { inheritProperties, mixin, isString, isNumber } from "../../../tools/data_util";
import Eventful from "../../../tools/EventEmitter";
import Track from "./Track";

class AnimationProcess {
    constructor(target, loop) {
        this._trackCacheMap = new Map(); //属性轨道Map {属性名： 对应的track}
        this._target = target; // shape={}  or style={}
        this._loop = loop || false;
        this._delay = 0;
        this._running = false;
        this._paused = false;
        inheritProperties(this, Eventful, this.opts);
    }

    when(time, props) {
        for (let propName in props) {
            if (!props.hasOwnProperty(propName)) {
                continue;
            }

            let value = this._target[propName];
            if (value === null || value === undefined) {
                continue;
            }

            let track = this._trackCacheMap.get(propName);
            //为每一个变化的 属性，建立动画时间线轨道
            if (!track) {
                track = new Track({
                    _target: this._target,
                    _delay: this._delay,
                });
            }

            if (time !== 0) {
                //标记第一个关键帧的time为0
                let first_key = track.keyFrames.length && track.keyFrames[0];
                if (!first_key) {
                    track.addKeyFrame({
                        time: 0,
                        value: value,
                    });
                }
            }

            //添加关键帧：记录自定义时间 的值
            track.addKeyFrame({
                time: time,
                value: props[propName],
            });

            // console.log(track.keyFrames);

            this._trackCacheMap.set(propName, track);
            return this;
        }
    }

    /**
     * @method start
     * 开始执行动画
     * @param  {Boolean} loop 是否循环
     * @param  {String|Function} [easing] 缓动函数名称，详见{@link qrenderer.animation.easing 缓动引擎}
     * @param  {Boolean} forceAnimate 是否强制开启动画
     * @return {qrenderer.animation.AnimationProcess}
     */
    start(loop = false, easing = "", forceAnima = false) {
        this._running = true;
        this._paused = false;

        let keys = [...this._trackCacheMap.keys()];
        // console.log(keys);
        if (!keys.length) {
            this.trigger("done");
            return this;
        }

        keys.forEach((name, index) => {
            //获取属性身上的 track
            let cur_track = this._trackCacheMap.get(name);
            cur_track && cur_track.start(name, loop, easing, forceAnima);
        });
        return this;
    }

    /**
     * 进入到下一帧
     * 在全局的WatchAnim.js 的 update 中 循环监控元素 身上的动画系统，如果存在就执行 nextFrame
     * @param {Number} time 当前时间
     * @param {Number} delta 时间的偏移量
     * @memberof AnimationProcess
     */
    nextFrame(time, delta) {
        this._running = true;
        this._paused = false;

        let deferredEvents = [];
        let deferredTracks = [];
        let percent = "";

        let track_values = [...this._trackCacheMap.values()];
        // console.log(track_values);

        track_values.forEach((track, index) => {
            //时间线返回动画执行的进度： 进度百分比 or  'restart' or 'destory'

            let result = track.nextFrame(time, delta);
            // console.log(result);
            if (isString(result)) {
                //当返回的是 ‘resstart' or 'destory'  ，保存
                deferredEvents.push(result);
                deferredTracks.push(track);
            } else if (isNumber(result)) {
                percent = result;
            }
        });

        // console.log(deferredEvents);
        // let len = deferredEvents.length;
        // for (let i = 0; i < len; i++) {
        //     deferredTracks[i].fire(deferredEvents[i]);
        // }

        if (isNumber(percent)) {
            // console.log(percent);
            this.trigger("during", this._target, percent);
        } else {
            this.trigger("during", this._target, 1);
        }

        if (this.isFinished()) {
            this.trigger("done");
        }
    }

    /**
     * @method stop
     * 停止动画
     * @param {Boolean} forwardToLast If move to last frame before stop
     */
    stop(forwardToLast) {
        this._running = false;
        this._paused = false;

        [...this._trackCacheMap.values()].forEach((track, index) => {
            track.stop(this._target, 1);
        });
        this._trackCacheMap = new Map();
        this.trigger("stop");
        return this;
    }

    during(cb) {
        this.on("during", cb);
        return this;
    }

    done(cb) {
        this.on("done", cb);
        return this;
    }

    //判断整个动画过程是否已经完成，所有Track上的动画完成，则整个动画过程完成
    isFinished() {
        let isFinished = true;
        let track_values = [...this._trackCacheMap.values()];
        track_values.forEach((track, index) => {
            if (!track.isFinished) {
                isFinished = false;
            }
        });
        return isFinished;
    }

    //设置动画延迟
    delay(time) {
        this._delay = time;
        return this;
    }
}

mixin(AnimationProcess.prototype, Eventful.prototype);

export default AnimationProcess;
