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
        if(_h){

        }
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

export default Eventful;