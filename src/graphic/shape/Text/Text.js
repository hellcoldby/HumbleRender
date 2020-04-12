import { merge } from "../../../tools/data_util";
import Path from "../../Path/Path";

export default class Text extends Path {
    constructor(opts) {
        super(opts);
        this.type = "text";
    }

    brush(ctx, prevEle) {
        this.style.bind(ctx, this, prevEle);
        if (this.style.text) {
            ctx.save();
            ctx.beginPath();

            this.drawRectText(ctx, this.style, this.getBoundingRect(ctx));
            ctx.restore();
        }
    }
    //获取canvas画布的尺寸
    getBoundingRect(ctx) {
        // console.log(ctx);
        const dpr = 1;
        const root = this.__hr && this.__hr.root;
        const ctxW = root.clientWidth * dpr;
        const ctxH = root.clientHeight * dpr;
        let min = {}; //盒子最小坐标
        let max = {}; //盒子最大坐标
        let cen = {}; //盒子中心点坐标

        const { x = 0, y = 0 } = this.shape;
        const { fontSize, textLineHeight } = this.style;

        const oY = Math.max(fontSize * dpr, textLineHeight * dpr); //默认字体是垂直居中，计算左上角坐标要 减去行高。

        min.x = 0 + x * dpr;
        min.y = oY / 2 + y * dpr;
        max.x = ctxW;
        max.y = ctxH;
        cen.x = ctxW / 2;
        cen.y = ctxH / 2;
        // console.log(min, max, cen);
        return {
            min,
            max,
            cen,
        };
    }
}
