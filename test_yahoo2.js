// import yahooFinance from 'yahoo-finance2';
const yahooFinance = require('yahoo-finance2').default; // NOTE the .default
async function stockGetData(query,queryOptions){
  const result = await yahooFinance.historical(query, queryOptions);
  console.log(result)
}
stockGetData('00713.TW',{ period1: '2023-09-15',period2:'2023-09-27',interval:'1d'})