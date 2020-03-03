/*
 *  注释:toos --- 表示是被其他函数引用 的工具函数
 */

import env from "./tools/env";
import guid from "./tools/guid";
import CanvasPainter from "./view/CanvasPainter";
import Storage from './model/Storage';


//检测浏览器的支持情况
if (!env.canvasSupported) {
    throw new Error("Need Canvas Environment");
}

//tools -- 初始保存实例 map
let instances = {};

//tools -- 图形环境 map
let painterMap = {
    canavs: CanvasPainter
};

export let version = "1.0.0";

/**
 *  main 初始化生成 绘图环境的实例
 *
 * @export
 * @param {DOM | Canvas | Context} root
 * @param {Object} opts
 */
export function init(root, opts) {
    let hr = new HumbleRender(root, opts);
    instances[hr.id] = hr;
    return hr;
}

//tools --- 初始化图形环境
class HumbleRender {
    constructor(root, opts) {
        this.id = guid();
        this.root = root;
        let self = this;

        this.storage = new Storage();

        let renderType = opts.render;
        if (!renderType || !painterMap[renderType]) {
            renderType = "canvas";
        }

        //生成视图实例
        this.painter = new painterMap[renderType](this.root, this.storage, opts, this.id);

        //对浏览器默认事件拦截， 做二次处理
        let handerProxy = null;
        if (typeof this.host.moveTo !== "function") {
            if (!env.node && !env.worker && !env.wxa) {
                handerProxy = new EventProxy(this.painter.root);
            }
        }

        //生成事件实例
        // this.eventHandler = new HRenderEventHandler(this.storage, this.painter, handerProxy);

        //生成动画实例
        this.globalAnimationMgr = new this.globalAnimationMgr();
        this.globalAnimationMgr.on('frame', function() {
            self.flush();
        });
        this.globalAnimationMgr.start();

        this._needRefresh = false;
    }

    //获取图形实例唯一id
    getId(){
        return this.id;
    }

    //添加元素
    add(ele){
        // this.storage.addToRoot(ele)
        this.refresh();
    }

    //移除元素
    remove(ele){
        // this.storage.delFromRoot(ele);
        this.refresh();
    }

    refresh(){
        this._needRefresh = true;
    }

    //刷新 canvas 画面
    flush() {
        //全部重绘
        if(this._needRefresh) {
            // this.refreshImmediately();
        }
        //重绘特定元素
        if(this._needRefreshHover){
            // this.refreshHoverImmediaterly();
        }
    }
}
