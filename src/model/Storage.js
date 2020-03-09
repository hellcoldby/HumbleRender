/**
 *
 * 内容仓库 (M)，用来存储和管理画布上的所有对象，同时提供绘制和更新队列的功能。
 * 需要绘制的对象首先存储在 Storage 中，然后 Painter 类会从 Storage 中依次取出进行绘图。
 * 利用 Storage 作为内存中转站，对于不需要刷新的对象可以不进行绘制，从而可以提升整体性能。
 *
 */

import env from "../tools/dev_support";
import Eventful from "../tools/EventEmitter";
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

        if (ele.__dirty) {
            // ele.composeLocalTransform();
        }

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

export default Storage;
