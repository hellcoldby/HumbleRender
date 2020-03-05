import {devicePixelRatio} from '../tools/dpr';
import CanvasLayer from './CanvasLayer';

const CANVAS_QLEVEL = 314159; //图层id;
class CanvasPainter{
    constructor(root, storage, opts={}){
        this.opts = Object.assign({}, opts);
        this.root = root;
        this.storage = storage;

        this.type = 'canvas';
        this.dpr = this.opts.devicePixelRatio || devicePixelRatio; //分辨率

        let layer_id_list = (this._layer_id_list = []); //图层id序列
        let layers = this._layers = {}; // 图层对象列表
        this._layerConfig = {}; //?

        this._needsManuallyCompositing = false; //?
        this._hoverlayer = null;  //?

        this._singleCanvas = !this.root.nodeName || this.root.nodeName.toUpperCase() === 'CANVAS'; //根节点canvas


        if(this._singleCanvas){ // 如果根节点是一个canvas
            let width = this.root.width;
            let height = this.root.height;

            if(this.opts.width){
                this._width = width = this.opts.width;
            }
            if(this.opts.height){
                this._height = height = this.opts.height;
            }
            
            this.root.width = this.dpr * width; //修正retina 屏幕的分辨率
            this.root.height = this.dpr * height;

            //为单一画布创建图层
            let mainLayer = new CanvasLayer(this.root, this._width, this._height, this.dpr, CANVAS_QLEVEL);
            mainLayer.__builtin__ = true; //标记构建完成
            
            layers[CANVAS_QLEVEL] = mainLayer;
            layer_id_list.push(CANVAS_QLEVEL);
            this._root = root;
            
        }else{ //根节点不是canvas, 动态创建一个div包裹
            this._width = this._getStyle(this.root, 'width');
            this._height = this._getStyle(this.root, 'height');

            let canvasCon = this._createDomRoot(this._width, this._height);
            this._root = canvasCon;
            this.root.appendChild(canvasCon);
        }



    }

    /**
     * @method
     * 刷新
     * @param {Boolean} [paintAll=false] 是否强制绘制所有displayable
     */
    refresh(paintAll){
        //从 storage 中获取 元素列表
        let list = this.storage.getDisplayList(true);
        let layer_id_list = this._layer_id_list;

        this._redrawId = Math.random(); // 重绘id
        this._paintList(list, paintAll, this._redrawId);

        //paint custom layers
        for(let i = 0; i < layer_id_list.length; i++) {
            let id = layer_id_list[i];
            let layer = this.layers[id];
            if(!layer.__builtin__ && layer.refresh){
                let clearColor = i === 0 ? this._backgroundColor : null;
                layer.refresh(clearColor);
            }
        }
        return this;
    }

    _paintList(list, paintAll, redrawId) {
        //如果 redrawId 不一致，说明下一个动画帧已经到来，这里就会直接跳过去，相当于跳过了一帧
        if(this._redrawId !== redrawId) {
            return;
        }

        paintAll = paintAll || false;
    }


    //tools--动态创建 根节点
    _createDomRoot(width, height){
        let oDiv = document.createElement('div');
        oDiv.style.cssText = [
            `position: relative`,
            `width: ${width}px`,
            `height: ${height}px`,
            `padding: 0`,
            `margin: 0`,
            `border-width: 0`,
            `background: #067`
        ].join(';') +';';
        return oDiv;
    }


    //tools--获取真实样式
    _getStyle(obj, attr){
       let opts = this.opts;
       if(attr in opts){
           return parseFloat(opts[attr]);
       }else{
           let res =  obj.currentStyle? obj.currentStyle[attr] : getComputedStyle(obj, false)[attr];
           return parseInt(res, 10);
       }

    }
}

export default CanvasPainter;

