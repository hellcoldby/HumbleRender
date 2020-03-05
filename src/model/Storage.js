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
        this._root = new Map(); //元素id 列表
        this._displayList = []; //所有图形的绘制队列
        this._displayList_len = 0;
    }

    addToRoot(ele) {
        if (ele._storage === this) {
            return;
        }
        this.trigger("beforeAddToRoot");
        ele.trigger("beforeAddToRoot");
        this.addToStorage(ele);
    }

    /**
     *
     *  创建基础图形的时候，基础图形订阅了"addToStorage", 调用此方法会触发
     * @param {*} ele
     */
    addToStorage(ele) {
        this._roots.set(el.id, ele);
        this.trigger("addToStorage");
        ele.trigger("addToStorage");
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
            this.updateDisplayList(includeIgnore);
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

        this._roots.forEach((el, id, map) => {
            this._updateAndAddDisplayable(el, null, includeIgnore); //recursive update
        });

        displayList.length = this._displayListLen;
        env.canvasSupported && timsort(displayList, this.displayableSortFunc);
    }
}

export default Storage;
