const express = require('express');
const { query } = require('./plugin/db')
const { stockPayMoreYear,stockPayTodayYearMonth,stockCagr,stockGrap,getNowTimeObj } = require("./plugin/stock");
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
//報酬
async function updataStockFn(obj){
  const jsons = await stockGrap(obj)
  console.log(`updataStockFn,${JSON.stringify(jsons)}`)
  if(!jsons)return;
  const row = {}
  const values1 = []
  const sqlSet1 = []
  Object.entries(jsons).forEach((json) => {
    sqlSet1.push(json[0]+' = ?')
    values1.push(json[1])
  });
  values1.push(row['id'])
  // console.log(`values1: ${JSON.stringify(values1)}`)
  // console.log(`sqlSet1: ${JSON.stringify(sqlSet1)}`)
  // const values1 = [
  //   recult['price'],
  //   recult['networth'],
  //   JSON.stringify(recult['stockdata']),
  //   JSON.stringify(recult['stockdata_w']),
  //   JSON.stringify(recult['yielddata']),
  //   row['id']
  // ]
  // const sql1 = `UPDATE stock SET stockdata = ?,stockdata_w = ?,price = ?,networth = ? WHERE id = ?`
  const sql1 = `UPDATE stock SET ${sqlSet1.join(',')} WHERE id = ?`
  await query( sql1,values1 )

  //更新stockdata
  const stockdata = JSON.parse(jsons['stockdata'])
  row['stockdata'] = jsons['stockdata']
  //更新時間
  row['dataDate'] = getNowTimeObj()['date']
  //最近8年每年報酬
  row['stockPayYear'] = stockPayMoreYear(stockdata,8)
  //年化報酬率
  row['stockCagr'] = stockCagr(row['stockPayYear'])
  //今年每月報酬
  row['stockPayMonth'] = stockPayTodayYearMonth(stockdata)

  return row;
}
app.get('/remuneration', async function (req, res) {
  const rows = await query( 'SELECT id,stockname,stockno,stockdata,updated_at from stock' )
  const nowDate = getNowTimeObj()['date']
  for (const row of rows) {
    console.log(row['stockno']+'-----------')
    const dataDate = getNowTimeObj(row['updated_at'])['date']
    //資料日期和今天日期不一樣更新
    if(dataDate!=nowDate && dataDate<nowDate || !row['stockdata']){
      console.log(`今天日期:${nowDate},和更新日期不一樣${dataDate}`)
      const updataStockObj = await updataStockFn(row)
      row['stockdata'] = updataStockObj['stockdata']
      //更新時間
      row['dataDate'] = updataStockObj['dataDate']
      //最近8年每年報酬
      row['stockPayYear'] = updataStockObj['stockPayYear']
      //年化報酬率
      row['stockCagr'] = updataStockObj['stockCagr']
      //今年每月報酬
      row['stockPayMonth'] = updataStockObj['stockPayMonth']
    }else{
      const stockdata = JSON.parse(row['stockdata'])
      //不更新時間
      row['dataDate'] = dataDate
      //最近8年每年報酬
      row['stockPayYear'] = stockPayMoreYear(stockdata,8)
      //年化報酬率
      row['stockCagr'] = stockCagr(row['stockPayYear'])
      //今年每月報酬
      row['stockPayMonth'] = stockPayTodayYearMonth(stockdata)
    }
  }
  // res.send(rows)
  res.render('remuneration',{
    'active': 'remuneration',
    'data': rows,
  })
})
app.post('/remuneration',async function (req, res) {
  const params = req.body
  const stockNo = params.stockNo
  const stockNoArray = await query( 'SELECT id from stock WHERE stockno = ?',[stockNo])
  // console.log(`stockNoArray,${stockNoArray.length}`)
  if(stockNoArray.length){
    console.log('false,資料重複')
    res.json({result:'false',error:'資料重複'})
  }else{
    console.log('INSERT')
    const rows = await query( 'INSERT INTO stock SET ?',params)
    // console.log(`insertId,${rows.insertId}`) 
    const updataStockObj = await updataStockFn(stockNo)
    console.log(updataStockObj)
  }
})
app.delete('/remuneration/:id',async function (req, res) {
  console.log(req.params.id)
  // const rows = await query( 'DELETE from class WHERE id = ?',[req.params.id] )
  // console.log(rows)
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
