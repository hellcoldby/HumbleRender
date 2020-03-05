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

//2. 精确判断数据类型
export function judeType(val) {
    return Object.prototype.toString.call(val)
}

//3. 深拷贝
export function deepClone(source) {
    if(!source || typeof source !== 'object') return;

    let res = source;
    if(judeType(source) === '[object Array]') {
        res = [];
        for(let i=0; i<source.length; i++) {
            res[i] = deepClone(source[i]);
        }
    }if(judeType(source) === '[object Object') {
        res = {};
        for(let key in source) {
            res[key] = deepClone(source[key]);
        }
    }

    return res;

}

export function merge(target, source, overwrite) {
   
    if(!isObject(target) || !isObject(source) ) { 
        //如果 overwirte 为true, source 覆盖 target
        if(overwrite){
            return deepClone(source)
        }else{
            return target;
        }
    }

    for(let key in source) {
        let source_prop = source[key];
        let target_prop = target[key];
        if( (judeType(source_prop) === '[object Object]') && judeType(target_prop) === '[object Object]') {
            // 如果需要递归覆盖，就递归调用merge
            merge(target_prop, source_prop, overwrite);
        }else if(overwrite || !(key in target)) {
            // 否则只处理overwrite为true，或者在目标对象中没有此属性的情况
            // NOTE，在 target[key] 不存在的时候也是直接覆盖
            target[key] = deepClone(source[key], true)
        }
    }

    return target;
}