(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.HumbleRneder = {}));
}(this, (function (exports) { 'use strict';

    /*
     *  检测设备支持情况
     */
    let env = {};


    //tools --- 浏览器环境检测
    function detect(ua) {
        let os = {};
        let browser = {};

        let firefox = ua.match(/Firefox\/([\d.]+)/);
        let ie = ua.match(/MSIE\s[\d.]+/) || ua.match(/Trident\/.+?rv:(([\d.]+))/);  // ie7 || ie11
        let edge = ua.match(/Edge\/([\d.]+)/); // ie12 +
        let weChat = (/micromessenger/i).test(ua);

        if(firefox){
            browser.firefox = true;
            browser.version = firefox[1];
        }

        if(ie){
            browser.ie = true;
            browser.version = ie[1];
        }

        if(edge) {
            browser.edge = true;
            browser.version = edge[1];
        }

        if (weChat) {
            browser.weChat = true;
        }

        return {
            browser : browser,
            os: os,
            node: false,
            canvasSupported: !!document.createElement('canvas').getContext,
            svgSupported: typeof SVGRect !== 'undefined',
            touchEventsSupported: 'ontouchstart' in window && !browser.ie && !browser.edge,
            pointerEventsSupported: 'onpointerdown' in window  &&  (browser.edge || (browser.ie && browser.version >= 11)),
            domSupported: typeof document !== 'undefined'
        }

    }

    if (typeof wx === "object" && typeof wx.getSystemInfoSync === "function") {
        // 判断微信环境
        env = {
            browser: {},
            os: {},
            node: false,
            wxa: true, // Weixin Application
            canvasSupported: true,
            svgSupported: false,
            touchEventsSupported: true,
            domSupported: false
        };
    } else if (typeof document === "undefined" && typeof self !== "undefined") {
        // web worker 环境
        env = {
            browser: {},
            os: {},
            node: false,
            worker: true,
            canvasSupported: true,
            domSupported: false
        };
    } else if(typeof navigator === 'undefined') {
        // node 环境
        env = {
            browser: {},
            os: {},
            node: true,
            worker: false,
            // Assume canvas is supported
            canvasSupported: true,
            svgSupported: true,
        };
    }else {
        //浏览器环境检测
        env = detect(navigator.userAgent); 
    }


    var env$1 = env;

    /*
     * 生成唯一 id
     */

     let idStart = 0x0907;

     function guid() {
         return idStart ++;
     }

    var dpr = 1;

    // If in browser environment
    if (typeof window !== 'undefined') {
        dpr = Math.max(window.devicePixelRatio || 1, 1);
    }
    // retina 屏幕优化
    var devicePixelRatio = dpr;

    class CanvasPainter{
        constructor(root, storage, opts={}){
            this.opts = Object.assign({}, opts);
            this.root = root;
            this.storage = storage;

            this.type = 'canvas';
            this.dpr = this.opts.devicePixelRatio || devicePixelRatio; //分辨率

            let qlevelList = this._qlevelList = []; //?
            let layers = this._layers = {}; //?
            this._layerConfig = {}; //?

            this._needsManuallyCompositing = false; //?
            this._hoverlayer = null;  //?

            this._singleCanvas = !this.root.nodeName || this.root.nodeName.toUpperCase() === 'CANVAS'; //根节点canvas

            if(this._singleCanvas){
                let width = this.root.width;
                let height = this.root.height;

                [width, height] = [this.root.width, this.root.height];
            }
        }
    }

    /**
     * 
     * 内容仓库 (M)，用来存储和管理画布上的所有对象，同时提供绘制和更新队列的功能。
     * 需要绘制的对象首先存储在 Storage 中，然后 Painter 类会从 Storage 中依次取出进行绘图。
     * 利用 Storage 作为内存中转站，对于不需要刷新的对象可以不进行绘制，从而可以提升整体性能。
     * 
     */


    class Storage {
        constructor(){

        }
    }

    /*
     *  注释:toos --- 表示是被其他函数引用 的工具函数
     */


    //检测浏览器的支持情况
    if (!env$1.canvasSupported) {
        throw new Error("Need Canvas Environment");
    }

    //tools -- 图形环境 map
    let painterMap = {
        canavs: CanvasPainter
    };

    let version = "1.0.0";

    /**
     *  main 初始化生成 绘图环境的实例
     *
     * @export
     * @param {DOM | Canvas | Context} root
     * @param {Object} opts
     */
    function init(root, opts) {
        let hr = new HumbleRender(root, opts);
        return hr;
    }

    //tools --- 初始化图形环境
    class HumbleRender {
        constructor(root, opts) {
            this.id = guid();
            this.root = root;
            let self = this;

            this.storage = new Storage();

            let renderType = opts.render;
            if (!renderType || !painterMap[renderType]) {
                renderType = "canvas";
            }

            //生成视图实例
            this.painter = new painterMap[renderType](this.root, this.storage, opts, this.id);

            //对浏览器默认事件拦截， 做二次处理
            let handerProxy = null;
            if (typeof this.host.moveTo !== "function") {
                if (!env$1.node && !env$1.worker && !env$1.wxa) {
                    handerProxy = new EventProxy(this.painter.root);
                }
            }

            //生成事件实例
            // this.eventHandler = new HRenderEventHandler(this.storage, this.painter, handerProxy);

            //生成动画实例
            this.globalAnimationMgr = new this.globalAnimationMgr();
            this.globalAnimationMgr.on('frame', function() {
                self.flush();
            });
            this.globalAnimationMgr.start();

            this._needRefresh = false;
        }

        //获取图形实例唯一id
        getId(){
            return this.id;
        }

        //添加元素
        add(ele){
            // this.storage.addToRoot(ele)
            this.refresh();
        }

        //移除元素
        remove(ele){
            // this.storage.delFromRoot(ele);
            this.refresh();
        }

        refresh(){
            this._needRefresh = true;
        }

        //刷新 canvas 画面
        flush() {
            //全部重绘
            if(this._needRefresh) ;
            //重绘特定元素
            if(this._needRefreshHover);
        }
    }

    exports.init = init;
    exports.version = version;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=humble-render.js.map
