/*
 * HRenderer 中所有图形对象都是 Element 的子类。这是一个抽象类，请不要直接创建这个类的实例。
 * 引入 transformable 为 Element 类提供变换功能，例如：平移、缩放、扭曲、旋转、翻转、形状、样式。
 * 引入 Animatable 为Element 为元素提供动画功能。
 * 引入 EventFul 为 Element 提供订阅发布功能。
 *
 * 注意： Element 同时继承多个类，并且只继承用户传递来的属性
 */
import Eventful from "../../tools/EventEmitter";
import Transformable from "../transform/Transformable";
import Animatable from "../Animatable/Animatable";
import guid from "../../tools/guid";
import { inheritProperties, mixin } from "../../tools/data_util";
import Style from "./Style";

class Element {
    constructor(opts = {}) {
        this.opts = opts;
        this.id = "el-" + guid();
        this.type = "element";
        this.name = "";
        this.parent = null;

        this.ignore = false; // 为true时，忽略图形绘制和事件触发
        this.clipPath = null; //用于裁剪的路径，所有 Group 内的路径在绘制时都会被这个路径裁剪，该路径会继承被裁减对象的变换。

        this.calculateTextPosition = null; //文本位置的字符串，计算实际位置

        this.invisible = false; //是否隐藏对象，默认false--不隐藏。（绘制）
        this.z = 0;

        this.hLevel = 0; //确定可显示对象可以在画布的哪一层绘制

        this.draggalbe = false; //是否开启拖拽
        this.dragging = false; //是否在拖拽中

        this.slient = false; //是否响应鼠标事件

        this.cursor = "pointer";
        this.rectHover = false; // 如果悬停区域是边界举行

        this.progressive = false; // 逐渐渲染数据

        this.incremental = false; // 渐增渲染
        this.globalScaleRatio = 1; //全局缩放

        this.animationProcessList = []; //元素上所有的动画处理列表

        this._hr = null; //元素被添加到 HumbleRender 实例后，自动赋值

        this._dirty = true; //下一帧渲染的元素，标记为 dirty（true)

        this._rect = null;

        this.__clipPaths = null; //因为仅使用null来检查clipPaths是否已更改很容易

        this.style = new Style(this.opts.style, this);

        this.shape = {}; // shape 形状 宽高 坐标等信息

        //拷贝自定义属性到 this.shape 默认属性中
        let defaultShape = this.opts.shape;
        if (defaultShape) {
            for (let name in defaultShape) {
                if (!this.shape.hasOwnProperty(name) && defaultShape.hasOwnProperty(name)) {
                    this.shape[name] = defaultShape[name];
                }
            }
        }

        inheritProperties(this, Transformable, this.opts);
        inheritProperties(this, Eventful, this.opts);
        inheritProperties(this, Animatable, this.opts);
        // copyOwnProperties(this, this.opts, ["style", "shape"]);

        // console.log(this);
        // this.on("addToStorage", this.addToStorageHandler);
        // this.on("delFromStorage", this.delFromStorageHandler);
    }

    beforeBrush(ctx) {}

    afterBrush(ctx) {}

    brush() {}
}

mixin(Element.prototype, Animatable.prototype, Transformable.prototype, Eventful.prototype);
// console.log(Element.prototype);

export default Element;
