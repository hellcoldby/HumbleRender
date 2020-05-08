/*
 * 拦截浏览器默认事件，用自定义事件来代替
 */
import * as eventUtil from "../../tools/event_util";
import Eventful from "../../tools/EventEmitter"; //引入 发布订阅
import env from "../../tools/dev_support"; //检测设备支持情况
import * as dataUtil from "../../tools/data_util";
let dev_support = env.domSupported; //获取设备支持情况

/**-----------------------------tools--start------------------------------------------------ */
/* 防止鼠标事件在 Touch 事件之后触发
 * @see <https://github.com/deltakosh/handjs/blob/master/src/hand.base.js>
 * 1. 移动端的浏览器会在触摸之后 300ms 派发鼠标事件。
 * 2. Android 上的 Chrome 浏览器会在长按约 650ms 之后派发 mousedown 事件。
 * 所以最终结果就是：禁止鼠标事件 700ms。
 *
 * @param {DOMHandlerScope} scope
 */
function setTouchTimer(scope) {
    scope.touching = true;
    if (scope.touchTimer != null) {
        clearTimeout(scope.touchTimer);
        scope.touchTimer = null;
    }
    scope.touchTimer = setTimeout(function () {
        scope.touching = false;
        scope.touchTimer = null;
    }, 700);
}

function markTriggeredFromLocal(event) {
    event && (event.qrIsFromLocal = true);
}

//转换自定义事件名
let localNativeListenerNames = (function () {
    let mouseHandlerNames = ["click", "dblclick", "mousewheel", "mouseout", "mouseup", "mousedown", "mousemove", "contextmenu"];
    let touchHandlerNames = ["touchstart", "touchend", "touchmove"];
    let pointerEventNameMap = {
        pointerdown: 1,
        pointerup: 1,
        pointermove: 1,
        pointerout: 1,
    };

    let pointerHandlerNames = dataUtil.map(mouseHandlerNames, function (name) {
        let nm = name.replace("mouse", "pointer");
        return pointerEventNameMap.hasOwnProperty(nm) ? nm : name;
    });

    return {
        mouse: mouseHandlerNames,
        touch: touchHandlerNames,
        pointer: pointerHandlerNames,
    };
})();

/** -------------------------- tools -- end----------------------------------------- */

class EventProxy {
    constructor(dom) {
        if (!dom) return;
        this.dom = dom;

        //canvas 内部事件,只监听画布里边
        this._canvasEvent = new DOMHandlerScope(dom, localDOMHandlers);

        //页面全局事件,直接监听document
        // if (dev_support) {
        //     this._globalEvent = new DOMHandlerScope(document);
        // }

        //在构造 DomEventInterceptor 实例的时候，挂载 DOM 事件监听器。
        mountDOMEventListeners(this, this._canvasEvent, localNativeListenerNames, true);
    }

    dispose() {}
}

dataUtil.mixin(EventProxy.prototype, Eventful.prototype);
export default EventProxy;

/**-------------------- tools ------------------------------ */

//生成事件池
function DOMHandlerScope(domTarget, domHandlers) {
    this.domTarget = domTarget;
    this.domHandlers = domHandlers;
    this.mounted = {};
    this.touchTimer = null;
    this.touching = false;
}

//事件选择器
let localDOMHandlers = {
    pointermove: function (event) {
        if (isPointerFromTouch(event)) {
            localDOMHandlers.mousemove.call(this, event);
        }
    },

    pointerup: function (event) {
        localDOMHandlers.mouseup.call(this, event);
    },

    mousemove: function (event) {
        event = eventUtil.no;
    },

    mouseup: function (event) {},

    keyup: function (event) {},
    keydown: function (event) {},
};

//兼容事件名称
function eventNameFix(name) {
    return name === "mousewheel" && env.browser.firefox ? "DOMMouseScroll" : name;
}

/**生成事件池的时候， 挂载DOM事件监听器。
 * @private
 * @method mountDOMEventListeners
 * @param {DomEventInterceptor} domEventInterceptor
 * @param {DOMHandlerScope} domHandlerScope
 * @param {Object} nativeListenerNames {mouse: Array<String>, touch: Array<String>, poiner: Array<String>}
 * @param {Boolean} localOrGlobal `true`: target local, `false`: target global.
 */
function mountDOMEventListeners(instance, scope, nativeListenerNames, localOrGlobal) {
    let domHandlers = scope.domHandlers;
    let domTarget = scope.domTarget;

    if (env.pointerEventsSuported) {
        // Only IE11+/Edge
        dataUtil.each(nativeListenerNames.pointer, function (evName) {
            mountSingle(nativeEventName, function (event) {
                if (localOrGlobal || !isTriggeredFromLocal(event)) {
                    localOrGlobal && markTriggeredFromLocal(event);
                    domHandlers[nativeEventName].call(instance, event);
                }
            });
        });
    } else {
        if (env.touchEventsSupported) {
            dataUtil.each(nativeListenerNames.touch, function (nativeEventName) {
                mountSingle(nativeEventName, function (event) {
                    if (localOrGlobal || !isTriggeredFromLocal(event)) {
                        localOrGlobal && markTriggeredFromLocal(event);
                        domHandlers[nativeEventName].call(instance, event);
                        setTouchTimer(scope);
                    }
                });
            });
        }

        console.log(nativeListenerNames);
        console.log(domHandlers);
        dataUtil.each(nativeListenerNames.mouse, function (nativeEventName) {
            mountSingle(nativeEventName, function (event) {
                event = eventUtil.getNativeEvent(event);
                if (!scope.touching && (localOrGlobal || !isTriggeredFromLocal(event))) {
                    localOrGlobal && markTriggeredFromLocal(event);
                    domHandlers[nativeEventName].call(instance, event);
                }
            });
        });

        //挂载键盘事件
        dataUtil.each(nativeListenerNames.keyboard, function (nativeEventName) {
            mountSingle(nativeEventName, function (event) {
                if (localOrGlobal || !isTriggeredFromLocal(event)) {
                    localOrGlobal && markTriggeredFromLocal(event);
                    domHandlers[nativeEventName].call(instance, event);
                }
            });
        });
    }

    //用来监听原生 DOM 事件
    function mountSingle(nativeEventName, listener) {
        scope.mounted[nativeEventName] = listener;
        eventUtil.addEventListener(domTarget, eventNameFix(nativeEventName), listener);
    }
}

function unmountDOMEventListeners(scope) {
    let mounted = scope.mounted;
    for (let nativeEventName in mounted) {
        if (mounted.hasOwnProperty(nativeEventName)) {
            eventUtil.removeEventListener(scope.domTarget, eventNameFix(nativeEventName), mounted[nativeEventName]);
        }
    }
    scope.mounted = {};
}

//判断触摸设备
function isPointerFromTouch(event) {
    let pointerType = event.pointerType;
    return pointerType === "pen" || pointerType === "touch";
}
