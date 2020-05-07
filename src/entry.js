/*
 *  注释:tools --- 表示是被其他函数引用 的工具函数
 *  引入 Storage.js 保存 绘制对象 的列表 （Model)
 *  引入 CanvasPainter.js 来生成绘图环境 创建图层 等 (view)
 *  引入 EvetProxy.js 转发DOM 事件，一部分到 容器div上，一部分到document， 或到绘制元素
 *  引入 GlobalAnimationMgr.js  无限循环监控 视图变化
 */

import env from "./tools/dev_support";
import guid from "./tools/guid";
import Storage from "./MVC/Model/Storage"; // 数据模型  model
import CanvasPainter from "./MVC/View/CanvasPainter"; //视图 view
import EventProxy from "./MVC/Control/EventProxy";
import WatchAnim from "./MVC/WatchAnim/WatchAnim"; //动画

//检测浏览器的支持情况
if (!env.canvasSupported) {
    throw new Error("Need Canvas Environment");
}

//tools -- 初始保存实例 map
let instances = {};

//tools -- 图形环境 map
let painterMap = {
    canvas: CanvasPainter,
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

export function dispose(hr) {
    if (hr) {
        hr.dispose();
    }
}

export function getInstance(id) {
    return instances[id];
}

//tools --- 初始化图形环境
class HumbleRender {
    constructor(root, opts = {}) {
        this.id = guid();
        this.root = root;
        let self = this;

        let renderType = opts.render;
        if (!renderType || !painterMap[renderType]) {
            renderType = "canvas";
        }

        this.storage = new Storage();
        this.painter = new painterMap[renderType](this.root, this.storage, opts, this.id);

        let handlerProxy = null;
        if (typeof this.root.moveTo !== "function") {
            if (!env.node && !env.worker && !env.wxa) {
                console.log(21321);
                handlerProxy = new EventProxy(this.painter.root);
            }
        }
        // this.eventHandler = new HRenderEventHandler(this.storage, this.painter, handerProxy);

        this.watchAnim = new WatchAnim();
        this.watchAnim.on("frame", function () {
            self.flush(); //每间隔16.7ms 监控一次flush
        });
        this.watchAnim.start();
        this._needRefresh = false;
    }

    //监控 this._needRefresh 的开关
    flush() {
        // console.log(this._needRefresh);
        if (this._needRefresh) {
            this.refreshImmediately(); //全部重绘
        }
        if (this._needRefreshHover) {
            this.refreshHoverImmediaterly(); //重绘特定元素
        }
    }

    //获取图形实例唯一id
    getId() {
        return this.id;
    }

    //向数据仓库storage中添加元素，并开启刷新
    add(ele) {
        ele.__hr = this; //保存当前元素的绘图环境
        this.storage.addToRoot(ele);
        this.refresh();
    }

    //开启刷新
    refresh() {
        this._needRefresh = true;
    }

    //移除元素
    remove(ele) {
        this.storage.delFromRoot(ele);
        this.refresh();
    }

    //立即重绘
    refreshImmediately() {
        this._needRefresh = this._needRefreshHover = false;
        this.painter.refresh();
        this._needRefresh = this._needRefreshHover = false;
    }

    //立即重绘特定元素
    refreshHoverImmediaterly() {
        this._needRefreshHover = false;
        this.painter.refreshHover && this.painter.refreshHover();
    }

    //销毁
    dispose() {
        this.watchAnim.clear();
        this.storage.dispose();
        this.painter.dispose();

        this.watchAnim = null;
        this.storage = null;
        this.painter = null;

        delete instances[this.id];
    }

    //清空画布上的所有对象。
    clear() {
        //应该先停止循环监控
        this.stopWatch();
        this.storage.delFromRoot();
        this.painter.clear();
        this.startWatch();
    }

    //尺寸变化重新渲染画布
    resize(options) {
        options = options || {};
        const { _width, _height } = this.painter.resize(options.width, options.height);
        // console.log(_width, _height);
        // this.eventDispatcher.resize();
        return this;
    }

    //复制画布上的像素数据
    // 在添加完图形后延迟调用
    getImageData() {
        let imgData = this.painter.getImageData();
        this.clear();
        return imgData;
    }

    //
    putImageData(imgData, opts) {
        if (!imgData) return;
        this.clear();
        let ctx = this.painter.putImageData(imgData, opts);
        return ctx;
    }

    //停止监控
    stopWatch() {
        this.watchAnim.pause();
    }

    //启动监控
    startWatch() {
        this.watchAnim.start();
    }
}
