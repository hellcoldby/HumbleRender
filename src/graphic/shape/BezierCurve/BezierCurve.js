/**
 * 贝塞尔曲线
 */

import Path from "../../Path/Path";
import { merge } from "../../../tools/data_util";
let defaultConfig = {
    shape: {
        x1: 0, // 开始位置
        y1: 0,
        x2: 0, //结束位置
        y2: 0,
        cpx1: 0,
        cpy1: 0,
        percent: 1
    },
    style: {
        stroke: "#000",
        fill: null
    }
};

export default class BezierCurve extends Path {
    constructor(opts) {
        super(merge(defaultConfig, opts, true));
        this.type = "bezier-curve";
    }

    buildPath(ctx, shape) {
        let x1 = shape.x1;
        let y1 = shape.y1;
        let x2 = shape.x2;
        let y2 = shape.y2;
        let cpx1 = shape.cpx1;
        let cpy1 = shape.cpy1;
        let cpx2 = shape.cpx2;
        let cpy2 = shape.cpy2;
        let percent = shpae.percent;
        if (percent === 0) {
            return;
        }

        ctx.moveTo(x1, y1);
    }
}
