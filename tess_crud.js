const express = require('express');
// const bodyParser = require('body-parser');//解析express裡的json 
const mysql = require('mysql');
const app = express(); //載入express模組
const port = 3000;//設定port

//解析json
// app.use(bodyParser.urlencoded({extended: false}))
// app.use(bodyParser.json())
app.use(express.json())

//監聽 port
app.listen(port,()=>{console.log(`port ${port}`)});

//mysql
const pool = mysql.createPool({
  connectionLimit: 10,//連接數
  host           : 'localhost',
  user           : 'root',
  password       : '',
  database       : 'store1489916217',
})

//使用express 
//home
app.get('/', function (req, res) {
  res.send('home')
})

//get class all data
app.get('/getData', function (req, res) {
  pool.getConnection((err,connection)=>{
    if(err) throw err
    console.log(`connection ${connection.threadId}`)

    //query
    connection.query('SELECT * from class',(err,rows)=>{
      connection.release() //
      if(!err){
        res.send(rows)
      }else{
        console.log(err)
      }
    })
  })
})

//get class one data
app.get('/:id', function (req, res) {
  pool.getConnection((err,connection)=>{
    if(err) throw err
    console.log(`connection ${connection.threadId}`)

    //query
    connection.query('SELECT * from class WHERE id = ?',[req.params.id],(err,rows)=>{
      connection.release() //
      if(!err){
        res.send(rows)
      }else{
        console.log(err)
      }
    })
  })
})

//delet class one data
app.delete('/:id', function (req, res) {
  pool.getConnection((err,connection)=>{
    if(err) throw err
    console.log(`connection ${connection.threadId}`)

    //query
    connection.query('DELETE from class WHERE id = ?',[req.params.id],(err,rows)=>{
      connection.release() //
      if(!err){
        res.send(`${[req.params.id]} remove`)
      }else{
        console.log(err)
      }
    })
  })
})

//add class one data
app.post('/', function (req, res) {
  pool.getConnection((err,connection)=>{
    if(err) throw err
    console.log(`connection ${connection.threadId}`)

    //query
    const params = req.body
    connection.query('INSERT INTO class SET ?',params,(err,rows)=>{
      connection.release() //
      if(!err){
        res.send(`${params.menuitemid} add`)
      }else{
        console.log(err)
      }
    })
  })
})

//update class one data
app.put('/', function (req, res) {
  pool.getConnection((err,connection)=>{
    if(err) throw err
    console.log(`connection ${connection.threadId}`)

    //query
    const {id,menuitemid,weekday,start,end,delete_flag,teacher_id} = req.body
    connection.query(
      'UPDATE class SET menuitemid = ?,weekday = ?,start = ?,end = ?,delete_flag = ?,teacher_id = ? WHERE id = ?',
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

