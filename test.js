const yahooFinance = require('yahoo-finance');
yahooFinance.historical({
  symbol: `00713.TW`,
  from: '2023-08-16',
  to: '2023-08-22',
  period: 'd'
  // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
}).then(jsons=>{
  // console.log(jsons)
  // 修改 jsons
  const array = jsons.map(json=>{
    // const date = new Date(json['date']).toLocaleDateString().replace(/\//g,'-')
    let date = new Date(json['date']).toLocaleDateString().split('/')
    // console.log('date',date)
    date = `${date[0]}-${date[1]>9?date[1].toString():'0'+ date[1]}-${date[2]>9?date[2].toString():'0'+ date[2]}`
    // console.log('date2',date)
    return {
      'Date': date,
      // 'Open':json['open'],
      // 'Hight':json['high'],
      // 'Low':json['low'],
      'Close': json['close'].toFixed(2),
      // 'symbol': json['symbol']
      // 'Volume':json['volume']
    };
  })
  console.log('array',array)
  //排小到大
  // const stringTryNumber = (text)=>{
  //   let array = text['Date'].split('-')
  //   let year = array[0].toString()
  //   let month = array[1].toString()
  //   let day = array[2].toString()
  //   return Number(year+month+day)
  // }
  // array.sort((o1,o2)=>{
  //   return stringTryNumber(o1)-stringTryNumber(o2)
  // })
  // return array;
}).catch(reason=>{
  // console.log('crud error',reason)
  // return false
});