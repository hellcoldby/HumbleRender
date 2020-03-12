/*
 *  用来记录 动画开关， 时间戳， 添加动画序列
 */

import { RAF } from "../../tools/anim_util";
import Eventful from "../../tools/EventEmitter";

export default class WatchAnim extends Eventful {
    constructor(opts) {
        super();
        opts = opts || {};
        this._running = false; //动画启动
        this._pause = false; //动画暂停
    }

    //启动监控
    start() {
        this._startLoop();
    }
    //暂停监控
    pause() {
        if (this._paused) {
            this._paused = true;
        }
    }

    _startLoop() {
        let self = this;
        this._running = true;
        function nextFrame() {
            if (self._running) {
                RAF(nextFrame);
                !self._paused && self._update();
            }
        }
        RAF(nextFrame);
    }

    _update() {
        this.trigger("frame"); //激活订阅的frame 事件，触发视图刷新
    }
}
