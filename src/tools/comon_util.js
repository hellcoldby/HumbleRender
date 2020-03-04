/*
 * common_util常用的 工具函数集合
 * 1. requestAnimationFrame
 */

export let RAF = (
    typeof window !== 'undefined'
    && ( 
        (window.requestAnimationFrame && window.requestAnimationFrame.bind(window))
        || (window.msRequestAnimationFrame && window.msRequestAnimationFrame.bind(window))
        || window.mozRequestAnimationFrame
        || window.webkitRequestAnimationFrame
    )
) || function(fn) { setTimeout(fn, 16) }
