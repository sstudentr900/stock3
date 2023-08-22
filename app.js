const express = require('express');
const engine = require("ejs-locals");
const { query } = require('./plugin/db')
const { stockPayMoreYear,stockPayTodayYearMonth,stockCagr,stockGrap,getNowTimeObj } = require("./plugin/stock");
const app = express(); //載入express模組
const port = 3000;//設定port


//解析json
// app.use(bodyParser.urlencoded({extended: false}))
// app.use(bodyParser.json())
app.use(express.json())

//ejs
app.engine('ejs', engine);
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
app.get('/remuneration', async function (req, res) {
  const rows = await query( 'SELECT id,stockname,stockno,stockdata,updated_at from stock' )
  // stockPayTodayYearMonth(rows[0]['stockdata']) //test
  const nowTimeObj = getNowTimeObj()
  // console.log(nowTimeObj['date'])
  for (const row of rows) {
    console.log(row['stockno']+'-----------')
    let dataDate = new Date(row['updated_at']);
    dataDate = dataDate.getFullYear()+'-'+('0'+(dataDate.getMonth()+1)).slice(-2)+'-'+('0'+dataDate.getDate()).slice(-2)
    //時間不一樣更新
    if(nowTimeObj['date']!=dataDate){
      console.log('時間不一樣更新資料')
      const recult = await stockGrap(row)
      const values1 = [
        recult['price'],
        recult['networth'],
        JSON.stringify(recult['stockdata']),
        JSON.stringify(recult['stockdata_w']),
        JSON.stringify(recult['yielddata']),
        row['id']
      ]
      const sql1 = 'UPDATE stock SET price = ?,networth = ?,stockdata = ?,stockdata_w = ?,yielddata = ? WHERE id = ?'
      await query( sql1,values1 )
      //補資料
      row['stockdata'] = recult['stockdata']
    }
    //更新時間
    row['dataDate'] = dataDate
    //年報酬
    row['stockPayYear'] = stockPayMoreYear(row['stockdata'],8)
    //年化報酬率
    row['stockCagr'] = stockCagr(row['stockPayYear'])
    //月報酬
    row['stockPayMonth'] = stockPayTodayYearMonth(row['stockdata'])
  }
  // console.log(rows)
  res.render('remuneration',{
    'active': 'remuneration',
    'data': rows,
  })
  // res.send(rows)
})
app.delete('/remuneration/:id',async function (req, res) {
  const rows = await query( 'DELETE from class WHERE id = ?',[req.params.id] )
  console.log(rows)
})

//error
app.get('/error', function (req, res) {
  notDefined(); // 執行一個沒有定義的函式跳去500
})
// 404
app.use((req, res, next) => {
  res.status(404).send("404 Oops! 找不到網頁！");
});
// 500
app.use((err, req, res, next) => {
  res.status(500).send("500 程式錯誤，請聯繫 IT 人員協助！");
});
