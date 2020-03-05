/*
 *  用来记录 动画开关， 时间戳， 添加动画序列
 */

import { RAF } from "../tools/anim_util";
import Eventful from "../control/event_simulation";

class GlobalAnimationMgr extends Eventful {
    constructor(opts) {
        super(); //调用父类的
        opts = opts || {};
        this._running = false; //动画启动开关
        this._timestamp; //时间戳(记录动画启动时间)
        this._pause = {
            duration: 0, //暂停持续时间
            start: 0, //暂停时间戳
            flag: false //暂停开关标记
        };
        this._animatableMap = new Map(); //动画对象列表
    }

    //启动动画
    start() {
        this._pause.duration = 0;
        this._timestamp = new Date().getTime();
        this._startLoop();
    }

    //暂停动画
    pause() {
        if (!this._pause.flag) {
            this._pause.start = new Date().getTime();
            this._pause.flag = true; //暂停
        }
    }

    // RAF (requestAnimationFrame) 递归执行动画
    _startLoop() {
        let self = this;
        this._running = true;
        function nextFrame() {
            if (self._running) {
                RAF(nextFrame);
                !self._pause.flag && self._update();
            }
        }
        RAF(nextFrame);
    }

    //
    _update() {
        let time = new Date().getTime() - this._pause.duration;
        let delta = time - this._timestamp;
        this._timestamp = time;
        this.trigger("frame");
    }

    //向动画列表中增加 动画方案（特征）
    addAnimatable(animatable) {
        this._animatableMap.set(animatable.id, animatable);
    }

    //从动画列表中移除 动画方案（特征）
    removeAnimatable(animatable) {
        this._animatableMap.delete(animatable.id);
    }
}

export default GlobalAnimationMgr;
