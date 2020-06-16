import { getContext } from "../../tools/canvas_util";
// let tmpRect = new BoundingRect();

const WILL_BE_RESTORED = 9; //字体编号，防止重复渲染
export default class TextRender {
    constructor(props) {
        this.textWidth = 0;
    }
    drawRectText(ctx, style, box) {
        const { max, min, cen } = box;
        // const dpr = ctx.dpr;
        // console.log(box);
        // console.log(style);
        let { fontSize, fontFamily, fontStyle, fontWeight, newText, textLineHeight, limitWidth, text } = style;
        fontFamily = fontFamily || "sans-serif";
        fontStyle = fontStyle || "normal";
        fontWeight = fontWeight || "normal";
        fontSize = fontSize || 12;
        text = text || "";
        textLineHeight = textLineHeight || 12;

        //合并字体样式
        let font = "";
        if (fontSize || fontFamily) {
            fontSize = parseFloat(fontSize);
            font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        }
        style.font = font || style.font;
        // console.log(style.font);

        //文字行高
        textLineHeight = textLineHeight || fontSize;
        if (textLineHeight > fontSize) {
        }

        //处理水平位置
        let textAlign = style.textAlign === "middle" ? "center" : style.textAlign;
        style.textAlign = ["left", "center", "right"].indexOf(textAlign) === -1 ? "left" : textAlign;
        //处理垂直位置
        let textVerticalAlign = style.textVerticalAlign || style.textBaseline;
        textVerticalAlign = textVerticalAlign === "center" ? "middle" : textVerticalAlign;
        style.textVerticalAlign = ["top", "bottom", "middle"].indexOf(textVerticalAlign) === -1 ? "top" : textVerticalAlign;

        //处理字体颜色
        let textFill = style.textFill ? style.textFill : "#000";
        if (textFill && (textFill.image || textFill.colorStops)) {
            textFill = "#000";
        }
        style.textFill = textFill;
        let textStroke = style.textStroke ? style.textStroke : null;
        if (textStroke && (textStroke.image || textStroke.colorStops)) {
            textStroke = "#000";
        }
        style.textStroke = textStroke;

        //默认文字位置
        let textX = cen.x;
        let textY = cen.y;
        let { textWidth, textLines } = getTextWidth(text, style.font); //获取单行文字宽度 和 行数

        function getLimitText(limitWidth, text) {
            if (limitWidth && text) {
                function cutText(text, limitWidth) {
                    let { textWidth } = getTextWidth(text, style.font); //获取单行文字宽度 和 行数

                    while (textWidth > limitWidth) {
                        text = text.substring(0, text.length - 1);
                        let res = getTextWidth(text, style.font);
                        textWidth = res && res.textWidth;
                    }
                    return {
                        newText: text,
                        newTextWidth: textWidth,
                    };
                }

                let { newText, newTextWidth } = cutText(text, limitWidth);
                text = newText === text ? text : newText.substring(0, newText.length - 2) + "...";
                // console.log(text);
            }

            return text;
        }
        text = getLimitText(limitWidth, text);

        this.textWidth = textWidth;

        //根据对齐方式调整文字位置
        switch (style.textAlign) {
            case "center":
                textX = cen.x;
                textY = cen.y;
                break;
            case "left":
                textX = min.x;
                textY = min.y;
                // console.log(textX, textY);
                break;
            case "right":
                textX = max.x;
                textY = min.y;
            default:
                break;
        }

        //处理内边距,转换为绝对位置
        if (style.textPadding) {
            style.textPadding = normalizeCssArray(style.textPadding);
            // //再获取盒子的绝对位置
            const { curX, curY } = getTextForPadding(textX, textY, style.textAlign, style.textPadding);
            textX = curX;
            textY = curY;
        }
        // console.log(textX, textY);

        //开始绘制字体
        ctx.save();
        ctx.font = style.font;
        ctx.textAlign = style.textAlign;
        ctx.textBaseline = "middle";
        ctx.globalAlpha = style.opacity || 1;

        //如果是多行
        if (textLines.length > 1) {
            // console.log(textX, textY, textLineHeight);

            textLines.forEach((item, index, ary) => {
                switch (style.textAlign) {
                    case "center":
                        textY = index > 0 ? textY + textLineHeight : textY - ((ary.length - 1) * textLineHeight) / 2;
                        break;
                    case "left":
                        textY = index > 0 ? textY + textLineHeight : textY;
                        break;
                    case "right":
                        // textY = index > 0 ? textY + textLineHeight : textY - (ary.length - 1) * textLineHeight;
                        textY = index > 0 ? textY + textLineHeight : textY;
                    default:
                        break;
                }

                let limText = getLimitText(limitWidth, item);
                if (style.textFill) {
                    ctx.fillStyle = style.textFill;
                    ctx.fillText(limText, textX, textY);
                }
                if (style.textStroke) {
                    ctx.strokeStyle = style.textStroke;
                    ctx.strokeText(limText, textX, textY);
                }
            });
        } else {
            // console.log(textX, textY);
            if (style.textFill) {
                ctx.fillStyle = style.textFill;
                ctx.fillText(text, textX, textY);
            }
            if (style.textStroke) {
                ctx.strokeStyle = style.textStroke;
                ctx.strokeText(text, textX, textY);
            }
        }

        ctx.restore();
    }
}

//tools 获取字体设置padding(内边距)后的位置[上，右， 下， 左]
function getTextForPadding(x, y, textAlign, textPadding) {
    let curX = 0;
    let curY = 0;
    let offsetY = 0; //y轴偏移
    let offsetX = 0; //x轴偏移
    if (Math.abs(textPadding[0]) > Math.abs(textPadding[2])) {
        offsetY = textPadding[0];
    } else {
        offsetY = textPadding[2];
    }
    if (Math.abs(textPadding[1]) > Math.abs(textPadding[3])) {
        offsetX = textPadding[1];
    } else {
        offsetX = textPadding[3];
    }

    // console.log(offsetY);
    switch (textAlign) {
        case "right":
            curX = x - textPadding[1];
            curY = y + offsetY;
            break;
        case "center":
            curX = x + offsetX;
            curY = y + offsetY;
            break;
        default:
            curX = x + textPadding[3];
            curY = y + offsetY;
            break;
    }

    return {
        curX,
        curY,
    };
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

// 获取字体占用宽度
function getTextWidth(text, font) {
    // console.log(text);
    let textWidth = 0;
    let textLines = `${text}`.split("\n");
    textLines.forEach((item) => {
        let Tmp_ctx = getContext();
        Tmp_ctx.font = font;
        let curWidth = Tmp_ctx.measureText(item).width;
        textWidth = Math.max(textWidth, curWidth);
    });
    return {
        textWidth,
        textLines,
    };
}

export function parsePercent(value, maxValue) {
    if (typeof value === "string") {
        if (value.lastIndexOf("%") >= 0) {
            return (parseFloat(value) / 100) * maxValue;
        }
        return parseFloat(value);
    }
    return value;
}
