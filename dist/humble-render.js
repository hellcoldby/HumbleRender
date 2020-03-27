'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/*
 *  检测设备支持情况
 */
let env = {};
//tools --- 浏览器环境检测
function detect(ua) {
    let os = {};
    let browser = {};

    let firefox = ua.match(/Firefox\/([\d.]+)/);
    let ie = ua.match(/MSIE\s[\d.]+/) || ua.match(/Trident\/.+?rv:(([\d.]+))/); // ie7 || ie11
    let edge = ua.match(/Edge\/([\d.]+)/); // ie12 +
    let weChat = /micromessenger/i.test(ua);

    if (firefox) {
        browser.firefox = true;
        browser.version = firefox[1];
    }

    if (ie) {
        browser.ie = true;
        browser.version = ie[1];
    }

    if (edge) {
        browser.edge = true;
        browser.version = edge[1];
    }

    if (weChat) {
        browser.weChat = true;
    }

    return {
        browser: browser,
        os: os,
        node: false,
        canvasSupported: !!document.createElement("canvas").getContext,
        svgSupported: typeof SVGRect !== "undefined",
        touchEventsSupported: "ontouchstart" in window && !browser.ie && !browser.edge,
        pointerEventsSupported: "onpointerdown" in window && (browser.edge || (browser.ie && browser.version >= 11)),
        domSupported: typeof document !== "undefined"
    };
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
} else if (typeof navigator === "undefined") {
    // node 环境
    env = {
        browser: {},
        os: {},
        node: true,
        worker: false,
        // Assume canvas is supported
        canvasSupported: true,
        svgSupported: true
    };
} else {
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
        this.ele_ary_len = 0;
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
        // console.log(this.ele_map);
        // console.log(this.ele_ary);
    }

    //2.1_2_1 排除 标记为忽略 的元素，更新元素数组
    _updateAndAddDisplayable(ele, clipPaths, includeIgnore) {
        if (ele.ignore && !includeIgnore) return;
        //计算图形transform矩阵
        if (ele.__dirty) {
            ele.updateTransform();
        }
        //添加元素到 数组队列中
        this.ele_ary[this.ele_ary_len++] = ele;
    }

    dispose() {
        this.ele_ary = null; //包含所有图形的数组
        this.ele_map = null;
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
        if (!this.canvasDOM) {
            return;
        }
        if (this.canvasDOM.style) {
            this.canvasDOM.style.width = width + "px";
            this.canvasDOM.style.height = height + "px";
        }
        this.canvasDOM.width = width * this.dpr;
        this.canvasDOM.height = height * this.dpr;

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
        let haveMotionBLur = this.motionBlur && !clearAll;
        let dpr = this.dpr;

        // if (haveMotionBLur && this.canvasDOM) {
        //     width = this.canvasDOM.width;
        //     height = this.canvasDOM.height;
        //     if (!this.hiddenCanvas) {
        //         this.creatHiddenCanvas();
        //     }
        //     this.hiddenContext.globalCompositeOperation = "copy";
        //     this.hiddenContext.drawImage(this.canvasDOM, 0, 0, width / dpr, height / dpr);
        // }
        // console.log(this.width, this.height);
        this.ctx.clearRect(0, 0, this.width * this.dpr, this.height * this.dpr);

        // if (haveMotionBLur && this.hiddenCanvas) {
        //     this.ctx.save();
        //     this.ctx.globalAlpha = lastFrameAlpha;
        //     this.ctx.drawImage(this.hiddenCanvas, 0, 0, width, height);
        //     this.ctx.restore();
        // }
    }

    // creatHiddenCanvas() {
    //     this.hiddenCanvas = canvasUtil.createCanvas("back-" + this.id, this.width, this.height, this.dpr);
    //     this.hiddenContext = canvasUtil.getContext(this.hiddenCanvas);
    //     if (this.dpr !== 1) {
    //         this.hiddenContext.scale(this.dpr, this.dpr);
    //     }
    // }
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

            this.layers_map[CANVAS_LEVEL_ID] = mainLayer;
            this.layer_id_list.push(CANVAS_LEVEL_ID);
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
        // console.log("123");
        //从 storage 中获取 元素数组列表
        let ele_ary = this.storage.getDisplayList(true);
        this._redrawId = Math.random(); // 重绘id
        console.log(ele_ary);
        this._paintList(ele_ary, paintAll, this._redrawId); //1.2 更新图层，动态创建图层， 绘制图层

        // let layer_id_list = this.layer_id_list;
        // for (let i = 0; i < layer_id_list.length; i++) {
        //     let id = layer_id_list[i];
        //     let layer = this.layers_map[id];
        //     if (!layer.__builtin__ && layer.refresh) {
        //         let clearColor = i === 0 ? this._backgroundColor : null;
        //         layer.refresh(clearColor);
        //     }
        // }
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
        console.log("update");
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

            //判断元素的属性发生变化， 标记图层为待更新。
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
                // console.log(ele.shape);
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

    dispose() {
        this.root.innerHTML = "";
        this.root = null;
        this.storage = null;
        this._root = null;
        this.layers_map = null;
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

        this._startTime = 0; //开始时间
        this._pause = {
            startTime: 0, //暂停开始时间
            flag: false, //暂停开关
            duration: 0 //暂停持续时间
        };

        this._animatableMap = new Map();
    }

    //启动监控
    start() {
        this._startTime = new Date().getTime();
        this._pause.duration = 0;
        this._startLoop();
    }
    //暂停监控
    pause() {
        if (!this._pause.flag) {
            this._pause.startTime = new Date().getTime();
            this._pause.flag = true;
        }
    }

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

    //动画循环中的更新逻辑
    _update() {
        let time = new Date().getTime() - this._pause.duration; //从暂停位置开始计时，没有暂停就是当前事件
        let delta = time - this._startTime; // 监控持续时间

        this._animatableMap.forEach((ele, id, map) => {
            //查找当前元素的动画系统是否存在

            let ele_anim_process = ele.animationProcessList[0];

            if (!ele_anim_process) {
                this.removeAnimatable(ele);
                return;
            } else {
                // console.log([...this._animatableMap]);
                //存在动画系统，就在下一帧渲染（AnimationProcess.js）
                ele_anim_process.nextFrame(time, delta);
            }
        });

        this._startTime = time;

        this.trigger("frame"); //激活订阅的frame 事件，触发视图刷新
    }

    //重置动画
    resume() {
        if (this._pause.flag) {
            this._pause.duration += new Date().getTime() - this._pause.startTime;
            this._pause.flag = false;
        }
    }

    //在animatable.js 的when()方法中调用
    addAnimatable(ele) {
        this._animatableMap.set(ele.id, ele);
    }

    removeAnimatable(ele) {
        this._animatableMap.delete(ele.id);
    }

    //清除所有元素的动画
    clear() {
        this._animatableMap.forEach(ele => {
            ele.stopAnimation();
        });
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

//tools -- 初始保存实例 map
let instances = {};

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
    instances[hr.id] = hr;
    return hr;
}

