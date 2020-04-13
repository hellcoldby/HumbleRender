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
        if (this.__storage) {
            this.__storage.addToStorage(child);
        }
    }
}
