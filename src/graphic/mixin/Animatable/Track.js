import Timline from "./TimeLine";
import {
    isArrayLike,
    isString,
    getArrayDim,
    isArraySame,
    fillArr,
    rgba2String,
    interpolateArray,
    interpolateString,
    interpolateNumber,
    catmullRomInterpolateArray,
    catmullRomInterpolate,
} from "../../../tools/data_util";
import * as colorUtil from "../../../tools/color_util";
export default class Track {
    constructor(opts) {
        this._target = opts._target;
        this._delay = opts._delay;

        this.isFinished = false;
        this.keyFrames = [];
        this.timeline;
    }

    addKeyFrame(kf) {
        this.keyFrames.push(kf);
    }

    start(propName, loop = false, easing = "", forceAnimate = false) {
        //将所有关键帧的值，统一长度，填充空缺。
        let options = this._parseKeyFrames(easing, propName, loop, forceAnimate);
        // console.log(options);
        if (!options) {
            return null;
        }

        let timeline = new Timline(options);
        this.timeline = timeline;
    }

    nextFrame(time, delta) {
        // console.log(time, delta);
        if (!this.timeline) {
            return;
        }
        //时间线返回动画执行的进度： 进度百分比 or  'restart' or 'destory'
        let result = this.timeline.nextFrame(time, delta);

        if (isString(result) && result === "destroy") {
            this.isFinished = true;
        }
        // console.log(result);
        return result;
    }
    /**
     * @method stop
     * 停止动画
     * @param {Boolean} forwardToLast 是否快进到最后一帧
     */
    stop(forwardToLast) {
        if (forwardToLast) {
            // Move to last frame before stop
            this.timeline.onframe(this._target, 1);
        }
    }

    fire(eventType, arg) {
        this.timeline.fire(eventType, arg);
    }

