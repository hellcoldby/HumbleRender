/**
 *
 * 内容仓库 (M)，用来存储和管理画布上的所有对象，同时提供绘制和更新队列的功能。
 * 需要绘制的对象首先存储在 Storage 中，然后 Painter 类会从 Storage 中依次取出进行绘图。
 * 利用 Storage 作为内存中转站，对于不需要刷新的对象可以不进行绘制，从而可以提升整体性能。
 *
 */
import Eventful from "../../tools/EventEmitter";
import timeSort from "../../tools/timsort";
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
        timeSort(this.ele_ary, (a, b) => {
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
        //计算图形transform矩阵
        if (ele.__dirty) {
            ele.updateTransform();
        }
        //添加元素到 数组队列中
        this.ele_ary[this.ele_ary_len++] = ele;
    }
}

export default Storage;
