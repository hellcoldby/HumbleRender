/*
 * data_util 数据 相关的 工具集合
 *
 * 判断对象类型
 */

import { fastLerp } from "./color_util";

//1. 判断对象类型
export function isObject(val) {
    let res = typeof val;
    return res === "function" || (!!val && res === "object");
}
export function isString(val) {
    return Object.prototype.toString.call(val) === "[object String]";
}
export function isNumber(val) {
    return !isNaN(parseFloat(val)) && isFinite(val);
}

//2. 判断数据类型
export function judgeType(val) {
    return Object.prototype.toString.call(val);
}

//3. 深拷贝
export function deepClone(source) {
    if (!source || typeof source !== "object") return source;

    let res = source;
    if (judgeType(source) === "[object Array]") {
        res = [];
        for (let i = 0; i < source.length; i++) {
            res[i] = deepClone(source[i]);
        }
    }
    if (judgeType(source) === "[object Object") {
        res = {};
        for (let key in source) {
            res[key] = deepClone(source[key]);
        }
    }

    return res;
}

export function merge(target, source, overwrite) {
    if (!isObject(target) || !isObject(source)) {
        //如果 overwirte 为true, source 覆盖 target
        if (overwrite) {
            return deepClone(source);
        } else {
            return target;
        }
    }

    for (let key in source) {
        let source_prop = source[key];
        let target_prop = target[key];
        if (judgeType(source_prop) === "[object Object]" && judgeType(target_prop) === "[object Object]") {
            // 如果需要递归覆盖，就递归调用merge
            merge(target_prop, source_prop, overwrite);
        } else if (overwrite || !(key in target)) {
            // 否则只处理overwrite为true，或者在目标对象中没有此属性的情况
            // 在 target[key] 不存在的时候也是直接覆盖
            target[key] = deepClone(source[key]);
        }
    }

    return target;
}

/** 拷贝父类上的属性，此方法用来支持那么没有按照 ES6 语法编写的类。
 *
 * @param {*} target 子类的实例
 * @param {*} SuperClass 父类的构造函数
 * @param {*} opts 父类构造参数
 */
export function inheritProperties(target, SuperClass, opts) {
    let src = new SuperClass(opts);
    for (let name in src) {
        if (src.hasOwnProperty(name)) {
            target[name] = src[name];
        }
    }
}

//5. 从目标对象上拷贝非继承的属性
export function copyOwnProperties(target, source, excludes = []) {
    for (let key in source) {
        if (source.hasOwnProperty(key)) {
            if (excludes && excludes.length) {
                if (excludes.indexOf(key) !== -1) {
                    continue;
                }
            }
            target[key] = source[key];
        }
    }
    return target;
}

//6. 拷贝多个对象的（非继承）属性。 参数（targe, obj1, obj2, ..., overWrite)
export function mixin() {
    let lastArgs = arguments[arguments.length - 1];
    let argLen = arguments.length;
    let overwrite = false;
    if (typeof lastArgs === "boolean") {
        overwrite = lastArgs;
        argLen -= 1;
    }
    let target = arguments[0];
    let i = 1;
    let tmp = null;
    let tmp_keys = [];
    for (i; i < argLen; i++) {
        tmp = arguments[i];

        tmp_keys = Object.getOwnPropertyNames(tmp);
        if (tmp_keys.length) {
            tmp_keys.forEach(function(prop) {
                if (prop !== "constructor" && prop !== "prototype") {
                    if (tmp.hasOwnProperty(prop) && (overwrite ? tmp[prop] != null : target.hasOwnProperty(prop) === false)) {
                        target[prop] = tmp[prop];
                        // console.log(target[prop]);
                    }
                }
            });
        }
    }
    return target;
}

//7.判断是否为类数组
export function isArrayLike(data) {
    if (!data) return;
    if (typeof data === "string") return;
    return typeof data.length === "number";
}

//8. 关键帧的值 , 值的第一项是数组则为2
export function getArrayDim(keyframes) {
    let lastValue = keyframes[keyframes.length - 1].value;
    return isArrayLike(lastValue && lastValue[0]) ? 2 : 1;
}

export function isArraySame(arr0, arr1, arrDim) {
    if (arr0 === arr1) return true;
    let len = arr0.length;
    if (len !== arr1.length) return false;
    //最后一个值不是数组
    if (arrDim === 1) {
        for (let i = 0; i < len; i++) {
            if (arr0[i] !== arr1[i]) {
                //两个数组不一样
                return false;
            }
        }
    } else {
        //最后一个值是数组
        let len2 = arr0[0].length;
        for (let i = 0; i < len; i++) {
            for (let j = 0; j < len2; j++) {
                if (arr0[i][j] !== arr1[i][j]) {
                    return false;
                }
            }
        }
    }
    return true;
}

export function fillArr(arr0, arr1, arrDim) {
    let len0 = arr0.length;
    let len1 = arr1.length;
    if (len0 !== len1) {
        //对比数组的长度，统一为最小长度
        let len0_isLarger = len0 > len1 ? true : false;
        if (len0_isLarger) {
            //第一个数组比较长,裁切数组长度。
            arr0.length = len1;
        } else {
            // 用后一个数组填充前一个数组
            for (let i = len0; i < len1; i++) {
                arr0.push(arrDim === 1 ? arr1[i] : Array.prototype.slice.call(arr1[i]));
            }
        }
    }

    let len2 = arr0[0] && arr0[0].length;
    for (var i = 0; i < arr0.length; i++) {
        if (arrDim === 1) {
            if (isNaN(arr0[i])) {
                arr0[i] = arr1[i];
            }
        } else {
            for (var j = 0; j < len2; j++) {
                if (isNaN(arr0[i][j])) {
                    arr0[i][j] = arr1[i][j];
                }
            }
        }
    }
}

/**
 * 字符串插值
 * @param  {String} p0
 * @param  {String} p1
 * @param  {Number} percent
 * @return {String}
 */
export function interpolateString(p0, p1, percent) {
    return percent > 0.5 ? p1 : p0;
}

/**
 * 数组插值
 * @param  {Array} p0
 * @param  {Array} p1
 * @param  {Number} percent
 * @param  {Array} out
 * @param  {Number} arrDim
 */
export function interpolateArray(p0, p1, percent, out, arrDim) {
    var len = p0.length;
    if (!len) return;
    if (arrDim === 1) {
        for (var i = 0; i < len; i++) {
            out[i] = interpolateNumber(p0[i], p1[i], percent);
        }
    } else {
        var len2 = p0[0].length;
        if (!len2) return;
        for (var i = 0; i < len; i++) {
            if (out[i] === undefined) {
                return;
            }
            for (var j = 0; j < len2; j++) {
                out[i][j] = interpolateNumber(p0[i][j], p1[i][j], percent);
            }
        }
    }
    return out;
}

/**
 * @param  {Number} p0
 * @param  {Number} p1
 * @param  {Number} percent
 * @return {Number}
 */
export function interpolateNumber(p0, p1, percent) {
    return (p1 - p0) * percent + p0;
}
