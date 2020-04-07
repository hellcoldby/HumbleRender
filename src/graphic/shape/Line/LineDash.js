import { subPixelOptimizeLine } from "../../tools/sub_pixel_optimize";
import Path from "../../Path/Path";
import { merge } from "../../../tools/data_util";

/**
 * 直线
 */

let defaultConfig = {
    shape: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        percent: 1
    },
    style: {
        stroke: "#000",
        fill: null,
        lineDash: [5, 10, 15],
        lineDashOffset: 0
    }
};

export default class LineDash extends Path {
    constructor(opts) {
        super(merge(defaultConfig, opts, true));
        this.type = "arc";
    }

    buildPath(ctx, shape) {
        let x1, x2, y1, y2;

        if (this.subPixelOptimize) {
            let subPixelOptimizeOutputShape = {};
            subPixelOptimizeLine(subPixelOptimizeOutputShape, shape, this.style);
            x1 = subPixelOptimizeOutputShape.x1;
            y1 = subPixelOptimizeOutputShape.y1;
            x2 = subPixelOptimizeOutputShape.x2;
            y2 = subPixelOptimizeOutputShape.y2;
        } else {
            x1 = shape.x1;
            y1 = shape.y1;
            x2 = shape.x2;
            y2 = shape.y2;
        }

        let percent = shape.percent;

        if (percent === 0) {
            return;
        }

        ctx.moveTo(x1, y1);

        if (percent < 1) {
            x2 = x1 * (1 - percent) + x2 * percent;
            y2 = y1 * (1 - percent) + y2 * percent;
        }
        ctx.lineTo(x2, y2);
    }
}
