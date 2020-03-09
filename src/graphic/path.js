/*
 *
 */
import Element from "./Element";
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

    brush(ctx, prevEl) {}

    getBoundingRect() {}

    contian(x, y) {}

    setShape() {}

    getLineScale() {}
}
export default Path;
