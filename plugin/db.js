const mysql = require('mysql');
//mysql
const pool = mysql.createPool({
  connectionLimit: 10,//連接數
  host           : 'localhost',
  user           : 'root',
  password       : '',
  database       : 'stockdata',
})
let dbQuery = function( sql, values ) {
  return new Promise(( resolve, reject ) => {
    pool.getConnection(function(err, connection) {
      if (err) {
        reject( err )
      } else { 
        // 執行 sql 腳本對資料庫進行讀寫
        connection.query(sql, values, (err, rows) => {
          if ( err ) {
            reject( err )
          } else {
            resolve( rows )
          }
          connection.release()  // 結束會話
        })
      }
    })
  })
}
let dbInsert = async function( dataName ,objs ) {
  console.log(`dbInsert`)
  if(!Object.values(objs).length){console.log('dbInsert->objs錯誤');return false;}
  return await dbQuery( `INSERT INTO ${dataName} SET ?`,objs);
}
let dbUpdata = async function( dataName, objs ,id ) {
  // console.log(`dbUpdata`)
  if(!Object.values(objs).length){console.log('dbUpdata->objs錯誤');return false;}
  const val = []
  const sqlText = []
  Object.entries(objs).forEach((obj) => {
    sqlText.push(obj[0]+' = ?')
    val.push(obj[1])
  });
  val.push(id)
  const sql = `UPDATE ${dataName} SET ${sqlText.join(',')} WHERE id = ?`
  return await dbQuery( sql,val );
}
let dbDelete = async function( dataName ,id ) {
  console.log(`dbDelete`)
  if(!id){console.log('dbDelete->id錯誤');return false;}
  return await dbQuery( `DELETE from ${dataName} WHERE id = ?`,[id] );
}
module.exports = { 
  dbQuery,
  dbInsert,
  dbUpdata,
  dbDelete
}