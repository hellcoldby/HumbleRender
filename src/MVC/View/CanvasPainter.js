import { devicePixelRatio } from "../../tools/dpr";
import CanvasLayer from "./CanvasLayer";
import { RAF } from "../../tools/anim_util";
import { createCanvas, getContext } from "../../tools/canvas_util";

const CANVAS_LEVEL_ID = 314159; //图层id;
const HOVER_LAYER_LEVEL_ID = 1e5; //事件图层id
const ELE_AFTER_INCREMENTAL_INC = 0.01; //图形 增量的初始id
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

        this.finished = false;

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
            mainLayer.initContext();

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

    getHost() {
        return this._root;
    }

    /**1.1
     * @param {Boolean} [paintAll=false] 是否强制绘制所有元素
     */
    refresh(paintAll) {
        //从 storage 中获取 元素数组列表
        let ele_ary = this.storage.getDisplayList(true);

        this._redrawId = Math.random(); // 重绘id
        // console.log(ele_ary);
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
        //1.2_2开始绘制图形, 保证每一帧都绘制完成
        let finished = this._doPaintList(ele_ary, paintAll);
        this.finished = finished;
        if (!finished) {
            console.log("resize");
            let self = this;
            RAF(function () {
                self._paintList(ele_ary, paintAll, redrawId);
            });
        }
    }

    //1.2_1 更新图层状态 动态创建图层
    _updateLayerStatus(ele_ary) {
        this._eachBuiltinLayer(function (layer, z) {
            layer.__dirty = layer.__used = false;
        });

        let prevLayer = null;
        let idx = 0;
        for (let i = 0; i < ele_ary.length; ) {
            let ele = ele_ary[i];
            let hLevel = ele.hLevel; //图形对应的图层
            let tmp_id = 0;
            //1.2_1_1 同一个图层的元素只创建一次图层，否则就创建多个图层
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
        this._eachBuiltinLayer(function (layer, z) {
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
        // console.log(this._width, this._height);

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
        } else {
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
        // console.log(layer_id_list);
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
                this.finished = false;
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
            // console.log(ele.brush);
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

    resize(width, height) {
        if (!this.root.style) {
            // Maybe in node or worker or Wechat
            if (width == null || height == null) {
                return;
            }
            this._width = width;
            this._height = height;
            // this.getLayer(CANVAS_QLEVEL).resize(width, height);
        } else {
            let domRoot = this._root;
            domRoot.style.display = "none";

            // Save input w/h
            let options = this.opts;
            width && (options.width = width);
            height && (options.height = height);

            domRoot.style.display = "";

            // 优化没有实际改变的resize
            if (this._width !== width || height !== this._height) {
                domRoot.style.width = width + "px";
                domRoot.style.height = height + "px";

                for (let id in this.layers_map) {
                    if (this.layers_map.hasOwnProperty(id)) {
                        this.layers_map[id].resize(width, height);
                    }
                }
                this._width = width;
                this._height = height;

                this.refresh(true);
            }
        }
        return this;
    }

    //复制画布上的像素数据
    getImageData(context) {
        if (!this.layer_id_list.length) return;
        const layers = this.layer_id_list;
        const layersMap = this.layers_map;
        //创建一个虚拟的canvas画布，将所有图层的图像合并到一个画布上
        const virCanvas = createCanvas("", this._width, this._height, this.dpr);
        const ctx = getContext(virCanvas);
        const imagedataAry = [];

        for (let i = 0, len = layers.length; i < len; i++) {
            const id = layers[i];
            const curLayer = layersMap[id];
            console.log(curLayer);
            const curCtx = curLayer.ctx;
            const curImageData = curCtx.getImageData(0, 0, this._width * this.dpr, this._height * this.dpr);
            // console.log(curImageData);
            imagedataAry.push(curImageData);
        }
        imagedataAry.forEach((item) => {
            ctx.putImageData(item, 0, 0);
        });

        const virImageData = ctx.getImageData(0, 0, this._width * this.dpr, this._height * this.dpr);

        return virImageData;
    }

    //将合并后的截图恢复到画布中
    putImageData(imgData, opts) {
        //判断根是 div 还是 canvas'
        let curCtx = null;
        let newCtx = null;
        let tmpData = imgData;
        const { scale } = opts;

        if (this._singleCanvas) {
            curCtx = this._root;
            curCtx.putImageData(imgData, 0, 0);
        } else {
            const virCanvas = createCanvas("", this._width, this._height, this.dpr);
            this._root.appendChild(virCanvas);
            const ctx = getContext(virCanvas);

            tmpData = this._scaleImageData(imgData, scale);
            ctx.putImageData(tmpData, 0, 0);
            // ctx.drawImage(tmpData, 0, 0, 2 * this._width, 2 * this._height);

            curCtx = ctx;
        }
        return curCtx;
    }

    _scaleImageData(imgData, scale) {
        const oneCanvas = createCanvas("", this._width, this._height, this.dpr);
        const oneCtx = getContext(oneCanvas);
        oneCtx.putImageData(imgData, 0, 0);
        const twoCanvas = createCanvas("", this._width, this._height, this.dpr);
        const twoCtx = getContext(twoCanvas);
        twoCtx.scale(scale.x, scale.y);
        twoCtx.drawImage(oneCanvas, 0, 0);

        const twoImageData = twoCtx.getImageData(0, 0, this._width * this.dpr, this._height * this.dpr);
        return twoImageData;
        // return oneCanvas;
    }

    /**
     * @method clear
     * 清除hover层外所有内容
     */
    clear() {
        this._eachBuiltinLayer(this._clearLayer);
        return this;
    }
    _clearLayer(layer) {
        layer.clear();
    }
}

export default CanvasPainter;

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
