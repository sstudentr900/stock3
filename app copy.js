const express = require('express');
const { dbQuery,dbInsert,dbUpdata,dbDelete } = require('./plugin/db')
const { 
  stockPayMoreYear,
  stockYieldPrice,
  stockPayMoreMonth,
  stockCagr,stockStart,
  getNowTimeObj,
  stockHighLowPriceMoreYear,
  stockdataFn_w,
  stockKdFn
} = require("./plugin/stock");
const app = express(); //載入express模組
const port = 3000;//設定port


//解析json
// app.use(bodyParser.urlencoded({extended: false}))
// app.use(bodyParser.json())
app.use(express.json())

//css 引入
app.use(express.static('public'))

//ejs
app.set('views', './views'); // 讀取 EJS 檔案位置
app.set('view engine', 'ejs');// 用 EJS 引擎跑模板


//監聽 port
app.listen(port,()=>{console.log(`port ${port}`)});


//使用express----------------------------------------- 
//middleware把關後才會進入主要的程式碼 ，可以寫一些安全性的程式邏輯
// app.use((req, res, next) => {
//   console.log("這是 middleware");
//   next();
// });

//home
app.get('/', function (req, res) {
  res.send('home')
})
app.get('/table', function (req, res) {
  res.render('table')
})
//查詢股票報酬
app.get('/remuneration', async function (req, res) {
  console.log(`---------查詢股票---------`)
  const rows = await dbQuery( 'SELECT id,sort,networth,stockname,stockno,stockdata,yielddata,updated_at from stock ORDER BY sort ASC' )
  const nowTimeObj = getNowTimeObj()
  const nowDate = nowTimeObj['date']
  for (const row of rows) {
    console.log(`--stockno:${row['stockno']}--`)
    const dataDate = getNowTimeObj({'date':row['updated_at']})['date']
    //不更新時間
    row['dataDate'] = dataDate
    //資料日期和今天日期不一樣更新
    console.log(`updated_at日期${dataDate},今天日期${nowDate}`)
    if(dataDate!=nowDate && dataDate<nowDate){
      // if(dataDate!=nowDate && dataDate<nowDate || !row['stockdata']){
      // console.log(`updated_at和今天日期不一樣且小於今天或是stockdata沒資料`)
      console.log(`updated_at和今天日期不一樣且小於今天`)
      //跑股票
      const jsons = await stockStart(row)
      // console.log(`jsons值,${JSON.stringify(jsons)}`)
      //更新資料或時間
      const updataValue =  jsons?jsons:{'updated_at':nowTimeObj['datetime']}
      // console.log(`updataValue更新資料,${JSON.stringify(updataValue)}`)
      await dbUpdata('stock',updataValue,row['id'])
      //更新row
      jsons && jsons['stockdata']?row['stockdata'] = jsons['stockdata']:console.log(`jsons['stockdata']沒有資料使用row['stockdata']`)
      jsons && jsons['yielddata']?row['yielddata'] = jsons['yielddata']:console.log(`jsons['yielddata']沒有資料`)
      jsons && jsons['networth']?row['networth'] = jsons['networth']:console.log(`jsons['networth']沒有資料`)
      // jsons?row['dataDate'] = nowDate:''
    }
    //stockdata 
    row['stockdata'] = row['stockdata']?JSON.parse(row['stockdata']):'';
    //今年每月報酬
    row['stockPayMonth'] = stockPayMoreMonth(row['stockdata']);
    //最近8年每年報酬
    row['stockPayYear'] = await stockPayMoreYear(row['stockdata'],8);
    //年化報酬率
    row['stockCagr'] = stockCagr(row['stockPayYear']);
    //殖利率
    let yieldObj = row['yielddata']?JSON.parse(row['yielddata']):'';
    yieldObj = stockYieldPrice(yieldObj,row['stockdata']);
    row['stockYield'] = yieldObj.stockYield;//每年殖利率
    row['average'] = yieldObj.average;//平均股利
    row['averageYield'] =yieldObj.averageYield;//平均殖利率
    row['nowYield'] = yieldObj.nowYield;//目前殖利率
    row['cheapPrice']  = yieldObj.cheapPrice;//便宜 
    row['fairPrice'] = yieldObj.fairPrice;//合理
    row['expensivePrice'] =yieldObj.expensivePrice;//昂貴
    //4年高低點
    row['highLowPrice'] = stockHighLowPriceMoreYear(row['stockdata'],4);
    //周kd
    row['wkd_d'] = stockKdFn(stockdataFn_w(row['stockdata']))['last_d'];
  

    //移除不需要的值
    delete row.stockdata
    delete row.yielddata
    delete row.updated_at
    console.log(`row,${JSON.stringify(row)}`)
  }
  // res.send(rows)
  res.render('remuneration',{
    'active': 'remuneration',
    'data': rows,
  })
})
//增加股票報酬
app.post('/remuneration',async function (req, res) {
  console.log(`---------增加股票---------`)
  const params = req.body
  if(!params.stockname || !params.stockno){
    console.log(`來源資料錯誤:${params.stockname}-${params.stockno}-${JSON.stringify(params)}`)
    res.json({result:'false',message:'來源資料錯誤'})
    return false;
  }
  const stockno = params.stockno
  const stocknoArray = await dbQuery( 'SELECT id from stock WHERE stockno = ?',[stockno])
  // console.log(`stocknoArray,${stocknoArray.length}`)
  if(stocknoArray.length){
    console.log('false,資料重複')
    res.json({result:'false',message:'資料重複'})
    return false;
  }else{
    console.log(`stockno:${stockno}`)
    const jsons = await stockStart({'stockno':stockno})
    if(!jsons){
      console.log('找不到資料')
      res.json({result:'false',message:'找不到資料'})
      return false;
    }
    // console.log(jsons)
    const data = {}
    //stockdata 轉換 parse
    // console.log(JSON.stringify(jsons))
    const stockdata = jsons['stockdata']?JSON.parse(jsons['stockdata']):''
    // console.log(`抓取數量:${stockdata.length}`)
    //今年月報酬
    data['stockPayMonth'] = stockPayMoreMonth(stockdata)
    //8年報酬
    data['stockPayYear'] = stockPayMoreYear(stockdata,8)
    //年化報酬率
    data['stockCagr'] = stockCagr(data['stockPayYear'])
    //殖利率
    const yielddata = jsons['yielddata']?JSON.parse(jsons['yielddata']):'';
    const yieldObj = stockYieldPrice(yielddata,stockdata);
    data['stockYield'] = yieldObj.stockYield;//每年殖利率
    data['average'] = yieldObj.average;//平均股利
    data['averageYield'] =yieldObj.averageYield;//平均殖利率
    data['nowYield'] = yieldObj.nowYield;//目前殖利率
    data['cheapPrice']  = yieldObj.cheapPrice;//便宜 
    data['fairPrice'] = yieldObj.fairPrice;//合理
    data['expensivePrice'] =yieldObj.expensivePrice;//昂貴
    //4年高低點
    data['highLowPrice'] = stockHighLowPriceMoreYear(stockdata,4);
    //周kd
    data['wkd_d'] = stockKdFn(stockdataFn_w(stockdata))['last_d'];
    //目前淨值
    data['networth'] = jsons['networth']

    //儲存資料
    // console.log(`儲存資料,jsons,${JSON.stringify(jsons)}`)
    const rows = await dbInsert('stock',params)
    const insertId = rows.insertId
    jsons['sort'] = insertId
    jsons['networth'] = data['networth']
    await dbUpdata('stock',jsons,insertId)

    //id
    data['id'] = insertId

    //移除不需要的值
    delete data.stockdata
    delete data.updated_at

    res.json({result:'true',data: data })
  }
})
//刪除股票報酬
app.delete('/remuneration/:id',async function (req, res) {
  console.log(`---------刪除股票-----------`)
  const params = req.params
  const id = params.id
  console.log(`id:${id}`)
  if(!id){
    console.log(`來源資料錯誤:${params}`)
    res.json({result:'false',message:'來源資料錯誤'})
    return false;
  }
  const rows = await dbDelete('stock',id)
  if(rows){
    res.json({result:'true',message:'刪除股票成功'})
  }else{
    res.json({result:'false',message:'刪除股票失敗'})
  }
})
//排序股票報酬
app.post('/remuneration/sort',async function (req, res) {
  console.log(`---------排序股票報酬---------`)
  const params = req.body
  for (const param of params) {
    // console.log(param['sort'],param['id'])
    await dbUpdata('stock',{'sort':param['sort']},param['id'])
  }
  res.json({result:'true',message: '股票排序成功'})
})

// //error
// app.get('/error', function (req, res) {
//   notDefined(); // 執行一個沒有定義的函式跳去500
// })
// // 404
// app.use((req, res, next) => {
//   res.status(404).send("404 Oops! 找不到網頁！");
// });
// // 500
// app.use((err, req, res, next) => {
//   res.status(500).send("500 程式錯誤，請聯繫 IT 人員協助！");
// });
