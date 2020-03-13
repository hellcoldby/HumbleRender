import Path from "../../Path/Path";
import { merge } from "../../../tools/data_util";
let defaultConfig = {
    shape: {
        cx: 0,
        cy: 0,
        r: 0
    }
};
export default class Circle extends Path {
    constructor(opts) {
        super(merge(defaultConfig, opts, true));
        this.type = "circle";
    }

    buildPath(ctx, shape, inBundle) {
        if (inBundle) {
            ctx.moveTo(shape.cx + shape.r, shape.cy);
        }
        ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2, true);
    }
}
