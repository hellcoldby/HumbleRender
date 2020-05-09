/*
 * event_util 常用事件函数 工具集合
 */
import env from "../tools/dev_support"; //检测设备支持情况

let isDomLevel2 = typeof window !== "undefined" && !!window.addEventListener; //验证dom二级事件
export function addEventListener(el, name, handler) {
    if (isDomLevel2) {
        el.addEventListener(name, handler);
    } else {
        el.attachEvent("on" + name, handler);
    }
}

export function removeEventListener(el, name, handler) {
    if (isDomLevel2) {
        el.removeEventListener(name, handler);
    } else {
        el.detachEvent("on" + name, handler);
    }
}

// event 兼容
export function getNativeEvent(e) {
    return e || window.event;
}

//tools
function preparePointerTransformer(markers, saved) {
    var transformer = saved.transformer;
    var oldSrcCoords = saved.srcCoords;
    var useOld = true;
    var srcCoords = [];
    var destCoords = [];

    for (var i = 0; i < 4; i++) {
        var rect = markers[i].getBoundingClientRect();
        var ii = 2 * i;
        var x = rect.left;
        var y = rect.top;
        srcCoords.push(x, y);
        useOld &= oldSrcCoords && x === oldSrcCoords[ii] && y === oldSrcCoords[ii + 1];
        destCoords.push(markers[i].offsetLeft, markers[i].offsetTop);
    }

    // Cache to avoid time consuming of `buildTransformer`.
    return useOld ? transformer : ((saved.srcCoords = srcCoords), (saved.transformer = buildTransformer(srcCoords, destCoords)));
}

//tools --- 被 clientToLocal 引用
function calculateQrXY(el, e, out) {
    // BlackBerry 5, iOS 3 (original iPhone) don't have getBoundingRect.
    if (el.getBoundingClientRect && env.domSupported) {
        var ex = e.clientX;
        var ey = e.clientY;

        if (el.nodeName.toUpperCase() === "CANVAS") {
            // Original approach, which do not support CSS transform.
            // marker can not be locationed in a canvas container
            // (getBoundingClientRect is always 0). We do not support
            // that input a pre-created canvas to qr while using css
            // transform in iOS.
            var box = el.getBoundingClientRect();
            out.qrX = ex - box.left;
            out.qrY = ey - box.top;
            return;
        } else {
            var saved = el[EVENT_SAVED_PROP] || (el[EVENT_SAVED_PROP] = {});
            var transformer = preparePointerTransformer(prepareCoordMarkers(el, saved), saved);
            if (transformer) {
                transformer(_calcOut, ex, ey);
                out.qrX = _calcOut[0];
                out.qrY = _calcOut[1];
                return;
            }
        }
    }
    out.qrX = out.qrY = 0;
}

//tools --- 被 normalizeEvent 引用
export function clientToLocal(el, e, out, calculate) {
    out = out || {};

    if (calculate || !env.canvasSupported) {
        calculateQrXY(el, e, out);
    } else if (env.browser.firefox && e.layerX != null && e.layerX !== e.offsetX) {
        out.qrX = e.layerX;
        out.qrY = e.layerY;
    }
    // For IE6+, chrome, safari, opera. (When will ff support offsetX?)
    else if (e.offsetX != null) {
        out.qrX = e.offsetX;
        out.qrY = e.offsetY;
    }
    // For some other device, e.g., IOS safari.
    else {
        calculateQrXY(el, e, out);
    }
    return out;
}

//事件优化
export function normalizeEvent(el, e, calculate) {
    e = e || window.event;
    if (e.qrX != null) {
        return e;
    }
    var eventType = e.type;
    var isTouch = eventType && eventType.indexOf("touch") >= 0;

    if (!isTouch) {
        clientToLocal(el, e, e, calculate);
        e.qrDelta = e.wheelDelta ? e.wheelDelta / 120 : -(e.detail || 0) / 3;
    } else {
        var touch = eventType !== "touchend" ? e.targetTouches[0] : e.changedTouches[0];
        touch && clientToLocal(el, touch, e, calculate);
    }

    var button = e.button;
    if (e.which == null && button !== undefined && MOUSE_EVENT_REG.test(e.type)) {
        e.which = button & 1 ? 1 : button & 2 ? 3 : button & 4 ? 2 : 0;
    }
    return e;
}
