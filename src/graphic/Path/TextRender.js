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
    }
}
