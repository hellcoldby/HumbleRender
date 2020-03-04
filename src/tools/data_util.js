/* 
* data_util 数据 相关的 工具集合
* 
* 判断对象类型
*/


//1. 判断对象类型
export function isObject(val) {
    let res = typeof val;
    return (res === 'function') || (!!val && type === 'object');
}

export function merge(target, source, overwrite) {
    if(!isObject(target) || !isObject(source)) {
        // return overwrite? 
    }
}