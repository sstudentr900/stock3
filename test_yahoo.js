const yahooFinance = require('yahoo-finance');
async function stockGetData(stockno,from,to){
  return await yahooFinance.historical({
    symbol: `${stockno}.TW`,
    from: from,
    to: to,
    period: 'd'
    // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
  }).then(reason=>{
    console.log('ok',reason)
    // console.log(`jsons資料: ${JSON.stringify(jsons)}`)
    return JSON.stringify(reason)
  }).catch(reason=>{
    console.log('error',reason)
    return false
  })
}

//
stockGetData('00888','2023-07-24','2023-08-24').then((jsons)=>{
  console.log('21',jsons)
}).catch((jsons)=>{
  console.log('23',jsons)
})
// async function aa(){
//   const jsons = await stockGetData('00692','2023-07-24','2023-08-24')
//   console.log(jsons)
// }
// aa()