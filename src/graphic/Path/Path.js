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
    dirty() {}

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

        this.style.bind(ctx, this, prevEl);

        if (hasFillGradient) {
            ctx.fillStyle = this.__fillGradient;
        }

        if (hasStrokeGradient) {
            ctx.strokeStyle = this.__strokeGradient;
        }

        if (hasFill) {
            path.fill(ctx);
        }

        if (hasStroke) {
            path.stroke(ctx);
        }
    }

    getBoundingRect() {}

    contian(x, y) {}

    setShape() {}

    getLineScale() {}
}
export default Path;
