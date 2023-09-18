const yahooFinance = require('yahoo-finance');
async function stockGetData(stockno,from,to){
  return await yahooFinance.historical({
    // symbol: `${stockno}.TW`,
    symbol: `${stockno}`,
    from: from,
    to: to,
    period: 'd'
    // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
  }).then(jsons=>{
    // console.log('ok',jsons)
    // console.log(`jsons資料: ${JSON.stringify(jsons)}`)
    return JSON.stringify(jsons)
  }).catch(reason=>{
    console.log('error',reason)
    return false
  })
}

//
stockGetData('^TWII','2023-08-16','2023-09-16').then((jsons)=>{
  console.log('21',jsons)
}).catch((jsons)=>{
  console.log('23',jsons)
})
// async function aa(){
//   const jsons = await stockGetData('00692','2023-07-24','2023-08-24')
//   console.log(jsons)
// }
// aa()