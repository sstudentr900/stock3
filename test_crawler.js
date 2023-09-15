// exports.crawlerStock = crawlerStock;//讓其他程式在引入時可以使用這個函式
const { dbQuery,dbInsert,dbUpdata,dbDelete } = require('./plugin/db')
const { stockCrawler,stockCrawler_market } = require("./plugin/stockCrawler");
//爬蟲股票
async function crawlerStock(){
  //個股
  // const rows = await dbQuery( 'SELECT * from stock' )
  // if(!rows){console.log(`crawlerStock失敗跳出`)}
  // for (const row of rows) {
  //   //跑股票
  //   // console.log(`----crawlerStock更新${row['stockno']}----`)
  //   // const jsons = await stockCrawler(row)
  //   // if(jsons){await dbUpdata('stock',jsons,row['id'])}
  //   await stockCrawler(row)
  // }

  //market 大盤
  const rows2 = await dbQuery( 'SELECT * from market where id=1' )
  if(!rows2){console.log(`crawlerStock_market失敗跳出`)}
  // console.log(`rows2,${JSON.stringify(rows2[0])}`)
  await stockCrawler_market(rows2[0])
}
crawlerStock()


