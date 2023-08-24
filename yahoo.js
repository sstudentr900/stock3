const yahooFinance = require('yahoo-finance');
async function stockGetData(stockno,from,to){
  return await yahooFinance.historical({
    symbol: `${stockno}.TW`,
    from: from,
    to: to,
    period: 'd'
    // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
  }).then(jsons=>{
    console.log(`jsons資料: ${JSON.stringify(jsons)}`)
  })
}
stockGetData('00692','2023-07-24','2023-08-24')