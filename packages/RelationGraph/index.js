import VisGraph from './static/visgraph.min.js'
import RelationGraph from './src/index.vue'

RelationGraph.install = function (Vue) {
    Vue.component(RelationGraph.name, RelationGraph)
}
export default RelationGraph