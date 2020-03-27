/*
 *  通过commander 自定义命令，来调配打包方式
 *  引入 build_util.js 来显示打印的格式
 *  引入 rollup_config 是Rollup 的配置文件
 */
const path = require('path');
const com = require("commander");
const fsExtra = require('fs-extra');
const { watch, build } = require("./config/build_util");
const { createConfig } = require("./config/rollup_config");

/* 通过commander 自定义命令 */
com.version("1.0.0")
    .name("测试")
    .usage("[options]")
    .option("-w --watch", "监控修改的的文件或文件夹") //
    .option("--release", "生产发布文件")
    .parse(process.argv); //解析以上的参数

if (com.watch) {
    watch(createConfig(false));
} else if (com.release) {
    fsExtra.removeSync(path.resolve(__dirname, '../', './dist')); //移除之前的打包 文件夹dist
    build([
        createConfig(false, 'cjs'),
        createConfig(true, 'cjs')
    ]).then(()=>{
        console.log('发布到nodejs');
    }).catch(err=> {
        console.log(err);
    })
}
