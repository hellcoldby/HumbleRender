/**
 * 椭圆
 */

import Path from "../../Path/Path";
import { merge } from "../../../tools/data_util";
let defaultConfig={
    shape: {
        cx: 0,
        cy: 0,
        r: 0,
        startAngle: 0,
        endAngle: Math.PI * 2,
        clockwise: true
    },
    style: {
        stroke: '#000',
        fill: null
    }
};

export default class Ellipse extends Path {
    constructor(opts) {
        super(merge(defaultConfig, opts, true));
        this.type = 'arc';
    }
    /**
     * @method buildPath
     * 绘制元素路径
     * @param {Object} ctx 
     * @param {String} shape 
     */
    buildPath(ctx, shape){
        let x = shape.cx;
        let y = shape.cy;
        let r = Math.max(shape.r, 0);
        let startAngle = shape.startAngle;
        let endAngle = shape.endAngle;
        let clockwise = shape.clockwise;

        ctx.arc(x, y, r, startAngle, endAngle, !clockwise);
    }
}
