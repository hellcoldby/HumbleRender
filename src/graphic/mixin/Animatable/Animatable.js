/**
 * 动画功能的入口
 * 引用AnimationProcess.js 为元素的属性生成 对应的动画系统
 */

import AnimationProcess from "./AnimationProcess";
let Animatable = function() {
    this.animationProcessList = []; //动画实例列表
};

Animatable.prototype = {
    /**
     * 设置循环动画
     * @param {string} path --- 元素的属性 shape.width   style.fill
     * @param {boolean} loop --- 动画循环
     */
    animate: function(path, loop) {
        let target = this;
        if (path) {
            let path_split = path.split(".");
            console.log(path_split);
            console.log(this);
            for (let i = 0; i < path_split.length; i++) {
                let item = path_split[i]; //'shape' or 'style'...
                if (!this[item]) {
                    continue;
                } else {
                    target = this[item];
                    break;
                }
            }
        }

        //创建动画实例
        let animationProcess = new AnimationProcess(target);
        animationProcess.during(() => {
            this.dirty();
        });
        animationProcess.on("done", () => {
            this.removeAnimationProcess(animationProcess);
        });
        animationProcess.on("stop", () => {
            this.removeAnimationProcess(animationProcess);
        });

        this.animationProcessList.push(animationProcess);
        if (this.__hr) {
            // 元素绑定的环境new HumbleRneder的实例，？？？为什么要加入绘图监控系统呢？
            this.__hr.watchAnim.addAnimatable(this);
        }
        return animationProcess;
    },

    removeAnimationProcess(animationProcess) {
        let index = this.animationProcessList.indexOf(animationProcess);
        if (index >= 0) {
            this.animationProcessList.splice(index, 1);
        }
    }
};

export default Animatable;
