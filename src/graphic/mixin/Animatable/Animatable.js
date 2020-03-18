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
        animationProcess.during(target => {
            target.dirty();
        });
        animationProcess.on("done", () => {
            target.removeAnimationProcess(animationProcess);
        });
        animationProcess.on("stop", () => {
            target.removeAnimationProcess(animationProcess);
        });

        this.animationProcessList.push(animationProcess);
        if (this.__hr) {
            console.log(this.__hr);
            this.__hr.watchAnim.addAnimatable(this);
        }
        return animationProcess;
    },

    removeAnimationProcess(animationProcess) {}
};

export default Animatable;
