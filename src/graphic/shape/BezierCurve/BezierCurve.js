/**
 * 贝塞尔曲线
 */

import Path from "../../Path/Path";
import { merge } from "../../../tools/data_util";
import { quadraticSubdivide, cubicSubdivide } from "../../tools/curve_util";

export default class BezierCurve extends Path {
    constructor(opts) {
        let defaultConfig = {
            shape: {
                x1: 0, // 开始位置
                y1: 0,
                x2: 0, //结束位置
                y2: 0,
                cpx1: 0,
                cpy1: 0,
                percent: 1,
            },
            style: {
                stroke: "#000",
                fill: null,
            },
        };
        super(merge(defaultConfig, opts, true));
        this.type = "bezier-curve";
        this.out = [];
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
        let percent = shape.percent;
        if (percent === 0) {
            return;
        }

        ctx.moveTo(x1, y1);
        if (cpx2 == null || cpy2 == null) {
            if (percent < 1) {
                quadraticSubdivide(x1, cpx1, x2, percent, this.out); // 细分二次贝塞尔曲线动态生成 cpx2 cpy2
                cpx1 = this.out[1];
                x2 = this.out[2];
                quadraticSubdivide(y1, cpy2, y2, percent, this.out);
                cpy1 = this.out[1];
                y2 = this.out[2];
            }
            ctx.quadraticCurveTo(cpx1, cpy1, x2, y2);
        } else {
            if (percent < 1) {
                cubicSubdivide(x1, cpx1, cpx2, x2, percent, this.out); //细分三次贝塞尔曲线
                cpx1 = this.out[1];
                cpx2 = this.out[2];
                x2 = this.out[3];
                cubicSubdivide(y1, cpy1, cpy2, y2, percent, this.out);
                cpy1 = this.out[1];
                cpy2 = this.out[2];
                y2 = this.out[3];
            }
            ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, x2, y2);
        }
    }
}
