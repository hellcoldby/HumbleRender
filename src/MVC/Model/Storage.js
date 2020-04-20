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
        if (ele.__storage === this) return;
        this.addToStorage(ele);
    }

    addToStorage(ele) {
        /**
         * 对于group 组，把当前最新的元素列表，同步到所有元素的__storage 属性上,
         * 在Element 函数初始化过程中，元素会订阅 ‘addToStorage’方法
         */
        this.ele_map.set(ele.id, ele);
        ele.trigger("addToStorage", this);
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
        timeSort(this.ele_ary, (a, b) => {
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

        //设置裁剪路径 ??????
        if (ele.clipPaths) {
            if (clipPaths) {
                clipPaths = clipPaths.slice();
            } else {
                clipPaths = [];
            }
            let curClipPath = ele.clipPath;
            let parentClipPath = ele;
            while (curClipPath) {
                curClipPath.parent = parentClipPath;
                curClipPath.updateTransform(); //计算图形transform矩阵
                clipPaths.push(curClipPath);
                parentClipPath = curClipPath;
                curClipPath = curClipPath.clipPath;
            }
        }

        if (ele.type === "group") {
            let children = ele.children;
            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                if (ele.__dirty) {
                    child.__dirty = true;
                }
                this._updateAndAddDisplayable(child, clipPaths, includeIgnore);
            }
            ele.__dirty = false;
        } else {
            // console.log(ele);
            ele.__clipPaths = clipPaths;
            //添加元素到 数组队列中
            this.ele_ary[this.ele_ary_len++] = ele;
        }
    }

    dispose() {
        this.ele_ary = null; //包含所有图形的数组
        this.ele_map = null;
    }

    delFromStorage(el) {
        if (this.ele_map.get(el.id)) {
            this.ele_map.delete(el.id);
            // this.trigger("delFromStorage",el);
            el.trigger("delFromStorage", this);
        }
        return this;
    }

    delFromRoot(el) {
        if (el == null) {
            this.ele_map.forEach((el, id, map) => {
                this.delFromStorage(el);
            });
            this.ele_map = new Map();
            this.ele_ary = [];
            this.ele_ary_len = 0;
            return;
        }

        if (el.forEach) {
            // Array like.
            el.forEach((item, index) => {
                this.delFromRoot(item);
            });
            return;
        }

        this.delFromStorage(el);
    }
}

export default Storage;
