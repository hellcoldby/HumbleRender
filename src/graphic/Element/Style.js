import { mixin } from "../../tools/data_util";
let STYLE_COMMON_PROPS = [
    ["shadowBlur", 0],
    ["shadowOffsetX", 0],
    ["shadowOffsetY", 0],
    ["shadowColor", "#000"],
    ["lineCap", "butt"],
    ["lineJoin", "miter"],
    ["miterLimit", 10]
];

/**
 * @method Style
 * @param {} opts --- 用户自定义的样式
 */
export default function Style(opts) {
    mixin(this, opts, false);
    // console.log(res);
}

Style.prototype = {
    constructor: Style,
    fill: "#000",
    stroke: null,
    opacity: 1,
    fillOpacity: null,
    strokeOPacity: null,

    strokeNoScale: false,

    lineDash: null,
    lineDashOffset: 0,

    shadowblur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,

    lineWidth: 1,
    text: null,

    font: null,
    textFont: null,
    fontStyle: null,
    fontWeight: null,
    fontFamily: null,
    textTag: null,
    textFill: "#000",
    textWidth: null,
    textHeight: null,
    textStrokeWidth: 0,
    textLineHeight: null,

    textPosition: "inside",
    textRect: null,
    textOffset: null,

    textAlign: null,
    textVerticalAlign: null,
    textDistance: 5,

    textShadowColor: "transparent",
    textShadowBlur: 0,
    textShadowOffsetX: 0,
    textShadowOffsetY: 0,

    textBoxShadowColor: "transparent",
    textBoxShadowBlur: 0,
    textBoxShadowOffsetX: 0,
    textBoxShadowOffsetY: 0,

    transformText: 0,
    textRotation: 0,
    textOrigin: null,

    textBorderColor: null,
    textBackgroundColor: null,
    textBorderWidth: 0,
    textBorderRadius: 0,
    textPadding: null,

    rich: null,
    truncate: null,
    blend: null,

    bind: function(ctx, ele, prevEl) {
        // console.log(this);
        let prevStyle = prevEl && prevEl.style;
        //检查当前ctx的样式 是否需要更新
        let styleNeedChange = !prevStyle || ctx._stylehasChanged === false;
        ctx._stylehasChanged = true;

        if (styleNeedChange || this.fill !== prevStyle.fill) {
            ctx.fillStyle = this.fill;
        }
        if (styleNeedChange || this.stroke !== prevStyle.stroke) {
            ctx.strokeStyle = this.stroke;
        }
        if (styleNeedChange || this.opacity !== prevStyle.opacity) {
            ctx.globalAlpha = this.opacity == null ? 1 : this.opacity;
        }

        if (styleNeedChange || this.blend !== prevStyle.blend) {
            ctx.globalCompositeOperation = this.blend || "source-over";
        }
    },

    hasFill: function() {
        let fill = this.fill;
        return fill != null && fill !== "none";
    },

    hasStroke: function() {
        let stroke = this.stroke;
        return stroke != null && stroke !== "none" && this.lineWidth > 0;
    },

    getBoundingRect: function() {},

    set: function() {},

    clone: function() {}
};

let styleProto = Style.prototype;
for (let i = 0; i < STYLE_COMMON_PROPS.length; i++) {
    let prop = STYLE_COMMON_PROPS[i];
    if (!prop[0] in styleProto) {
        styleProto[prop[0]] = prop[1];
    }
}

/**
 * tools -- 复制属性
 * @param source --- 传递来的属性
 * @param overwrite --- 是否覆盖   true -- 全部覆盖   false --- 仅复制target没有的属性
 */
// const extendStyle = function(target, source, overwrite) {
//     if (!source) return;
//     if (overwrite) {
//         //全覆盖
//         target = Object.assign(target, source);
//     } else {
//         for (let prop in source) {
//             //仅复制target已经有的属性
//             if (!target.hasOwnProperty(prop) && source[prop]) {
//                 target[prop] = source[prop];
//             }
//         }
//     }
//     return target;
// };
