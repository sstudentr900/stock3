const express = require('express');
const engine = require("ejs-locals");
const { query } = require('./plugin/db')
const { stockPromise,stockGrap,getNowTimeObj } = require("./plugin/stock");
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

//報酬 get all data
app.get('/remuneration', async function (req, res) {
  const sql = 'SELECT * from stock'
  const rows = await query( sql )
  for (const row of rows) {
    // console.log(row['yielddata'])
    // if(!row['stockdata'] || !row['yielddata'] || row['yielddata']!=0){
      console.log(row['stockno']+'-----------')
      const recult = await stockGrap(row)
      const sql1 = 'UPDATE stock SET price = ?,networth = ?,stockdata = ?,stockdata_w = ?,yielddata = ? WHERE id = ?'
      const values1 = [
        recult['price'],
        recult['networth'],
        JSON.stringify(recult['stockdata']),
        JSON.stringify(recult['stockdata_w']),
        recult['yielddata'],
        row['id']
      ]
      const row1 = await query( sql1,values1 )
    // }
    // console.log(recult['price'])
  }
  // }
  // res.render('remuneration',{
  //   'active': 'remuneration',
  //   'data': rows,
  // })
  res.send(rows)
})
//報酬 get one data
app.get('/remuneration/:id', function (req, res) {
  pool.getConnection((err,connection)=>{
    if(err) throw err
    // console.log(`connection ${connection.threadId}`)
    //query
    connection.query('SELECT * from stock WHERE id = ?',[req.params.id],(err,rows)=>{
      connection.release() //
      if(!err){
        res.send(rows)
      }else{
        console.log(err)
      }
    })
  })
})
//報酬 delet one data
app.delete('/remuneration/:id', function (req, res) {
  pool.getConnection((err,connection)=>{
    if(err) throw err
    // console.log(`connection ${connection.threadId}`)

    //query
    connection.query('DELETE from stock WHERE id = ?',[req.params.id],(err,rows)=>{
      connection.release() //
      if(!err){
        res.send(`${[req.params.id]} remove`)
      }else{
        console.log(err)
      }
    })
  })
})
//報酬 add one data
app.post('/remuneration/', function (req, res) {
  pool.getConnection((err,connection)=>{
    if(err) throw err
    // console.log(`connection ${connection.threadId}`)

    //query
    const params = req.body
    connection.query('INSERT INTO stock SET ?',params,(err,rows)=>{
      connection.release() //
      if(!err){
        res.send(`${params.menuitemid} add`)
      }else{
        console.log(err)
      }
    })
  })
})
//報酬 update one data
app.put('/remuneration/', function (req, res) {
  pool.getConnection((err,connection)=>{
    if(err) throw err
    // console.log(`connection ${connection.threadId}`)

    //query
    const {id,menuitemid,weekday,start,end,delete_flag,teacher_id} = req.body
    connection.query(
      'UPDATE stock SET menuitemid = ?,weekday = ?,start = ?,end = ?,delete_flag = ?,teacher_id = ? WHERE id = ?',
      [menuitemid,weekday,start,end,delete_flag,teacher_id,id],
      (err,rows)=>{
        connection.release() //
        if(!err){
          res.send(`${id} update`)
        }else{
          console.log(err)
        }
      }
    )
  })
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
