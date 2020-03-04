import {devicePixelRatio} from '../tools/dpr';

class CanvasPainter{
    constructor(root, storage, opts={}){
        this.opts = Object.assign({}, opts);
        this.root = root;
        this.storage = storage;

        this.type = 'canvas';
        this.dpr = this.opts.devicePixelRatio || devicePixelRatio; //分辨率

        let qlevelList = this._qlevelList = []; //?
        let layers = this._layers = {}; //?
        this._layerConfig = {}; //?

        this._needsManuallyCompositing = false; //?
        this._hoverlayer = null;  //?

        this._singleCanvas = !this.root.nodeName || this.root.nodeName.toUpperCase() === 'CANVAS'; //根节点canvas

        if(this._singleCanvas){
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
            let mainLayer = new CanvasLayer();
            
        }
    }
}

export default CanvasPainter;