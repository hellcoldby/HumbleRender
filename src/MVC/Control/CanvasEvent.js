/**
 * canvas API 没有提供画布内部的事件系统， canvasEvent 用来封装画布内部元素的事件处理逻辑。
 * 此实现的整体概念与 w3c定义的DOM 事件系统一致。
 * canvasEvent 的核心逻辑是拦截所有的 鼠标、 键盘、触摸事件派发给 canvas 内部的元素。
 */

import Eventful from "../../tools/EventEmitter";
import * as dataUtil from "../../tools/data_util";

/**--------------------- tools --- start------------------------------------- */

let handlerNames = ["click", "dblclick", "mousewheel", "mouseout", "mouseup", "mousedown", "mousemove", "contextmenu", "pagemousemove", "pagemouseup", "pagekeydown", "pagekeyup"];
//拦截器
function EmptyInterceptor() {}
EmptyInterceptor.prototype.dispose = function () {};

//监听整个页面上的事件
function afterListenerChanged(handlerInstance) {
    let allSilent =
        handlerInstance.isSilent("pagemousemove") && handlerInstance.isSilent("pagemouseup") && handlerInstance.isSilent("pagekeydown") && handlerInstance.isSilent("pagekeyup");
    let interceptor = handlerInstance.interceptor;
    interceptor && interceptor.togglePageEvent && interceptor.togglePageEvent(!allSilent);
}

/**--------------------- tools --- end------------------------------------- */

/**
 *
 * @param {*} storage   待绘制的图形数据
 * @param {*} painter   图层逻辑
 * @param {*} interceptor  拦截器
 * @param {*} painterRoot
 */
let afterEvent = dataUtil.bind(afterListenerChanged, null, this);
class CanvasEvent extends Eventful {
    constructor(storage, painter, interceptor, painterRoot) {
        super(afterEvent);

        this.storage = storage;
        this.painter = painter;
        this.painterRoot = painterRoot;

        interceptor = interceptor || new EmptyInterceptor(); //拦截器

        this.interceptor = null;
        this._hovered = {};

        this._lastTouchMoment;

        this._lastX;
        this._lastY;

        this._gestureMgr;

        this.setHandlerProxy(interceptor);

        // this._ddMgr = new DragDropMgr(this).startListen();

        // this._transformMgr = new TransformEventMgr(this).startListen();

        // this._linkMgr = new LinkMgr(this).startListen();
    }

    disableTransform() {}

    enableTransform() {}

    setHandlerProxy(interceptor) {
        //先清空已经挂载过的事件拦截
        if (this.interceptor) {
            this.interceptor.dispose();
        }
        //
        if (interceptor) {
            console.log(interceptor);
            dataUtil.each(
                handlerNames,
                function (name) {
                    // 监听 Proxy 上面派发的原生DOM事件，转发给本类的处理方法。
                    interceptor.on && interceptor.on(name, this[name], this);
                },
                this
            );
            interceptor.handler = this;
        }
        this.interceptor = interceptor;
    }

    mousemove(event) {}

    mouseout(event) {}

    resize() {}

    dispatch(eventName, eventArgs) {
        // let handler = this[eventName];
        // handler && handler.call(this, eventArgs);
    }

    dispose() {}
}

export default CanvasEvent;
