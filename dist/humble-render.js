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

    /* 
    *  分辨率检测
    */
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
    class CanvasPainter {
        constructor(root, storage, opts = {}) {
            this.opts = Object.assign({}, opts);
            this.root = root;
            this.storage = storage;

            this.type = "canvas";
            this.dpr = this.opts.devicePixelRatio || devicePixelRatio; //分辨率

            let layer_id_list = (this._layer_id_list = []); //图层id序列
            let layers = (this._layers = {}); // 图层对象列表
            this._layerConfig = {}; //?

            this._needsManuallyCompositing = false; //?
            this._hoverlayer = null; //?

            this._singleCanvas = !this.root.nodeName || this.root.nodeName.toUpperCase() === "CANVAS"; //根节点canvas

            if (this._singleCanvas) {
                // 如果根节点是一个canvas
                let width = this.root.width;
                let height = this.root.height;

                if (this.opts.width) {
                    this._width = width = this.opts.width;
                }
                if (this.opts.height) {
                    this._height = height = this.opts.height;
                }

                this.root.width = this.dpr * width; //修正retina 屏幕的分辨率
                this.root.height = this.dpr * height;

                //为单一画布创建图层
                let mainLayer = new CanvasLayer(this.root, this._width, this._height, this.dpr, CANVAS_QLEVEL);
                mainLayer.__builtin__ = true; //标记构建完成

                layers[CANVAS_QLEVEL] = mainLayer;
                layer_id_list.push(CANVAS_QLEVEL);
                this._root = root;
            } else {
                //根节点不是canvas, 动态创建一个div包裹
                this._width = getStyle(this.root, "width");
                this._height = getStyle(this.root, "height");

                let canvasCon = createDomRoot(this._width, this._height);
                this._root = canvasCon;
                this.root.appendChild(canvasCon);
            }
        }

        /**
         * @method
         * 刷新
         * @param {Boolean} [paintAll=false] 是否强制绘制所有displayable
         */
        refresh(paintAll) {
            //从 storage 中获取 元素列表
            let list = this.storage.getDisplayList(true);
            let layer_id_list = this._layer_id_list;

            this._redrawId = Math.random(); // 重绘id
            this._paintList(list, paintAll, this._redrawId);

            //paint custom layers
            for (let i = 0; i < layer_id_list.length; i++) {
                let id = layer_id_list[i];
                let layer = this.layers[id];
                if (!layer.__builtin__ && layer.refresh) {
                    let clearColor = i === 0 ? this._backgroundColor : null;
                    layer.refresh(clearColor);
                }
            }
            return this;
        }

        _paintList(list, paintAll, redrawId) {
            //如果 redrawId 不一致，说明下一个动画帧已经到来，这里就会直接跳过去，相当于跳过了一帧
            if (this._redrawId !== redrawId) {
                return;
            }
        }
    }

    //tools--动态创建 根节点
    function createDomRoot(width, height) {
        let oDiv = document.createElement("div");
        oDiv.style.cssText = [`position: relative`, `width: ${width}px`, `height: ${height}px`, `padding: 0`, `margin: 0`, `border-width: 0`, `background: #067`].join(";") + ";";
        return oDiv;
    }

    //tools--获取真实样式
    function getStyle(obj, attr) {
        let opts = this.opts;
        if (attr in opts) {
            return parseFloat(opts[attr]);
        } else {
            let res = obj.currentStyle ? obj.currentStyle[attr] : getComputedStyle(obj, false)[attr];
            return parseInt(res, 10);
        }
    }

    /*
     *
     * event_simulation(事件模拟) 为不支持事件的类提供事件支持
     * 订阅发布模式
     */

    class Eventful {
        constructor(eventProcessor) {
            this._handle_map = {}; //订阅的事件列表
            this._eventProcessor = eventProcessor;
        }

        /**
         * 订阅事件
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
         * 触发事件（发布）
         *
         * @param {String} event --- 事件的名称
         */
        trigger(event) {
            let _map = this._handle_map[event];
            let _ev_pro = this._eventProcessor;
            if (_map) {
                let args = arguments;
                let args_len = args.length;

                if (args_len > 3) {
                    //如果参数长度超过3个，截取第一个后边的 所有参数
                    args = Array.prototype.slice.call(args, 1);
                }

                let _map_len = _map.length;
                for (let i = 0; i < _map_len; ) {
                    //遍历事件列表
                    let item = _map[i];
                    if (_ev_pro && _ev_pro.filter && item.query !== null && !_ev_pro.filter(event, item.query)) {
                        i++;
                        continue;
                    }

                    switch (args_len) {
                        case 1:
                            item.fn.call(item.ctx);
                            break;
                        case 2:
                            item.fn.call(item.ctx, args[1]);
                            break;
                        case 3:
                            item.fn.call(item.ctx, args[2]);
                            break;
                        default:
                            item.fn.apply(item.ctx, args);
                            break;
                    }

                    if(item.one) { //如果只运行一次， 就从订阅列表中移除 当前事件
                        _map.splice(i, 1); 
                        _map.length --;
                    }else {
                        i++;
                    }
                }
            }

            _ev_pro && _ev_pro.afterTigger && _ev_pro.afterTigger(event);
            return this;
        }
    }

    //tools -- 订阅事件
    function on(_this, event, query, fn, context, isOnce) {
        let _map = _this._handle_map;

        if (typeof query === "function") {
            //参数自适应
            context = fn;
            fn = query;
            query = null;
        }

        if (!fn || !event) {
            return _this;
        }

        query = normalizeQuery(_this, query);

        if (!_map[event]) {
            //创建订阅列表
            _map[event] = [];
        }

        for (let i = 0; i < _map[event].length; i++) {
            //已经订阅过的事件 不再订阅
            if (_map[event][i].h === fn) {
                return _this;
            }
        }

        let wrap = {
            fn,
            one: isOnce,
            query,
            ctx: context || _this,
            // FIXME
            // Do not publish this feature util it is proved that it makes sense.  我不知道callAtLast 是干嘛的
            callAtLast: fn.qrEventfulCallAtLast
        };

        let lastIndex = _map[event].length - 1;
        let lastWrap = _map[event][lastIndex];

        if (lastWrap && lastWrap.callAtLast) {
            // callAtLast 存在，订阅事件就替换它
            _map[event].splice(lastIndex, 0, wrap);
        } else {
            _map[event].push(wrap); // 订阅事件放入对应的列表
        }

        callListenerChanged(_this, event); // 不知道这是干嘛用的
        return _this;
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
            this._roots = new Map(); //元素id 列表
            this._displayList = []; //所有图形的绘制队列
            this._displayList_len = 0;
        }

        //增加 图像 到元素的id列表
        addToRoot(ele) {
            if (ele._storage === this) {
                return;
            }
            // this.trigger("beforeAddToRoot");
            // ele.trigger("beforeAddToRoot");
            this.addToStorage(ele);
        }

        /**
         *
         *  创建基础图形的时候，基础图形订阅了"addToStorage", 调用此方法会触发
         * @param {*} ele
         */
        addToStorage(ele) {
            this._roots.set(ele.id, ele);
            // this.trigger("addToStorage");
            // ele.trigger("addToStorage");
            return this;
        }

        /**
         * @method getDisplayList
         * 返回所有图形的绘制队列
         * @param {boolean} [needUpdate=false] 是否在返回前更新该数组
         * @param {boolean} [includeIgnore=false] 是否包含 ignore 的数组, 在 needUpdate 为 true 的时候有效
         *
         * 详见{@link Displayable.prototype.updateDisplayList}
         * @return {Array<Displayable>}
         */
        getDisplayList(needUpdate, includeIgnore = false) {
            if (needUpdate) { 
                this.updateDisplayList(includeIgnore);   //更新图形队列,并按照优先级排序
                //更新完成后返回最新排序的 图形队列
            }
            
            return this._displayList;
        }

        /**
         * @method updateDisplayList
         * 更新图形的绘制队列。
         * 每次绘制前都会调用，该方法会先深度优先遍历整个树，更新所有Group和Shape的变换并且把所有可见的Shape保存到数组中，
         * 最后根据绘制的优先级（zlevel > z > 插入顺序）排序得到绘制队列
         * @param {boolean} [includeIgnore=false] 是否包含 ignore 的数组
         */
        updateDisplayList(includeIgnore) {
            this._displayListLen = 0;
            let displayList = this._displayList;

            this._roots.forEach((ele, id, map) => {
                this._updateAndAddDisplayable(ele, null, includeIgnore); //recursive update
            });

            displayList.length = this._displayListLen;
            //队列排序
            env$1.canvasSupported && (this._displayList_sort);
        }

        _updateAndAddDisplayable(ele, clipPaths, includeIgnore) {
            if (ele.ignore && !includeIgnore) {
                return;
            }





        }

        //tools -- 对图形队列排序
        _displayList_sort(a,b){
            if (a.qlevel === b.qlevel) {
                if (a.z === b.z) {
                    return a.z2 - b.z2;
                }
                return a.z - b.z;
            }
            return a.qlevel - b.qlevel;
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
     * 动画相关的 工具函数集合
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

    /*
     *  用来记录 动画开关， 时间戳， 添加动画序列
     */

    class GlobalAnimationMgr extends Eventful {
        constructor(opts) {
            super(); //调用父类的
            this._running = false; //动画启动开关
            this._timestamp; //时间戳(记录动画启动时间)
            this._pause = {
                duration: 0, //暂停持续时间
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
            this.trigger("frame");
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
     *  注释:tools --- 表示是被其他函数引用 的工具函数
     *  引入 Storage.js 保存 绘制对象 的列表 （Model)
     *  引入 CanvasPainter.js 来生成绘图环境 创建图层 等 (view)
     *  引入 EvetProxy.js 转发DOM 事件，一部分到 容器div上，一部分到document， 或到绘制元素
     *  引入 GlobalAnimationMgr.js  无限循环监控 视图变化
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
        constructor(root, opts = {}) {
            this.id = guid();
            this.root = root;
            let self = this;

            let renderType = opts.render;
            if (!renderType || !painterMap[renderType]) {
                renderType = "canvas";
            }
            //创建数据仓库
            this.storage = new Storage();
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
            this.globalAnimationMgr.on("frame", function() {
                self.flush();
            });
            this.globalAnimationMgr.start();
            this._needRefresh = false;
        }

        //获取图形实例唯一id
        getId() {
            return this.id;
        }

        //向数据仓库storage中添加元素，并开启刷新
        add(ele) {
            this.storage.addToRoot(ele);
            this.refresh();
        }

        //移除元素
        remove(ele) {
            // this.storage.delFromRoot(ele);
            this.refresh();
        }

        //开启刷新
        refresh() {
            this._needRefresh = true;
        }

        //监控 this._needRefresh 的开关
        flush() {
            // console.log('123');
            //全部重绘
            if (this._needRefresh) {
                this.refreshImmediately();
            }
            //重绘特定元素
            if (this._needRefreshHover) {
                this.refreshHoverImmediaterly();
            }
        }

        //立即重绘
        refreshImmediately() {
            console.log("立即更新");
            this._needRefresh = this._needRefreshHover = false;
            this.painter.refresh();
            this._needRefresh = this._needRefreshHover = false;
        }

        //立即重绘特定元素
        refreshHoverImmediaterly() {
            this._needRefreshHover = false;
            this.painter.refreshHover && this.painter.refreshHover();
        }
    }

    function round_rect(ctx, shape) {
        let x = shape.x;
        let y = shape.y;
        let width = shape.width;
        let height = shape.height;
        let r = shape.r;
        let r1, r2, r3, r4;

        if(width < 0){
            x = x + width; 
            width = - width;
        }

        if(height < 0) {
            y = y + height;
            height = - height;
        }

        if(typeof r === 'number') {
            r1 = r2 = r3 = r4 = r;
        }else if(r instanceof Array) {
            switch (r.length) {
                case 1:
                    r1 = r2 = r3 = r4 = r[0];
                    break;
                case 2:
                    r1 = r3 = r[0];
                    r2 = r4 = r[2]; 
                    break;
                case 3:
                    r1 = r[0];
                    r2 = r4 = r[1];
                    r3 = r[2];
                    break;
                default:
                    r1 = r[0];
                    r2 = r[1];
                    r3 = r[2];
                    r4 = r[4];
                    break;
            }
       
        }else{
            r1 = r2 = r3 = r4 = 0;
        }

        let total;
        if(r1 + r2 > width) {
            total = r1 + r2;
            r1 *= width / total;
            r2 *= width / total;
        }

        if (r3 + r4 > width) {
            total = r3 + r4;
            r3 *= width / total;
            r4 *= width / total;
        }
        if (r2 + r3 > height) {
            total = r2 + r3;
            r2 *= height / total;
            r3 *= height / total;
        }
        if (r1 + r4 > height) {
            total = r1 + r4;
            r1 *= height / total;
            r4 *= height / total;
        }

        ctx.moveTo(x + r1, y);
        ctx.lineTo(x + width - r2, y);
        r2 !== 0 && ctx.arc(x + width - r2, y + r2, r2, -Math.PI /2, 0);
        ctx.lineTo(x + width, y + height - r3);
        r3 !== 0 && ctx.arc(x + width - r3, y + height - r3, r3, 0, Math.PI / 2);
        ctx.lineTo(x + r4, y + height);
        r4 !== 0 && ctx.arc(x + r4, y + height - r4, r4, Math.PI / 2, Math.PI);
        ctx.lineTo(x, y + r1);
        r1 !== 0 && ctx.arc(x + r1, y + r1, r1, Math.PI, Math.PI * 1.5);


    }

    class Rect {
        constructor(opts) {
            // super(merge(defaultConfig, opts, true))
            this.type = "rect";
        }

        /**
         * @method buildPath
         * 绘制元素路径
         * @param {Object} ctx
         * @param {String} shape
         */
        buildPath(ctx, shape) {
            let x;
            let y;
            let width;
            let height;
            if (this.subPixelOptimize) ; else {
                x = shape.x;
                y = shape.y;
                width = shape.width;
                height = shape.height;
            }
            // 判断是否为 圆角矩形
            if (!shape.r) {
                ctx.rect(x, y, width, height);
            } else {
                round_rect(ctx, shape);
            }
            ctx.closePath();
            return;
        }
    }

    exports.Rect = Rect;
    exports.init = init;
    exports.version = version;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=humble-render.js.map
