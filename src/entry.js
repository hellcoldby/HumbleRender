/*
 *  注释:tools --- 表示是被其他函数引用 的工具函数
 *  引入 Storage.js 保存 绘制对象 的列表 （Model)
 *  引入 CanvasPainter.js 来生成绘图环境 创建图层 等 (view)
 *  引入 EvetProxy.js 转发DOM 事件，一部分到 容器div上，一部分到document， 或到绘制元素
 *  引入 GlobalAnimationMgr.js  无限循环监控 视图变化
 */

import env from "./tools/dev_support";
import guid from "./tools/guid";
import CanvasPainter from "./view/CanvasPainter"; //视图 view
import Storage from "./model/Storage"; // 数据模型  model
import EventProxy from "./control/EventProxy";
import GlobalAnimationMgr from "./animation/GlobalAnimationMgr"; //动画

//检测浏览器的支持情况
if (!env.canvasSupported) {
    throw new Error("Need Canvas Environment");
}

//tools -- 初始保存实例 map
let instances = {};

//tools -- 图形环境 map
let painterMap = {
    canvas: CanvasPainter
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
    constructor(root, opts = {}) {
        this.id = guid();
        this.root = root;
        let self = this;

        let renderType = opts.render;
        if (!renderType || !painterMap[renderType]) {
            renderType = "canvas";
        }
        //创建数据仓库
        this.storage = new Storage();
        //生成视图实例
        this.painter = new painterMap[renderType](this.root, this.storage, opts, this.id);

        //对浏览器默认事件拦截， 做二次处理
        let handerProxy = null;
        if (typeof this.root.moveTo !== "function") {
            if (!env.node && !env.worker && !env.wxa) {
                handerProxy = new EventProxy(this.painter.root);
            }
        }

        //生成事件实例
        // this.eventHandler = new HRenderEventHandler(this.storage, this.painter, handerProxy);

        //生成动画实例
        this.globalAnimationMgr = new GlobalAnimationMgr();
        this.globalAnimationMgr.on("frame", function() {
            console.log("监控更新");
            self.flush();
        });
        this.globalAnimationMgr.start();
        this._needRefresh = false;
    }

    //获取图形实例唯一id
    getId() {
        return this.id;
    }

    //添加元素
    add(ele) {
        this.storage.addToRoot(ele);
        this.refresh();
    }

    //移除元素
    remove(ele) {
        // this.storage.delFromRoot(ele);
        this.refresh();
    }

    refresh() {
        this._needRefresh = true;
    }

    //刷新 canvas 画面
    flush() {
        // console.log('123');
        //全部重绘
        if (this._needRefresh) {
            this.refreshImmediately();
        }
        //重绘特定元素
        if (this._needRefreshHover) {
            this.refreshHoverImmediaterly();
        }
    }

    //立即重绘
    refreshImmediately() {
        console.log("立即更新");
        this._needRefresh = this._needRefreshHover = false;
        this.painter.refresh();
        this._needRefresh = this._needRefreshHover = false;
    }

    //立即重绘特定元素
    refreshHoverImmediaterly() {
        this._needRefreshHover = false;
        this.painter.refreshHover && this.painter.refreshHover();
    }
}
