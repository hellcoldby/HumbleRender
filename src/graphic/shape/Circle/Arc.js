/**
 * 弧形
 */

import Path from "../../Path/Path";
import { merge } from "../../../tools/data_util";
let defaultConfig = {
    shape: {
        cx: 0,
        cy: 0,
        r: 0,
        startAngle: 0,
        endAngle: Math.PI * 2,
        clockwise: true
    },
    style: {
        stroke: null,
        fill: null
    }
};

export default class Arc extends Path {
    constructor(opts) {
        let mergeOpts = merge(defaultConfig, opts, true);
        // console.log(mergeOpts);
        super(mergeOpts);
        this.type = "arc";
    }
    /**
     * @method buildPath
     * 绘制元素路径
     * @param {Object} ctx
     * @param {String} shape
     */
    buildPath(ctx, shape) {
        let x = shape.cx;
        let y = shape.cy;
        let r = Math.max(shape.r, 0);
        let startAngle = shape.startAngle;
        let endAngle = shape.endAngle;
        let clockwise = shape.clockwise;

        // let unitX = Math.cos(startAngle);
        // let unitY = Math.sin(startAngle);

        // ctx.moveTo(unitX * r + x, unitY * r + y);
        // console.log(startAngle, endAngle);
        ctx.arc(x, y, r, startAngle, endAngle, !clockwise);
    }
}
