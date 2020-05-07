/*
 * 拦截浏览器默认事件，用自定义事件来代替
 */

import Eventful from "../../tools/EventEmitter"; //引入 发布订阅
import env from "../../tools/dev_support"; //检测设备支持情况

let dev_support = env.domSupported; //获取设备支持情况
export default class EventProxy {
    constructor(dom) {
        this.dom = dom;

        //canvas 内部事件,只监听画布里边
        this._canvasEvent = new DOMHandlerScope(dom);

        //页面全局事件,直接监听document
        if (dev_support) {
            this._globalEvent = new DOMHandlerScope(document);
        }
    }
}

function DOMHandlerScope(domTarget, domHandlers) {
    this.domTarget = domTarget;
    this.domHandlers = domHandlers;
    this.mounted = {};
    this.touchTimer = null;
    this.touching = false;
}
