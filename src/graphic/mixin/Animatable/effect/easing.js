let PI = Math.PI;
/**
 * 缓动代码来自 https://github.com/sole/tween.js/blob/master/src/Tween.js
 * 这里的缓动主要是一些数学计算公式，这些公式可以用来计算对象的坐标。
 * @see http://sole.github.io/tween.js/examples/03_graphs.html
 * @exports qrenderer/animation/easing
 */
let easing = {
    /**
     * @param {Number} k
     * @return {Number}
     */
    linear: function(k) {
        return k;
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    quadraticIn: function(k) {
        return k * k;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    quadraticOut: function(k) {
        return k * (2 - k);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    quadraticInOut: function(k) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k;
        }
        return -0.5 * (--k * (k - 2) - 1);
    },

    // 三次方的缓动（t^3）
    /**
     * @param {Number} k
     * @return {Number}
     */
    cubicIn: function(k) {
        return k * k * k;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    cubicOut: function(k) {
        return --k * k * k + 1;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    cubicInOut: function(k) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k * k;
        }
        return 0.5 * ((k -= 2) * k * k + 2);
    },

    // 四次方的缓动（t^4）
    /**
     * @param {Number} k
     * @return {Number}
     */
    quarticIn: function(k) {
        return k * k * k * k;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    quarticOut: function(k) {
        return 1 - --k * k * k * k;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    quarticInOut: function(k) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k * k * k;
        }
        return -0.5 * ((k -= 2) * k * k * k - 2);
    },

    // 五次方的缓动（t^5）
    /**
     * @param {Number} k
     * @return {Number}
     */
    quinticIn: function(k) {
        return k * k * k * k * k;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    quinticOut: function(k) {
        return --k * k * k * k * k + 1;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    quinticInOut: function(k) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k * k * k * k;
        }
        return 0.5 * ((k -= 2) * k * k * k * k + 2);
    },

    // 正弦曲线的缓动（sin(t)）
    /**
     * @param {Number} k
     * @return {Number}
     */
    sinusoidalIn: function(k) {
        return 1 - Math.cos((k * PI) / 2);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    sinusoidalOut: function(k) {
        return Math.sin((k * PI) / 2);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    sinusoidalInOut: function(k) {
        return 0.5 * (1 - Math.cos(PI * k));
    },

    // 指数曲线的缓动（2^t）
    /**
     * @param {Number} k
     * @return {Number}
     */
    exponentialIn: function(k) {
        return k === 0 ? 0 : Math.pow(1024, k - 1);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    exponentialOut: function(k) {
        return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    exponentialInOut: function(k) {
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        if ((k *= 2) < 1) {
            return 0.5 * Math.pow(1024, k - 1);
        }
        return 0.5 * (-Math.pow(2, -10 * (k - 1)) + 2);
    },

    // 圆形曲线的缓动（sqrt(1-t^2)）
    /**
     * @param {Number} k
     * @return {Number}
     */
    circularIn: function(k) {
        return 1 - Math.sqrt(1 - k * k);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    circularOut: function(k) {
        return Math.sqrt(1 - --k * k);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    circularInOut: function(k) {
        if ((k *= 2) < 1) {
            return -0.5 * (Math.sqrt(1 - k * k) - 1);
        }
        return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
    },

    // 创建类似于弹簧在停止前来回振荡的动画
    /**
     * @param {Number} k
     * @return {Number}
     */
    elasticIn: function(k) {
        let s;
        let a = 0.1;
        let p = 0.4;
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        } else {
            s = (p * Math.asin(1 / a)) / (2 * PI);
        }
        return -(a * Math.pow(2, 10 * (k -= 1)) * Math.sin(((k - s) * (2 * PI)) / p));
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    elasticOut: function(k) {
        let s;
        let a = 0.1;
        let p = 0.4;
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        } else {
            s = (p * Math.asin(1 / a)) / (2 * PI);
        }
        return a * Math.pow(2, -10 * k) * Math.sin(((k - s) * (2 * PI)) / p) + 1;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    elasticInOut: function(k) {
        let s;
        let a = 0.1;
        let p = 0.4;
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        } else {
            s = (p * Math.asin(1 / a)) / (2 * PI);
        }
        if ((k *= 2) < 1) {
            return -0.5 * (a * Math.pow(2, 10 * (k -= 1)) * Math.sin(((k - s) * (2 * PI)) / p));
        }
        return a * Math.pow(2, -10 * (k -= 1)) * Math.sin(((k - s) * (2 * PI)) / p) * 0.5 + 1;
    },

    // 在某一动画开始沿指示的路径进行动画处理前稍稍收回该动画的移动
    /**
     * @param {Number} k
     * @return {Number}
     */
    backIn: function(k) {
        let s = 1.70158;
        return k * k * ((s + 1) * k - s);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    backOut: function(k) {
        let s = 1.70158;
        return --k * k * ((s + 1) * k + s) + 1;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    backInOut: function(k) {
        let s = 1.70158 * 1.525;
        if ((k *= 2) < 1) {
            return 0.5 * (k * k * ((s + 1) * k - s));
        }
        return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
    },

    // 创建弹跳效果
    /**
     * @param {Number} k
     * @return {Number}
     */
    bounceIn: function(k) {
        return 1 - easing.bounceOut(1 - k);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    bounceOut: function(k) {
        if (k < 1 / 2.75) {
            return 7.5625 * k * k;
        } else if (k < 2 / 2.75) {
            return 7.5625 * (k -= 1.5 / 2.75) * k + 0.75;
        } else if (k < 2.5 / 2.75) {
            return 7.5625 * (k -= 2.25 / 2.75) * k + 0.9375;
        } else {
            return 7.5625 * (k -= 2.625 / 2.75) * k + 0.984375;
        }
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    bounceInOut: function(k) {
        if (k < 0.5) {
            return easing.bounceIn(k * 2) * 0.5;
        }
        return easing.bounceOut(k * 2 - 1) * 0.5 + 0.5;
    }
};

export default easing;
