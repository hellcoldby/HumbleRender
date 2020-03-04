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

    class CanvasLayer {
        constructor(root, width, height, dpr, id){
            Object.assign(this, {root, width, height, dpr, id});
            

        }
    }

    const CANVAS_QLEVEL = 314159; //图层id;
    class CanvasPainter{
        constructor(root, storage, opts={}){
            this.opts = Object.assign({}, opts);
            this.root = root;
            this.storage = storage;

            this.type = 'canvas';
            this.dpr = this.opts.devicePixelRatio || devicePixelRatio; //分辨率

            let layer_id_list = (this._layer_id_list = []);
            let layers = this._layers = {}; // 图层 对象列表
            this._layerConfig = {}; //?

            this._needsManuallyCompositing = false; //?
            this._hoverlayer = null;  //?

            this._singleCanvas = !this.root.nodeName || this.root.nodeName.toUpperCase() === 'CANVAS'; //根节点canvas


            if(this._singleCanvas){ // 如果根节点是一个canvas
                let width = this.root.width;
                let height = this.root.height;

                if(this.opts.width){
                    this._width = width = this.opts.width;
                }
                if(this.opts.height){
                    this._height = height = this.opts.height;
                }
                
                this.root.width = this.dpr * width; //修正retina 屏幕的分辨率
                this.root.height = this.dpr * height;

                //为单一画布创建图层
                let mainLayer = new CanvasLayer(this.root, this._width, this._height, this.dpr, CANVAS_QLEVEL);
                mainLayer.__builtin__ = true;
                
                layers[CANVAS_QLEVEL] = mainLayer;
                layer_id_list.push(CANVAS_QLEVEL);
                this._root = root;
                
            }else{ //根节点不是canvas, 动态创建一个div包裹
                this._width = this._getStyle(this.root, 'width');
                this._height = this._getStyle(this.root, 'height');

                let canvasCon = this._createDomRoot(this._width, this._height);
                this._root = canvasCon;
                this.root.appendChild(canvasCon);
            }



        }


        //tools--动态创建 根节点
        _createDomRoot(width, height){
            let oDiv = document.createElement('div');
            oDiv.style.cssText = [
                `position: relative`,
                `width: ${width}px`,
                `height: ${height}px`,
                `padding: 0`,
                `margin: 0`,
                `border-width: 0`,
                `background: #067`
            ].join(';') +';';
            return oDiv;
        }


        //tools--获取真实样式
        _getStyle(obj, attr){
           let opts = this.opts;
           if(attr in opts){
               return parseFloat(opts[attr]);
           }else{
               let res =  obj.currentStyle? obj.currentStyle[attr] : getComputedStyle(obj, false)[attr];
               return parseInt(res, 10);
           }

        }
    }

    /*
     *
     * event_simulation(事件模拟) 为不支持事件的类提供事件支持
     */

    class Eventful {
        constructor(eventProcessor) {
            this._handle_map = {};  //订阅的事件列表
            this._$eventProcessor = eventProcessor;
        }

        /**
         * 绑定一个事件控制器
         *
         * @param {String} event 事件名称
         * @param {String | Object} query 事件过滤器条件
         * @param {Function} handler 事件控制器
         * @param {Object} context
         */
        on(event, query, fn, context) {
            return on(this, event, query, fn, context, false);
        }

        once(event, query, fn, context) {
            return on(this, event, query, fn, context, true);
        }

        /**
         * @method
         * 触发绑定的事件
         *
         * @param {String} event --- 事件的名称
         */
        trigger(event) {
            let _hmp = this._handle_map[event];
            if(_h);
            return this;
        }
    }



    //tools -- 绑定事件
    function on(eventful, event, query, fn, context, isOnce) {
        let _h = eventful._handle_map;

        //参数自适应
        if (typeof query === "function") {
            context = fn;
            fn = query;
            query = null;
        }

        if (!fn || !event) {
            return eventful;
        }

        query = normalizeQuery(eventful, query);

        if (!_h[event]) {
            _h[event] = [];
        }

        for (let i = 0; i < _h[event].length; i++) {
            if (_h[event][i].h === fn) {
                return eventful;
            }
        }

        let wrap = {
            h: handler,
            one: isOnce,
            query: query,
            ctx: context || eventful,
            callAtLast: ""
        };

        let lastIndex = _h[event].length - 1;
        let lastWrap = _h[event][lastIndex];
        if (lastWrap && lastWrap.callAtLast) {
            _h[event].splice(lastIndex, 0, wrap);
        } else {
            _h[event].push(wrap);
        }

        callListenerChanged(eventful, event);
        return eventful;
    }



    //tools -- 解析参数
    function normalizeQuery(host, query) {
        let eventProcessor = host._$eventProcessor;
        if (query != null && eventProcessor && eventProcessor.normalizeQuery) {
            query = eventProcessor.normalizeQuery(query);
        }
        return query;
    }

    //tools --
    function callListenerChanged(eventful, eventType) {
        let eventProcessor = eventful._$eventProcessor;
        if (eventProcessor && eventProcessor.afterListenerChanged) {
            eventProcessor.afterListenerChanged(eventType);
        }
    }

    /**
     *
     * 内容仓库 (M)，用来存储和管理画布上的所有对象，同时提供绘制和更新队列的功能。
     * 需要绘制的对象首先存储在 Storage 中，然后 Painter 类会从 Storage 中依次取出进行绘图。
     * 利用 Storage 作为内存中转站，对于不需要刷新的对象可以不进行绘制，从而可以提升整体性能。
     *
     */
    class Storage extends Eventful {
        constructor() {
            super();
            this._root = new Map();
            this._displayList = [];
            this._displayList_len = 0;
        }

        addToRoot(ele) {
            if(el._storage === this){
                return;
            }
            this.trigger('beforeAddToRoot');
            ele.trigger('beforeAddToRoot');
            this.addToStorage(ele);
        }

        addToStorage(ele) {
            this._roots.set(el.id,ele);
            this.trigger("addToStorage");
            ele.trigger("addToStorage");
            return this;
        }
    }

    /*
     * 拦截浏览器默认事件，用自定义事件来代替
     */
    class EventProxy {
        constructor(root) {}

        trigger(){
            
        }
    }

    /*
     * common_util常用的 工具函数集合
     * 1. requestAnimationFrame
     */

    let RAF = (
        typeof window !== 'undefined'
        && ( 
            (window.requestAnimationFrame && window.requestAnimationFrame.bind(window))
            || (window.msRequestAnimationFrame && window.msRequestAnimationFrame.bind(window))
            || window.mozRequestAnimationFrame
            || window.webkitRequestAnimationFrame
        )
    ) || function(fn) { setTimeout(fn, 16); };

    class GlobalAnimationMgr extends Eventful {
        constructor(opts) {
            super(); //调用父类的
            this._running = false; //动画启动开关
            this._timestamp; //时间戳(记录动画启动时间)
            this._pause ={
                duration : 0,  //暂停持续时间
                start: 0, //暂停时间戳
                flag: false //暂停开关标记
            };
            this._animatableMap = new Map(); //动画对象列表
        }

        //启动动画
        start() {
            this._pause.duration = 0;
            this._timestamp = new Date().getTime();
            this._startLoop();
        }

        //暂停动画
        pause() {
            if (!this._pause.flag) {
                this._pause.start = new Date().getTime();
                this._pause.flag = true; //暂停
            }
        }

        // RAF (requestAnimationFrame) 递归执行动画
        _startLoop() {
            let self = this;
            this._running = true;
            function nextFrame() {
                if (self._running) {
                    RAF(nextFrame);
                    !self._pause.flag && self._update();
                }
            }
            RAF(nextFrame);
        }

        //
        _update() {
            let time = new Date().getTime() - this._pause.duration;
            let delta = time - this._timestamp;
            this._timestamp = time;
            this.trigger('frame');
        }

        //向动画列表中增加 动画方案（特征）
        addAnimatable(animatable) {
            this._animatableMap.set(animatable.id, animatable);
        }

        //从动画列表中移除 动画方案（特征）
        removeAnimatable(animatable) {
            this._animatableMap.delete(animatable.id);
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
        canvas: CanvasPainter
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
        constructor(root, opts={}) {
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
            if (typeof this.root.moveTo !== "function") {
                if (!env$1.node && !env$1.worker && !env$1.wxa) {
                    handerProxy = new EventProxy(this.painter.root);
                }
            }

            //生成事件实例
            // this.eventHandler = new HRenderEventHandler(this.storage, this.painter, handerProxy);

            //生成动画实例
            this.globalAnimationMgr = new GlobalAnimationMgr();
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
