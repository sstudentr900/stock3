const express = require('express');
const { dbQuery,dbInsert,dbUpdata,dbDelete } = require('./plugin/db')
const { stockPayMoreYear,stockPayTodayYearMonth,stockCagr,stockStart,getNowTimeObj } = require("./plugin/stock");
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
  const rows = await dbQuery( 'SELECT id,sort,stockname,stockno,stockdata,updated_at from stock ORDER BY sort ASC' )
  const nowTimeObj = getNowTimeObj()
  const nowDate = nowTimeObj['date']
  for (const row of rows) {
    console.log(`--stockno:${row['stockno']}--`)
    const dataDate = getNowTimeObj(row['updated_at'])['date']
    //不更新時間
    row['dataDate'] = dataDate
    //資料日期和今天日期不一樣更新
    if(dataDate!=nowDate && dataDate<nowDate || !row['stockdata']){
      console.log(`資料日期${dataDate}和今天日期${nowDate}不一樣`)
      //跑股票
      const jsons = await stockStart(row)
      //更新資料或時間
      const updataValue =  jsons?jsons:{'updated_at':nowTimeObj['datetime']}
      await dbUpdata('stock',updataValue,row['id'])
      //更新row
      jsons?row['stockdata'] = jsons['stockdata']:''
      jsons?row['dataDate'] = nowDate:''
    }
    const stockdata = JSON.parse(row['stockdata'])
    //今年每月報酬
    row['stockPayMonth'] = stockPayTodayYearMonth(stockdata)
    //最近8年每年報酬
    row['stockPayYear'] = await stockPayMoreYear(stockdata,8)
    //年化報酬率
    row['stockCagr'] = stockCagr(row['stockPayYear'])

    //移除不需要的值
    delete row.stockdata
    delete row.updated_at
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
    }else{
      // console.log(jsons)
      const data = {}
      //stockdata 轉換 parse
      const stockdata = JSON.parse(jsons['stockdata'])
      console.log(`抓取數量:${stockdata.length}`)
      //今年每月報酬
      data['stockPayMonth'] = stockPayTodayYearMonth(stockdata)
      //最近8年每年報酬
      data['stockPayYear'] = await stockPayMoreYear(stockdata,8)
      //年化報酬率
      data['stockCagr'] = stockCagr(data['stockPayYear'])
      //儲存資料
      const rows = await dbInsert('stock',params)
      const insertId = rows.insertId
      jsons['sort'] = insertId
      await dbUpdata('stock',jsons,insertId)
      //id
      data['id'] = insertId

      //移除不需要的值
      delete data.stockdata
      delete data.updated_at

      res.json({result:'true',data: data })
    }
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
    console.log(param['sort'],param['id'])
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
