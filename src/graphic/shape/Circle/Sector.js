/**
 * 扇形
 */

import Path from "../../Path/Path";
import { merge } from "../../../tools/data_util";

export default class Sector extends Path {
    constructor(opts) {
        let defaultConfig = {
            shape: {
                cx: 0,
                cy: 0,
                r: 0,
                startAngle: 0,
                endAngle: Math.PI * 2,
                clockwise: true,
            },
            style: {
                stroke: null,
                fill: null,
            },
        };
        super(merge(defaultConfig, opts, true));
        this.type = "sector";
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

        ctx.moveTo(x, y);
        ctx.arc(x, y, r, startAngle, endAngle, !clockwise);
        ctx.closePath();
    }
}
