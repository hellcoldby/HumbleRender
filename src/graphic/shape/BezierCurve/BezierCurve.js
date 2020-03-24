/**
 * 贝塞尔曲线
 */

import Path from "../../Path/Path";
import { merge } from "../../../tools/data_util";
let defaultConfig = {
    shape: {
        x1: 0,
        y1: 0,
        x2: 0,
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
        this.type = "arc";
    }
}
