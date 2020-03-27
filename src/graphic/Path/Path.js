/*
 *
 */
import Element from "../Element/Element";
import pathProxy from "./PathProxy";
class Path extends Element {
    constructor(opts) {
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
        let path = this.path || new pathProxy(true); //拦截api,增加功能

        let hasStroke = this.style.hasStroke(); //绘制需求
        let hasFill = this.style.hasFill(); //填充需求

        let fill = this.style.fill;
        let stroke = this.style.stroke;

        let hasFillGradient = hasFill && !!fill.colorStops;
        let hasStrokeGradient = hasStroke && !!stroke.colorStops;

        let hasFillPattern = hasFill && !!fill.image;
        let hasStrokePattern = hasStroke && !!stroke.image;

        let ctxLineDash = !!ctx.setLineDash;
        let lineDash = this.style.lineDash;
        let lineDashOffset = this.style.lineDashOffset;

        //在style.bind()中完成 fillSytle  和 strokeStyle的设置

        this.style.bind(ctx, this, prevEl);
        this.setTransform(ctx);

        if (this.__dirty) {
            let rect;
            if (hasFillGradient) {
                rect = rect || this.getBoundingRect();
                this._fillGradient = this.style.getBoundingRect(ctx, fill, rect);
            }

            if (hasStrokeGradient) {
                rect = rect || this.getBoundingRect();
                this.__strokeGradient = this.style.getBoundingRect(ctx, stroke, rect);
            }
        }

        if (hasFillGradient) {
            ctx.fillStyle = this.__fillGradient;
        }

        if (hasStrokeGradient) {
            ctx.strokeStyle = this.__strokeGradient;
        }

        if (hasStrokeGradient) {
            ctx.strokeStyle = this._strokeGradient;
        } else if (hasStrokePattern) {
            // ctx.strokeStyle = Pattern.prototype.getCanvasPattern.call(stroke, ctx);
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
            path.fill(ctx);
        }

        if (hasStroke) {
            path.stroke(ctx);
        }

        //清除 虚线对其他图形的影响
        if (lineDash && ctxLineDash) {
            ctx.setLineDash([]);
        }
    }

    //
    dirty() {
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
}
export default Path;
