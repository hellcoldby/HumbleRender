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

    /**
     * 创建 canvas 实例
     * @param {String} id
     * @param {Number} width
     * @param {Number} height
     * @param {Number} dpr
     * @return {Canvas}
     */
    function createCanvas(id, width, height, dpr) {
        let canvas = document.createElement("canvas");

        if (id == null || id == undefined) {
            id = guid();
        }
        canvas.setAttribute("data-qr-dom-id", id);

        if (width == null || width == undefined || height == null || height == undefined) {
            return canvas;
        }

        // Canvas instance has no style attribute in nodejs.
        if (canvas.style) {
            canvas.style.position = "absolute";
            canvas.style.left = 0;
            canvas.style.top = 0;
            canvas.style.width = width + "px";
            canvas.style.height = height + "px";
        }

        if (dpr == null || dpr == undefined) {
            return canvas;
        }

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        return canvas;
    }

    function getContext(canvasInstance) {
        if (!canvasInstance) {
            canvasInstance = createCanvas();
        }
        return canvasInstance.getContext("2d");
    }

    /*
     * 创建canvas 图层实例
     * 该类被设计用来创建 canvas 层，在 CanvasPainter 类中会引用此类。
     * 在绘图过程中， CanvasPainter 会创建多个 canvas 实例来辅助操作，
     * 某些 canvas 实例是隐藏的，比如用来导出图片的 canvas。
     * 注意：在微信小程序中不能动态创建 canvas 标签，因为微信小程序不允许 DOM 操作。
     */
    class CanvasLayer {
        constructor(root, width, height, dpr, id) {
            Object.assign(this, { root, width, height, dpr, id });

            this.ctx = null;

            let canvasDOM = null;
            if (root && root.nodeName && root.nodeName.toUpperCase() === "CANVAS") {
                canvasDOM = root;
            } else if (typeof root === "string") {
                canvasDOM = createCanvas(id, width, height, dpr);
            } else {
                this.ctx = root; //root 为上下文环境
            }

            if (canvasDOM && canvasDOM.style) {
                canvasDOM.onselectstart = () => {
                    return false;
                }; // 避免页面选中的尴尬
                canvasDOM.style["-webkit-user-select"] = "none";
                canvasDOM.style["user-select"] = "none";
                canvasDOM.style["-webkit-touch-callout"] = "none";
                canvasDOM.style["-webkit-tap-highlight-color"] = "rgba(0,0,0,0)";
                canvasDOM.style["padding"] = 0; // eslint-disable-line dot-notation
                canvasDOM.style["margin"] = 0; // eslint-disable-line dot-notation
                canvasDOM.style["border-width"] = 0;
            }

            this.canvasDOM = canvasDOM; //注意：this.canvasDOM 可能为null，因为在微信小程序中，没有办法获取 canvas 实例，只能获取到 Context 对象。

            this.hiddenCanvas = null; // 隐藏画布实例
            this.hiddenContext = null; // 隐藏画布的上下文

            this.config = null;
            this.clearColor = 0; //每次清空画布的颜色
        }

        //初始化绘图环境
        initContext() {
            if (this.canvasDOM) {
                this.ctx = getContext(this.canvasDOM);
            }
            this.ctx.dpr = this.dpr;
        }

        //创建隐藏的canvas
        creatHiddenCanvas() {
            this.hiddenCanvas = createCanvas("back-" + this.id, this.width, this.height, this.dpr);
            this.hiddenContext = getContext(this.hiddenCanvas);
            if (this.dpr !== 1) {
                this.hiddenContext.scale(this.dpr, this.dpr);
            }
        }

        //改变尺寸
        resize(width, height) {
            //Can NOT get canvas instance in Wechat mini-program.
            if (!this.canvasInstance) {
                return;
            }
            if (this.canvasInstance.style) {
                this.canvasInstance.style.width = width + "px";
                this.canvasInstance.style.height = height + "px";
            }
            this.canvasInstance.width = width * this.dpr;
            this.canvasInstance.height = height * this.dpr;

            if (!this.hiddenCanvas) {
                return;
            }
            this.hiddenCanvas.width = width * this.dpr;
            this.hiddenCanvas.height = height * this.dpr;
            if (this.dpr !== 1) {
                this.hiddenContext.scale(this.dpr, this.dpr);
            }
        }

        clear(clearAll, clearColor) {
            clearColor = clearColor || this.clearColor;
            let dpr = this.dpr;

            this.ctx.clearRect(0, 0, this.width, this.height);
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

    const CANVAS_LEVEL_ID = 314159; //图层id;
    const HOVER_LAYER_LEVEL_ID = 1e5; //事件图层id
    class CanvasPainter {
        constructor(root, storage, opts = {}) {
            this.opts = Object.assign({}, opts);
            // console.log(this.opts);
            this.root = root;
            this.storage = storage;

            this.type = "canvas";
            this.dpr = this.opts.devicePixelRatio || devicePixelRatio; //分辨率

            let layer_id_list = (this.layer_id_list = []); //图层id序列
            let layers = (this.layers_map = {}); // 图层对象列表
            this._layerConfig = {}; //?

            this._needsManuallyCompositing = false; //? 是否需要手动合成
            this._hoverlayer = null; //?

            this._hoverElements = []; //?

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
                let mainLayer = new CanvasLayer(this.root, this._width, this._height, this.dpr, CANVAS_LEVEL_ID);
                mainLayer.__builtin__ = true; //标记构建完成

                layers[CANVAS_LEVEL_ID] = mainLayer;
                layer_id_list.push(CANVAS_LEVEL_ID);
                this._root = root;
            } else {
                //根节点不是canvas, 动态创建一个div包裹
                this._width = getStyle(this.root, "width", this.opts);
                this._height = getStyle(this.root, "height", this.opts);

                let canvas_wrap = createDomRoot(this._width, this._height);
                this._root = canvas_wrap;
                this.root.appendChild(canvas_wrap);
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
            let layer_id_list = this.layer_id_list;

            this._redrawId = Math.random(); // 重绘id
            this._paintList(list, paintAll, this._redrawId); //更新图层，动态创建图层， 绘制图层

            //paint custom layers
            for (let i = 0; i < layer_id_list.length; i++) {
                let id = layer_id_list[i];
                let layer = this.layers_map[id];
                if (!layer.__builtin__ && layer.refresh) {
                    let clearColor = i === 0 ? this._backgroundColor : null;
                    layer.refresh(clearColor);
                }
            }
            // this.refreshHover(); // 获取图层，动态创建图层，更新图层id 列表

            return this;
        }

        /*
         * @method _paintList
         * @param {} list --- 要绘制的图形列表
         * @param {} redrawId --- 随机生成的重绘id
         */
        _paintList(list, paintAll, redrawId) {
            //如果 redrawId 不一致，说明下一个动画帧已经到来，这里就会直接跳过去，相当于跳过了一帧
            if (this._redrawId !== redrawId) {
                return;
            }
            paintAll = paintAll || false;
            //更新图层状态， 动态创建图层
            this._updateLayerStatus(list); //
            //开始绘制图形
            let finished = this._doPaintList(list, paintAll);

            if (!finished) {
                let self = this;
                RAF(function() {
                    self._paintList(list, paintAll, redrawId);
                });
            }
        }

        //更新图层状态
        _updateLayerStatus(list) {
            this.eachBuildinLayer(function(layer, id) {
                layer.__dirty = layer.used = false;
            });

            if (this._singleCanvas) {
                for (let i = 0; i < list.length; i++) {}
            }

            let prevLayer = null;

            let idx = 0;
            for (let i = 0; i < list.length; i++) {
                idx = i;
                let ele = list[i];
                let hLevel = ele.hLevel; //确定可显示对象可以在画布的哪一层绘制
                let layer;

                if (ele.incremental) ; else {
                    let tmp_id =  0;
                    layer = this.getLayer(hLevel + tmp_id, this._needsManuallyCompositing);
                }

                if (!layer.__builtin__) {
                    console.log("ZLevel" + hLevel + "has been used by unknow layer" + layer.id);
                }

                if (layer !== prevLayer) {
                    layer.used = true;
                    if (layer.__startIndex !== 1) {
                        layer.__dirty = true;
                    }
                    layer.__startIndex = i;

                    if (!layer.incremental) {
                        layer.__drawIndex = i;
                    } else {
                        layer.__drawIndex = -1;
                    }
                    updatePrevLayer(i);
                    prevLayer = layer;
                }

                if (ele.__dirty) {
                    layer.__dirty = true;
                    if (layer.incremental && layer.__drawIndex < 0) {
                        layer.__drawIndex = i;
                    }
                }
            }

            updatePrevLayer(idx);

            this.eachBuildinLayer(function(cur_layer, z) {
                if (!cur_layer.__used && cur_layer.getElementCount > 0) {
                    cur_layer.__dirty = true;
                    cur_layer.__startIndex = cur_layer.__endIndex = cur_layer.__drawIndex = 0;
                }

                if (cur_layer.__dirty && cur_layer.__drawIndex < 0) {
                    cur_layer.__drawIndex = cur_layer.__startIndex;
                }
            });

            function updatePrevLayer(idx) {
                if (prevLayer) {
                    if (prevLayer.__endIndex !== idx) {
                        prevLayer.__dirty = true;
                    }
                    prevLayer.__endIndex = idx;
                }
            }
        }

        //遍历执行构建完成 图层的回调
        eachBuildinLayer(cb, context) {
            let layer_id_list = this.layer_id_list;
            let layer;
            for (let i = 0; i < layer_id_list.length; i++) {
                let id = layer_id_list[i];
                layer = this.layers_map[id];
                if (layer.__builtin__) {
                    cb.call(context, layer, id);
                }
            }
        }

        //绘制图形
        _doPaintList(list, paintAll) {
            let layerList = [];
            for (let i = 0; i < this.layer_id_list.length; i++) {
                let id = this.layer_id_list[i];
                let cur_layer = this.layers_map[id];
                if (cur_layer.__builtin__ && cur_layer !== this.__hoverlayer && (cur_layer.__dirty || paintAll)) {
                    layerList.push(cur_layer);
                }
            }

            let finished = true;
            console.log(layerList);
            for (let j = 0; j < layerList.length; j++) {
                let cur_layer = layerList[j];
                let ctx = cur_layer.ctx;
                let scope = {};
                ctx.save();

                let start = paintAll ? cur_layer.__startIndex : cur_layer.__drawIndex; //paintAll 为true ,重绘所有图形

                let userTimer = !paintAll && cur_layer.incremental && Date.now; //不重新绘制 记录当前时间
                let startTimer = userTimer && Date.now();

                let clearColor = cur_layer.hLevel === this.layer_id_list[0] ? this._backgroundColor : null;

                //如果全部重绘，清空图层颜色
                if (cur_layer.__startIndex === cur_layer.__endIndex) {
                    cur_layer.clear(false, clearColor);
                } else if (start === cur_layer.__startIndex) {
                    let firstEl = list[start];
                    if (!firstEl.incremental || paintAll) {
                        cur_layer.clear(false, clearColor);
                    }
                }

                if (start === -1) {
                    console.log("for some unknow reason.  drawIndex is -1");
                    start = cur_layer.__startIndex;
                }

                //遍历所有的图层,开始绘制元素
                let i = start;
                for (; i < cur_layer.__endIndex; i++) {
                    let ele = list[i];
                    this._doPaintEl(ele, cur_layer, paintAll, scope); //绘制图形的参数
                    ele.__dirty = ele.__dirtyText = false;

                    //如果 不是全部重绘
                    if (userTimer) {
                        let dTime = Date.now() - startTimer;
                        //这里的时间非常重要， 如果15ms 内没有完成所有绘制， 则跳出， 等待下一帧继续绘制
                        //但是 15ms 的时间是有限的， 如果元素的数量非常巨大， 例如有1000万个， 还是会卡顿。
                        if (dTime > 15) {
                            break;
                        }
                    }
                }

                cur_layer.__drawIndex = i;

                if (cur_layer.__drawIndex < cur_layer.__endIndex) {
                    finished = false;
                }

                if (scope.prevElClipPaths) {
                    ctx.restore();
                }

                ctx.restore();

                return finished;
            }
        }

        _doPaintEl(ele, cur_layer, paintAll, scope) {
            let ctx = cur_layer.ctx;
            let m = ele.transform;
            if (
                (cur_layer.__dirty || paintAll) &&
                !ele.invisible &&
                ele.style.opacity !== 0 &&
                !(m && !m[0] && !m[3])
                // && !(ele.culling && this.isDisplayableCulled())
            ) {
                ele.beforeBrush && ele.beforeBrush(ctx);
                ele.brush(ctx, scope.prevEl || null);
                scope.prevEl = ele;
                ele.afterBrush && ele.afterBrush(ctx);
            }
        }

        refreshHover() {
            let hoverElements = this._hoverElements;
            let len = hoverElements.length;

            if (!len) return;

            let hoverLayer = this._hoverlayer;
            if (!hoverLayer) {
                hoverLayer = this._hoverlayer = this.getLayer(HOVER_LAYER_LEVEL_ID); //获取图层
            }
            // hoverLayer.ctx.save();

            // hoverLayer.ctx.restore();
        }

        //获取图层，如果没有图层就创建一个
        getLayer(curLevelId, virtual) {
            if (this._singleCanvas && !this._needsManuallyCompositing) {
                //如果根节点是canvas,而且不需要手动合成, 那么当前图层id 就是初始化的图层id
                curLevelId = CANVAS_LEVEL_ID;
            }

            let layer = this.layers_map[curLevelId]; //根据id获取图层

            if (!layer) {
                //如果没有初始图层存在就创建一个 canvas 图层
                layer = new CanvasLayer("hr_" + curLevelId, this._width, this._height, this.dpr);
                layer.levelId = curLevelId;
                layer.__builtin__ = true;

                this.insertLayer(curLevelId, layer); //动态插入图层 到 运行环境
                layer.initContext();
            }
            return layer;
        }

        //将动态创建的图层 插入到页面中
        insertLayer(levelId, layer) {
            let layersMap = this.layers_map;
            let layer_id_list = this.layer_id_list;
            let len = layer_id_list.length;

            let prevLayer = null;

            if (layersMap[levelId]) {
                // 图层id 已经被占用
                console.log("Zlevel" + levelId + "has been used already");
                return;
            }

            let i = -1; //查找图层的 位置
            if (len > 0 && levelId > layer_id_list[0]) {
                //在图层id列表中，比自己序列小的 前一个图层
                for (let i = 0; i < len - 1; i++) {
                    if (layer_id_list[i] < levelId && layer_id_list[i + 1] > levelId) break;
                }
                prevLayer = layersMap[layer_id_list[i]];
            }

            layer_id_list.splice(i + 1, 0, levelId);

            layersMap[levelId] = layer;

            if (!layer.virtual) {
                //没有虚拟图层
                if (prevLayer) {
                    let prevDom = prevLayer.canvasDOM;
                    if (prevDom.nextSibling) {
                        this._root.insertBefore(layer.canvasDOM, prevDom.nextSibling);
                    } else {
                        this._root.appendChild(layer.canvasDOM);
                    }
                } else {
                    if (this._root.firstChild) {
                        this._root.insertBefore(layer.canvasDOM, this.root.firstChild);
                    } else {
                        this._root.appendChild(layer.canvasDOM);
                    }
                }
            }
        }
    }

    //tools--动态创建 根节点
    function createDomRoot(width, height) {
        let oDiv = document.createElement("div");
        oDiv.style.cssText = [`position: relative`, `width: ${width}px`, `height: ${height}px`, `padding: 0`, `margin: 0`, `border-width: 0`, `background: none`].join(";") + ";";
        return oDiv;
    }

    //tools--获取真实样式
    function getStyle(obj, attr, opts) {
        if (opts && attr in opts) {
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

    /**
     * @method constructor Eventful
     * @param {Object} [eventProcessor] The object eventProcessor is the scope when
     *        `eventProcessor.xxx` called. 事件处理者，也就是当前事件处理函数执行时的作用域。
     * @param {Function} [eventProcessor.normalizeQuery]
     *        param: {String|Object} Raw query.
     *        return: {String|Object} Normalized query.
     * @param {Function} [eventProcessor.filter] Event will be dispatched only
     *        if it returns `true`.
     *        param: {String} eventType
     *        param: {String|Object} query
     *        return: {Boolean}
     * @param {Function} [eventProcessor.afterTrigger] Called after all handlers called.
     *        param: {String} eventType
     * @param {Function} [eventProcessor.afterListenerChanged] Called when any listener added or removed.
     *        param: {String} eventType
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
            // console.log(_map[0].fn);
            let _ev_pro = this._eventProcessor;
            if (_map) {
                let args = arguments;
                // console.log(args);
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

                    if (item.one) {
                        //如果只运行一次， 就从订阅列表中移除 当前事件
                        _map.splice(i, 1);
                        _map.length--;
                    } else {
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

        // console.log(fn);

        query = normalizeQuery(_this, query);

        if (!_map[event]) {
            //没有相关的订阅事件就 创建订阅列表
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
            this._displayList_len = 0; // 图形编号
        }

        //1.1增加 图像 到元素的id列表
        addToRoot(ele) {
            if (ele._storage === this) {
                return;
            }
            // this.trigger("beforeAddToRoot");
            // ele.trigger("beforeAddToRoot");
            this.addToStorage(ele);
        }

        /**
         * 1.2增加 图像 到元素的id列表
         * 创建基础图形的时候，基础图形订阅了"addToStorage"
         * @param {*} ele
         */
        addToStorage(ele) {
            this._roots.set(ele.id, ele);
            // this.trigger("addToStorage");
            // ele.trigger("addToStorage");
            return this;
        }

        /**2.1 返回所有图形的绘制队列
         * @method getDisplayList
         * @param {boolean} [needUpdate=false] 是否在返回前更新该数组
         * @param {boolean} [includeIgnore=false] 是否包含 ignore 的数组, 在 needUpdate 为 true 的时候有效
         *
         * 详见{@link Displayable.prototype.updateDisplayList}
         * @return {Array<Displayable>}
         */
        getDisplayList(needUpdate, includeIgnore = false) {
            if (needUpdate) {
                this.updateDisplayList(includeIgnore); //更新图形队列,并按照优先级排序， 更新完成后返回最新排序的 图形队列
            }
            return this._displayList;
        }

        /**
         * @method updateDisplayList
         * 2.2 更新图形的绘制队列。
         * 每次绘制前都会调用，该方法会先深度优先遍历整个树，更新所有Group和Shape的变换并且把所有可见的Shape保存到数组中，
         * 最后根据绘制的优先级（zlevel > z > 插入顺序）排序得到绘制队列
         * @param {boolean} [includeIgnore=false] 是否包含 ignore 的数组
         */
        updateDisplayList(includeIgnore) {
            this._displayList_len = 0;
            let displayList = this._displayList;
            //遍历元素的id 列表
            this._roots.forEach((ele, id, map) => {
                this._updateAndAddDisplayable(ele, null, includeIgnore);
            });

            displayList.length = this._displayList_len;
            //队列排序
            // env.canvasSupported && (displayList, this._displayList_sort);
        }

        _updateAndAddDisplayable(ele, clipPaths, includeIgnore) {
            if (ele.ignore && !includeIgnore) {
                return;
            }

            if (ele.__dirty) ;

            ele.clipPaths = clipPaths;
            this._displayList[this._displayList_len++] = ele;
        }

        //tools -- 对图形队列排序
        _displayList_sort(a, b) {
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
            this.trigger("frame", delta);
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

    /*
     * data_util 数据 相关的 工具集合
     *
     * 判断对象类型
     */

    //1. 判断对象类型
    function isObject(val) {
        let res = typeof val;
        return res === "function" || (!!val && res === "object");
    }

    //2. 精确判断数据类型
    function judeType(val) {
        return Object.prototype.toString.call(val);
    }

    //3. 深拷贝
    function deepClone(source) {
        if (!source || typeof source !== "object") return source;

        let res = source;
        if (judeType(source) === "[object Array]") {
            res = [];
            for (let i = 0; i < source.length; i++) {
                res[i] = deepClone(source[i]);
            }
        }
        if (judeType(source) === "[object Object") {
            res = {};
            for (let key in source) {
                res[key] = deepClone(source[key]);
            }
        }

        return res;
    }

    function merge(target, source, overwrite) {
        if (!isObject(target) || !isObject(source)) {
            //如果 overwirte 为true, source 覆盖 target
            if (overwrite) {
                return deepClone(source);
            } else {
                return target;
            }
        }

        for (let key in source) {
            let source_prop = source[key];
            let target_prop = target[key];
            if (judeType(source_prop) === "[object Object]" && judeType(target_prop) === "[object Object]") {
                // 如果需要递归覆盖，就递归调用merge
                merge(target_prop, source_prop, overwrite);
            } else if (overwrite || !(key in target)) {
                // 否则只处理overwrite为true，或者在目标对象中没有此属性的情况
                // NOTE，在 target[key] 不存在的时候也是直接覆盖
                target[key] = deepClone(source[key]);
            }
        }

        return target;
    }

    //4. 从父类继承 并覆盖taget内置的属性
    function inheritProperties(target, source, opts) {
        let src = new source(opts);
        for (let name in src) {
            if (target.hasOwnProperty(name)) {
                target[name] = src[name];
            }
        }
    }

    class Transformable {
        constructor() {}
    }

    class Animatable {
        constructor() {}
    }

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
    function Style(opts) {
        extendStyle(this, opts, false);
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
            let prevStyle = prevEl && prevEl.style;

            //如果没有上一个样式，就代表绘制第一个元素

            if (!prevEl) {
                ctx.fillStyle = this.fill;
                ctx.strokeStyle = this.stroke;
                ctx.globalAlpha = this.opacity == null ? 1 : this.opacity;

                ctx.globalCompositeOperation = this.blend || "source-over";
            }

            // if(this.hasStroke()) {
            //     let lineWidth = this.lineWidth;
            //     ctx.lineWidth = lineWidth / (this.strokeNoScale && ele && ele.getLineScale)?
            // }
        },

        hasFill: function() {
            let fill = this.fill;
            return fill != null && fill !== "none";
        },

        hasStroke: function() {
            let stroke = this.stroke;
            return stroke != null && stroke !== "none" && this.lineWidth > 0;
        },

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
    const extendStyle = function(target, source, overwrite) {
        if (!source) return;
        if (overwrite) {
            //全覆盖
            target = Object.assign(target, source);
        } else {
            for (let prop in source) {
                //仅复制target已经有的属性
                if (!target.hasOwnProperty(prop) && source[prop]) {
                    target[prop] = source[prop];
                }
            }
        }
        return target;
    };

    /*
     * HRenderer 中所有图形对象都是 Element 的子类。这是一个抽象类，请不要直接创建这个类的实例。
     * 引入 transformable 为 Element 类提供变换功能，例如：平移、缩放、扭曲、旋转、翻转、形状、样式。
     * 引入 Animatable 为Element 为元素提供动画功能。
     * 引入 EventFul 为 Element 提供订阅发布功能。
     *
     * 注意： Element 同时继承多个类，并且只继承用户传递来的属性
     */

    class Element {
        constructor(opts = {}) {
            this.opts = opts;
            this.id = "el-" + guid();
            this.type = "element";
            this.name = "";
            this.parent = null;

            this.ignore = false; // 为true时，忽略图形绘制和事件触发
            this.clipPath = null; //用于裁剪的路径，所有 Group 内的路径在绘制时都会被这个路径裁剪，该路径会继承被裁减对象的变换。

            this.calculateTextPosition = null; //文本位置的字符串，计算实际位置

            this.invisible = false; //是否隐藏对象，默认false--不隐藏。（绘制）
            this.z = 0;

            this.hLevel = 0; //确定可显示对象可以在画布的哪一层绘制

            this.draggalbe = false; //是否开启拖拽
            this.dragging = false; //是否在拖拽中

            this.slient = false; //是否响应鼠标事件

            this.cursor = "pointer";
            this.rectHover = false; // 如果悬停区域是边界举行

            this.progressive = false; // 逐渐渲染数据

            this.incremental = false; // 渐增渲染
            this.globalScaleRatio = 1; //全局缩放

            this.animationProcessList = []; //元素上所有的动画处理列表

            this._hr = null; //元素被添加到 HumbleRender 实例后，自动赋值

            this._dirty = true; //下一帧渲染的元素，标记为 dirty（true)

            this._rect = null;

            this.__clipPaths = null; //因为仅使用null来检查clipPaths是否已更改很容易

            this.style = new Style(this.opts.style, this);

            this.shape = {}; // shape 形状 宽高 坐标等信息

            //拷贝自定义属性到 this.shape 默认属性中
            let defaultShape = this.opts.shape;
            if (defaultShape) {
                for (let name in defaultShape) {
                    if (!this.shape.hasOwnProperty(name) && defaultShape.hasOwnProperty(name)) {
                        this.shape[name] = defaultShape[name];
                    }
                }
            }

            inheritProperties(this, Transformable, this.opts);
            inheritProperties(this, Eventful, this.opts);
            inheritProperties(this, Animatable, this.opts);
            // copyOwnProperties(this, this.opts, ["style", "shape"]);

            // console.log(this);
            // this.on("addToStorage", this.addToStorageHandler);
            // this.on("delFromStorage", this.delFromStorageHandler);
        }

        beforeBrush(ctx) {}

        afterBrush(ctx) {}

        brush() {}
    }

    class pathProxy {
        constructor(notSaveData) {
            this._saveData = !(notSaveData || false);

            if (this._saveData) {
                this.data = [];
            }

            this.ctx = null;
        }

        getContext() {
            return this._ctx;
        }

        beginPath(ctx) {
            this._ctx = ctx;
            ctx && ctx.beginPath();
            ctx && (this.dpr = ctx.dpr);

            //Reset
            if (this._saveData) {
                this._len = 0;
            }

            if (this._lineDash) {
                this._lineDash = null;
                this._dashOffset = 0;
            }
            return this;
        }

        moveTo(x, y) {
            this.addData(CMD, x, y);
            this._ctx && this._ctx.moveTo(x, y);
        }

        addData(cmd) {
            if (!this._saveData) {
                return;
            }

            var data = this.data;
            // if(this._len + arguments.length > data.length) {
            //     this._expandData();
            //     data = this.data;
            // }
        }
    }

    /*
     *
     */
    class Path extends Element {
        constructor(opts) {
            super(opts);
            this.type = "path";
            this.path = null;
            this.__dirtyPath = true;

            this.strokeContainThreshold = 5; //绘制 临界值
            this.segmentIgnoreThreshold = 0; //部分 忽略 临界值
            this.subPixelOptimize = false; //设备优化
        }
        dirty() {}

        brush(ctx, prevEl) {
            let path = this.path || new pathProxy(true);
            let hasStroke = this.style.hasStroke(); //绘制需求
            let hasFill = this.style.hasFill(); //填充需求

            let fill = this.style.fill;
            let stroke = this.style.stroke;

            let hasFillGradient = hasFill && !!fill.colorStops;
            let hasStrokeGradient = hasStroke && !!stroke.colorStops;

            let hasFillPattern = hasFill && !!fill.image;
            let hasStrokePattern = hasStroke && !!stroke.image;

            this.style.bind(ctx, this, prevEl);

            if (hasFillGradient) {
                ctx.fillStyle = this.__fillGradient;
            }

            if (hasStrokeGradient) {
                ctx.strokeStyle = this.__strokeGradient;
            }

            if (hasFill) {
                path.fill(ctx);
            }

            if (hasStroke) {
                path.stroke(ctx);
            }
        }

        getBoundingRect() {}

        contian(x, y) {}

        setShape() {}

        getLineScale() {}
    }

    //tools -- 默认配置
    let defaultConfig = {
        shape: {
            // 左上、右上、右下、左下角的半径依次为r1、r2、r3、r4
            // r缩写为1         相当于 [1, 1, 1, 1]
            // r缩写为[1]       相当于 [1, 1, 1, 1]
            // r缩写为[1, 2]    相当于 [1, 2, 1, 2]
            // r缩写为[1, 2, 3] 相当于 [1, 2, 3, 2]
            r: 0,
            x: 0,
            y: 0,
            width: 0,
            height: 0
        }
    };

    class Rect extends Path {
        constructor(opts) {
            super(merge(defaultConfig, opts, true));
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
