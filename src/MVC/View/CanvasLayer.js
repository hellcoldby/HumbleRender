/*
 * 创建canvas 图层实例
 * 该类被设计用来创建 canvas 层，在 CanvasPainter 类中会引用此类。
 * 在绘图过程中， CanvasPainter 会创建多个 canvas 实例来辅助操作，
 * 某些 canvas 实例是隐藏的，比如用来导出图片的 canvas。
 * 注意：在微信小程序中不能动态创建 canvas 标签，因为微信小程序不允许 DOM 操作。
 */

import { createCanvas, getContext } from "../../tools/canvas_util";
export default class CanvasLayer {
    constructor(root, width, height, dpr, id) {
        Object.assign(this, { root, width, height, dpr, id });

        this.ctx = null;

        let canvasDOM = null;
        if (root && root.nodeName && root.nodeName.toUpperCase() === "CANVAS") {
            canvasDOM = root;
        } else if (typeof root === "string") {
            canvasDOM = createCanvas(id, width, height, dpr);
        } else {
            this.ctx = root; //root 为上下文环境
        }

        if (canvasDOM && canvasDOM.style) {
            canvasDOM.onselectstart = () => {
                return false;
            }; // 避免页面选中的尴尬
            canvasDOM.style["-webkit-user-select"] = "none";
            canvasDOM.style["user-select"] = "none";
            canvasDOM.style["-webkit-touch-callout"] = "none";
            canvasDOM.style["-webkit-tap-highlight-color"] = "rgba(0,0,0,0)";
            canvasDOM.style["padding"] = 0; // eslint-disable-line dot-notation
            canvasDOM.style["margin"] = 0; // eslint-disable-line dot-notation
            canvasDOM.style["border-width"] = 0;
        }

        this.canvasDOM = canvasDOM; //注意：this.canvasDOM 可能为null，因为在微信小程序中，没有办法获取 canvas 实例，只能获取到 Context 对象。

        this.hiddenCanvas = null; // 隐藏画布实例
        this.hiddenContext = null; // 隐藏画布的上下文

        this.config = null;
        this.clearColor = 0; //每次清空画布的颜色

        /**
         * @property {boolean} 是否开启动态模糊
         */
        this.motionBlur = false;

        /**
         * @property {Number} 在开启动态模糊的时候使用，与上一帧混合的alpha值，值越大尾迹越明显
         */
        this.lastFrameAlpha = 0.7;

        this.__dirty = true;
        this.__used = false;
        this.__drawIndex = 0; //增量绘制的序列
        this.__startIndex = 0; //最先绘制的元素编号
        this.__endIndex = 0; //最后绘制的元素编号
        this.incremental = false; //增量绘制
    }

    //初始化绘图环境
    initContext() {
        if (this.canvasDOM) {
            this.ctx = getContext(this.canvasDOM);
        }
        this.ctx.dpr = this.dpr;
    }

    //创建隐藏的canvas
    creatHiddenCanvas() {
        this.hiddenCanvas = createCanvas("back-" + this.id, this.width, this.height, this.dpr);
        this.hiddenContext = getContext(this.hiddenCanvas);
        if (this.dpr !== 1) {
            this.hiddenContext.scale(this.dpr, this.dpr);
        }
    }

    getElementCount() {
        return this.__endIndex - this.__startIndex;
    }
    //改变尺寸
    resize(width, height) {
        //Can NOT get canvas instance in Wechat mini-program.
        if (!this.canvasDOM) {
            return;
        }
        if (this.canvasDOM.style) {
            this.canvasDOM.style.width = width + "px";
            this.canvasDOM.style.height = height + "px";
        }
        this.canvasDOM.width = width * this.dpr;
        this.canvasDOM.height = height * this.dpr;

        if (!this.hiddenCanvas) {
            return;
        }
        this.hiddenCanvas.width = width * this.dpr;
        this.hiddenCanvas.height = height * this.dpr;
        if (this.dpr !== 1) {
            this.hiddenContext.scale(this.dpr, this.dpr);
        }
    }

    clear(clearAll, clearColor) {
        clearColor = clearColor || this.clearColor;
        let haveMotionBLur = this.motionBlur && !clearAll;
        let dpr = this.dpr;
        let width = 0;
        let height = 0;

        // if (haveMotionBLur && this.canvasDOM) {
        //     width = this.canvasDOM.width;
        //     height = this.canvasDOM.height;
        //     if (!this.hiddenCanvas) {
        //         this.creatHiddenCanvas();
        //     }
        //     this.hiddenContext.globalCompositeOperation = "copy";
        //     this.hiddenContext.drawImage(this.canvasDOM, 0, 0, width / dpr, height / dpr);
        // }
        console.log(this.width, this.height);
        this.ctx.clearRect(0, 0, this.width * this.dpr, this.height * this.dpr);

        // if (haveMotionBLur && this.hiddenCanvas) {
        //     this.ctx.save();
        //     this.ctx.globalAlpha = lastFrameAlpha;
        //     this.ctx.drawImage(this.hiddenCanvas, 0, 0, width, height);
        //     this.ctx.restore();
        // }
    }

    // creatHiddenCanvas() {
    //     this.hiddenCanvas = canvasUtil.createCanvas("back-" + this.id, this.width, this.height, this.dpr);
    //     this.hiddenContext = canvasUtil.getContext(this.hiddenCanvas);
    //     if (this.dpr !== 1) {
    //         this.hiddenContext.scale(this.dpr, this.dpr);
    //     }
    // }
}

let a = function() {};
