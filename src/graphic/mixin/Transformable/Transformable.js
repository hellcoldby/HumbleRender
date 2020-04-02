import * as matrix from "./matrix";

var EPSILON = 5e-5;
function Transformable(opts = {}) {
    this.origin = !opts.origin ? [0, 0] : opts.origin;
    this.rotation = !opts.rotation ? 0 : opts.rotation;
    this.position = !opts.position ? [0, 0] : opts.position;
    this.scale = !opts.scale ? [1, 1] : opts.scale;
    this.skew = !opts.skew ? [0, 0] : opts.skew;
    this.globalScaleRatio = 1;
    // console.log(this.position);
}

Transformable.prototype = {
    constructor: Transformable,

    //是否需要
    needLocalTransform() {
        // console.log(this);
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
        let parent_trans = parent && parent.transform;
        // 判断是位置是否接近0, 接近0为false (不变化矩阵)
        let needLocalTransform = this.needLocalTransform();

        let m = this.transform;
        if (!(needLocalTransform || parent_trans)) {
            m && matrix.identity(m);
            return;
        }
        //创建矩阵
        m = m || matrix.create();
        // console.log(m);

        if (needLocalTransform) {
            m = this.getLocalTransform(m);
        } else {
            matrix.identity(m);
        }

        this.transform = m;
        // var globalScaleRatio = this.globalScaleRatio;

        this.invTransform = this.invTransform || matrix.create();
        matrix.invert(this.invTransform, m);
    },

    /**
     * 将自己的transform应用到context上
     * @param {CanvasRenderingContext2D} ctx
     */
    setTransform(ctx) {
        let m = this.transform;
        let dpr = ctx.dpr || 1;
        // console.log(this.type, m);
        if (m) {
            ctx.setTransform(dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * m[4], dpr * m[5]);
        } else {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    },

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

    // 将 this.transform 应用到 canvas context 上
    applyTransform: function(ctx) {
        let m = this.transform;
        let dpr = ctx.dpr || 1;
        if (m) {
            ctx.setTransform(dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * m[4], dpr * m[5]);
        } else {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }
};

//tools --- 判断不在0附近
function isNotAroundZero(val) {
    return val > EPSILON || val < -EPSILON;
}

export default Transformable;
