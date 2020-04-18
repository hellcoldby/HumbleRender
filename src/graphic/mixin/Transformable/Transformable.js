import * as matrix from "./matrix";

var EPSILON = 5e-5;
let scaleTmp = [];
let transformTmp = [];
function Transformable(opts = {}) {
    this.origin = !opts.origin ? [0, 0] : opts.origin;
    this.rotation = !opts.rotation ? 0 : opts.rotation;
    this.position = !opts.position ? [0, 0] : opts.position;
    this.scale = !opts.scale ? [1, 1] : opts.scale;
    this.skew = !opts.skew ? [0, 0] : opts.skew;
    this.globalScaleRatio = 1;
    this.transform = matrix.create();
    //逆变换矩阵
    this.inverseTransform = null;

    //全局缩放比例
    this.globalScaleRatio = 1;
}

Transformable.prototype = {
    constructor: Transformable,

    // 判断是位置不再0附近
    needLocalTransform() {
        return (
            isNotAroundZero(this.rotation) ||
            isNotAroundZero(this.position[0]) ||
            isNotAroundZero(this.position[1]) ||
            isNotAroundZero(this.scale[0] - 1) ||
            isNotAroundZero(this.scale[1] - 1)
        );
    },

    //更新图形的偏移矩阵
    updateTransform() {
        let parent = this.parent;
        let parentHasTransform = parent && parent.transform;
        // 判断是位置不再0附近
        let needLocalTransform = this.needLocalTransform();
        let m = this.transform;

        if (needLocalTransform) {
            m = this.getLocalTransform(m);
        } else {
            matrix.identity(m);
        }

        // 应用父节点变换
        if (parentHasTransform) {
            if (needLocalTransform) {
                m = matrix.mul(parent.transform, m);
            } else {
                matrix.copy(m, parent.transform);
            }
        }
        // 应用全局缩放
        if (this.globalScaleRatio != null && this.globalScaleRatio !== 1) {
            this.getGlobalScale(scaleTmp);
            let relX = scaleTmp[0] < 0 ? -1 : 1;
            let relY = scaleTmp[1] < 0 ? -1 : 1;
            let sx = ((scaleTmp[0] - relX) * this.globalScaleRatio + relX) / scaleTmp[0] || 0;
            let sy = ((scaleTmp[1] - relY) * this.globalScaleRatio + relY) / scaleTmp[1] || 0;

            m[0] *= sx;
            m[1] *= sx;
            m[2] *= sy;
            m[3] *= sy;
        }

        this.transform = m;
        this.invTransform = this.invTransform || matrix.create();
        matrix.invert(this.invTransform, m);
    },

    //将 参数opts 转化为矩阵数组
    getLocalTransform(m = []) {
        matrix.identity(m);

        let origin = this.origin;
        let scale = this.scale || [1, 1];
        let rotation = this.rotation || 0;
        let position = this.position || [0, 0];

        if (origin) {
            m[4] -= origin[0];
            m[5] -= origin[1];
        }

        matrix.scale(m, m, scale);
        if (rotation) {
            matrix.rotate(m, m, rotation);
        }

        if (origin) {
            m[4] += origin[0];
            m[5] += origin[1];
        }

        m[4] += position[0];
        m[5] += position[1];
        return m;
    },

    /**
     * 将自己的transform应用到context上
     * @param {CanvasRenderingContext2D} ctx
     */
    setTransform(ctx) {
        // console.log(this.transform);
        let m = this.transform;
        let dpr = ctx.dpr || 1;
        if (m) {
            ctx.setTransform(dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * m[4], dpr * m[5]);
        } else {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    },

    // 将 this.transform 应用到 canvas context 上
    applyTransform: function (ctx) {
        let m = this.transform;
        let dpr = ctx.dpr || 1;
        if (m) {
            ctx.setTransform(dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * m[4], dpr * m[5]);
        } else {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    },

    /**
     * @method composeLocalTransform
     * 把各项参数，包括：scale、position、skew、rotation、父层的变换矩阵、全局缩放，全部
     * 结合在一起，计算出一个新的本地变换矩阵，此操作是 decomposeLocalTransform 是互逆的。
     */
    composeLocalTransform: function () {
        let parent = this.parent;
        let parentHasTransform = parent && parent.transform;
        let needLocalTransform = this.needLocalTransform();

        let m = this.transform;

        // 自身的变换
        if (needLocalTransform) {
            m = this.getLocalTransform();
        } else {
            matrix.identity(m);
        }

        // 应用父节点变换
        if (parentHasTransform) {
            if (needLocalTransform) {
                m = matrix.mul(parent.transform, m);
            } else {
                matrix.copy(m, parent.transform);
            }
        }

        // 应用全局缩放
        if (this.globalScaleRatio != null && this.globalScaleRatio !== 1) {
            this.getGlobalScale(scaleTmp);
            let relX = scaleTmp[0] < 0 ? -1 : 1;
            let relY = scaleTmp[1] < 0 ? -1 : 1;
            let sx = ((scaleTmp[0] - relX) * this.globalScaleRatio + relX) / scaleTmp[0] || 0;
            let sy = ((scaleTmp[1] - relY) * this.globalScaleRatio + relY) / scaleTmp[1] || 0;

            m[0] *= sx;
            m[1] *= sx;
            m[2] *= sy;
            m[3] *= sy;
        }

        //保存变换矩阵
        this.transform = m;
        //计算逆变换矩阵
        this.inverseTransform = this.inverseTransform || matrix.create();
        this.inverseTransform = matrix.invert(this.inverseTransform, m);
    },

    /**
     * @method decomposeLocalTransform
     * 把 transform 矩阵分解到 position、scale、skew、rotation 上去，此操作与 composeLocalTransform 是互逆的。
     */
    decomposeLocalTransform: function () {
        let m = this.transform;
        let transformTmp = matrix.create();
        if (this.parent && this.parent.transform) {
            m = transformTmp = matrix.mul(this.parent.inverseTransform, m);
        }

        let origin = this.origin;
        let originTransform = matrix.create();
        if (origin && (origin[0] || origin[1])) {
            originTransform[4] = origin[0];
            originTransform[5] = origin[1];
            transformTmp = matrix.mul(m, originTransform);
            transformTmp[4] -= origin[0];
            transformTmp[5] -= origin[1];
            m = transformTmp;
        }

        this.setLocalTransform(m);
    },
};

//tools --- 判断不在0附近
function isNotAroundZero(val) {
    return val > EPSILON || val < -EPSILON;
}

export default Transformable;