function dispose(hr) {
    if (hr) {
        hr.dispose();
    }
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

        this.watchAnim = new WatchAnim();
        this.watchAnim.on("frame", function() {
            self.flush(); //每间隔16.7ms 监控一次flush
        });
        this.watchAnim.start();
        this._needRefresh = false;
    }

    //监控 this._needRefresh 的开关
    flush() {
        // console.log(this._needRefresh);
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
        ele.__hr = this; //保存当前元素的绘图环境
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

    //销毁
    dispose() {
        this.watchAnim.clear();
        this.storage.dispose();
        this.painter.dispose();

        this.watchAnim = null;
        this.storage = null;
        this.painter = null;

        delete instances[this.id];
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

// Simple LRU cache use doubly linked list

/**
 * Simple double linked list. Compared with array, it has O(1) remove operation.
 * @constructor
 */
var LinkedList = function () {

    /**
     * @property {LRU~Entry}
     */
    this.head = null;

    /**
     * @property {LRU~Entry}
     */
    this.tail = null;

    this._len = 0;
};

var linkedListProto = LinkedList.prototype;
/**
 * Insert a new value at the tail
 * @param  {} val
 * @return {LRU~Entry}
 */
linkedListProto.insert = function (val) {
    var entry = new Entry(val);
    this.insertEntry(entry);
    return entry;
};

/**
 * Insert an entry at the tail
 * @param  {LRU~Entry} entry
 */
linkedListProto.insertEntry = function (entry) {
    if (!this.head) {
        this.head = this.tail = entry;
    }
    else {
        this.tail.next = entry;
        entry.prev = this.tail;
        entry.next = null;
        this.tail = entry;
    }
    this._len++;
};

/**
 * Remove entry.
 * @param  {LRU~Entry} entry
 */
linkedListProto.remove = function (entry) {
    var prev = entry.prev;
    var next = entry.next;
    if (prev) {
        prev.next = next;
    }
    else {
        // Is head
        this.head = next;
    }
    if (next) {
        next.prev = prev;
    }
    else {
        // Is tail
        this.tail = prev;
    }
    entry.next = entry.prev = null;
    this._len--;
};

/**
 * @return {Number}
 */
linkedListProto.len = function () {
    return this._len;
};

/**
 * Clear list
 */
linkedListProto.clear = function () {
    this.head = this.tail = null;
    this._len = 0;
};

/**
 * @constructor
 * @param {} val
 */
var Entry = function (val) {
    /**
     * @property {}
     */
    this.value = val;

    /**
     * @property {LRU~Entry}
     */
    this.next;

    /**
     * @property {LRU~Entry}
     */
    this.prev;
};

/**
 * LRU Cache
 * @constructor
 * @alias LRU
 */
var LRU = function (maxSize) {

    this._list = new LinkedList();

    this._map = {};

    this._maxSize = maxSize || 10;

    this._lastRemovedEntry = null;
};

var LRUProto = LRU.prototype;

/**
 * @param  {String} key
 * @param  {} value
 * @return {} Removed value
 */
LRUProto.put = function (key, value) {
    var list = this._list;
    var map = this._map;
    var removed = null;
    if (map[key] == null) {
        var len = list.len();
        // Reuse last removed entry
        var entry = this._lastRemovedEntry;

        if (len >= this._maxSize && len > 0) {
            // Remove the least recently used
            var leastUsedEntry = list.head;
            list.remove(leastUsedEntry);
            delete map[leastUsedEntry.key];

            removed = leastUsedEntry.value;
            this._lastRemovedEntry = leastUsedEntry;
        }

        if (entry) {
            entry.value = value;
        }
        else {
            entry = new Entry(value);
        }
        entry.key = key;
        list.insertEntry(entry);
        map[key] = entry;
    }

    return removed;
};

/**
 * @param  {String} key
 * @return {}
 */
LRUProto.get = function (key) {
    var entry = this._map[key];
    var list = this._list;
    if (entry != null) {
        // Put the latest used entry in the tail
        if (entry !== list.tail) {
            list.remove(entry);
            list.insertEntry(entry);
        }

        return entry.value;
    }
};

/**
 * Clear the cache
 */
LRUProto.clear = function () {
    this._list.clear();
    this._map = {};
};

var kCSSColorTable = {
    transparent: [0, 0, 0, 0],
    aliceblue: [240, 248, 255, 1],
    antiquewhite: [250, 235, 215, 1],
    aqua: [0, 255, 255, 1],
    aquamarine: [127, 255, 212, 1],
    azure: [240, 255, 255, 1],
    beige: [245, 245, 220, 1],
    bisque: [255, 228, 196, 1],
    black: [0, 0, 0, 1],
    blanchedalmond: [255, 235, 205, 1],
    blue: [0, 0, 255, 1],
    blueviolet: [138, 43, 226, 1],
    brown: [165, 42, 42, 1],
    burlywood: [222, 184, 135, 1],
    cadetblue: [95, 158, 160, 1],
    chartreuse: [127, 255, 0, 1],
    chocolate: [210, 105, 30, 1],
    coral: [255, 127, 80, 1],
    cornflowerblue: [100, 149, 237, 1],
    cornsilk: [255, 248, 220, 1],
    crimson: [220, 20, 60, 1],
    cyan: [0, 255, 255, 1],
    darkblue: [0, 0, 139, 1],
    darkcyan: [0, 139, 139, 1],
    darkgoldenrod: [184, 134, 11, 1],
    darkgray: [169, 169, 169, 1],
    darkgreen: [0, 100, 0, 1],
    darkgrey: [169, 169, 169, 1],
    darkkhaki: [189, 183, 107, 1],
    darkmagenta: [139, 0, 139, 1],
    darkolivegreen: [85, 107, 47, 1],
    darkorange: [255, 140, 0, 1],
    darkorchid: [153, 50, 204, 1],
    darkred: [139, 0, 0, 1],
    darksalmon: [233, 150, 122, 1],
    darkseagreen: [143, 188, 143, 1],
    darkslateblue: [72, 61, 139, 1],
    darkslategray: [47, 79, 79, 1],
    darkslategrey: [47, 79, 79, 1],
    darkturquoise: [0, 206, 209, 1],
    darkviolet: [148, 0, 211, 1],
    deeppink: [255, 20, 147, 1],
    deepskyblue: [0, 191, 255, 1],
    dimgray: [105, 105, 105, 1],
    dimgrey: [105, 105, 105, 1],
    dodgerblue: [30, 144, 255, 1],
    firebrick: [178, 34, 34, 1],
    floralwhite: [255, 250, 240, 1],
    forestgreen: [34, 139, 34, 1],
    fuchsia: [255, 0, 255, 1],
    gainsboro: [220, 220, 220, 1],
    ghostwhite: [248, 248, 255, 1],
    gold: [255, 215, 0, 1],
    goldenrod: [218, 165, 32, 1],
    gray: [128, 128, 128, 1],
    green: [0, 128, 0, 1],
    greenyellow: [173, 255, 47, 1],
    grey: [128, 128, 128, 1],
    honeydew: [240, 255, 240, 1],
    hotpink: [255, 105, 180, 1],
    indianred: [205, 92, 92, 1],
    indigo: [75, 0, 130, 1],
    ivory: [255, 255, 240, 1],
    khaki: [240, 230, 140, 1],
    lavender: [230, 230, 250, 1],
    lavenderblush: [255, 240, 245, 1],
    lawngreen: [124, 252, 0, 1],
    lemonchiffon: [255, 250, 205, 1],
    lightblue: [173, 216, 230, 1],
    lightcoral: [240, 128, 128, 1],
    lightcyan: [224, 255, 255, 1],
    lightgoldenrodyellow: [250, 250, 210, 1],
    lightgray: [211, 211, 211, 1],
    lightgreen: [144, 238, 144, 1],
    lightgrey: [211, 211, 211, 1],
    lightpink: [255, 182, 193, 1],
    lightsalmon: [255, 160, 122, 1],
    lightseagreen: [32, 178, 170, 1],
    lightskyblue: [135, 206, 250, 1],
    lightslategray: [119, 136, 153, 1],
    lightslategrey: [119, 136, 153, 1],
    lightsteelblue: [176, 196, 222, 1],
    lightyellow: [255, 255, 224, 1],
    lime: [0, 255, 0, 1],
    limegreen: [50, 205, 50, 1],
    linen: [250, 240, 230, 1],
    magenta: [255, 0, 255, 1],
    maroon: [128, 0, 0, 1],
    mediumaquamarine: [102, 205, 170, 1],
    mediumblue: [0, 0, 205, 1],
    mediumorchid: [186, 85, 211, 1],
    mediumpurple: [147, 112, 219, 1],
    mediumseagreen: [60, 179, 113, 1],
    mediumslateblue: [123, 104, 238, 1],
    mediumspringgreen: [0, 250, 154, 1],
    mediumturquoise: [72, 209, 204, 1],
    mediumvioletred: [199, 21, 133, 1],
    midnightblue: [25, 25, 112, 1],
    mintcream: [245, 255, 250, 1],
    mistyrose: [255, 228, 225, 1],
    moccasin: [255, 228, 181, 1],
    navajowhite: [255, 222, 173, 1],
    navy: [0, 0, 128, 1],
    oldlace: [253, 245, 230, 1],
    olive: [128, 128, 0, 1],
    olivedrab: [107, 142, 35, 1],
    orange: [255, 165, 0, 1],
    orangered: [255, 69, 0, 1],
    orchid: [218, 112, 214, 1],
    palegoldenrod: [238, 232, 170, 1],
    palegreen: [152, 251, 152, 1],
    paleturquoise: [175, 238, 238, 1],
    palevioletred: [219, 112, 147, 1],
    papayawhip: [255, 239, 213, 1],
    peachpuff: [255, 218, 185, 1],
    peru: [205, 133, 63, 1],
    pink: [255, 192, 203, 1],
    plum: [221, 160, 221, 1],
    powderblue: [176, 224, 230, 1],
    purple: [128, 0, 128, 1],
    red: [255, 0, 0, 1],
    rosybrown: [188, 143, 143, 1],
    royalblue: [65, 105, 225, 1],
    saddlebrown: [139, 69, 19, 1],
    salmon: [250, 128, 114, 1],
    sandybrown: [244, 164, 96, 1],
    seagreen: [46, 139, 87, 1],
    seashell: [255, 245, 238, 1],
    sienna: [160, 82, 45, 1],
    silver: [192, 192, 192, 1],
    skyblue: [135, 206, 235, 1],
    slateblue: [106, 90, 205, 1],
    slategray: [112, 128, 144, 1],
    slategrey: [112, 128, 144, 1],
    snow: [255, 250, 250, 1],
    springgreen: [0, 255, 127, 1],
    steelblue: [70, 130, 180, 1],
    tan: [210, 180, 140, 1],
    teal: [0, 128, 128, 1],
    thistle: [216, 191, 216, 1],
    tomato: [255, 99, 71, 1],
    turquoise: [64, 224, 208, 1],
    violet: [238, 130, 238, 1],
    wheat: [245, 222, 179, 1],
    white: [255, 255, 255, 1],
    whitesmoke: [245, 245, 245, 1],
    yellow: [255, 255, 0, 1],
    yellowgreen: [154, 205, 50, 1]
};

function clampCssByte(i) {
    // Clamp to integer 0 .. 255.
    i = Math.round(i); // Seems to be what Chrome does (vs truncation).
    return i < 0 ? 0 : i > 255 ? 255 : i;
}

function clampCssFloat(f) {
    // Clamp to float 0.0 .. 1.0.
    return f < 0 ? 0 : f > 1 ? 1 : f;
}

function parseCssInt(str) {
    // int or percentage.
    if (str.length && str.charAt(str.length - 1) === "%") {
        return clampCssByte((parseFloat(str) / 100) * 255);
    }
    return clampCssByte(parseInt(str, 10));
}

function parseCssFloat(str) {
    // float or percentage.
    if (str.length && str.charAt(str.length - 1) === "%") {
        return clampCssFloat(parseFloat(str) / 100);
    }
    return clampCssFloat(parseFloat(str));
}

function cssHueToRgb(m1, m2, h) {
    if (h < 0) {
        h += 1;
    } else if (h > 1) {
        h -= 1;
    }

    if (h * 6 < 1) {
        return m1 + (m2 - m1) * h * 6;
    }
    if (h * 2 < 1) {
        return m2;
    }
    if (h * 3 < 2) {
        return m1 + (m2 - m1) * (2 / 3 - h) * 6;
    }
    return m1;
}

function setRgba(out, r, g, b, a) {
    out[0] = r;
    out[1] = g;
    out[2] = b;
    out[3] = a;
    return out;
}
function copyRgba(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
}

var colorCache = new LRU(20);
var lastRemovedArr = null;

function putToCache(colorStr, rgbaArr) {
    // Reuse removed array
    if (lastRemovedArr) {
        copyRgba(lastRemovedArr, rgbaArr);
    }
    lastRemovedArr = colorCache.put(colorStr, lastRemovedArr || rgbaArr.slice());
}

/**
 * @param {String} colorStr
 * @param {Array<Number>} out
 * @return {Array<Number>}
 */
function parse(colorStr, rgbaArr) {
    if (!colorStr) {
        return;
    }
    rgbaArr = rgbaArr || [];

    var cached = colorCache.get(colorStr);
    if (cached) {
        return copyRgba(rgbaArr, cached);
    }

    // colorStr may be not string
    colorStr = colorStr + "";
    // Remove all whitespace, not compliant, but should just be more accepting.
    var str = colorStr.replace(/ /g, "").toLowerCase();

    // Color keywords (and transparent) lookup.
    if (str in kCSSColorTable) {
        copyRgba(rgbaArr, kCSSColorTable[str]);
        putToCache(colorStr, rgbaArr);
        return rgbaArr;
    }

    // #abc and #abc123 syntax.
    if (str.charAt(0) === "#") {
        if (str.length === 4) {
            var iv = parseInt(str.substr(1), 16); // TODO(deanm): Stricter parsing.
            if (!(iv >= 0 && iv <= 0xfff)) {
                setRgba(rgbaArr, 0, 0, 0, 1);
                return; // Covers NaN.
            }
            setRgba(rgbaArr, ((iv & 0xf00) >> 4) | ((iv & 0xf00) >> 8), (iv & 0xf0) | ((iv & 0xf0) >> 4), (iv & 0xf) | ((iv & 0xf) << 4), 1);
            putToCache(colorStr, rgbaArr);
            return rgbaArr;
        } else if (str.length === 7) {
            var iv = parseInt(str.substr(1), 16); // TODO(deanm): Stricter parsing.
            if (!(iv >= 0 && iv <= 0xffffff)) {
                setRgba(rgbaArr, 0, 0, 0, 1);
                return; // Covers NaN.
            }
            setRgba(rgbaArr, (iv & 0xff0000) >> 16, (iv & 0xff00) >> 8, iv & 0xff, 1);
            putToCache(colorStr, rgbaArr);
            return rgbaArr;
        }

        return;
    }
    var op = str.indexOf("(");
    var ep = str.indexOf(")");
    if (op !== -1 && ep + 1 === str.length) {
        var fname = str.substr(0, op);
        var params = str.substr(op + 1, ep - (op + 1)).split(",");
        var alpha = 1; // To allow case fallthrough.
        switch (fname) {
            case "rgba":
                if (params.length !== 4) {
                    setRgba(rgbaArr, 0, 0, 0, 1);
                    return;
                }
                alpha = parseCssFloat(params.pop()); // jshint ignore:line
            // Fall through.
            case "rgb":
                if (params.length !== 3) {
                    setRgba(rgbaArr, 0, 0, 0, 1);
                    return;
                }
                setRgba(rgbaArr, parseCssInt(params[0]), parseCssInt(params[1]), parseCssInt(params[2]), alpha);
                putToCache(colorStr, rgbaArr);
                return rgbaArr;
            case "hsla":
                if (params.length !== 4) {
                    setRgba(rgbaArr, 0, 0, 0, 1);
                    return;
                }
                params[3] = parseCssFloat(params[3]);
                hsla2rgba(params, rgbaArr);
                putToCache(colorStr, rgbaArr);
                return rgbaArr;
            case "hsl":
                if (params.length !== 3) {
                    setRgba(rgbaArr, 0, 0, 0, 1);
                    return;
                }
                hsla2rgba(params, rgbaArr);
                putToCache(colorStr, rgbaArr);
                return rgbaArr;
            default:
                return;
        }
    }

    setRgba(rgbaArr, 0, 0, 0, 1);
    return;
}

/**
 * @param {Array<Number>} hsla
 * @param {Array<Number>} rgba
 * @return {Array<Number>} rgba
 */
function hsla2rgba(hsla, rgba) {
    var h = (((parseFloat(hsla[0]) % 360) + 360) % 360) / 360; // 0 .. 1
    // NOTE(deanm): According to the CSS spec s/l should only be
    // percentages, but we don't bother and let float or percentage.
    var s = parseCssFloat(hsla[1]);
    var l = parseCssFloat(hsla[2]);
    var m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
    var m1 = l * 2 - m2;

    rgba = rgba || [];
    setRgba(rgba, clampCssByte(cssHueToRgb(m1, m2, h + 1 / 3) * 255), clampCssByte(cssHueToRgb(m1, m2, h) * 255), clampCssByte(cssHueToRgb(m1, m2, h - 1 / 3) * 255), 1);

    if (hsla.length === 4) {
        rgba[3] = hsla[3];
    }

    return rgba;
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
function isString(val) {
    return Object.prototype.toString.call(val) === "[object String]";
}
function isNumber(val) {
    return !isNaN(parseFloat(val)) && isFinite(val);
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

/** 拷贝父类上的属性，此方法用来支持那么没有按照 ES6 语法编写的类。
 *
 * @param {*} target 子类的实例
 * @param {*} SuperClass 父类的构造函数
 * @param {*} opts 父类构造参数
 */
function inheritProperties(target, SuperClass, opts) {
    let src = new SuperClass(opts);
    for (let name in src) {
        if (src.hasOwnProperty(name)) {
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
    let argLen = arguments.length;
    let overwrite = false;
    if (typeof lastArgs === "boolean") {
        overwrite = lastArgs;
        argLen -= 1;
    }
    let target = arguments[0];
    let i = 1;
    let tmp = null;
    let tmp_keys = [];
    for (i; i < argLen; i++) {
        tmp = arguments[i];

        tmp_keys = Object.getOwnPropertyNames(tmp);
        if (tmp_keys.length) {
            tmp_keys.forEach(function(prop) {
                if (prop !== "constructor" && prop !== "prototype") {
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

//7.判断是否为类数组
function isArrayLike(data) {
    if (!data) return;
    if (typeof data === "string") return;
    return typeof data.length === "number";
}

//8. 关键帧的值 , 值的第一项是数组则为2
function getArrayDim(keyframes) {
    let lastValue = keyframes[keyframes.length - 1].value;
    return isArrayLike(lastValue && lastValue[0]) ? 2 : 1;
}

function isArraySame(arr0, arr1, arrDim) {
    if (arr0 === arr1) return true;
    let len = arr0.length;
    if (len !== arr1.length) return false;
    //最后一个值不是数组
    if (arrDim === 1) {
        for (let i = 0; i < len; i++) {
            if (arr0[i] !== arr1[i]) {
                //两个数组不一样
                return false;
            }
        }
    } else {
        //最后一个值是数组
        let len2 = arr0[0].length;
        for (let i = 0; i < len; i++) {
            for (let j = 0; j < len2; j++) {
                if (arr0[i][j] !== arr1[i][j]) {
                    return false;
                }
            }
        }
    }
    return true;
}

function fillArr(arr0, arr1, arrDim) {
    let len0 = arr0.length;
    let len1 = arr1.length;
    if (len0 !== len1) {
        //对比数组的长度，统一为最小长度
        let len0_isLarger = len0 > len1 ? true : false;
        if (len0_isLarger) {
            //第一个数组比较长,裁切数组长度。
            arr0.length = len1;
        } else {
            // 用后一个数组填充前一个数组
            for (let i = len0; i < len1; i++) {
                arr0.push(arrDim === 1 ? arr1[i] : Array.prototype.slice.call(arr1[i]));
            }
        }
    }

    let len2 = arr0[0] && arr0[0].length;
    for (var i = 0; i < arr0.length; i++) {
        if (arrDim === 1) {
            if (isNaN(arr0[i])) {
                arr0[i] = arr1[i];
            }
        } else {
            for (var j = 0; j < len2; j++) {
                if (isNaN(arr0[i][j])) {
                    arr0[i][j] = arr1[i][j];
                }
            }
        }
    }
}

/**
 * 字符串插值
 * @param  {String} p0
 * @param  {String} p1
 * @param  {Number} percent
 * @return {String}
 */
function interpolateString(p0, p1, percent) {
    return percent > 0.5 ? p1 : p0;
}

/**
 * 数组插值
 * @param  {Array} p0
 * @param  {Array} p1
 * @param  {Number} percent
 * @param  {Array} out
 * @param  {Number} arrDim
 */
function interpolateArray(p0, p1, percent, out, arrDim) {
    var len = p0.length;
    if (!len) return;
    if (arrDim === 1) {
        for (var i = 0; i < len; i++) {
            out[i] = interpolateNumber(p0[i], p1[i], percent);
        }
    } else {
        var len2 = p0[0].length;
        if (!len2) return;
        for (var i = 0; i < len; i++) {
            if (out[i] === undefined) {
                return;
            }
            for (var j = 0; j < len2; j++) {
                out[i][j] = interpolateNumber(p0[i][j], p1[i][j], percent);
            }
        }
    }
    return out;
}

/**
 * @param  {Number} p0
 * @param  {Number} p1
 * @param  {Number} percent
 * @return {Number}
 */
function interpolateNumber(p0, p1, percent) {
    return (p1 - p0) * percent + p0;
}


/**
 * Catmull Rom interpolate number
 * @param  {Number} p0
 * @param  {Number} p1
 * @param  {Number} p2
 * @param  {Number} p3
 * @param  {Number} t
 * @param  {Number} t2
 * @param  {Number} t3
 * @return {Number}
 */
function catmullRomInterpolate(p0, p1, p2, p3, t, t2, t3) {
    var v0 = (p2 - p0) * 0.5;
    var v1 = (p3 - p1) * 0.5;
    return (2 * (p1 - p2) + v0 + v1) * t3
            + (-3 * (p1 - p2) - 2 * v0 - v1) * t2
            + v0 * t + p1;
}

function rgba2String(rgba) {
    rgba[0] = Math.floor(rgba[0]);
    rgba[1] = Math.floor(rgba[1]);
    rgba[2] = Math.floor(rgba[2]);

    return 'rgba(' + rgba.join(',') + ')';
}


/**
 * Catmull Rom interpolate array
 * @param  {Array} p0
 * @param  {Array} p1
 * @param  {Array} p2
 * @param  {Array} p3
 * @param  {Number} t
 * @param  {Number} t2
 * @param  {Number} t3
 * @param  {Array} out
 * @param  {Number} arrDim
 */
function catmullRomInterpolateArray(
    p0, p1, p2, p3, t, t2, t3, out, arrDim
) {
    var len = p0.length;
    if (arrDim === 1) {
        for (var i = 0; i < len; i++) {
            out[i] = catmullRomInterpolate(
                p0[i], p1[i], p2[i], p3[i], t, t2, t3
            );
        }
    }
    else {
        var len2 = p0[0].length;
        for (var i = 0; i < len; i++) {
            for (var j = 0; j < len2; j++) {
                out[i][j] = catmullRomInterpolate(
                    p0[i][j], p1[i][j], p2[i][j], p3[i][j],
                    t, t2, t3
                );
            }
        }
    }
}

let ArrayCtor = typeof Float32Array === "undefined" ? Array : Float32Array;

function create() {
    let out = new ArrayCtor(6);
    identity(out);
    return out;
}

//设置矩阵
function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
}

/**
 * 缩放变换
 * @param {Float32Array|Array.<number>} out
 * @param {Float32Array|Array.<number>} a
 * @param {Float32Array|Array.<number>} v
 */
function scale(out, a, v) {
    var vx = v[0];
    var vy = v[1];
    out[0] = a[0] * vx;
    out[1] = a[1] * vy;
    out[2] = a[2] * vx;
    out[3] = a[3] * vy;
    out[4] = a[4] * vx;
    out[5] = a[5] * vy;
    return out;
}

/**
 * 旋转变换
 * @param {Float32Array|Array.<number>} out
 * @param {Float32Array|Array.<number>} a
 * @param {number} rad
 */
function rotate(out, a, rad) {
    var aa = a[0];
    var ac = a[2];
    var atx = a[4];
    var ab = a[1];
    var ad = a[3];
    var aty = a[5];
    var st = Math.sin(rad);
    var ct = Math.cos(rad);

    out[0] = aa * ct + ab * st;
    out[1] = -aa * st + ab * ct;
    out[2] = ac * ct + ad * st;
    out[3] = -ac * st + ct * ad;
    out[4] = ct * atx + st * aty;
    out[5] = ct * aty - st * atx;
    return out;
}

/**
 * 求逆矩阵
 * @param {Float32Array|Array.<number>} out
 * @param {Float32Array|Array.<number>} a
 */
function invert(out, a) {
    var aa = a[0];
    var ac = a[2];
    var atx = a[4];
    var ab = a[1];
    var ad = a[3];
    var aty = a[5];

    var det = aa * ad - ab * ac;
    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = ad * det;
    out[1] = -ab * det;
    out[2] = -ac * det;
    out[3] = aa * det;
    out[4] = (ac * aty - ad * atx) * det;
    out[5] = (ab * atx - aa * aty) * det;
    return out;
}

var EPSILON = 5e-5;
function Transformable(opts = {}) {
    this.origin = !opts.origin ? [0, 0] : opts.origin;
    this.rotation = !opts.rotation ? 0 : opts.rotation;
    this.position = !opts.position ? [0, 0] : opts.position;
    this.scale = !opts.scale ? [1, 1] : opts.scale;
    this.skew = !opts.skew ? [0, 0] : opts.skew;
    this.globalScaleRatio = 1;
    // console.log(this.position);
}

Transformable.prototype = {
    constructor: Transformable,

    //是否需要
    needLocalTransform() {
        // console.log(this);
        return (
            isNotAroundZero(this.rotation) ||
            isNotAroundZero(this.position[0]) ||
            isNotAroundZero(this.position[1]) ||
            isNotAroundZero(this.scale[0] - 1) ||
            isNotAroundZero(this.scale[1] - 1)
        );
    },

    //更新图形的偏移矩阵
    updateTransform() {
        let parent = this.parent;
        let parent_trans = parent && parent.transform;
        // 判断是位置是否接近0, 接近0为false (不变化矩阵)
        let needLocalTransform = this.needLocalTransform();

        let m = this.transform;
        if (!(needLocalTransform || parent_trans)) {
            m && identity(m);
            return;
        }
        //创建矩阵
        m = m || create();
        // console.log(m);

        if (needLocalTransform) {
           m = this.getLocalTransform(m);
        } else {
            identity(m);
        }

        this.transform = m;
        // var globalScaleRatio = this.globalScaleRatio;

        this.invTransform = this.invTransform || create();
        invert(this.invTransform, m);
    },

    /**
     * 将自己的transform应用到context上
     * @param {CanvasRenderingContext2D} ctx
     */
    setTransform(ctx) {
        let m = this.transform;
        let dpr = ctx.dpr || 1;
        // console.log(this.type, m);
        if (m) {
            ctx.setTransform(dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * m[4], dpr * m[5]);
        } else {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    },

    getLocalTransform(m = []) {
        identity(m);

        let origin = this.origin;
        let scale$1 = this.scale || [1, 1];
        let rotation = this.rotation || 0;
        let position = this.position || [0, 0];

        if (origin) {
            m[4] -= origin[0];
            m[5] -= origin[1];
        }

        scale(m, m, scale$1);
        if (rotation) {
            rotate(m, m, rotation);
        }

        if (origin) {
            m[4] += origin[0];
            m[5] += origin[1];
        }

        m[4] += position[0];
        m[5] += position[1];
        return m;
    }
};

//tools --- 判断不在0附近
function isNotAroundZero(val) {
    return val > EPSILON || val < -EPSILON;
}

let PI = Math.PI;
/**
 * 缓动代码来自 https://github.com/sole/tween.js/blob/master/src/Tween.js
 * 这里的缓动主要是一些数学计算公式，这些公式可以用来计算对象的坐标。
 * @see http://sole.github.io/tween.js/examples/03_graphs.html
 * @exports qrenderer/animation/easing
 */
let easing = {
    /**
     * @param {Number} k
     * @return {Number}
     */
    linear: function(k) {
        return k;
    },

    /**
     * @param {Number} k
     * @return {Number}
     */
    quadraticIn: function(k) {
        return k * k;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    quadraticOut: function(k) {
        return k * (2 - k);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    quadraticInOut: function(k) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k;
        }
        return -0.5 * (--k * (k - 2) - 1);
    },

    // 三次方的缓动（t^3）
    /**
     * @param {Number} k
     * @return {Number}
     */
    cubicIn: function(k) {
        return k * k * k;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    cubicOut: function(k) {
        return --k * k * k + 1;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    cubicInOut: function(k) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k * k;
        }
        return 0.5 * ((k -= 2) * k * k + 2);
    },

    // 四次方的缓动（t^4）
    /**
     * @param {Number} k
     * @return {Number}
     */
    quarticIn: function(k) {
        return k * k * k * k;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    quarticOut: function(k) {
        return 1 - --k * k * k * k;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    quarticInOut: function(k) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k * k * k;
        }
        return -0.5 * ((k -= 2) * k * k * k - 2);
    },

    // 五次方的缓动（t^5）
    /**
     * @param {Number} k
     * @return {Number}
     */
    quinticIn: function(k) {
        return k * k * k * k * k;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    quinticOut: function(k) {
        return --k * k * k * k * k + 1;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    quinticInOut: function(k) {
        if ((k *= 2) < 1) {
            return 0.5 * k * k * k * k * k;
        }
        return 0.5 * ((k -= 2) * k * k * k * k + 2);
    },

    // 正弦曲线的缓动（sin(t)）
    /**
     * @param {Number} k
     * @return {Number}
     */
    sinusoidalIn: function(k) {
        return 1 - Math.cos((k * PI) / 2);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    sinusoidalOut: function(k) {
        return Math.sin((k * PI) / 2);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    sinusoidalInOut: function(k) {
        return 0.5 * (1 - Math.cos(PI * k));
    },

    // 指数曲线的缓动（2^t）
    /**
     * @param {Number} k
     * @return {Number}
     */
    exponentialIn: function(k) {
        return k === 0 ? 0 : Math.pow(1024, k - 1);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    exponentialOut: function(k) {
        return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    exponentialInOut: function(k) {
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        if ((k *= 2) < 1) {
            return 0.5 * Math.pow(1024, k - 1);
        }
        return 0.5 * (-Math.pow(2, -10 * (k - 1)) + 2);
    },

    // 圆形曲线的缓动（sqrt(1-t^2)）
    /**
     * @param {Number} k
     * @return {Number}
     */
    circularIn: function(k) {
        return 1 - Math.sqrt(1 - k * k);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    circularOut: function(k) {
        return Math.sqrt(1 - --k * k);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    circularInOut: function(k) {
        if ((k *= 2) < 1) {
            return -0.5 * (Math.sqrt(1 - k * k) - 1);
        }
        return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
    },

    // 创建类似于弹簧在停止前来回振荡的动画
    /**
     * @param {Number} k
     * @return {Number}
     */
    elasticIn: function(k) {
        let s;
        let a = 0.1;
        let p = 0.4;
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        } else {
            s = (p * Math.asin(1 / a)) / (2 * PI);
        }
        return -(a * Math.pow(2, 10 * (k -= 1)) * Math.sin(((k - s) * (2 * PI)) / p));
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    elasticOut: function(k) {
        let s;
        let a = 0.1;
        let p = 0.4;
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        } else {
            s = (p * Math.asin(1 / a)) / (2 * PI);
        }
        return a * Math.pow(2, -10 * k) * Math.sin(((k - s) * (2 * PI)) / p) + 1;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    elasticInOut: function(k) {
        let s;
        let a = 0.1;
        let p = 0.4;
        if (k === 0) {
            return 0;
        }
        if (k === 1) {
            return 1;
        }
        if (!a || a < 1) {
            a = 1;
            s = p / 4;
        } else {
            s = (p * Math.asin(1 / a)) / (2 * PI);
        }
        if ((k *= 2) < 1) {
            return -0.5 * (a * Math.pow(2, 10 * (k -= 1)) * Math.sin(((k - s) * (2 * PI)) / p));
        }
        return a * Math.pow(2, -10 * (k -= 1)) * Math.sin(((k - s) * (2 * PI)) / p) * 0.5 + 1;
    },

    // 在某一动画开始沿指示的路径进行动画处理前稍稍收回该动画的移动
    /**
     * @param {Number} k
     * @return {Number}
     */
    backIn: function(k) {
        let s = 1.70158;
        return k * k * ((s + 1) * k - s);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    backOut: function(k) {
        let s = 1.70158;
        return --k * k * ((s + 1) * k + s) + 1;
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    backInOut: function(k) {
        let s = 1.70158 * 1.525;
        if ((k *= 2) < 1) {
            return 0.5 * (k * k * ((s + 1) * k - s));
        }
        return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
    },

    // 创建弹跳效果
    /**
     * @param {Number} k
     * @return {Number}
     */
    bounceIn: function(k) {
        return 1 - easing.bounceOut(1 - k);
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    bounceOut: function(k) {
        if (k < 1 / 2.75) {
            return 7.5625 * k * k;
        } else if (k < 2 / 2.75) {
            return 7.5625 * (k -= 1.5 / 2.75) * k + 0.75;
        } else if (k < 2.5 / 2.75) {
            return 7.5625 * (k -= 2.25 / 2.75) * k + 0.9375;
        } else {
            return 7.5625 * (k -= 2.625 / 2.75) * k + 0.984375;
        }
    },
    /**
     * @param {Number} k
     * @return {Number}
     */
    bounceInOut: function(k) {
        if (k < 0.5) {
            return easing.bounceIn(k * 2) * 0.5;
        }
        return easing.bounceOut(k * 2 - 1) * 0.5 + 0.5;
    }
};

/**
 * @class qrenderer.animation.Timeline
 * Timeline，时间线，用来计算元素上的某个属性在指定时间点的数值。
 *
 */

class Timeline {
    constructor(options) {
        this._target = options.target;
        this._lifeTime = options.lifeTime || 1000;
        this._delay = options.delay || 0;
        this._initialized = false;
        this.loop = options.loop == null ? false : options.loop;
        this.gap = options.gap || 0;
        this.easing = options.easing || "Linear";
        this.onframe = options.onframe;
        this.ondestroy = options.ondestroy;
        this.onrestart = options.onrestart;

        this._pausedTime = 0;
        this._paused = false;
    }
    /**
     *
     * @param {Number} globalTime  监控 开始更新的时间
     * @param {Number} deltaTime  监控的持续时间
     */
    nextFrame(globalTime, deltaTime) {
        if (!this._initialized) {
            this._startTime = globalTime + this._delay;
            this._initialized = true;
        }
        if (this._paused) {
            this._pausedTime += deltaTime;
            return;
        }

        let percent = (globalTime - this._startTime - this._pausedTime) / this._lifeTime;

        //还没开始
        if (percent < 0) {
            return;
        }

        //超过 100%，就停止在100%
        percent = Math.min(percent, 1);

        let easing$1 = this.easing;
        let easingFunc = typeof easing$1 === "string" ? easing[easing$1] : easing$1; //调取缓动函数

        let schedule = typeof easingFunc === "function" ? easingFunc(percent) : percent; //返回缓动的数据

        //将缓动的数据传递给 关键帧函数 onframe(target, percent)
        this.fire("frame", schedule);

        if (percent === 1) {
            // console.log(percent);
            if (this.loop) {
                this.restart(globalTime);
                return "restart";
            }
            return "destroy";
        }
        return percent;
    }

    /**
     * @method restart
     * 重新开始
     * @param {Number} globalTime
     */
    restart(globalTime) {
        let remainder = (globalTime - this._startTime - this._pausedTime) % this._lifeTime;
        this._startTime = globalTime - remainder + this.gap;
        this._pausedTime = 0;
    }

    /**
     * @method fire
     * 触发事件
     * @param {String} eventType
     * @param {Object} arg
     */
    fire(eventType, arg) {
        eventType = "on" + eventType;
        if (this[eventType]) {
            this[eventType](this._target, arg);
        }
    }
}

class Track {
    constructor(opts) {
        this._target = opts._target;
        this._delay = opts._delay;

        this.isFinished = false;
        this.keyFrames = [];
        this.timeline;
    }

    addKeyFrame(kf) {
        this.keyFrames.push(kf);
    }

    start(propName, loop = false, easing = "", forceAnimate = false) {
        //将所有关键帧的值，统一长度，填充空缺。
        let options = this._parseKeyFrames(easing, propName, loop, forceAnimate);
        // console.log(options);
        if (!options) {
            return null;
        }

        let timeline = new Timeline(options);
        this.timeline = timeline;
    }

    nextFrame(time, delta) {
        // console.log(time, delta);
        if (!this.timeline) {
            return;
        }
        //时间线返回动画执行的进度： 进度百分比 or  'restart' or 'destory'
        let result = this.timeline.nextFrame(time, delta);

        if (isString(result) && result === "destroy") {
            this.isFinished = true;
        }
        // console.log(result);
        return result;
    }
    /**
     * @method stop
     * 停止动画
     * @param {Boolean} forwardToLast 是否快进到最后一帧
     */
    stop(forwardToLast) {
        if (forwardToLast) {
            // Move to last frame before stop
            this.timeline.onframe(this._target, 1);
        }
    }

    fire(eventType, arg) {
        this.timeline.fire(eventType, arg);
    }

    /**
     * @private
     * @method _parseKeyFrames
     * 解析关键帧，创建时间线
     * @param {String} easing 缓动函数名称
     * @param {String} propName 属性名称
     * @param {Boolean} forceAnimate 是否强制开启动画
     * //TODO:try move this into webworker
     */
    _parseKeyFrames(easing, propName, loop, forceAnimate) {
        let target = this._target;
        let useSpline = easing === "spline";
        let kfLength = this.keyFrames.length;
        if (!kfLength) return;

        let firstVal = this.keyFrames[0].value; //第一帧的值
        let isValueArray = isArrayLike(firstVal); //第一帧的值是否为数组
        let isValueColor = false;
        let isValueString = false;
        // 判断关键帧的值 值的第一项是不是数组
        let arrDim = isValueArray ? getArrayDim(this.keyFrames) : 0;
        //把所有的帧进行排序
        this.keyFrames.sort((a, b) => {
            return a.time - b.time;
        });

        let trackMaxTime = this.keyFrames[kfLength - 1].time; //最后一帧时间
        let kfPercents = []; //所有关键帧的时间转化为百分比
        let kfValues = []; //所有关键帧的值
        let preValue; //前一帧的值
        let isAllValuesEqual = false; //所有的值都相等

        for (let i = 0; i < kfLength; i++) {
            kfPercents.push(this.keyFrames[i].time / trackMaxTime); //将所有的帧，转换为百分比
            let curVal = this.keyFrames[i].value;

            preValue = i > 0 ? this.keyFrames[i - 1].value : [];
            //检测上一帧 和 当前帧 是否一致
            if (!(isValueArray && isArraySame(curVal, preValue, arrDim)) || (!isValueArray && curVal !== preValue)) {
                isAllValuesEqual = false;
            }

            //尝试转换 字符串颜色
            if (typeof curVal === "string") {
                let colorArray = parse(curVal);
                if (colorArray) {
                    curVal = colorArray;
                    isValueColor = true;
                } else {
                    isValueString = true;
                }
            }
            kfValues.push(curVal);
        }

        if (!forceAnimate && isAllValuesEqual) {
            return;
        }

        let lastValue = kfValues[kfLength - 1]; //最后一帧的值
        //循环，补全空缺的数值，让所有的数值长度都统一
        for (let i = 0; i < kfLength; i++) {
            if (isValueArray) {
                fillArr(kfValues[i], lastValue, arrDim);
            } else {
                if (isNaN(kfValues[i] && !isNaN(lastValue) && !isValueString && !isValueColor)) {
                    kfValues[i] = lastValue;
                }
            }
        }
        // console.log(propName);
        isValueArray && fillArr(target[propName], lastValue, arrDim); //将元素的属性指定定格到最后一帧。

        //缓存最后一帧的关键帧，加快动画播放时的速度
        let lastFrame = 0;
        let lastFramePercent = 0; //
        let start;
        let w;
        let p0;
        let p1;
        let p2;
        let p3;
        let rgba = [0, 0, 0, 0];
        //参数： （元素， 经过数学计算之后的数据）
        let onframe = function(target, percent) {
            // console.log(percent);
            let frame; //保存最后一帧的序列

            if (percent < 0) {
                //当前时间帧小于0，frame 就是第一帧
                frame = 0;
            } else if (percent < lastFramePercent) {
                //当前时间小于 最后一帧时间，

                start = Math.min(lastFrame + 1, kfLength - 1); //倒数第一帧
                for (frame = start; frame >= 0; frame--) {
                    if (kfLength[frame] <= percent) {
                        break;
                    }
                    frame = Math.min(frame, kfLength - 2); //倒数第二帧
                }
            } else {
                //当前时间 大于  最后一帧时间
                for (frame = lastFrame; frame < kfLength; frame++) {
                    if (kfPercents[frame] > percent) {
                        break;
                    }
                }
                frame = Math.min(frame - 1, kfLength - 2);
            }
            lastFrame = frame;
            lastFramePercent = percent;

            let range = kfPercents[frame + 1] - kfPercents[frame];
            if (range === 0) {
                return;
            } else {
                w = (percent - kfPercents[frame]) / range;
            }

            if (useSpline) {
                p1 = kfValues[frame];
                p0 = kfValues[frame === 0 ? frame : frame - 1];
                p2 = kfValues[frame > kfLength - 2 ? kfLength - 1 : frame + 1];
                p3 = kfValues[frame > kfLength - 3 ? kfLength - 1 : frame + 2];
                if (isValueArray) {
                    catmullRomInterpolateArray(p0, p1, p2, p3, w, w * w, w * w * w, target[propName], arrDim);
                } else {
                    let value;
                    if (isValueColor) {
                        value = catmullRomInterpolateArray(p0, p1, p2, p3, w, w * w, w * w * w, rgba, 1);
                        value = rgba2String(rgba);
                    } else if (isValueString) {
                        // String is step(0.5)
                        return interpolateString(p1, p2, w);
                    } else {
                        value = catmullRomInterpolate(p0, p1, p2, p3, w, w * w, w * w * w);
                    }
                    target[propName] = value;
                }
            } else {
                if (isValueArray) {
                    if (kfValues[frame]) {
                        //实时更新元素的属性
                        let res = interpolateArray(kfValues[frame], kfValues[frame + 1], w, target[propName], arrDim);
                        console.log(res);
                    } else {
                        console.log(kfValues, "---", frame);
                    }
                } else {
                    let value;
                    if (isValueColor) {
                        interpolateArray(kfValues[frame], kfValues[frame + 1], w, rgba, 1);
                        value = rgba2String(rgba);
                    } else if (isValueString) {
                        return interpolateString(kfValues[frame], kfValues[frame + 1], w);
                    } else {
                        value = interpolateNumber(kfValues[frame], kfValues[frame + 1], w);
                    }
                    console.log(value);
                    target[propName] = value;
                }
            }
        };

        let options = {
            target: target,
            lifeTime: trackMaxTime,
            loop: loop,
            delay: this._delay,
            onframe: onframe,
            easing: easing && easing !== "spline" ? easing : "Linear"
        };
        return options;
    }
}

/**
 * 动画控制系统，为动画设置关键帧
 * 引用: Track.js  为每个属性建立各自的动画轨道
 *
 * 每个元素element 实例中都有一个列表，用来存储实例上的动画过程。
 * 列表中的动画按照顺序获得运行机会，  在特定的时间点上只有一个 AnimationPrcoss 处于运行状态，运行的过程由
 * GlobalAnimationMgr 来进行调度。
 *
 * AinmationPrcoss 运行完成后会触发 done 事件， Element 监听done事件后，把对应的动画过程从列表中删除。
 * 如果 Element 实例的动画过程列表中存在多个实例，其中某个过程是无限循环运行的，那么后续所有动画过程都不会获得到运行机会
 *
 * @class AnimationProcess
 */

class AnimationProcess {
    constructor(target, loop) {
        this._trackCacheMap = new Map(); //属性轨道Map {属性名： 对应的track}
        this._target = target; // shape={}  or style={}
        this._loop = loop || false;
        this._delay = 0;
        this._running = false;
        this._paused = false;
        inheritProperties(this, Eventful, this.opts);
    }

    when(time, props) {
        for (let propName in props) {
            if (!props.hasOwnProperty(propName)) {
                continue;
            }

            let value = this._target[propName];
            if (value === null || value === undefined) {
                continue;
            }

            let track = this._trackCacheMap.get(propName);
            //为每一个变化的 属性，建立动画时间线轨道
            if (!track) {
                track = new Track({
                    _target: this._target,
                    _delay: this._delay
                });
            }

            if (time !== 0) {
                //标记第一个关键帧的time为0
                let first_key = track.keyFrames.length && track.keyFrames[0];
                if (!first_key) {
                    track.addKeyFrame({
                        time: 0,
                        value: value
                    });
                }
            }

            //添加关键帧：记录自定义时间 的值
            track.addKeyFrame({
                time: time,
                value: props[propName]
            });

            // console.log(track.keyFrames);

            this._trackCacheMap.set(propName, track);
            return this;
        }
    }

    /**
     * @method start
     * 开始执行动画
     * @param  {Boolean} loop 是否循环
     * @param  {String|Function} [easing] 缓动函数名称，详见{@link qrenderer.animation.easing 缓动引擎}
     * @param  {Boolean} forceAnimate 是否强制开启动画
     * @return {qrenderer.animation.AnimationProcess}
     */
    start(loop = false, easing = "", forceAnima = false) {
        this._running = true;
        this._paused = false;

        let keys = [...this._trackCacheMap.keys()];
        console.log(keys);
        if (!keys.length) {
            this.trigger("done");
            return this;
        }

        keys.forEach((name, index) => {
            //获取属性身上的 track
            let cur_track = this._trackCacheMap.get(name);
            cur_track && cur_track.start(name, loop, easing, forceAnima);
        });
        return this;
    }

    /**
     * 进入到下一帧
     * 在全局的WatchAnim.js 的 update 中 循环监控元素 身上的动画系统，如果存在就执行 nextFrame
     * @param {Number} time 当前时间
     * @param {Number} delta 时间的偏移量
     * @memberof AnimationProcess
     */
    nextFrame(time, delta) {
        this._running = true;
        this._paused = false;
        let percent = "";

        let track_values = [...this._trackCacheMap.values()];
        // console.log(track_values);

        track_values.forEach((track, index) => {
            //时间线返回动画执行的进度： 进度百分比 or  'restart' or 'destory'

            let result = track.nextFrame(time, delta);
            // console.log(result);
            if (isString(result)) ; else if (isNumber(result)) {
                percent = result;
            }
        });

        // console.log(deferredEvents);
        // let len = deferredEvents.length;
        // for (let i = 0; i < len; i++) {
        //     deferredTracks[i].fire(deferredEvents[i]);
        // }

        if (isNumber(percent)) {
            // console.log(percent);
            this.trigger("during", this._target, percent);
        }

        if (this.isFinished()) {
            this.trigger("done");
        }
    }

    /**
     * @method stop
     * 停止动画
     * @param {Boolean} forwardToLast If move to last frame before stop
     */
    stop(forwardToLast) {
        this._running = false;
        this._paused = false;

        [...this._trackCacheMap.values()].forEach((track, index) => {
            track.stop(this._target, 1);
        });
        this._trackCacheMap = new Map();
        this.trigger("stop");
        return this;
    }

    during(cb) {
        this.on("during", cb);
        return this;
    }

    done(cb) {
        this.on("done", cb);
        return this;
    }

    //判断整个动画过程是否已经完成，所有Track上的动画完成，则整个动画过程完成
    isFinished() {
        let isFinished = true;
        let track_values = [...this._trackCacheMap.values()];
        track_values.forEach((track, index) => {
            if (!track.isFinished) {
                isFinished = false;
            }
        });
        return isFinished;
    }
}

mixin(AnimationProcess.prototype, Eventful.prototype);

/**
 * 动画功能的入口
 * 引用AnimationProcess.js 为元素的属性生成 对应的动画系统
 */
let Animatable = function() {
    this.animationProcessList = []; //动画实例列表
};

Animatable.prototype = {
    /**
     * 设置循环动画
     * @param {string} path --- 元素的属性 shape.width   style.fill
     * @param {boolean} loop --- 动画循环
     */
    animate: function(path, loop) {
        let target = this;
        if (path) {
            let path_split = path.split(".");
            for (let i = 0; i < path_split.length; i++) {
                let item = path_split[i]; //'shape' or 'style'...
                if (!this[item]) {
                    continue;
                } else {
                    target = this[item];
                    break;
                }
            }
        }

        //创建动画实例
        let animationProcess = new AnimationProcess(target);
        animationProcess.during(() => {
            this.dirty();
        });
        animationProcess.on("done", () => {
            this.removeAnimationProcess(animationProcess);
        });
        animationProcess.on("stop", () => {
            this.removeAnimationProcess(animationProcess);
        });

        this.animationProcessList.push(animationProcess);
        if (this.__hr) {
            this.__hr.watchAnim.addAnimatable(this); //保存带有带有动画的元素列表
        }
        return animationProcess;
    },

    //从动画队列中删除一组动画
    removeAnimationProcess: function(animationProcess) {
        let index = this.animationProcessList.indexOf(animationProcess);
        if (index >= 0) {
            this.animationProcessList.splice(index, 1);
        }
    },
    //停止动画
    stopAnimation: function(forwardToLast = false) {
        this.animationProcessList.forEach((ap, index) => {
            ap.stop(forwardToLast);
        });
        this.animationProcessList.length = 0;
        return this;
    }
};

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
    let res = mixin(this, opts, false);
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
        //检查当前元素的样式 是否已经改变
        let styleNeedChange = !prevStyle || ctx._stylehasChanged === false;

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

        if (this.hasStroke()) {
            let lineWidth = this.lineWidth;
            let scaleLine = this.strokeNoScale && ele && ele.getLineScale();
            ctx.lineWidth = lineWidth / (scaleLine ? scaleLine : 1);
        }

        //标记当前元素的样式已经改变
        ctx._stylehasChanged = true;
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

        this.__hr = null; //元素被添加到 HumbleRender 实例后，自动赋值

        this.__dirty = true; //下一帧渲染的元素，标记为 dirty（true)

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

    //标记元素需要更新
    // dirty() {
    //     this.__dirty = this.__dirtyText = true;
    //     this._rect = null;
    // }

    //设置元素的属性
    attr(key, value) {
        if (judgeType(key) === "[Object String]") {
            this._setProp(key, value);
        } else if (isObject(key)) {
            for (let name in key) {
                if (key.hasOwnProperty(name)) {
                    this._setProp(name, key[name]);
                }
            }
        }
        // console.log(this._dirty);
        this.dirty();
    }

    //tools 设置属性
    _setProp(key, val) {
        switch (key) {
            case "style":
                copyOwnProperties(this.style, val);
                break;
            case "positon":
            case "scale":
            case "origin":
            case "skew":
            case "translate":
                let target = this[key] ? this[key] : [];
                target[0] = val[0];
                target[1] = val[1];
            default:
                this[key] = val;
                break;
        }
    }
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

    bezierCurveTo: function(x1, y1, x2, y2, x3, y3) {
        // this.addData(CMD.C, x1, y1, x2, y2, x3, y3);
        if (this._ctx) {
            this._needsDash() ? this._dashedBezierTo(x1, y1, x2, y2, x3, y3) : this._ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
        }
        this._xi = x3;
        this._yi = y3;
        return this;
    },

    quadraticCurveTo: function(x1, y1, x2, y2) {
        // this.addData(CMD.Q, x1, y1, x2, y2);
        if (this._ctx) {
            this._needsDash() ? this._dashedQuadraticTo(x1, y1, x2, y2) : this._ctx.quadraticCurveTo(x1, y1, x2, y2);
        }
        this._xi = x2;
        this._yi = y2;
        return this;
    },

    fill: function(ctx) {
        ctx && ctx.fill();
        // this.toStatic();
    },

    stroke: function(ctx) {
        ctx && ctx.stroke();
    },

    setLineDash: function(lineDash) {
        if (lineDash instanceof Array) {
            this._lineDash = lineDash;
            this._dashIdx = 0;
            let lineDashSum = 0;
            for (let i = 0; i < lineDash.length; i++) {
                lineDashSum += lineDashSum[i];
            }
            this._dashSum = lineDashSum;
        }
        return this;
    },

    setLineDashOffset: function(offset) {
        this._dashOffset = offset;
        return this;
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

    //调用canvas API 绘制i
    brush(ctx, prevEl) {
        // console.log(this.shape);
        let path = this.path || new PathProxy(true); //拦截api,增加功能

        let hasStroke = this.style.hasStroke(); //绘制需求
        let hasFill = this.style.hasFill(); //填充需求

        let fill = this.style.fill;
        let stroke = this.style.stroke;

        let hasFillGradient = hasFill && !!fill.colorStops;
        let hasStrokeGradient = hasStroke && !!stroke.colorStops;

        let hasFillPattern = hasFill && !!fill.image;
        let hasStrokePattern = hasStroke && !!stroke.image;

        let ctxLineDash = !!ctx.setLineDash;
        let lineDash = this.style.lineDash;
        let lineDashOffset = this.style.lineDashOffset;

        //在style.bind()中完成 fillSytle  和 strokeStyle的设置

        this.style.bind(ctx, this, prevEl);
        this.setTransform(ctx);

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

        if (hasStrokeGradient) {
            ctx.strokeStyle = this._strokeGradient;
        }

        if (this.__dirtyPath) {
            path.beginPath(ctx);
            if (lineDash && ctxLineDash) {
                ctx.setLineDash(lineDash);
                ctx.lineDashOffset = lineDashOffset;
            }

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

        //清除 虚线对其他图形的影响
        if (lineDash && ctxLineDash) {
            ctx.setLineDash([]);
        }
    }

    //
    dirty() {
        this.__dirty = this.__dirtyText = true;
        this.__hr && this.__hr.refresh();
        if (this.__clipTarget) {
            this.__clipTarget.dirty();
        }
    }

    getLineScale() {
        let m = this.transform;
        return m && Math.abs(m[0] - 1) > 1e-10 && Math.abs(m[3] - 1) > 1e-10 ? Math.sqrt(Math.abs(m[0] * m[3] - m[2] * m[1])) : 1;
    }
}

// 左上、右上、右下、左下角的半径依次为r1、r2、r3、r4
// r缩写为1         相当于 [1, 1, 1, 1]
// r缩写为[1]       相当于 [1, 1, 1, 1]
// r缩写为[1, 2]    相当于 [1, 2, 1, 2]
// r缩写为[1, 2, 3] 相当于 [1, 2, 3, 2]

//tools -- 默认配置

class Rect extends Path {
    constructor(opts) {
        let defaultConfig = {
            shape: {
                r: 0,
                x: 0,
                y: 0,
                width: 0,
                height: 0
            }
        };
        let config =  merge(defaultConfig, opts, true);
        super(config);
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

let defaultConfig = {
    shape: {
        cx: 0,
        cy: 0,
        r: 0
    }
};
class Circle extends Path {
    constructor(opts) {
        super(merge(defaultConfig, opts, true));
        this.type = "circle";
    }

    buildPath(ctx, shape, inBundle) {
        if (inBundle) {
            ctx.moveTo(shape.cx + shape.r, shape.cy);
        }
        ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2, true);
    }
}

/**
 * 弧形
 */
let defaultConfig$1 = {
    shape: {
        cx: 0,
        cy: 0,
        r: 0,
        startAngle: 0,
        endAngle: Math.PI * 2,
        clockwise: true
    },
    style: {
        stroke: null,
        fill: null
    }
};

class Arc extends Path {
    constructor(opts) {
        super(merge(defaultConfig$1, opts, true));
        this.type = "arc";
    }
    /**
     * @method buildPath
     * 绘制元素路径
     * @param {Object} ctx
     * @param {String} shape
     */
    buildPath(ctx, shape) {
        let x = shape.cx;
        let y = shape.cy;
        let r = Math.max(shape.r, 0);
        let startAngle = shape.startAngle;
        let endAngle = shape.endAngle;
        let clockwise = shape.clockwise;

        // let unitX = Math.cos(startAngle);
        // let unitY = Math.sin(startAngle);

        // ctx.moveTo(unitX * r + x, unitY * r + y);
        // console.log(startAngle, endAngle);
        ctx.arc(x, y, r, startAngle, endAngle, !clockwise);
    }
}

/**
 * 扇形
 */
let defaultConfig$2={
    shape: {
        cx: 0,
        cy: 0,
        r: 0,
        startAngle: 0,
        endAngle: Math.PI * 2,
        clockwise: true
    },
    style: {
        stroke: null,
        fill: null
    }
};

class Sector extends Path {
    constructor(opts) {
        super(merge(defaultConfig$2, opts, true));
        this.type = 'arc';
    }
    /**
     * @method buildPath
     * 绘制元素路径
     * @param {Object} ctx 
     * @param {String} shape 
     */
    buildPath(ctx, shape){
        let x = shape.cx;
        let y = shape.cy;
        let r = Math.max(shape.r, 0);
        let startAngle = shape.startAngle;
        let endAngle = shape.endAngle;
        let clockwise = shape.clockwise;


        ctx.moveTo(x,y);
        ctx.arc(x, y, r, startAngle, endAngle, !clockwise);
        ctx.closePath();
    }
}

/**
 * Sub-pixel optimize for canvas rendering, prevent from blur when rendering a thin vertical/horizontal line.
 *  画布渲染优化， 防止水平或垂直线条变得模糊。
 */

/**
 * Sub pixel optimize line for canvas
 *
 * @param {Object} outputShape The modification will be performed on `outputShape`.
 *                 `outputShape` and `inputShape` can be the same object.
 *                 `outputShape` object can be used repeatly, because all of
 *                 the `x1`, `x2`, `y1`, `y2` will be assigned in this method.
 * @param {Object} [inputShape]
 * @param {Number} [inputShape.x1]
 * @param {Number} [inputShape.y1]
 * @param {Number} [inputShape.x2]
 * @param {Number} [inputShape.y2]
 * @param {Object} [style]
 * @param {Number} [style.lineWidth]
 */
function subPixelOptimizeLine(outputShape, inputShape, style) {
    var lineWidth = style && style.lineWidth;

    if (!inputShape || !lineWidth) {
        return;
    }

    var x1 = inputShape.x1;
    var x2 = inputShape.x2;
    var y1 = inputShape.y1;
    var y2 = inputShape.y2;

    if (Math.round(x1 * 2) === Math.round(x2 * 2)) {
        outputShape.x1 = outputShape.x2 = subPixelOptimize(x1, lineWidth, true);
    } else {
        outputShape.x1 = x1;
        outputShape.x2 = x2;
    }
    if (Math.round(y1 * 2) === Math.round(y2 * 2)) {
        outputShape.y1 = outputShape.y2 = subPixelOptimize(y1, lineWidth, true);
    } else {
        outputShape.y1 = y1;
        outputShape.y2 = y2;
    }
}

/**
 * Sub pixel optimize for canvas
 *
 * @param {Number} position Coordinate, such as x, y
 * @param {Number} lineWidth Should be nonnegative integer.
 * @param {boolean=} positiveOrNegative Default false (negative).  正数 或 负数
 * @return {Number} Optimized position.
 */
function subPixelOptimize(position, lineWidth, positiveOrNegative) {
    // Assure that (position + lineWidth / 2) is near integer edge,  确保 在整数附近
    // otherwise line will be fuzzy in canvas. 否则会模糊
    var doubledPosition = Math.round(position * 2);
    return (doubledPosition + Math.round(lineWidth)) % 2 === 0 ? doubledPosition / 2 : (doubledPosition + (positiveOrNegative ? 1 : -1)) / 2;
}

/**
 * 直线
 */

let defaultConfig$3 = {
    shape: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        percent: 1
    },
    style: {
        stroke: "#000",
        fill: null
    }
};

class Line extends Path {
    constructor(opts) {
        super(merge(defaultConfig$3, opts, true));
        this.type = "arc";
    }

    buildPath(ctx, shape) {
        let x1, x2, y1, y2;

        if (this.subPixelOptimize) {
            let subPixelOptimizeOutputShape = {};
            subPixelOptimizeLine(subPixelOptimizeOutputShape, shape, this.style);
            x1 = subPixelOptimizeOutputShape.x1;
            y1 = subPixelOptimizeOutputShape.y1;
            x2 = subPixelOptimizeOutputShape.x2;
            y2 = subPixelOptimizeOutputShape.y2;
        } else {
            x1 = shape.x1;
            y1 = shape.y1;
            x2 = shape.x2;
            y2 = shape.y2;
        }

        let percent = shape.percent;

        if (percent === 0) {
            return;
        }

        ctx.moveTo(x1, y1);

        if (percent < 1) {
            x2 = x1 * (1 - percent) + x2 * percent;
            y2 = y1 * (1 - percent) + y2 * percent;
        }
        ctx.lineTo(x2, y2);
    }
}

/**
 * 直线
 */

let defaultConfig$4 = {
    shape: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        percent: 1
    },
    style: {
        stroke: "#000",
        fill: null,
        lineDash: [5, 10, 15],
        lineDashOffset: 0
    }
};

class LineDash extends Path {
    constructor(opts) {
        super(merge(defaultConfig$4, opts, true));
        this.type = "arc";
    }

    buildPath(ctx, shape) {
        let x1, x2, y1, y2;

        if (this.subPixelOptimize) {
            let subPixelOptimizeOutputShape = {};
            subPixelOptimizeLine(subPixelOptimizeOutputShape, shape, this.style);
            x1 = subPixelOptimizeOutputShape.x1;
            y1 = subPixelOptimizeOutputShape.y1;
            x2 = subPixelOptimizeOutputShape.x2;
            y2 = subPixelOptimizeOutputShape.y2;
        } else {
            x1 = shape.x1;
            y1 = shape.y1;
            x2 = shape.x2;
            y2 = shape.y2;
        }

        let percent = shape.percent;

        if (percent === 0) {
            return;
        }

        ctx.moveTo(x1, y1);

        if (percent < 1) {
            x2 = x1 * (1 - percent) + x2 * percent;
            y2 = y1 * (1 - percent) + y2 * percent;
        }
        ctx.lineTo(x2, y2);
    }
}

/* global Float32Array */

var ArrayCtor$1 = typeof Float32Array === "undefined" ? Array : Float32Array;

/**
 * 创建一个向量
 * @param {Number} [x=0]
 * @param {Number} [y=0]
 * @return {Vector2}
 */
function create$1(x, y) {
    var out = new ArrayCtor$1(2);
    if (x == null) {
        x = 0;
    }
    if (y == null) {
        y = 0;
    }
    out[0] = x;
    out[1] = y;
    return out;
}

/**
 * 曲线辅助模块
 * @author pissang(https://www.github.com/pissang)
 */

// 临时变量
var _v0 = create$1();
var _v1 = create$1();
var _v2 = create$1();

/**
 * 细分三次贝塞尔曲线
 * @param  {Number} p0
 * @param  {Number} p1
 * @param  {Number} p2
 * @param  {Number} p3
 * @param  {Number} t
 * @param  {Array<Number>} out
 */
function cubicSubdivide(p0, p1, p2, p3, t, out) {
    var p01 = (p1 - p0) * t + p0;
    var p12 = (p2 - p1) * t + p1;
    var p23 = (p3 - p2) * t + p2;

    var p012 = (p12 - p01) * t + p01;
    var p123 = (p23 - p12) * t + p12;

    var p0123 = (p123 - p012) * t + p012;
    // Seg0
    out[0] = p0;
    out[1] = p01;
    out[2] = p012;
    out[3] = p0123;
    // Seg1
    out[4] = p0123;
    out[5] = p123;
    out[6] = p23;
    out[7] = p3;
}

/**
 * 细分二次贝塞尔曲线
 * @param  {Number} p0
 * @param  {Number} p1
 * @param  {Number} p2
 * @param  {Number} t
 * @param  {Array<Number>} out
 */
function quadraticSubdivide(p0, p1, p2, t, out) {
    var p01 = (p1 - p0) * t + p0;
    var p12 = (p2 - p1) * t + p1;
    var p012 = (p12 - p01) * t + p01;

    // Seg0
    out[0] = p0;
    out[1] = p01;
    out[2] = p012;

    // Seg1
    out[3] = p012;
    out[4] = p12;
    out[5] = p2;
}

/**
 * 贝塞尔曲线
 */

let defaultConfig$5 = {
    shape: {
        x1: 0, // 开始位置
        y1: 0,
        x2: 0, //结束位置
        y2: 0,
        cpx1: 0,
        cpy1: 0,
        percent: 1
    },
    style: {
        stroke: "#000",
        fill: null
    }
};

let out = [];
class BezierCurve extends Path {
    constructor(opts) {
        super(merge(defaultConfig$5, opts, true));
        this.type = "bezier-curve";
    }

    buildPath(ctx, shape) {
        let x1 = shape.x1;
        let y1 = shape.y1;
        let x2 = shape.x2;
        let y2 = shape.y2;
        let cpx1 = shape.cpx1;
        let cpy1 = shape.cpy1;
        let cpx2 = shape.cpx2;
        let cpy2 = shape.cpy2;
        let percent = shape.percent;
        if (percent === 0) {
            return;
        }

        ctx.moveTo(x1, y1);
        if (cpx2 == null || cpy2 == null) {
            if (percent < 1) {
                quadraticSubdivide(x1, cpx1, x2, percent, out); // 细分二次贝塞尔曲线动态生成 cpx2 cpy2
                cpx1 = out[1];
                x2 = out[2];
                quadraticSubdivide(y1, cpy2, y2, percent, out);
                cpy1 = out[1];
                y2 = out[2];
            }
            ctx.quadraticCurveTo(cpx1, cpy1, x2, y2);
        } else {
            if (percent < 1) {
                cubicSubdivide(x1, cpx1, cpx2, x2, percent, out); //细分三次贝塞尔曲线
                cpx1 = out[1];
                cpx2 = out[2];
                x2 = out[3];
                cubicSubdivide(y1, cpy1, cpy2, y2, percent, out);
                cpy1 = out[1];
                cpy2 = out[2];
                y2 = out[3];
            }
            ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, x2, y2);
        }
    }
}

exports.Arc = Arc;
exports.BezierCurve = BezierCurve;
exports.Circle = Circle;
exports.Line = Line;
exports.LineDash = LineDash;
exports.Rect = Rect;
exports.Sector = Sector;
exports.dispose = dispose;
exports.init = init;
exports.version = version;
//# sourceMappingURL=humble-render.js.map
