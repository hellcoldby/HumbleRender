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

    // https://github.com/mziccard/node-timsort
    var DEFAULT_MIN_MERGE = 32;

    var DEFAULT_MIN_GALLOPING = 7;

    function minRunLength(n) {
        var r = 0;

        while (n >= DEFAULT_MIN_MERGE) {
            r |= n & 1;
            n >>= 1;
        }

        return n + r;
    }

    function makeAscendingRun(array, lo, hi, compare) {
        var runHi = lo + 1;

        if (runHi === hi) {
            return 1;
        }

        if (compare(array[runHi++], array[lo]) < 0) {
            while (runHi < hi && compare(array[runHi], array[runHi - 1]) < 0) {
                runHi++;
            }

            reverseRun(array, lo, runHi);
        }
        else {
            while (runHi < hi && compare(array[runHi], array[runHi - 1]) >= 0) {
                runHi++;
            }
        }

        return runHi - lo;
    }

    function reverseRun(array, lo, hi) {
        hi--;

        while (lo < hi) {
            var t = array[lo];
            array[lo++] = array[hi];
            array[hi--] = t;
        }
    }

    function binaryInsertionSort(array, lo, hi, start, compare) {
        if (start === lo) {
            start++;
        }

        for (; start < hi; start++) {
            var pivot = array[start];

            var left = lo;
            var right = start;
            var mid;

            while (left < right) {
                mid = left + right >>> 1;

                if (compare(pivot, array[mid]) < 0) {
                    right = mid;
                }
                else {
                    left = mid + 1;
                }
            }

            var n = start - left;

            switch (n) {
                case 3:
                    array[left + 3] = array[left + 2];

                case 2:
                    array[left + 2] = array[left + 1];

                case 1:
                    array[left + 1] = array[left];
                    break;
                default:
                    while (n > 0) {
                        array[left + n] = array[left + n - 1];
                        n--;
                    }
            }

            array[left] = pivot;
        }
    }

    function gallopLeft(value, array, start, length, hint, compare) {
        var lastOffset = 0;
        var maxOffset = 0;
        var offset = 1;

        if (compare(value, array[start + hint]) > 0) {
            maxOffset = length - hint;

            while (offset < maxOffset && compare(value, array[start + hint + offset]) > 0) {
                lastOffset = offset;
                offset = (offset << 1) + 1;

                if (offset <= 0) {
                    offset = maxOffset;
                }
            }

            if (offset > maxOffset) {
                offset = maxOffset;
            }

            lastOffset += hint;
            offset += hint;
        }
        else {
            maxOffset = hint + 1;
            while (offset < maxOffset && compare(value, array[start + hint - offset]) <= 0) {
                lastOffset = offset;
                offset = (offset << 1) + 1;

                if (offset <= 0) {
                    offset = maxOffset;
                }
            }
            if (offset > maxOffset) {
                offset = maxOffset;
            }

            var tmp = lastOffset;
            lastOffset = hint - offset;
            offset = hint - tmp;
        }

        lastOffset++;
        while (lastOffset < offset) {
            var m = lastOffset + (offset - lastOffset >>> 1);

            if (compare(value, array[start + m]) > 0) {
                lastOffset = m + 1;
            }
            else {
                offset = m;
            }
        }
        return offset;
    }

    function gallopRight(value, array, start, length, hint, compare) {
        var lastOffset = 0;
        var maxOffset = 0;
        var offset = 1;

        if (compare(value, array[start + hint]) < 0) {
            maxOffset = hint + 1;

            while (offset < maxOffset && compare(value, array[start + hint - offset]) < 0) {
                lastOffset = offset;
                offset = (offset << 1) + 1;

                if (offset <= 0) {
                    offset = maxOffset;
                }
            }

            if (offset > maxOffset) {
                offset = maxOffset;
            }

            var tmp = lastOffset;
            lastOffset = hint - offset;
            offset = hint - tmp;
        }
        else {
            maxOffset = length - hint;

            while (offset < maxOffset && compare(value, array[start + hint + offset]) >= 0) {
                lastOffset = offset;
                offset = (offset << 1) + 1;

                if (offset <= 0) {
                    offset = maxOffset;
                }
            }

            if (offset > maxOffset) {
                offset = maxOffset;
            }

            lastOffset += hint;
            offset += hint;
        }

        lastOffset++;

        while (lastOffset < offset) {
            var m = lastOffset + (offset - lastOffset >>> 1);

            if (compare(value, array[start + m]) < 0) {
                offset = m;
            }
            else {
                lastOffset = m + 1;
            }
        }

        return offset;
    }

    function TimSort(array, compare) {
        var minGallop = DEFAULT_MIN_GALLOPING;
        var length = 0;
        var runStart;
        var runLength;
        var stackSize = 0;

        length = array.length;

        var tmp = [];

        runStart = [];
        runLength = [];

        function pushRun(_runStart, _runLength) {
            runStart[stackSize] = _runStart;
            runLength[stackSize] = _runLength;
            stackSize += 1;
        }

        function mergeRuns() {
            while (stackSize > 1) {
                var n = stackSize - 2;

                if (
                    (n >= 1 && runLength[n - 1] <= runLength[n] + runLength[n + 1])
                    || (n >= 2 && runLength[n - 2] <= runLength[n] + runLength[n - 1])
                ) {
                    if (runLength[n - 1] < runLength[n + 1]) {
                        n--;
                    }
                }
                else if (runLength[n] > runLength[n + 1]) {
                    break;
                }
                mergeAt(n);
            }
        }

        function forceMergeRuns() {
            while (stackSize > 1) {
                var n = stackSize - 2;

                if (n > 0 && runLength[n - 1] < runLength[n + 1]) {
                    n--;
                }

                mergeAt(n);
            }
        }

        function mergeAt(i) {
            var start1 = runStart[i];
            var length1 = runLength[i];
            var start2 = runStart[i + 1];
            var length2 = runLength[i + 1];

            runLength[i] = length1 + length2;

            if (i === stackSize - 3) {
                runStart[i + 1] = runStart[i + 2];
                runLength[i + 1] = runLength[i + 2];
            }

            stackSize--;

            var k = gallopRight(array[start2], array, start1, length1, 0, compare);
            start1 += k;
            length1 -= k;

            if (length1 === 0) {
                return;
            }

            length2 = gallopLeft(array[start1 + length1 - 1], array, start2, length2, length2 - 1, compare);

            if (length2 === 0) {
                return;
            }

            if (length1 <= length2) {
                mergeLow(start1, length1, start2, length2);
            }
            else {
                mergeHigh(start1, length1, start2, length2);
            }
        }

        function mergeLow(start1, length1, start2, length2) {
            var i = 0;

            for (i = 0; i < length1; i++) {
                tmp[i] = array[start1 + i];
            }

            var cursor1 = 0;
            var cursor2 = start2;
            var dest = start1;

            array[dest++] = array[cursor2++];

            if (--length2 === 0) {
                for (i = 0; i < length1; i++) {
                    array[dest + i] = tmp[cursor1 + i];
                }
                return;
            }

            if (length1 === 1) {
                for (i = 0; i < length2; i++) {
                    array[dest + i] = array[cursor2 + i];
                }
                array[dest + length2] = tmp[cursor1];
                return;
            }

            var _minGallop = minGallop;
            var count1;
            var count2;
            var exit;

            while (1) {
                count1 = 0;
                count2 = 0;
                exit = false;

                do {
                    if (compare(array[cursor2], tmp[cursor1]) < 0) {
                        array[dest++] = array[cursor2++];
                        count2++;
                        count1 = 0;

                        if (--length2 === 0) {
                            exit = true;
                            break;
                        }
                    }
                    else {
                        array[dest++] = tmp[cursor1++];
                        count1++;
                        count2 = 0;
                        if (--length1 === 1) {
                            exit = true;
                            break;
                        }
                    }
                } while ((count1 | count2) < _minGallop);

                if (exit) {
                    break;
                }

                do {
                    count1 = gallopRight(array[cursor2], tmp, cursor1, length1, 0, compare);

                    if (count1 !== 0) {
                        for (i = 0; i < count1; i++) {
                            array[dest + i] = tmp[cursor1 + i];
                        }

                        dest += count1;
                        cursor1 += count1;
                        length1 -= count1;
                        if (length1 <= 1) {
                            exit = true;
                            break;
                        }
                    }

                    array[dest++] = array[cursor2++];

                    if (--length2 === 0) {
                        exit = true;
                        break;
                    }

                    count2 = gallopLeft(tmp[cursor1], array, cursor2, length2, 0, compare);

                    if (count2 !== 0) {
                        for (i = 0; i < count2; i++) {
                            array[dest + i] = array[cursor2 + i];
                        }

                        dest += count2;
                        cursor2 += count2;
                        length2 -= count2;

                        if (length2 === 0) {
                            exit = true;
                            break;
                        }
                    }
                    array[dest++] = tmp[cursor1++];

                    if (--length1 === 1) {
                        exit = true;
                        break;
                    }

                    _minGallop--;
                } while (count1 >= DEFAULT_MIN_GALLOPING || count2 >= DEFAULT_MIN_GALLOPING);

                if (exit) {
                    break;
                }

                if (_minGallop < 0) {
                    _minGallop = 0;
                }

                _minGallop += 2;
            }

            minGallop = _minGallop;

            minGallop < 1 && (minGallop = 1);

            if (length1 === 1) {
                for (i = 0; i < length2; i++) {
                    array[dest + i] = array[cursor2 + i];
                }
                array[dest + length2] = tmp[cursor1];
            }
            else if (length1 === 0) {
                throw new Error();
                // throw new Error('mergeLow preconditions were not respected');
            }
            else {
                for (i = 0; i < length1; i++) {
                    array[dest + i] = tmp[cursor1 + i];
                }
            }
        }

        function mergeHigh(start1, length1, start2, length2) {
            var i = 0;

            for (i = 0; i < length2; i++) {
                tmp[i] = array[start2 + i];
            }

            var cursor1 = start1 + length1 - 1;
            var cursor2 = length2 - 1;
            var dest = start2 + length2 - 1;
            var customCursor = 0;
            var customDest = 0;

            array[dest--] = array[cursor1--];

            if (--length1 === 0) {
                customCursor = dest - (length2 - 1);

                for (i = 0; i < length2; i++) {
                    array[customCursor + i] = tmp[i];
                }

                return;
            }

            if (length2 === 1) {
                dest -= length1;
                cursor1 -= length1;
                customDest = dest + 1;
                customCursor = cursor1 + 1;

                for (i = length1 - 1; i >= 0; i--) {
                    array[customDest + i] = array[customCursor + i];
                }

                array[dest] = tmp[cursor2];
                return;
            }

            var _minGallop = minGallop;

            while (true) {
                var count1 = 0;
                var count2 = 0;
                var exit = false;

                do {
                    if (compare(tmp[cursor2], array[cursor1]) < 0) {
                        array[dest--] = array[cursor1--];
                        count1++;
                        count2 = 0;
                        if (--length1 === 0) {
                            exit = true;
                            break;
                        }
                    }
                    else {
                        array[dest--] = tmp[cursor2--];
                        count2++;
                        count1 = 0;
                        if (--length2 === 1) {
                            exit = true;
                            break;
                        }
                    }
                } while ((count1 | count2) < _minGallop);

                if (exit) {
                    break;
                }

                do {
                    count1 = length1 - gallopRight(tmp[cursor2], array, start1, length1, length1 - 1, compare);

                    if (count1 !== 0) {
                        dest -= count1;
                        cursor1 -= count1;
                        length1 -= count1;
                        customDest = dest + 1;
                        customCursor = cursor1 + 1;

                        for (i = count1 - 1; i >= 0; i--) {
                            array[customDest + i] = array[customCursor + i];
                        }

                        if (length1 === 0) {
                            exit = true;
                            break;
                        }
                    }

                    array[dest--] = tmp[cursor2--];

                    if (--length2 === 1) {
                        exit = true;
                        break;
                    }

                    count2 = length2 - gallopLeft(array[cursor1], tmp, 0, length2, length2 - 1, compare);

                    if (count2 !== 0) {
                        dest -= count2;
                        cursor2 -= count2;
                        length2 -= count2;
                        customDest = dest + 1;
                        customCursor = cursor2 + 1;

                        for (i = 0; i < count2; i++) {
                            array[customDest + i] = tmp[customCursor + i];
                        }

                        if (length2 <= 1) {
                            exit = true;
                            break;
                        }
                    }

                    array[dest--] = array[cursor1--];

                    if (--length1 === 0) {
                        exit = true;
                        break;
                    }

                    _minGallop--;
                } while (count1 >= DEFAULT_MIN_GALLOPING || count2 >= DEFAULT_MIN_GALLOPING);

                if (exit) {
                    break;
                }

                if (_minGallop < 0) {
                    _minGallop = 0;
                }

                _minGallop += 2;
            }

            minGallop = _minGallop;

            if (minGallop < 1) {
                minGallop = 1;
            }

            if (length2 === 1) {
                dest -= length1;
                cursor1 -= length1;
                customDest = dest + 1;
                customCursor = cursor1 + 1;

                for (i = length1 - 1; i >= 0; i--) {
                    array[customDest + i] = array[customCursor + i];
                }

                array[dest] = tmp[cursor2];
            }
            else if (length2 === 0) {
                throw new Error();
                // throw new Error('mergeHigh preconditions were not respected');
            }
            else {
                customCursor = dest - (length2 - 1);
                for (i = 0; i < length2; i++) {
                    array[customCursor + i] = tmp[i];
                }
            }
        }

        this.mergeRuns = mergeRuns;
        this.forceMergeRuns = forceMergeRuns;
        this.pushRun = pushRun;
    }

    function sort(array, compare, lo, hi) {
        if (!lo) {
            lo = 0;
        }
        if (!hi) {
            hi = array.length;
        }

        var remaining = hi - lo;

        if (remaining < 2) {
            return;
        }

        var runLength = 0;

        if (remaining < DEFAULT_MIN_MERGE) {
            runLength = makeAscendingRun(array, lo, hi, compare);
            binaryInsertionSort(array, lo, hi, lo + runLength, compare);
            return;
        }

        var ts = new TimSort(array, compare);

        var minRun = minRunLength(remaining);

        do {
            runLength = makeAscendingRun(array, lo, hi, compare);
            if (runLength < minRun) {
                var force = remaining;
                if (force > minRun) {
                    force = minRun;
                }

                binaryInsertionSort(array, lo, lo + force, lo + runLength, compare);
                runLength = force;
            }

            ts.pushRun(lo, runLength);
            ts.mergeRuns();

            remaining -= runLength;
            lo += runLength;
        } while (remaining !== 0);

        ts.forceMergeRuns();
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
            this.ele_map = new Map(); //图形对象列表 {id: ele}
            this.ele_ary = []; //包含所有图形的数组
            this.ele_ary_len = 0; //图形数组的长度
        }

        addToRoot(ele) {
            this.addToStorage(ele);
        }

        addToStorage(ele) {
            this.ele_map.set(ele.id, ele);
            return this;
        }

        //2.1 返回所有图形的绘制队列 参数(是否更新图形数组， 是否包含忽略)
        getDisplayList(needUpdate, includeIgnore = false) {
            if (needUpdate) {
                this.updateDisplayList(includeIgnore); //2.1_2更新图形队列
            }
            return this.ele_ary;
        }

        /**
         * @method updateDisplayList
         * 2.1_2 更新图形数组队列。
         * 每次绘制前都会调用，该方法会先深度优先遍历整个树，更新所有Group和Shape的变换并且把所有可见的Shape保存到数组中，
         * 最后根据绘制的优先级（zlevel > z > 插入顺序）排序得到绘制队列
         * @param {boolean} [includeIgnore=false] 是否包含 ignore 的数组
         */
        updateDisplayList(includeIgnore) {
            this.ele_map.forEach((ele, id, map) => {
                this._updateAndAddDisplayable(ele, null, includeIgnore);
            });
            sort(this.ele_ary, (a, b) => {
                if (a.hLevel === b.hLevel) {
                    if (a.z === b.z) {
                        return a.z2 - b.z2;
                    }
                    return a.z - b.z;
                }
                return a.hLevel - b.hLevel;
            });
        }

        //2.1_2_1 排除 标记为忽略 的元素，更新元素数组
        _updateAndAddDisplayable(ele, clipPaths, includeIgnore) {
            if (ele.ignore && !includeIgnore) return;
            //计算图形偏移矩阵
            if (ele.__dirty) {
                ele.updateTransform();
            }
            //添加元素到 数组队列中
            this.ele_ary[this.ele_ary_len++] = ele;
        }
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

            /**
             * @property {boolean} 是否开启动态模糊
             */
            this.motionBlur = false;

            /**
             * @property {Number} 在开启动态模糊的时候使用，与上一帧混合的alpha值，值越大尾迹越明显
             */
            this.lastFrameAlpha = 0.7;

            this.__dirty = true;
            this.__used = false;
            this.__drawIndex = 0; //增量绘制的序列
            this.__startIndex = 0; //最先绘制的元素编号
            this.__endIndex = 0; //最后绘制的元素编号
            this.incremental = false; //增量绘制
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

        getElementCount() {
            return this.__endIndex - this.__startIndex;
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
            this.root = root;
            this.storage = storage;

            this.type = "canvas";
            this.dpr = this.opts.devicePixelRatio || devicePixelRatio; //分辨率比例

            this.layers_map = {}; // 图层对象列表
            this.layer_id_list = []; //图层id数组
            this._layerConfig = {}; //?
            this._needsManuallyCompositing = false; //? 是否需要手动合成

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

                layers_map[CANVAS_LEVEL_ID] = mainLayer;
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

        /**1.1
         * @param {Boolean} [paintAll=false] 是否强制绘制所有元素
         */
        refresh(paintAll) {
            //从 storage 中获取 元素数组列表
            let ele_ary = this.storage.getDisplayList(true);
            this._redrawId = Math.random(); // 重绘id
            this._paintList(ele_ary, paintAll, this._redrawId); //1.2 更新图层，动态创建图层， 绘制图层

            let layer_id_list = this.layer_id_list;
            for (let i = 0; i < layer_id_list.length; i++) {
                let id = layer_id_list[i];
                let layer = this.layers_map[id];
                if (!layer.__builtin__ && layer.refresh) {
                    let clearColor = i === 0 ? this._backgroundColor : null;
                    layer.refresh(clearColor);
                }
            }
            return this;
        }

        /**1.2 更新图层，动态创建图层， 绘制图层
         * @method _paintList
         * @param {} ele_ary --- 要绘制的图形列表
         * @param {Boolean} [paintAll=false] 是否强制绘制所有displayable
         * @param {} redrawId --- 随机生成的重绘id
         */
        _paintList(ele_ary, paintAll, redrawId) {
            //如果 redrawId 不一致，说明下一个动画帧已经到来，这里就会直接跳过去，相当于跳过了一帧
            if (this._redrawId !== redrawId) {
                return;
            }
            paintAll = paintAll || false;
            //1.2_1  动态创建图层 更新图层状态
            this._updateLayerStatus(ele_ary);
            //1.2_2开始绘制图形
            let finished = this._doPaintList(ele_ary, paintAll);
            if (!finished) {
                let self = this;
                RAF(function() {
                    self._paintList(ele_ary, paintAll, redrawId);
                });
            }
        }

        //1.2_1 更新图层状态 动态创建图层
        _updateLayerStatus(ele_ary) {
            this._eachBuiltinLayer(function(layer, z) {
                layer.__dirty = layer.__used = false;
            });
            let prevLayer = null;
            let idx = 0;
            for (let i = 0; i < ele_ary.length; ) {
                let ele = ele_ary[i];
                let hLevel = ele.hLevel; //图形对应的图层
                let tmp_id = 0;
                //1.2_1_1 同一个图层的元素只创建一次图层，否则就创建过个图层
                let layer = this.getLayer(hLevel + tmp_id, this._needsManuallyCompositing);
                if (layer !== prevLayer) {
                    layer.__used = true;
                    if (layer.__startIndex !== i) {
                        layer.__dirty = true;
                    }
                    layer.__startIndex = i;

                    if (!layer.incremental) {
                        //没有增量图层
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

                i++;
                idx = i;
            }
            updatePrevLayer(idx);
            this._eachBuiltinLayer(function(layer, z) {
                // Used in last frame but not in this frame. Needs clear
                if (!layer.__used && layer.getElementCount() > 0) {
                    layer.__dirty = true;
                    layer.__startIndex = layer.__endIndex = layer.__drawIndex = 0;
                }
                // For incremental layer. In case start index changed and no elements are dirty.
                if (layer.__dirty && layer.__drawIndex < 0) {
                    //增量更新的图层
                    layer.__drawIndex = layer.__startIndex;
                }
            });

            //tools --- 更新图层序列
            function updatePrevLayer(idx) {
                if (prevLayer) {
                    if (prevLayer.__endIndex !== idx) {
                        prevLayer.__dirty = true;
                    }
                    prevLayer.__endIndex = idx;
                }
            }

            // console.log(this.layers_map);
        }

        //1.2_1 tools ---遍历图层的id 列表，如果图层构建完成，就执行回调
        _eachBuiltinLayer(cb, context) {
            if (!this.layer_id_list.length) return;
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

        //1.2_1_1  为图形动态创建图层 --参数：（图层id, 是否合并）
        getLayer(curLevelId, virtual) {
            if (this._singleCanvas && !this._needsManuallyCompositing) {
                curLevelId = CANVAS_LEVEL_ID;
            }
            //多个元素 同一个图层，id是一样的，就直接返回创建 好的图层。
            let layer = this.layers_map[curLevelId];
            if (!layer) {
                //如果没有初始图层存在就创建一个 canvas 图层
                layer = new CanvasLayer("hr_" + curLevelId, this._width, this._height, this.dpr);
                layer.levelId = curLevelId;
                layer.__builtin__ = true;
                if (virtual) {
                    layer.virtual = virtual;
                }
                //1.2_1_1_1图层 插入到页面中
                this.insertLayer(curLevelId, layer);
                layer.initContext();
            }
            return layer;
        }

        //1.2_1_1_1 图层 插入到页面中
        insertLayer(levelId, layer) {
            let layers_map = this.layers_map;
            let layer_id_list = this.layer_id_list;
            let len = layer_id_list.length;
            let prevLayer = null; //插入图层的上一个图层
            let index = -1;
            if (layers_map[levelId]) {
                console.log("Zlevel" + levelId + "has been used already");
                return;
            }

            if (len > 0 && levelId > layer_id_list[0]) {
                //多个图层
                for (let i = 0; i < len - 1; i++) {
                    if (layer_id_list[i] < levelId && layer_id_list[i + 1] > levelId) {
                        index = i; //找到 图层插入的前一个位置
                        break;
                    }
                }
                prevLayer = layers_map[layer_id_list[index]]; //获取前一个图层
            }

            layer_id_list.splice(index + 1, 0, levelId); //插入 新图层id
            layers_map[levelId] = layer; // 新图层id 对应图层map

            //没有需要合并的图层
            if (!layer.virtual) {
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

        //1.2_2绘制图形
        _doPaintList(ele_ary, paintAll) {
            let layerList = [];
            for (let i = 0; i < this.layer_id_list.length; i++) {
                let id = this.layer_id_list[i];
                let cur_layer = this.layers_map[id];
                //如果图层构建完成 并且 当前图层和事件图层不一致  并且 图层需要更新 ， 那么就放入到 layerList 图层队列中
                if (cur_layer.__builtin__ && cur_layer !== this.__hoverlayer && (cur_layer.__dirty || paintAll)) {
                    layerList.push(cur_layer);
                }
            }
            // console.log(layerList);

            let finished = true;
            //遍历所有的图层
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
                    let firstEl = ele_ary[start];
                    if (!firstEl.incremental || paintAll) {
                        cur_layer.clear(false, clearColor);
                    }
                }

                if (start === -1) {
                    console.log("for some unknow reason.  drawIndex is -1");
                    start = cur_layer.__startIndex;
                }

                //遍历图层中所有的元素
                let i = start;
                for (; i < cur_layer.__endIndex; i++) {
                    let ele = ele_ary[i];
                    //1.2_2_1绘制图形
                    this._doPaintEl(ele, cur_layer, paintAll, scope);
                    //绘制完成标记为不更新
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
        //1.2_2_1 开始绘制图层里的 元素
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
     *  用来记录 动画开关， 时间戳， 添加动画序列
     */

    class WatchAnim extends Eventful {
        constructor(opts) {
            super();
            this._running = false; //动画启动
            this._pause = false; //动画暂停
        }

        //启动监控
        start() {
            this._startLoop();
        }
        //暂停监控
        pause() {
            if (this._paused) {
                this._paused = true;
            }
        }

        _startLoop() {
            let self = this;
            this._running = true;
            function nextFrame() {
                if (self._running) {
                    RAF(nextFrame);
                    !self._paused && self._update();
                }
            }
            RAF(nextFrame);
        }

        _update() {
            this.trigger("frame"); //激活订阅的frame 事件，触发视图刷新
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

            this.storage = new Storage();
            this.painter = new painterMap[renderType](this.root, this.storage, opts, this.id);
            if (typeof this.root.moveTo !== "function") ;
            // this.eventHandler = new HRenderEventHandler(this.storage, this.painter, handerProxy);

            this.WatchAnim = new WatchAnim();
            this.WatchAnim.on("frame", function() {
                self.flush(); //每间隔16.7ms 监控一次flush
            });
            this.WatchAnim.start();
            this._needRefresh = false;
        }

        //监控 this._needRefresh 的开关
        flush() {
            if (this._needRefresh) {
                this.refreshImmediately(); //全部重绘
            }
            if (this._needRefreshHover) {
                this.refreshHoverImmediaterly(); //重绘特定元素
            }
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

        //开启刷新
        refresh() {
            this._needRefresh = true;
        }

        //移除元素
        remove(ele) {
            // this.storage.delFromRoot(ele);
            this.refresh();
        }

        //立即重绘
        refreshImmediately() {
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

    //2. 判断数据类型
    function judgeType(val) {
        return Object.prototype.toString.call(val);
    }

    //3. 深拷贝
    function deepClone(source) {
        if (!source || typeof source !== "object") return source;

        let res = source;
        if (judgeType(source) === "[object Array]") {
            res = [];
            for (let i = 0; i < source.length; i++) {
                res[i] = deepClone(source[i]);
            }
        }
        if (judgeType(source) === "[object Object") {
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
            if (judgeType(source_prop) === "[object Object]" && judgeType(target_prop) === "[object Object]") {
                // 如果需要递归覆盖，就递归调用merge
                merge(target_prop, source_prop, overwrite);
            } else if (overwrite || !(key in target)) {
                // 否则只处理overwrite为true，或者在目标对象中没有此属性的情况
                // 在 target[key] 不存在的时候也是直接覆盖
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

    //5. 从目标对象上拷贝非继承的属性
    function copyOwnProperties(target, source, excludes = []) {
        for (let key in source) {
            if (source.hasOwnProperty(key)) {
                if (excludes && excludes.length) {
                    if (excludes.indexOf(key) !== -1) {
                        continue;
                    }
                }
                target[key] = source[key];
            }
        }
        return target;
    }

    //6. 拷贝多个对象的（非继承）属性。 参数（targe, obj1, obj2, ..., overWrite)
    function mixin() {
        let lastArgs = arguments[arguments.length - 1];
        let overwrite = false;
        if (typeof lastArgs === "boolean") {
            overwrite = lastArgs;
        }
        let target = arguments[0];
        let i = 1;
        let tmp = null;
        let tmp_keys = [];
        for (i; i < arguments.length - 1; i++) {
            tmp = arguments[i];

            tmp_keys = Object.getOwnPropertyNames(tmp);
            if (tmp_keys.length) {
                tmp_keys.forEach(function(prop) {
                    if (prop !== "constructor" && prop !== "prototype" && prop !== "name") {
                        if (tmp.hasOwnProperty(prop) && (overwrite ? tmp[prop] != null : target.hasOwnProperty(prop) === false)) {
                            target[prop] = tmp[prop];
                            // console.log(target[prop]);
                        }
                    }
                });
            }
        }
        return target;
    }

    let Transformable = function(opts = {}) {
        this.origin = opts.origin === null || pots.origin === undefined ? [0, 0] : opts.origin;
        this.rotation = opts.rotation === null || opts.rotation === undefined ? 0 : opts.rotation;
        this.positon = opts.position === null || opts.position === undefined ? [0, 0] : opts.position;
        this.scale = opts.scale === null || opts.scale === undefined ? [1, 1] : opts.scale;

        this.skew = opts.skew === null || opts.skew === undefined ? [0, 0] : opts.skew;
        this.globalScaleRatio = 1;
    };

    Transformable.prototype = {
        constructor: Transformable,

        //
        composeLocalTransform() {}
    };

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
            this.z = 0; //图层层级

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
            copyOwnProperties(this, this.opts, ["style", "shape"]);

            // console.log(this);
            // this.on("addToStorage", this.addToStorageHandler);
            // this.on("delFromStorage", this.delFromStorageHandler);
        }

        beforeBrush(ctx) {}

        afterBrush(ctx) {}

        brush() {}
    }

    mixin(Element.prototype, Animatable.prototype, Transformable.prototype, Eventful.prototype);

    var CMD = {
        M: 1,
        L: 2,
        C: 3,
        Q: 4,
        A: 5,
        Z: 6,
        R: 7
    };

    function PathProxy(notSaveData) {
        this._saveData = !(notSaveData || false);
        if (this._saveData) {
            this.data = [];
        }
        this._ctx = null;
    }

    PathProxy.prototype = {
        constructor: PathProxy,
        _xi: 0, // xi, yi 记录当前点
        _yi: 0,
        _x0: 0, // x0, y0 记录起始点
        _y0: 0,

        _ux: 0, //线段的最小值
        _uy: 0,

        _len: 0,
        _lineDash: null, // 设置虚线，数组格式

        _dashOffset: 0,
        _dashIdx: 0,
        _dashSum: 0,

        getContext: function() {
            return this._ctx;
        },

        beginPath: function(ctx) {
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
        },

        moveTo: function(x, y) {
            this.addData(CMD, x, y);
            this._ctx && this._ctx.moveTo(x, y);
            // x0, y0, xi, yi 是记录在 _dashedXXXXTo 方法中使用
            // xi, yi 记录当前点, x0, y0 在 closePath 的时候回到起始点。
            // 有可能在 beginPath 之后直接调用 lineTo，这时候 x0, y0 需要
            // 在 lineTo 方法中记录，这里先不考虑这种情况，dashed line 也只在 IE10- 中不支持
            this._x0 = x;
            this._y0 = y;

            this._xi = x;
            this._yi = y;

            return this;
        },

        lineTo: function(x, y) {
            //判断是否超过 线段的最小值
            let exceedUnit = Math.abs(x - this.xi) > this._ux || Math.abs(y - this._yi) > this._uy || this._len < 5;
            if (exceedUnit) {
                this._xi = x;
                this._yi = y;
            }
            if (this._ctx && exceedUnit) {
                this._ctx.lineTo(x, y);
            }

            return this;
        },

        arc: function(cx, cy, r, startAngle, endAngle, anticlockwise) {
            this._ctx && this._ctx.arc(cx, cy, r, startAngle, endAngle, anticlockwise);
            this._xi = Math.cos(endAngle) * r + cx; //??? 这个坐标的计算有=疑问
            this._yi = Math.sin(endAngle) * r + cy; //??
            return this;
        },

        fill: function(ctx) {
            ctx && ctx.fill();
            // this.toStatic();
        },

        closePath: function() {
            // this.addData(CMD.Z);

            var ctx = this._ctx;
            var x0 = this._x0;
            var y0 = this._y0;
            if (ctx) {
                // this._needsDash() && this._dashedLineTo(x0, y0);
                ctx.closePath();
            }

            this._xi = x0;
            this._yi = y0;
            return this;
        },

        rect: function(x, y, w, h) {
            this._ctx && this._ctx.rect(x, y, w, h);
            // this.addData(CMD.R, x, y, w, h);
            return this;
        },

        _needsDash: function() {
            return this._lineDash;
        },

        addData: function(cmd) {
            if (!this._saveData) {
                return;
            }

            var data = this.data;
            if (this._len + arguments.length > data.length) {
                // 因为之前的数组已经转换成静态的 Float32Array
                // 所以不够用时需要扩展一个新的动态数组
                this._expandData();
                data = this.data;
            }
            for (var i = 0; i < arguments.length; i++) {
                data[this._len++] = arguments[i];
            }

            this._prevCmd = cmd;
        },

        _expandData: function() {
            // Only if data is Float32Array
            if (!(this.data instanceof Array)) {
                var newData = [];
                for (var i = 0; i < this._len; i++) {
                    newData[i] = this.data[i];
                }
                this.data = newData;
            }
        }
    };

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

        brush(ctx, prevEl) {
            let path = this.path || new PathProxy(true);
            let hasStroke = this.style.hasStroke(); //绘制需求
            let hasFill = this.style.hasFill(); //填充需求

            let fill = this.style.fill;
            let stroke = this.style.stroke;

            let hasFillGradient = hasFill && !!fill.colorStops;
            let hasStrokeGradient = hasStroke && !!stroke.colorStops;

            let hasFillPattern = hasFill && !!fill.image;
            let hasStrokePattern = hasStroke && !!stroke.image;

            //在style.bind()中完成 fillSytle  和 strokeStyle的设置
            this.style.bind(ctx, this, prevEl);
            // this.setTransform(ctx);

            if (this.__dirty) {
                let rect;
                if (hasFillGradient) {
                    rect = rect || this.getBoundingRect();
                    this._fillGradient = this.style.getBoundingRect(ctx, fill, rect);
                }

                if (hasStrokeGradient) {
                    rect = rect || this.getBoundingRect();
                    this.__strokeGradient = this.style.getBoundingRect(ctx, stroke, rect);
                }
            }

            if (hasFillGradient) {
                ctx.fillStyle = this.__fillGradient;
            }

            if (hasStrokeGradient) {
                ctx.strokeStyle = this.__strokeGradient;
            }

            //更新路径
            if (this.__dirtyPath) {
                path.beginPath(ctx);
                this.buildPath(path, this.shape, false);
                if (this.path) {
                    this.__dirtyPath = false;
                }
            } else {
                ctx.beginPath();
            }

            if (hasFill) {
                path.fill(ctx);
            }

            if (hasStroke) {
                path.stroke(ctx);
            }
        }
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
                console.log(ctx);
                round_rect(ctx, shape);
            }
            ctx.closePath();
            return;
        }
    }

    let defaultConfig$1 = {
        shape: {
            cx: 0,
            cy: 0,
            r: 0
        }
    };
    class Circle extends Path {
        constructor(opts) {
            super(merge(defaultConfig$1, opts, true));
            this.type = "circle";
        }

        buildPath(ctx, shape, inBundle) {
            if (inBundle) {
                ctx.moveTo(shape.cx + shape.r, shape.cy);
            }
            ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2, true);
        }
    }

    exports.Circle = Circle;
    exports.Rect = Rect;
    exports.init = init;
    exports.version = version;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=humble-render.js.map
