/**
 *
 * 内容仓库 (M)，用来存储和管理画布上的所有对象，同时提供绘制和更新队列的功能。
 * 需要绘制的对象首先存储在 Storage 中，然后 Painter 类会从 Storage 中依次取出进行绘图。
 * 利用 Storage 作为内存中转站，对于不需要刷新的对象可以不进行绘制，从而可以提升整体性能。
 *
 */

import Eventful from "../control/event_simulation";
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

export default Storage;
