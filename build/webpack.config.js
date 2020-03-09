const path = require('path')
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin') //拷贝
const {CleanWebpackPlugin} = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const vueLoaderPlugin = require('vue-loader/lib/plugin')
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const HappyPack = require('happypack') //多线程Loader转换 主进程-子进程-主进程=》减少总构建时间
const os = require('os')
const happyThreadPool = HappyPack.ThreadPool({size: os.cpus().length})
const ParallelUglifyPlugin = require('webpack-parallel-uglify-plugin') //增强代码压缩
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;  //分析打包后的文件 将打包后的内容树展示出来
// Tree-shaking主要用来清除代码中无用的部分  坑：tree-shaking生效条件为生成的代码必须是es6模块，如果使用babel的话会将任何模块类型转译为commonjs类型，导致tree-shaking失效；修正：在.babelrc或者webpack.config.js中设置modules:false
const devMode = process.argv.indexOf('--mode=production') === -1;
module.exports = {
  entry:{
    main:path.resolve(__dirname,'../src/main.js')
  },
  output:{
    path:path.resolve(__dirname,'../dist'),
    filename:'js/[name].[hash:8].js',
    chunkFilename:'js/[name].[hash:8].js'
  },
  module:{
    noParse: /jquery/,
    rules:[
      {
        test:/\.js$/,
        //把js文件处理交给id为happyBabel的HappyPack的实例执行
        use:{
          // loader:'babel-loader',
          loader: 'happypack/loader?id=happyBabel',
          // options:{
          //   presets:['@babel/preset-env',{modules: false}]
          // }
        },
        exclude:/node_modules/
      },
      {
        test:/\.vue$/,
        use:[{
          loader:'vue-loader',
          options:{
            compilerOptions:{
              preserveWhitespace:false
            }
          }
        }],
        include: [path.resolve(__dirname,'../src')],
        exclude: /node_modules/
      },
      {
        test:/\.css$/,
        use:[{
          loader: devMode ? 'vue-style-loader' : MiniCssExtractPlugin.loader,
          options:{
            publicPath:"../dist/css/",
            hmr:devMode
          }
        },'css-loader',{
          loader:'postcss-loader',
          options:{
            plugins:[require('autoprefixer')]
          }
        }]
      },
      {
        test:/\.less$/,
        use:[{
          loader:devMode ? 'vue-style-loader' : MiniCssExtractPlugin.loader,
          options:{
            publicPath:"../dist/css/",
            hmr:devMode
          }
        },'css-loader','less-loader',{
          loader:'postcss-loader',
          options:{
            plugins:[require('autoprefixer')]
          }
        }]
      },
      {
        test:/\.(jep?g|png|gif)$/,
        use:{
          loader:'url-loader',
          options:{
            limit:10240,
            fallback:{
              loader:'file-loader',
              options:{
                name:'img/[name].[hash:8].[ext]'
              }
            }
          }
        },
        include: [path.resolve(__dirname,'../src/assets/images')],
        exclude: /node_modules/
      },
      {
        test:/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        use:{
          loader:'url-loader',
          options:{
            limit:10240,
            fallback:{
              loader:'file-loader',
              options:{
                name:'media/[name].[hash:8].[ext]'
              }
            }
          }
        }
      },
      {
        test:/\.(woff2?|eot|ttf|otf)(\?.*)?$/i,
        use:{
          loader:'url-loader',
          options:{
            limit:10240,
            fallback:{
              loader:'file-loader',
              options:{
                name:'media/[name].[hash:8].[ext]'
              }
            }
          }
        }
      },
      {
        test: /\.ext$/,
        use: [
          'cache-loader',
          // ...loaders
        ],
        include: path.resolve(__dirname,'../src')
      }
    ]
  },
  resolve:{
    alias:{
      'vue$':'vue/dist/vue.runtime.esm.js',
      ' @':path.resolve(__dirname,'../src'),
      'assets': path.resolve(__dirname,'src/assets'),
      'components': path.resolve(__dirname,'src/components')
    },
    extensions:['*','.js','.json','.vue'] //扩展名
  },
  plugins:[
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template:path.resolve(__dirname,'../public/index.html')
    }),
    new vueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: devMode ? '[name].css' : '[name].[hash].css',
      chunkFilename: devMode ? '[id].css' : '[id].[hash].css'
    }),
    new HappyPack({
      id: 'happyBabel', //与loader对应的id标识
      //用法和loader的配置一样，此处是loaders
      loaders: [
        {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env']
            ],
            cacheDirectory: true
          }
        }
      ],
      threadPool: happyThreadPool //共享线程池
    }),
    new webpack.DllReferencePlugin({
      context: __dirname,
      manifest: require('./vendor-manifest.json')
    }),
    new CopyWebpackPlugin([ // 拷贝生成的文件到dist目录 这样每次不必手动去cv
      {from: 'static', to:'static'}
    ]),
    new BundleAnalyzerPlugin({
      analyzerHost: '127.0.0.1',
      analyzerPort: 8899
    })
  ],
  optimization: {
    minimizer: [
      new ParallelUglifyPlugin({
        cacheDir: '.cache/',
        uglifyJS: {
          output: {
            comments: false,
            beautify: false
          },
          compress: {
            drop_console: true,
            collapse_vars: true,
            reduce_vars: true
          }
        }
      })
    ]
  },
  // externals: { //引入一个库，不让webpack打包，且不影响在程序总使用，具体使用看webpack官方示例
  //   jquery: 'jQuery'
  // }
}
