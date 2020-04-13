/**
 * Group 可以插入子节点， 其他类型不能
 * Group 上的变换也会被应用到子节点。
 */

export default class Group extends Element {
    constructor(ops = {}) {
        super(opts);
        this.type = "group";
        this.children = [];

        this._storage = null;
    }
    add(child) {
        if (child && child !== this && child.parent !== this) {
            this.children.push(child);
            this._doAdd(child);
        }
        return this;
    }
}
