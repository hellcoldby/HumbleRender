// let tmpRect = new BoundingRect();

const WILL_BE_RESTORED = 9; //字体编号，防止重复渲染
export default class TextRender {
    constructor() {}
    drawRectText(ctx, style) {
        //合并字体样式
        const { fontSize, fontFamily, fontStyle, fontWeight } = style;
        let font = "";
        if (fontSize || fontFamily) {
            font = `${fontStyle} ${fontWeight} ${fontSize || 12}px ${fontFamily || "sans-serif"}`;
        }
        style.font = style.font || font;

        //处理水平位置
        let textAlign = style.textAlign === "middle" ? "center" : style.textAlign;
        style.textAlign = ["left", "center", "right"].indexOf(textAlign) === -1 ? "left" : textAlign;
        //处理垂直位置
        textVerticalAlign = style.textVerticalAlign || style.textBaseline;
        let textVerticalAlign = textVerticalAlign === "center" ? "middle" : textVerticalAlign;
        style.textVerticalAlign = ["top", "bottom", "middle"].indexOf(textVerticalAlign) === -1 ? "top" : textVerticalAlign;

        //处理内边距
        if (style.textPadding) {
            style.textPadding = normalizeCssArray(style.textPadding);
        }

        //判断字体变化，决定是否重新渲染
        if (style.text) {
            style.text += "";
        }

        ctx.save();
        let transform = thi.transform;
        if (!style.transformText) {
            //????
            if (transform) {
            }
        } else {
            this.applayTransform(ctx); //???
        }

        // 渲染字体
    }
}

/** tools 处理内边距的参数
 * Normalize css liked array configuration
 * e.g.
 *  3 => [3, 3, 3, 3]
 *  [4, 2] => [4, 2, 4, 2]
 *  [4, 3, 2] => [4, 3, 2, 3]
 * @param {number|Array.<Number>} val
 * @return {Array<Number>}
 */
export function normalizeCssArray(val) {
    if (typeof val === "number") {
        return [val, val, val, val];
    }
    var len = val.length;
    if (len === 2) {
        // vertical | horizontal
        return [val[0], val[1], val[0], val[1]];
    } else if (len === 3) {
        // top | horizontal | bottom
        return [val[0], val[1], val[2], val[1]];
    }
    return val;
}
