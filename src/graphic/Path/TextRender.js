export default class TextRender {
    constructor() {}
    drawRectText(ctx, style) {
        const { fontSize, fontFamily, fontStyle, fontWeight } = style;
        let font = "";
        if (fontSize || fontFamily) {
            font = `${fontStyle} ${fontWeight} ${fontSize || 12}px ${fontFamily || "sans-serif"}`;
        }
        style.font = style.font || font;
        console.log(style.font);
    }
}
