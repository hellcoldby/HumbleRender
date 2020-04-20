/**
 * 动画功能的入口
 * 引用AnimationProcess.js 为元素的属性生成 对应的动画系统
 */

import AnimationProcess from "./AnimationProcess";
let Animatable = function () {
    this.animationProcessList = []; //动画实例列表
};

Animatable.prototype = {
    /**
     * 设置循环动画
     * @param {string} path --- 元素的属性 shape.width   style.fill
     * @param {boolean} loop --- 动画循环
     */
    animate: function (path, loop) {
        //创建动画实例
        let animationProcess = new AnimationProcess(this, path);
        animationProcess.during(() => {
            // console.log(this);
            this.dirty();
        });
        animationProcess.on("done", () => {
            this.removeAnimationProcess(animationProcess);
        });
        animationProcess.on("stop", () => {
            this.removeAnimationProcess(animationProcess);
        });

        this.animationProcessList.push(animationProcess);
        if (this.__hr && this.__hr.watchAnim) {
            this.__hr.watchAnim.addAnimatable(this); //保存带有带有动画的元素列表
        }
        return animationProcess;
    },

    //从动画队列中删除一组动画
    removeAnimationProcess: function (animationProcess) {
        let index = this.animationProcessList.indexOf(animationProcess);
        if (index >= 0) {
            this.animationProcessList.splice(index, 1);
        }
    },
    //停止动画
    stopAnimation: function (forwardToLast = false) {
        this.animationProcessList.forEach((ap, index) => {
            ap.stop(forwardToLast);
        });
        this.animationProcessList.length = 0;
        return this;
    },
};

export default Animatable;
