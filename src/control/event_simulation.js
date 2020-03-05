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
                    i++
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

export default Eventful;
