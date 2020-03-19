import Timline from "./TimeLine";
import { isArrayLike } from "../../../tools/data_util";
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
        let options = this._parseKeyFrames(propName, easing, loop, forceAnimate);
        console.log(options);
        if (!options) {
            return null;
        }

        let timeLine = new Timline(options);
        this.timeLine = timeLine;
    }

    nextFrame(time, delta) {
        // console.log(time, delta);
        if (!this.timeline) {
            return;
        }

        let result = this.timeline.nextFrame(time, delta);
        // this.isFinished = true;

        return result;
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
    _parseKeyFrames(propName, easing, loop, forceAnimate) {
        let target = this._target;
        let kfLength = this.keyFrames.length;
        if (!kfLength) return;

        let firstVal = this.keyFrames[0].value;
        let isValueArray = isArrayLike(firstVal);
        let isValueColor = false;
        let isValueString = false;

        this.keyFrames.sort((a, b) => {
            return a.time - b.time;
        });
        console.log(this.keyFrames);

        let trackMaxTime = this.keyFrames[kfLength - 1].time; //最后一帧时间
        let kfPercents = []; //所有关键帧的时间转化为百分比
        let kfValues = []; //所有关键帧的值
        let preValue; //前一帧的值
        let isAllValuesEqual = false; //所有的值都相等

        for (let i = 0; i < kfLength; i++) {
            kfPercents.push(this.keyFrames[i].time / trackMaxTime);
            let curVal = this.keyFrames[i].value;

            preValue = i > 0 ? this.keyFrames[i - 1].value : this.keyFrames[0].value;
            if (!isValueArray && curVal === preValue) {
                //？？
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

        let lastValue = kfValues[kfLength - 1];
        for (let i = 0; i < kfLength; i++) {
            if (isValueArray) {
            } else {
                if (isNaN(kfValues[i] && !isNaN(lastValue) && !isValueString && !isValueColor)) {
                    kfValues[i] = lastValue;
                }
            }
        }
        //isValueArray && dataUtil.fillArr(target[propName], lastValue, arrDim); //??

        //缓存最后一帧的关键帧，加快动画播放时的速度
        let lastFrame = 0;
        let lastFramePercent = 0;
        let start;
        let w;
        let p0;
        let p1;
        let p2;
        let p3;
        let rgba = [0, 0, 0, 0];

        let onframe = function(target, percent) {
            let frame;

            if (percent < 0) {
                frame = 0;
            } else if (percent < lastFramePercent) {
                start = Math.min(lastFrame + 1, kfLength - 1);
                for (frame = start; frame >= 0; frame--) {
                    if (kfLength[frame] <= percent) {
                        break;
                    }
                    frame = Math.min(frame, kfLength - 2);
                }
            } else {
                for (frame = lastFrame; frame < kfLength; frame++) {
                    if (kfPercents[frame] > percent) {
                        break;
                    }
                }
                frame = Math.min(frame - 1, kfLength - 2);
            }
            lastFrame = frame;
            lastFramePercent = percent;
        };

        let options = {
            target: target,
            lifeTime: trackMaxTime,
            loop: loop,
            delay: this._delay,
            onframe: onframe,
            easing: easing && easing !== "spline" ? easing : "Linear"
        };
        return options;
    }
}