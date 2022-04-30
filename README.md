## pdf-render-puppeteer  👏👏👏 `Fork` & `Star`
通过nodejs服务调用puppeteer，服务端生成导出pdf方案;

支持大批量列表数据转换成pdf；测试数据可以选择普通数据`test.json`和5k+数据的`big.json`; 

- [puppeteer项目实践说明](https://my.samyz.cn/rat-skill/pages/452c61/)
- [heroku在线演示](https://pdf-render-puppeteer.herokuapp.com/pdfServer/) (ps:因免费版本预览/转换不稳定，生产部署可参考上面文档centos系统)

## 安装依赖及启动

安装相关依赖
```bash
npm install --unsafe-perm=true --allow-root
```

单核部署
```bash
npm run serve #本地开发调试

#本地预览
http://127.0.0.1:8084/pdfServer/
```
多核负载部署
```bash
npm install -g pm2

sh start.sh #线上

```