    /**
     * @private
     * @method _parseKeyFrames
     * 解析关键帧，创建时间线
     * @param {String} easing 缓动函数名称
     * @param {String} propName 属性名称
     * @param {Boolean} forceAnimate 是否强制开启动画
     * //TODO:try move this into webworker
     */
    _parseKeyFrames(easing, propName, loop, forceAnimate) {
        let target = this._target;
        let useSpline = easing === "spline";
        let kfLength = this.keyFrames.length;
        if (!kfLength) return;

        let firstVal = this.keyFrames[0].value; //第一帧的值
        let isValueArray = isArrayLike(firstVal); //第一帧的值是否为数组
        let isValueColor = false;
        let isValueString = false;
        // 判断关键帧的值 值的第一项是不是数组
        let arrDim = isValueArray ? getArrayDim(this.keyFrames) : 0;
        //把所有的帧进行排序
        this.keyFrames.sort((a, b) => {
            return a.time - b.time;
        });

        let trackMaxTime = this.keyFrames[kfLength - 1].time; //最后一帧时间
        let kfPercents = []; //所有关键帧的时间转化为百分比
        let kfValues = []; //所有关键帧的值
        let preValue; //前一帧的值
        let isAllValuesEqual = false; //所有的值都相等

        for (let i = 0; i < kfLength; i++) {
            kfPercents.push(this.keyFrames[i].time / trackMaxTime); //将所有的帧，转换为百分比
            let curVal = this.keyFrames[i].value;

            preValue = i > 0 ? this.keyFrames[i - 1].value : [];
            //检测上一帧 和 当前帧 是否一致
            if (!(isValueArray && isArraySame(curVal, preValue, arrDim)) || (!isValueArray && curVal !== preValue)) {
                isAllValuesEqual = false;
            }

            //尝试转换 字符串颜色
            if (typeof curVal === "string") {
                let colorArray = colorUtil.parse(curVal);
                if (colorArray) {
                    curVal = colorArray;
                    isValueColor = true;
                } else {
                    isValueString = true;
                }
            }
            kfValues.push(curVal);
        }

        if (!forceAnimate && isAllValuesEqual) {
            return;
        }

        let lastValue = kfValues[kfLength - 1]; //最后一帧的值
        //循环，补全空缺的数值，让所有的数值长度都统一
        for (let i = 0; i < kfLength; i++) {
            if (isValueArray) {
                fillArr(kfValues[i], lastValue, arrDim);
            } else {
                if (isNaN(kfValues[i] && !isNaN(lastValue) && !isValueString && !isValueColor)) {
                    kfValues[i] = lastValue;
                }
            }
        }
        // console.log(propName);
        isValueArray && fillArr(target[propName], lastValue, arrDim); //将元素的属性指定定格到最后一帧。

        //缓存最后一帧的关键帧，加快动画播放时的速度
        let lastFrame = 0;
        let lastFramePercent = 0; //
        let start;
        let w;
        let p0;
        let p1;
        let p2;
        let p3;
        let rgba = [0, 0, 0, 0];
        //参数： （元素， 经过数学计算之后的数据）
        let onframe = function (target, percent) {
            // console.log(percent);
            let frame; //保存最后一帧的序列

            if (percent < 0) {
                //当前时间帧小于0，frame 就是第一帧
                frame = 0;
            } else if (percent < lastFramePercent) {
                //当前时间小于 最后一帧时间，

                start = Math.min(lastFrame + 1, kfLength - 1); //倒数第一帧
                for (frame = start; frame >= 0; frame--) {
                    if (kfLength[frame] <= percent) {
                        break;
                    }
                    frame = Math.min(frame, kfLength - 2); //倒数第二帧
                }
            } else {
                //当前时间 大于  最后一帧时间
                for (frame = lastFrame; frame < kfLength; frame++) {
                    if (kfPercents[frame] > percent) {
                        break;
                    }
                }
                frame = Math.min(frame - 1, kfLength - 2);
            }
            lastFrame = frame;
            lastFramePercent = percent;

            let range = kfPercents[frame + 1] - kfPercents[frame];
            if (range === 0) {
                return;
            } else {
                w = (percent - kfPercents[frame]) / range;
            }

            if (useSpline) {
                p1 = kfValues[frame];
                p0 = kfValues[frame === 0 ? frame : frame - 1];
                p2 = kfValues[frame > kfLength - 2 ? kfLength - 1 : frame + 1];
                p3 = kfValues[frame > kfLength - 3 ? kfLength - 1 : frame + 2];
                if (isValueArray) {
                    catmullRomInterpolateArray(p0, p1, p2, p3, w, w * w, w * w * w, target[propName], arrDim);
                } else {
                    let value;
                    if (isValueColor) {
                        value = catmullRomInterpolateArray(p0, p1, p2, p3, w, w * w, w * w * w, rgba, 1);
                        value = rgba2String(rgba);
                    } else if (isValueString) {
                        // String is step(0.5)
                        return interpolateString(p1, p2, w);
                    } else {
                        value = catmullRomInterpolate(p0, p1, p2, p3, w, w * w, w * w * w);
                    }
                    target[propName] = value;
                }
            } else {
                if (isValueArray) {
                    if (kfValues[frame]) {
                        //实时更新元素的属性
                        let res = interpolateArray(kfValues[frame], kfValues[frame + 1], w, target[propName], arrDim);
                        // console.log(res);
                    } else {
                        console.log(kfValues, "---", frame);
                    }
                } else {
                    let value;
                    if (isValueColor) {
                        interpolateArray(kfValues[frame], kfValues[frame + 1], w, rgba, 1);
                        value = rgba2String(rgba);
                    } else if (isValueString) {
                        return interpolateString(kfValues[frame], kfValues[frame + 1], w);
                    } else {
                        value = interpolateNumber(kfValues[frame], kfValues[frame + 1], w);
                    }
                    // console.log(value);
                    target[propName] = value;
                }
            }
        };

        let options = {
            target: target,
            lifeTime: trackMaxTime,
            loop: loop,
            delay: this._delay,
            onframe: onframe,
            easing: easing && easing !== "spline" ? easing : "Linear",
        };
        return options;
    }
}
