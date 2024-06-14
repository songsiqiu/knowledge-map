const {defineConfig} = require('@vue/cli-service')

const VUE_APP_BASE_API = process.env.VUE_APP_BASE_API

module.exports = defineConfig({
    /* 设为 true 时，会对依赖包进行 Babel 转译，确保兼容性 */
    transpileDependencies: true,
    pages: {
        index: {
            entry: 'examples/main.js',
            template: 'public/index.html',
            filename: 'index.html'
        }
    },
    chainWebpack: config => {
        config.module.rule('js') // 修改js文件的loader
            .include.add('/packages')  // 添加需要编译的目录
            .end() // 结束
            .use('babel') // 使用babel-loader
            .loader('babel-loader') // loader名称
    },
    configureWebpack: {
        performance: {  //配置性能提示
            hints: 'warning',
            maxEntrypointSize: 40000000,
            //生成文件的最大体积
            maxAssetSize: 20000000,
            assetFilter: function (assetFilename) {   //只给出 js 文件的性能提示
                return assetFilename.endsWith('.js')
            }
        }
    },
    devServer: {
        open: true,
        host: 'localhost',
        https: false,
        proxy: {
            '/api': {
                target: VUE_APP_BASE_API, // 需要代理的后端接口
                changeOrigin: true, //开启代理：在本地会创建一个虚拟服务端，然后发送请求的数据，并同时接收请求
                pathRewrite: {
                    //重写匹配的字段，如果不需要在请求路径上，重写为""
                    '^/api': ''
                }
            }
        }
    }
})