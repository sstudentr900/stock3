// exports.crawlerStock = crawlerStock;//讓其他程式在引入時可以使用這個函式
const { dbQuery,dbInsert,dbUpdata,dbDelete } = require('./plugin/db')
const { stockCrawler,stockCrawler_market,sleep } = require("./plugin/stockCrawler");
//爬蟲股票
async function crawlerStock(){
  //個股
  // const rows = await dbQuery( 'SELECT * from stock' )
  // if(!rows){console.log(`crawlerStock失敗跳出`)}
  // for (const [index, row] of rows.entries()) {
  //   //跑股票
  //   await stockCrawler(row)

  //   //等
  //   await sleep(20000)
  // }

  // market 大盤
  const rows2 = await dbQuery( 'SELECT * from market where id=1' )
  if(!rows2){console.log(`crawlerStock_market失敗跳出`)}
  // console.log(`rows2,${JSON.stringify(rows2[0])}`)
  await stockCrawler_market(rows2[0])
}
crawlerStock()


