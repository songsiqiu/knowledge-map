import RelationGraph from './RelationGraph'

// 组件列表
const components = [RelationGraph]

// 定义 install 方法，接收 Vue 作为参数。如果使用 use 注册插件，那么所有的组件都会被注册
const install = function (Vue) {
    // 判断是否安装
    if (install.installed) return
    // 遍历注册全局组件
    components.map(component => Vue.component(component.name, component))
}
//这里export default是提供给全局引入使用
export default {
    install,
    RelationGraph
}
//这里export是提供给按需引入使用
export { RelationGraph }