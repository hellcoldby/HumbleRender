import * as vectorUtil from "../../tools/vector_util";
import * as matrixUtil from "../../tools/affine_matrix_util";

/**
 * @class qrenderer.core.BoundingRect
 *
 * Bounding Rect.
 *
 * 边界矩形。
 *
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */
let v2ApplyTransform = vectorUtil.applyTransform;
let lt = [];
let rb = [];
let lb = [];
let rt = [];

class BoundingRect {
    /**
     * @method constructor BoundingRect
     */
    constructor(x, y, width, height) {
        if (width < 0) {
            x = x + width;
            width = -width;
        }
        if (height < 0) {
            y = y + height;
            height = -height;
        }

        /**
         * @property {Number}
         */
        this.x = x;
        /**
         * @property {Number}
         */
        this.y = y;
        /**
         * @property {Number}
         */
        this.width = width;
        /**
         * @property {Number}
         */
        this.height = height;
    }

    /**
     * @param {Object|BoundingRect} rect
     * @param {Number} rect.x
     * @param {Number} rect.y
     * @param {Number} rect.width
     * @param {Number} rect.height
     * @return {BoundingRect}
     */
    static create(rect) {
        return new BoundingRect(rect.x, rect.y, rect.width, rect.height);
    }

    /**
     * @method union
     * @param {BoundingRect} other
     */
    union(other) {
        let x = Math.min(other.x, this.x);
        let y = Math.min(other.y, this.y);

        this.width = Math.max(other.x + other.width, this.x + this.width) - x;
        this.height = Math.max(other.y + other.height, this.y + this.height) - y;
        this.x = x;
        this.y = y;
    }

    /**
     * @method applyTransform
     * @param {Array<Number>}
     */
    applyTransform(m) {
        // In case usage like this
        // el.getBoundingRect().applyTransform(el.transform)
        // And element has no transform
        if (!m) {
            return;
        }
        lt[0] = lb[0] = this.x;
        lt[1] = rt[1] = this.y;
        rb[0] = rt[0] = this.x + this.width;
        rb[1] = lb[1] = this.y + this.height;

        v2ApplyTransform(lt, lt, m);
        v2ApplyTransform(rb, rb, m);
        v2ApplyTransform(lb, lb, m);
        v2ApplyTransform(rt, rt, m);

        this.x = Math.min(lt[0], rb[0], lb[0], rt[0]);
        this.y = Math.min(lt[1], rb[1], lb[1], rt[1]);
        let maxX = Math.max(lt[0], rb[0], lb[0], rt[0]);
        let maxY = Math.max(lt[1], rb[1], lb[1], rt[1]);
        this.width = maxX - this.x;
        this.height = maxY - this.y;
    }

    /**
     * @method calculateTransform
     * Calculate matrix of transforming from self to target rect
     * @param  {BoundingRect} b
     * @return {Array<Number>}
     */
    calculateTransform(b) {
        let a = this;
        let sx = b.width / a.width;
        let sy = b.height / a.height;

        let m = matrixUtil.create();
        m = matrixUtil.translate(m, [-a.x, -a.y]);
        m = matrixUtil.scale(m, [sx, sy]);
        m = matrixUtil.translate(m, [b.x, b.y]);
        return m;
    }

    /**
     * @method intersect
     * @param {(BoundingRect|Object)} b
     * @return {boolean}
     */
    intersect(b) {
        if (!b) {
            return false;
        }

        if (!(b instanceof BoundingRect)) {
            // Normalize negative width/height.
            b = BoundingRect.create(b);
        }

        let a = this;
        let ax0 = a.x;
        let ax1 = a.x + a.width;
        let ay0 = a.y;
        let ay1 = a.y + a.height;

        let bx0 = b.x;
        let bx1 = b.x + b.width;
        let by0 = b.y;
        let by1 = b.y + b.height;

        return !(ax1 < bx0 || bx1 < ax0 || ay1 < by0 || by1 < ay0);
    }

    /**
     * @method contain
     * @param {*} x
     * @param {*} y
     */
    contain(x, y) {
        let rect = this;
        return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    }

    /**
     * @method clone
     * @return {BoundingRect}
     */
    clone() {
        return new BoundingRect(this.x, this.y, this.width, this.height);
    }

    /**
     * @method copy
     * Copy from another rect
     * @param other
     */
    copy(other) {
        this.x = other.x;
        this.y = other.y;
        this.width = other.width;
        this.height = other.height;
    }

    /**
     * @method plain
     */
    plain() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

export default BoundingRect;
