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

        this._startTime = 0; //开始时间
        this._pause = {
            startTime: 0, //暂停开始时间
            flag: false, //暂停开关
            duration: 0, //暂停持续时间
        };

        this._animatableMap = new Map();
    }

    //启动监控
    start() {
        this._startTime = new Date().getTime();
        this._pause.duration = 0;
        this._pause.flag = false;
        this._startLoop();
    }
    //暂停监控
    pause() {
        if (!this._pause.flag) {
            this._pause.startTime = new Date().getTime();
            this._pause.flag = true;
        }
    }

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

    //动画循环中的更新逻辑
    _update() {
        let time = new Date().getTime() - this._pause.duration; //从暂停位置开始计时，没有暂停就是当前事件
        let delta = time - this._startTime; // 监控持续时间

        this._animatableMap.forEach((ele, id, map) => {
            //查找当前元素的动画系统是否存在

            let ele_anim_process = ele.animationProcessList[0];

            if (!ele_anim_process) {
                this.removeAnimatable(ele);
                return;
            } else {
                // console.log([...this._animatableMap]);
                //存在动画系统，就在下一帧渲染（AnimationProcess.js）
                ele_anim_process.nextFrame(time, delta);
            }
        });

        this._startTime = time;

        this.trigger("frame"); //激活订阅的frame 事件，触发视图刷新
    }

    //重置动画
    resume() {
        if (this._pause.flag) {
            this._pause.duration += new Date().getTime() - this._pause.startTime;
            this._pause.flag = false;
        }
    }

    //在animatable.js 的when()方法中调用
    addAnimatable(ele) {
        this._animatableMap.set(ele.id, ele);
    }

    removeAnimatable(ele) {
        this._animatableMap.delete(ele.id);
    }

    //清除所有元素的动画
    clear() {
        this._animatableMap.forEach((ele) => {
            ele.stopAnimation();
        });
        this._running = false;
        this._animatableMap = new Map();
    }
}
