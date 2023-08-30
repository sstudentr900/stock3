exports.crawlerStock = crawlerStock;//讓其他程式在引入時可以使用這個函式
const { dbQuery,dbInsert,dbUpdata,dbDelete } = require('./db')
const { stockStart } = require("./stock");
//爬蟲股票
async function crawlerStock(){
  const rows = await dbQuery( 'SELECT id,sort,networth,stockname,stockno,stockdata,yielddata,updated_at from stock ORDER BY sort ASC' )
  if(!rows){console.log(`crawlerStock,dbQuery失敗跳出`)}
  for (const row of rows) {
    //跑股票
    console.log(`----crawlerStock更新${row['stockno']}----`)
    const jsons = await stockStart(row)
    if(jsons){await dbUpdata('stock',jsons,row['id'])}
  }
}

