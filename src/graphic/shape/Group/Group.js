/**
 * Group 可以插入子节点， 其他类型不能
 * Group 上的变换也会被应用到子节点。
 */

import Element from "../../Element/Element";

export default class Group extends Element {
    constructor(opts = {}) {
        super(opts);
        this.type = "group";
        this.children = [];

        this.__storage = null;
    }
    add(child) {
        if (child && child !== this && child.parent !== this) {
            this.children.push(child);
            this._doAdd(child);
        }
        return this;
    }

    _doAdd(child) {
        child.parent && child.parent.remove(child);
        if (this.__hr) {
            child.__hr = this.__hr;
        }
    }

    //hr.add(group)时，在Storage.js 中add()会触发 this.trigger('addToStorage', storage)
    // 在Element.js 中默认 this.on('addToStorage', this.addToStorageHandler)
    // 如果此处不定义addToStorageHandler，默认会触发 Element.js下的 addToStorageHandler()
    addToStorageHandler(storage) {
        this.children.forEach((child, index) => {
            child.parent = this;
            child.__hr = this.__hr;
            storage.addToStorage(child);
        });
        //然后在调用父层的处理函数添加自身
        Element.prototype.addToStorageHandler.call(this, storage);
    }
}
