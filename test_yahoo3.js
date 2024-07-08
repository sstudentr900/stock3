const yahooFinance = require('yahoo-finance2').default; // NOTE the .default
const fs = require('fs').promises; // 引入 Node.js 的文件系统模块
async function stockGetData(query,queryOptions){
  const result = await yahooFinance.historical(query, queryOptions);
  const formattedData = result.map(i=>{
    let date =  new Date(i.date)
    date =  date.toISOString().split('T')[0];
    //console.log(date,i)
    return{
      "date": date,
      "open": Number(i.open).toFixed(2),
      "high": Number(i.high).toFixed(2),
      "low": Number(i.low).toFixed(2),
      "close": Number(i.close).toFixed(2),
      "volume": i.volume.toString().substring(0,4)+'.'+i.volume.toString().substring(4,6)
    }
  })
  // await fs.writeFile('twii_data.json', JSON.stringify(formattedData, null, ""));

  
}
//台灣加權指數
const period1 = '2000-01-01'
stockGetData('^TWII',{ period1: '20024-01-01',period2:'2024-07-08',interval:'1d'})
