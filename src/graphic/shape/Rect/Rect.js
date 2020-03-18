import round_rect from "./round_rect";
import { merge } from "../../../tools/data_util";
import Path from "../../Path/Path";

// 左上、右上、右下、左下角的半径依次为r1、r2、r3、r4
// r缩写为1         相当于 [1, 1, 1, 1]
// r缩写为[1]       相当于 [1, 1, 1, 1]
// r缩写为[1, 2]    相当于 [1, 2, 1, 2]
// r缩写为[1, 2, 3] 相当于 [1, 2, 3, 2]

//tools -- 默认配置

export default class Rect extends Path {
    constructor(opts) {
        let defaultConfig = {
            shape: {
                r: 0,
                x: 0,
                y: 0,
                width: 0,
                height: 0
            }
        };
        let config =  merge(defaultConfig, opts, true)
        super(config);
        this.type = "rect";
    }

    /**
     * @method buildPath
     * 绘制元素路径
     * @param {Object} ctx
     * @param {String} shape
     */
    buildPath(ctx, shape) {
        let x;
        let y;
        let width;
        let height;
        if (this.subPixelOptimize) {
        } else {
            x = shape.x;
            y = shape.y;
            width = shape.width;
            height = shape.height;
        }
        // 判断是否为 圆角矩形
        if (!shape.r) {
            ctx.rect(x, y, width, height);
        } else {
            
            round_rect(ctx, shape);
        }
        ctx.closePath();
        return;
    }
}
