import { devicePixelRatio } from "../tools/dpr";
import CanvasLayer from "./CanvasLayer";

const CANVAS_LEVEL_ID = 314159; //图层id;
const HOVER_LAYER_LEVEL_ID = 1e5; //事件图层id
const ELE_AFTER_INCREMENTAL_INC = 0.01; //图形 增量的初始id
class CanvasPainter {
    constructor(root, storage, opts = {}) {
        this.opts = Object.assign({}, opts);
        // console.log(this.opts);
        this.root = root;
        this.storage = storage;

        this.type = "canvas";
        this.dpr = this.opts.devicePixelRatio || devicePixelRatio; //分辨率

        let layer_id_list = (this.layer_id_list = []); //图层id序列
        let layers = (this.layers_map = {}); // 图层对象列表
        this._layerConfig = {}; //?

        this._needsManuallyCompositing = false; //? 是否需要手动合成
        this._hoverlayer = null; //?

        this._hoverElements = []; //?

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

            layers[CANVAS_LEVEL_ID] = mainLayer;
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

    /**
     * @method
     * 刷新
     * @param {Boolean} [paintAll=false] 是否强制绘制所有displayable
     */
    refresh(paintAll) {
        //从 storage 中获取 元素列表
        let list = this.storage.getDisplayList(true);
        let layer_id_list = this.layer_id_list;

        this._redrawId = Math.random(); // 重绘id
        this._paintList(list, paintAll, this._redrawId); //更新图层，动态创建图层， 绘制图层

        //paint custom layers
        for (let i = 0; i < layer_id_list.length; i++) {
            let id = layer_id_list[i];
            let layer = this.layers_map[id];
            if (!layer.__builtin__ && layer.refresh) {
                let clearColor = i === 0 ? this._backgroundColor : null;
                layer.refresh(clearColor);
            }
        }
        // this.refreshHover(); // 获取图层，动态创建图层，更新图层id 列表

        return this;
    }

    /*
     * @method _paintList
     * @param {} list --- 要绘制的图形列表
     * @param {} redrawId --- 随机生成的重绘id
     */
    _paintList(list, paintAll, redrawId) {
        //如果 redrawId 不一致，说明下一个动画帧已经到来，这里就会直接跳过去，相当于跳过了一帧
        if (this._redrawId !== redrawId) {
            return;
        }
        paintAll = paintAll || false;
        //更新图层状态， 动态创建图层
        this._updateLayerStatus(list); //
        //开始绘制图形
        let finished = this._doPaintList(list, paintAll);
    }

    //更新图层状态
    _updateLayerStatus(list) {
        this.eachBuildinLayer(function(layer, id) {
            layer.__dirty = layer.used = false;
        });

        if (this._singleCanvas) {
            for (let i = 0; i < list.length; i++) {}
        }

        let prevLayer = null;
        let incremental_layer_count = 0; //增量图层计数

        let idx = 0;
        for (let i = 0; i < list.length; i++) {
            idx = i;
            let ele = list[i];
            let hLevel = ele.hLevel; //确定可显示对象可以在画布的哪一层绘制
            let layer;

            if (ele.incremental) {
                //是否增量渲染
            } else {
                let tmp_id = incremental_layer_count > 0 ? ELE_AFTER_INCREMENTAL_INC : 0;
                layer = this.getLayer(hLevel + tmp_id, this._needsManuallyCompositing);
            }

            if (!layer.__builtin__) {
                console.log("ZLevel" + hLevel + "has been used by unknow layer" + layer.id);
            }

            if (layer !== prevLayer) {
                layer.used = true;
                if (layer.__startIndex !== 1) {
                    layer.__dirty = true;
                }
                layer.__startIndex = i;
            }

            if (ele.__dirty) {
                layer.__dirty = true;
                if (layer.incremental && layer.__drawIndex < 0) {
                    layer.__drawIndex = i;
                }
            }
        }

        updatePrevLayer(idx);

        function updatePrevLayer(idx) {
            if (prevLayer) {
                if (prevLayer.__endIndex !== idx) {
                    prevLayer.__dirty = true;
                }
                prevLayer.__endIndex = idx;
            }
        }
    }

    //遍历执行构建完成 图层的回调
    eachBuildinLayer(cb) {
        let layer_id_list = this.layer_id_list;
        let layer;
        for (let i = 0; i < layer_id_list.length; i++) {
            let id = layer_id_list[i];
            layer = this.layers[id];
            if (layer.__builtin__) {
                cb.call(context, layer, id);
            }
        }
    }

    //绘制图形
    _doPaintList(list, paintAll) {
        let layerList = [];
        for (let i = 0; i < this.layer_id_list.length; i++) {
            let id = this.layer_id_list[i];
            let cur_layer = this.layers_map[id];
            if (cur_layer.__builtin__ && cur_layer !== this.__hoverlayer && (cur_layer.__dirty || paintAll)) {
                layerList.push(cur_layer);
            }
        }

        let finished = true;
        console.log(layerList);
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

    //获取图层，如果没有图层就创建一个
    getLayer(curLevelId, virtual) {
        if (this._singleCanvas && !this._needsManuallyCompositing) {
            //如果根节点是canvas,而且不需要手动合成, 那么当前图层id 就是初始化的图层id
            curLevelId = CANVAS_LEVEL_ID;
        }

        let layer = this.layers_map[curLevelId]; //根据id获取图层

        if (!layer) {
            //如果没有初始图层存在就创建一个 canvas 图层
            layer = new CanvasLayer("hr_" + curLevelId, this._width, this._height, this.dpr);
            layer.levelId = curLevelId;
            layer.__builtin__ = true;

            this.insertLayer(curLevelId, layer); //动态插入图层 到 运行环境
            layer.initContext();
        }
        return layer;
    }

    //将动态创建的图层 插入到页面中
    insertLayer(levelId, layer) {
        let layersMap = this.layers_map;
        let layer_id_list = this.layer_id_list;
        let len = layer_id_list.length;

        let prevLayer = null;

        if (layersMap[levelId]) {
            // 图层id 已经被占用
            console.log("Zlevel" + levelId + "has been used already");
            return;
        }

        let i = -1; //查找图层的 位置
        if (len > 0 && levelId > layer_id_list[0]) {
            //在图层id列表中，比自己序列小的 前一个图层
            for (let i = 0; i < len - 1; i++) {
                if (layer_id_list[i] < levelId && layer_id_list[i + 1] > levelId) break;
            }
            prevLayer = layersMap[layer_id_list[i]];
        }

        layer_id_list.splice(i + 1, 0, levelId);

        layersMap[levelId] = layer;

        if (!layer.virtual) {
            //没有虚拟图层
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
}

export default CanvasPainter;

//tools--动态创建 根节点
function createDomRoot(width, height) {
    let oDiv = document.createElement("div");
    oDiv.style.cssText = [`position: relative`, `width: ${width}px`, `height: ${height}px`, `padding: 0`, `margin: 0`, `border-width: 0`, `background: #067`].join(";") + ";";
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
