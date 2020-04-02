import { getContext } from "../../tools/canvas_util";
// let tmpRect = new BoundingRect();

const WILL_BE_RESTORED = 9; //字体编号，防止重复渲染
export default class TextRender {
    constructor() {}
    drawRectText(ctx, style) {
        let { fontSize = 12, fontFamily = "sans-serif", fontStyle, fontWeight, text, textLineHeight } = style;

        //合并字体样式
        let font = "";
        if (fontSize || fontFamily) {
            fontSize = parseFloat(fontSize);
            font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        }
        style.font = style.font || font;

        //处理字体的行高
        textLineHeight = textLineHeight || fontSize;

        //处理水平位置
        let textAlign = style.textAlign === "middle" ? "center" : style.textAlign;
        style.textAlign = ["left", "center", "right"].indexOf(textAlign) === -1 ? "left" : textAlign;
        //处理垂直位置
        let textVerticalAlign = style.textVerticalAlign || style.textBaseline;
        textVerticalAlign = textVerticalAlign === "center" ? "middle" : textVerticalAlign;
        style.textVerticalAlign = ["top", "bottom", "middle"].indexOf(textVerticalAlign) === -1 ? "top" : textVerticalAlign;

        //处理字体颜色
        let textFill = style.textFill ? style.textFill : null;
        if (textFill && (textFill.image || textFill.colorStops)) {
            textFill = "#000";
        }
        style.textFill = textFill;

        let textStroke = style.textStroke ? style.textStroke : null;
        if (textStroke && (textStroke.image || textStroke.colorStops)) {
            textStroke = "#000";
        }
        style.textStroke = textStroke;

        //处理内边距,转换为绝对位置
        let boxPos = getBoxPosition(this, style, null);
        console.log(style);
        let textX = boxPos.baseX;
        let textY = boxPos.baseY;
        if (style.textPadding) {
            style.textPadding = normalizeCssArray(style.textPadding);
            let padding = style.textPadding;
            // let textWidth = 0;
            if (text) {
                // let textLines = `${text}`.split("\n");
                // textLines.forEach(item => {
                //     let Tmp_ctx = getContext();
                //     Tmp_ctx.font = style.font;
                //     let curWidth = Tmp_ctx.measureText(text).width;
                //     textWidth = Math.max(textWidth, curWidth);
                // });
                //再获取盒子的绝对位置
                textX = getTextForPadding(baseX, style.textAlign, style.textPadding);
                textY += textPadding[0] + textLineHeight / 2;
            }
        }

        // let transform = thi.transform;
        // if (!style.transformText) {
        //     if (transform) {
        //     }
        // } else {
        // }

        //开始绘制字体
        ctx.save();
        ctx.font = style.font;
        ctx.textAlign = style.textAlign;
        ctx.textBaseline = "middle";
        ctx.globalAlpha = style.opacity || 1;
        if (style.textFill) {
            ctx.fillStyle = style.textFill;
            ctx.fillText(text, textX, textY);
        }
        if (style.textStroke) {
            ctx.strokeStyle = style.textStroke;
            ctx.strokeText(text, textX, textY);
        }
    }
}

//tools 获取图形的绝对位置
function getBoxPosition(ele, style, rect) {
    let baseX = style.x || 0;
    let baseY = style.y || 0;
    let textAlign = style.textAlign;
    let textVerticalAlign = style.textVerticalAlign;

    if (rect) {
    }

    return {
        baseX,
        baseY,
        textAlign,
        textVerticalAlign
    };
}

//tools 获取字体设置padding(内边距)后的位置
function getTextForPadding(x, textAlign, textPadding) {
    let curX = 0;
    switch (textAlign) {
        case "right":
            curX = x - textPadding[1];
            break;
        case "center":
            curX = x + textPadding[3] / 2 - textPadding[1] / 2;
            break;
        default:
            curX = x + textPadding[3];
            break;
    }
    return curX;
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
function normalizeCssArray(val) {
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
