/**
 * @class core.utils.affine_matrix_util
 *
 * 矩阵操作类，方便进行仿射变换运算。 Canvas transform 是二维仿射变换，映射到三维线性变换进行运算，
 * 此工具类为了编码方便，运算过程中省略第三行 [0,0,1]，与 Transformations 接口定义的结构一致。
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Transformations
 * @exports qrenderer/core/matrix
 * @docauthor 大漠穷秋 <damoqiongqiu@126.com>
 */

/* global Float32Array */

let ArrayConstructor = typeof Float32Array === "undefined" ? Array : Float32Array;

/**
 * @method create
 * Create a identity matrix.
 * @return {Float32Array|Array.<Number>}
 */
export function create() {
    return identity(new ArrayConstructor(6));
}

/**
 * @method identity
 * 设置矩阵为单位矩阵
 * @param {Float32Array|Array.<Number>} out
 */
export function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
}

/**
 * @method copy
 * 复制矩阵
 * @param {Float32Array|Array.<Number>} out
 * @param {Float32Array|Array.<Number>} m
 */
export function copy(out, m) {
    out[0] = m[0];
    out[1] = m[1];
    out[2] = m[2];
    out[3] = m[3];
    out[4] = m[4];
    out[5] = m[5];
    return out;
}

/**
 * @method invert
 * 求逆矩阵
 * @param {Float32Array|Array.<Number>} out
 * @param {Float32Array|Array.<Number>} a
 */
export function invert(out, a) {
    let aa = a[0];
    let ac = a[2];
    let atx = a[4];
    let ab = a[1];
    let ad = a[3];
    let aty = a[5];

    let det = aa * ad - ab * ac;
    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = ad * det;
    out[1] = -ab * det;
    out[2] = -ac * det;
    out[3] = aa * det;
    out[4] = (ac * aty - ad * atx) * det;
    out[5] = (ab * atx - aa * aty) * det;
    return out;
}

/**
 * @method clone
 * Clone a new matrix.
 * @param {Float32Array|Array.<Number>} a
 */
export function clone(a) {
    let b = create();
    copy(b, a);
    return b;
}

/**
 * @method mul
 * m1 左乘 m2，Context.transform 定义的实际上是一个 3×3 的方阵，所以这里一定可以相乘。
 * @param {Float32Array|Array.<Number>} m1
 * @param {Float32Array|Array.<Number>} m2
 */
export function mul(m1, m2) {
    let out0 = m1[0] * m2[0] + m1[2] * m2[1];
    let out1 = m1[1] * m2[0] + m1[3] * m2[1];
    let out2 = m1[0] * m2[2] + m1[2] * m2[3];
    let out3 = m1[1] * m2[2] + m1[3] * m2[3];
    let out4 = m1[0] * m2[4] + m1[2] * m2[5] + m1[4];
    let out5 = m1[1] * m2[4] + m1[3] * m2[5] + m1[5];
    return [out0, out1, out2, out3, out4, out5];
}

/**
 * @method translate
 * 平移变换
 * @param {Float32Array|Array.<Number>} a
 * @param {Float32Array|Array.<Number>} v
 */
export function translate(a, v) {
    return mul([1, 0, 0, 1, v[0], v[1]], a);
}

/**
 * @method rotate
 * 旋转变换
 * @param {Float32Array|Array.<Number>} a
 * @param {Number} rad
 */
export function rotate(a, rad) {
    let sinx = Math.sin(rad);
    let cosx = Math.cos(rad);
    return mul([cosx, -sinx, sinx, cosx, 0, 0], a);
}

/**
 * @method scale
 * 缩放变换
 * @param {Float32Array|Array.<Number>} a
 * @param {Float32Array|Array.<Number>} v
 */
export function scale(a, v) {
    let vx = v[0];
    let vy = v[1];
    return mul([vx, 0, 0, vy, 0, 0], a);
}

/**
 * @method skew
 * 斜切变换
 * @param {Float32Array|Array.<Number>} a
 * @param {Float32Array|Array.<Number>} v
 */
export function skew(a, v) {
    return mul([1, v[1], v[0], 1, 0, 0], a);
}
