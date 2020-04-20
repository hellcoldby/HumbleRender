/*
 * 继承 Element.js ，主要为元素自身的属性
 * 继承 renderText.js, 绘制字体的逻辑
 * 引入 ./PathProxy 重写 Canvas 常用API
 */
import Element from "../Element/Element";
import PathProxy from "./PathProxy/PathProxy";
import TextRender from "./TextRender";
import { mixin, isObject, merge } from "../../tools/data_util";

class Path extends Element {
    constructor(opts) {
        // console.log(opts);
        super(opts);
        this.type = "path";
        this.path = null;
        this.__dirtyPath = true;

        this.strokeContainThreshold = 5; //绘制 临界值
        this.segmentIgnoreThreshold = 0; //部分 忽略 临界值
        this.subPixelOptimize = false; //设备优化
    }

    //调用canvas API 绘制i
    brush(ctx, prevEl) {
        // console.log(this.shape);
        let path = this.path || new PathProxy(true); //拦截api,增加功能

        let hasStroke = this.style.hasStroke(); //绘制需求
        let hasFill = this.style.hasFill(); //填充需求

        let fill = this.style.fill;
        let stroke = this.style.stroke;
        // console.log(fill, stroke);
        let hasFillGradient = hasFill && !!fill.colorStops;
        let hasStrokeGradient = hasStroke && !!stroke.colorStops;

        let hasFillPattern = hasFill && !!fill.image;
        let hasStrokePattern = hasStroke && !!stroke.image;

        let ctxLineDash = !!ctx.setLineDash;
        let lineDash = this.style.lineDash;
        let lineDashOffset = this.style.lineDashOffset;

        //在style.bind()中完成 fillSytle  和 strokeStyle的设置

        this.style.bind(ctx, this, prevEl);
        //调用transformable.js 中的 设置矩阵
        this.setTransform(ctx);

        if (this.__dirty) {
            let rect;
            if (hasFillGradient) {
                // rect = rect || this.getBoundingRect();

                this._fillGradient = this.style.getGradient(ctx, fill, rect);
            }

            if (hasStrokeGradient) {
                // rect = rect || this.getBoundingRect();
                //  如果描边为渐变色{stroke:  new linearGradient()}
                this._strokeGradient = this.style.getGradient(ctx, stroke, rect);
            }
        }

        if (hasFillGradient) {
            ctx.fillStyle = this._fillGradient;
        }

        if (hasStrokeGradient) {
            ctx.strokeStyle = this._strokeGradient;
        }

        if (this.__dirtyPath) {
            path.beginPath(ctx);
            if (lineDash && ctxLineDash) {
                ctx.setLineDash(lineDash);
                ctx.lineDashOffset = lineDashOffset;
            }

            this.buildPath(path, this.shape, false);
            if (this.path) {
                this.__dirtyPath = false;
            }
        } else {
            ctx.beginPath();
        }

        if (hasFill) {
            if (this.style.fillOpacity != null) {
                let originalGlobalAlpha = ctx.globalAlpha;
                ctx.globalAlpha = this.style.fillOpacity * this.style.opacity;
                path.fill(ctx);
                ctx.globalAlpha = originalGlobalAlpha;
            } else {
                path.fill(ctx);
            }
        }

        if (hasStroke) {
            path.stroke(ctx);
        }

        //清除 虚线对其他图形的影响
        if (lineDash && ctxLineDash) {
            ctx.setLineDash([]);
        }

        //绘制canvas 文字
        if (this.style.text) {
            this.drawRectText(ctx, this.style, this.getBoundingRect());
        }
    }

    //元素标记为更新，并让绘图环境 this.__hr.refresh()重绘
    dirty(dirtyPath = true) {
        if (dirtyPath) {
            this.__dirtyPath = dirtyPath;
            this._rect = null;
        }

        this.__dirty = this.__dirtyText = true;
        this.__hr && this.__hr.refresh();
        if (this.__clipTarget) {
            this.__clipTarget.dirty();
        }
    }

    getLineScale() {
        let m = this.transform;
        return m && Math.abs(m[0] - 1) > 1e-10 && Math.abs(m[3] - 1) > 1e-10 ? Math.sqrt(Math.abs(m[0] * m[3] - m[2] * m[1])) : 1;
    }

    //获取包围盒
    getBoundingRect() {
        const { type, shape } = this;

        let boxInfo = null;
        // console.log(this);
        switch (type) {
            //弧度按照 整个圆形来取包围盒
            case "arc":
                boxInfo = _getCircleBox(shape);
                break;
            //圆形
            case "circle":
                boxInfo = _getCircleBox(shape);
                break;
            //矩形
            case "rect":
                boxInfo = _getRectBox(shape);
                break;
            //扇形
            case "sector":
                boxInfo = _getCircleBox(shape);
                break;

            //线段
            case "line":
                boxInfo = _getLineBox(shape);
                break;

            default:
                break;
        }
        return boxInfo;

        function _getCircleBox(shape) {
            let min = {}; //盒子最小坐标
            let max = {}; //盒子最大坐标
            let cen = {}; //盒子中心点坐标
            const { cx, cy, r } = shape;
            min.x = cx - r;
            min.y = cy - r;
            max.x = cx + r;
            max.y = cy + r;
            cen.x = cx;
            cen.y = cy;
            return {
                min,
                max,
                cen,
            };
        }

        function _getRectBox(shape) {
            let min = {}; //盒子最小坐标
            let max = {}; //盒子最大坐标
            let cen = {}; //盒子中心点坐标
            const { x, y, width, height } = shape;
            min.x = x;
            min.y = y;
            max.x = x + width;
            max.y = y + height;
            cen.x = min.x + width / 2;
            cen.y = min.y + height / 2;
            return {
                min,
                max,
                cen,
            };
        }
        function _getLineBox(shape) {
            let min = {}; //盒子最小坐标
            let max = {}; //盒子最大坐标
            let cen = {}; //盒子中心点坐标
            const { x1, y1, x2, y2 } = shape;
            min.x = x1;
            min.y = y1;
            max.x = x2;
            max.y = y2;
            cen.x = min.x + (max.x - min.x) / 2;
            cen.y = min.y + (max.y - min.y) / 2;

            return {
                min,
                max,
                cen,
            };
        }
    }

    setShape(key, value) {
        if (!this.shape) {
            return this;
        }
        if (isObject(key)) {
            merge(this.shape, key, true); //覆盖之前的属性
        } else {
            this.shape[key] = value;
        }
        this.dirty(true);
        return this;
    }
}

mixin(Path.prototype, TextRender.prototype); //继承
export default Path;
