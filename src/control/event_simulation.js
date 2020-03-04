/*
 *
 * event_simulation(事件模拟) 为不支持事件的类提供事件支持
 */

 class Eventful {
     constructor(eventProcessor) {
        this._$handlers = {};  
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
     on(event, query, handler, context) {
        return on(this, event, query, handler, context, false);
     }

     once(event, query, handler, context) {
         return on(this, event, query, handler, context, true);
     }
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



 //tools -- 绑定事件
 function on(eventful, event, query, handler, context, isOnce) {
    let _h = eventful._$handlers;

    //参数自适应 
    if (typeof query === 'function') { 
        context = handler;
        handler = query;
        query = null;
    }

    if(!handler || !event){
        return eventful
    }

    query = normalizeQuery(eventful, query);

    if (!_h[event]) {
        _h[event] = [];
    }

    for (let i = 0; i < _h[event].length; i++) {
        if (_h[event][i].h === handler) {
            return eventful;
        }
    }
    
    let wrap = {
        h: handler,
        one: isOnce,
        query: query,
        ctx: context || eventful,
        callAtLast: ''
    }

    let lastIndex = _h[event].length - 1;
    let lastWrap = _h[event][lastIndex];
    if(lastWrap && lastWrap.callAtLast){
        _h[event].splice(lastIndex, 0, wrap)
    }else{
        _h[event].push(wrap);
    }

    callListenerChanged(eventful, event);
    return eventful;
 }
 export default Eventful;