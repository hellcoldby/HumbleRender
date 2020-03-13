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

    brush(ctx, prevEl) {
        let path = this.path || new pathProxy(true);
        let hasStroke = this.style.hasStroke(); //绘制需求
        let hasFill = this.style.hasFill(); //填充需求

        let fill = this.style.fill;
        let stroke = this.style.stroke;

        let hasFillGradient = hasFill && !!fill.colorStops;
        let hasStrokeGradient = hasStroke && !!stroke.colorStops;

        let hasFillPattern = hasFill && !!fill.image;
        let hasStrokePattern = hasStroke && !!stroke.image;

        //在style.bind()中完成 fillSytle  和 strokeStyle的设置
        this.style.bind(ctx, this, prevEl);
        // this.setTransform(ctx);

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

        //更新路径
        if (this.__dirtyPath) {
            path.beginPath(ctx);
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
    }
}
export default Path;
