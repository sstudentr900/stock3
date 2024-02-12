// exports.crawlerStock = crawlerStock;//讓其他程式在引入時可以使用這個函式
const { dbQuery,dbInsert,dbUpdata,dbDelete } = require('./plugin/db')
const { stockCrawler,stockCrawler_market,sleep } = require("./plugin/stockCrawler");
//爬蟲股票
async function crawlerStock(){
  //跑個股
  const rows = await dbQuery( 'SELECT * from stock' )
  if(!rows){console.log(`crawlerStock失敗跳出`)}
  for (const [index, row] of rows.entries()) {
  // for (const row of rows) {
    //跑股票
    await stockCrawler(row)
    
    //只抓2筆
    // if(index>=1){break;}

    //等
    await sleep(20000)
  }
}
crawlerStock()


