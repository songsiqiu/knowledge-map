<template>
  <div class="warpper">
    <div id="graph-panel" :style="{ width: width, height: height }"></div>
    <div class="type-area">
      <div
          v-for="item in Object.keys(typeConfig)"
          :key="item"
          class="type-item-box"
          :style="{
          backgroundColor: typeConfig[item].backColor,
          color: typeConfig[item].fontColor
        }"
      >
        {{ typeConfig[item].name }}
      </div>
    </div>
    <div v-show="showDetail" class="detail-dialog" :style="{ left: detailObj.x + 'px', top: detailObj.y + 'px' }">{{ detailObj.text }}</div>
  </div>
</template>

<script>
import axios from 'axios'
import _ from 'lodash'
// 引用AES源码js
import CryptoJS from 'crypto-js/crypto-js'

const cryptoKey = CryptoJS.enc.Utf8.parse('AAqq123123ABCDEF') // 十六位十六进制数作为密钥
const cryptoIv = CryptoJS.enc.Utf8.parse('BBqq123123ABCDEF') // 十六位十六进制数作为密钥偏移量

export default {
  name: 'relation-graph',
  props: {
    width: {
      type: String | Number,
      default: '100vw'
    },
    height: {
      type: String | Number,
      default: '100vh'
    },
    commonConfig: {
      // 批量节点配置
      type: Object,
      default: () => ({})
    },
    headerParams: {
      // 请求header参数
      type: Object,
      default: () => ({})
    },
    apiUrl: {
      type: String, // 接口路径
      default: ''
    },
    apiMethods: {
      type: String, // 接口路径
      default: 'post'
    },
    centerCode: {
      type: String, // 中心点code
      default: ''
    },
    nodeConfig: {
      type: Object,
      default: () => ({})
    },
    typeConfig: {
      type: Object,
      default: () => ({})
    },
    isNodeDecode: {
      // 节点是否需要解密
      type: Boolean,
      default: false
    },
    isLinkDecode: {
      // 关系节点是否需要解密
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      visGraph: null,
      showDetail: false,
      detailObj: {
        text: '',
        x: 0,
        y: 0
      },
      elIsMove: false,
      isClick: false,
      config: {
        // 批量节点配置
        node: {


          //节点的默认配置
          label: {
            //标签配置
            show: true, //是否显示
            color: '255, 255, 255', //字体颜色
            font: 'normal 14px 微软雅黑', //字体大小及类型
            textPosition: 'Middle_Center' //文字位置 Top_Center,Bottom_Center,Middle_Right,Middle_Center
            // wrapText: true //节点包裹文字
          },
          shape: 'circle', //rect,circle,star
          color: '11, 168, 240', //节点颜色
          borderColor: '80,80,255', //边框颜色
          borderWidth: 1, //边框宽度,
          size: 100,
          borderAlpha: 0.6, //边框透明度
          lineDash: [0], //边框虚线间隔,borderWidth>0时生效
          alpha: 1, //节点透明度
          selected: {
            //选中时的样式设置
            borderColor: '80,80,255', //选中时边框颜色
            borderAlpha: 0.8, //选中时的边框透明度
            borderWidth: 4 //选中时的边框宽度
          },
          onMousedrag: () => {
            this.elIsMove = true
          },
          onMouseOver: (event, node) => {
            this.showDetail = true
            let properties = node.properties || {}
            if (typeof properties === 'string') {
              properties = JSON.parse(properties)
            }
            const name = properties.label || node.label
            this.detailObj = {
              text: name,
              x: event.clientX,
              y: event.clientY - 60
            }
          },
          onMouseOut: () => {
            this.showDetail = false
          },
          onMouseDown: () => {
            this.showDetail = false
          },
          onClick: (event, node) => {
            if (this.elIsMove) {
              this.elIsMove = false
              return
            }
            this.unfoldLevel(event, node)
          }
        },
        link: {
          //连线的默认配置
          label: {
            //连线标签
            show: true, //是否显示
            color: '50,50,50', //字体颜色
            font: 'normal 14px Arial', //字体大小及类型
            background: '220,220,220' //标签背景色
          },
          lineType: 'direct', //连线类型,direct,curver,vlink,hlink,vbezier,hbezier,bezier
          colorType: 'defined', //连线颜色类型 source:继承source颜色,target:继承target颜色 both:用双边颜色，d:自定义
          color: '230,150,120', //连线颜色
          alpha: 1, // 连线透明度
          lineWidth: 2, //连线宽度
          lineDash: [0], //虚线间隔样式如：[5,8]
          showArrow: true, //显示连线箭头
          selected: {
            //选中时的样式设置
            color: '255,50,50' //选中时的颜色
          }
        },
        wheelZoom: 0.8, //开启鼠标滚轮缩放
        highLightNeiber: false //相邻节点高亮开关
      },
      infoParams: {
        code: '',
        level: 0,
        centerCode: ''
      },
      graphData: {
        links: [],
        nodes: []
      }
    }
  },
  mounted() {
    this.infoParams = {
      ...this.infoParams,
      code: this.centerCode,
      centerCode: this.centerCode
    }
    this.$nextTick(() => this.getData())
  },
  methods: {
    getInit() {
      this.$nextTick(() => {
        this.config = _.merge({}, this.config, this.commonConfig)
        //1、创建GraphVis对象，进行方法调用
        this.visGraph = new VisGraph(document.getElementById('graph-panel'), this.config)
      })
    },
    getData() {
      if (!this.apiUrl) return
      if (!this.isClick) {
        this.getInit()
      }
      let paramsObj = {
        ...this.infoParams
      }
      if (this.apiMethods === 'get') {
        paramsObj = {
          params: { ...this.infoParams },
          ...this.headerParams
        }
      } else {
        paramsObj = {
          ...this.infoParams
        }
      }
      axios[this.apiMethods](this.apiUrl, paramsObj, {
        ...this.headerParams
      }).then(obj => {
        const res = obj.data
        if (res.code === 0) {
          const list = res.data || {}
          const result = {
            links: list.links || [],
            nodes: list.nodes || []
          }
          if (!this.isClick) {
            const domWidth = document.getElementById('graph-panel').style.width
            const domHeight = document.getElementById('graph-panel').style.height
            const level0NodesArr = result.nodes.filter(item => item.level === 0)
            const level1NodesArr = result.nodes.filter(item => item.level > 0)
            const level1Nodes = level1NodesArr.length || 0
            level0NodesArr.forEach(item => {
              item.x = parseFloat(domWidth) / 2 - 50
              item.y = parseFloat(domHeight) / 2 - 50
              if (item.type && this.nodeConfig[item.type]) {
                Object.keys(this.nodeConfig[item.type]).forEach(el => {
                  item[el] = this.nodeConfig[item.type][el]
                })
              }
              this.visGraph.addNode(item)
            })
            level1NodesArr.forEach((item, idx) => {
              item.x = parseFloat(domWidth) / 2 - 50 + 200 * Math.cos(((((idx + 1) * 360) / level1Nodes) * Math.PI) / 180)
              item.y = parseFloat(domHeight) / 2 - 50 + 200 * Math.sin(((((idx + 1) * 360) / level1Nodes) * Math.PI) / 180)
              if (item.type && this.nodeConfig[item.type]) {
                Object.keys(this.nodeConfig[item.type]).forEach(el => {
                  item[el] = this.nodeConfig[item.type][el]
                })
              }
              this.visGraph.addNode(item)
            })
            result.nodes.forEach(item => {
              if (this.isNodeDecode) {
                item.label = this.toDecrypt(item.label)
                if (item.properties && item.properties.label) {
                  item.properties.label = this.toDecrypt(item.properties.label)
                }
              }
            })
            result.links.forEach(item => {
              if (this.isLinkDecode) {
                item.label = this.toDecrypt(item.label)
                if (item.properties && item.properties.label) {
                  item.properties.label = this.toDecrypt(item.properties.label)
                }
              }
              this.visGraph.addEdge(item)
            })
            this.graphData = result
            this.visGraph.setZoom('auto')
          } else {
            result.nodes.forEach(item => {
              if (item.type && this.nodeConfig[item.type]) {
                Object.keys(this.nodeConfig[item.type]).forEach(el => {
                  item[el] = this.nodeConfig[item.type][el]
                })
              }
              if (this.isNodeDecode) {
                item.label = this.toDecrypt(item.label)
                if (item.properties && item.properties.label) {
                  item.properties.label = this.toDecrypt(item.properties.label)
                }
              }
            })
            result.links.forEach(item => {
              if (this.isLinkDecode) {
                item.label = this.toDecrypt(item.label)
                if (item.properties && item.properties.label) {
                  item.properties.label = this.toDecrypt(item.properties.label)
                }
              }
            })
            this.visGraph.activeAddNodeLinks(result.nodes, result.links)
            this.graphData = {
              links: [...this.graphData.links, ...result.links],
              nodes: [...this.graphData.nodes, ...result.nodes]
            }
          }
        }
      })
    },
    unfoldLevel(event, node) {
      let properties = node.properties || {}
      if (typeof properties === 'string') {
        properties = JSON.parse(properties)
      }
      this.infoParams = {
        code: node.id,
        level: properties.level,
        centerCode: this.centerCode
      }
      this.isClick = true
      this.$nextTick(() => this.getData())
    },
    toDecrypt(word) {
      if (word !== undefined && word !== null && word !== '') {
        word = decodeURIComponent(word)
        let base64 = CryptoJS.enc.Base64.parse(word)
        let src = CryptoJS.enc.Base64.stringify(base64)
        // 解密模式为CBC，后端补码方式为PKCS5Padding（也就是PKCS7）
        let decrypt = CryptoJS.AES.decrypt(src, cryptoKey, { iv: cryptoIv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 })
        let decryptedStr = decrypt.toString(CryptoJS.enc.Utf8)
        return decryptedStr.toString()
      }
    }
  },
  beforeDestroy() {
    this.visGraph = null
    this.isClick = false
    this.elIsMove = false
    this.showDetail = false
  }
}
</script>

<style scoped lang="less">
.warpper {
  position: relative;
}
.relation-graph-component {
  background-color: #efefef;
}
.detail-dialog {
  position: absolute;
  z-index: 999999;
  padding: 10px;
  border-radius: 5px;
  color: #fff;
  line-height: 20px;
  font-size: 14px;
  background: rgba(0, 0, 0, 0.5);
  width: 200px;
  word-break: break-all;
  white-space: pre-wrap;
  margin-left: -100px;
}
.type-area {
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 10;
}
.type-item-box {
  margin-bottom: 10px;
  width: 80px;
  border-radius: 50px;
  font-size: 14px;
  text-align: left;
  padding: 3px 10px;
  box-sizing: border-box;
  box-shadow: 2px 2px 5px #999;
}
</style>
