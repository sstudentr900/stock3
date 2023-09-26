function getNowTimeObj(obj){
  const objDate = obj?.date
  const objDay = obj?.day
  const objYear= obj?.year
  const dt = objDate?new Date(objDate):new Date();
  objDay?dt.setDate(dt.getDate()+Number(objDay)):'';//加減日
  objYear?dt.setFullYear(dt.getFullYear()+Number(objYear)):'';//加減日
  // const year = Number(dt.getFullYear());//取幾年-2022
  // let month = Number(dt.getMonth())+1;//取幾月-8
  // month = month>9?month:'0'+month//08
  const year = dt.getFullYear()+'';
  const month = ('0'+(dt.getMonth()+1)).slice(-2);
  const day = ('0'+dt.getDate()).slice(-2);
  const date = `${year}-${month}-${day}`;
  const hours = ('0'+(dt.getHours())).slice(-2);
  const min = ('0'+(dt.getMinutes())).slice(-2);
  const sec = ('0'+(dt.getSeconds())).slice(-2);
  const time = `${hours}:${min}:${sec}`;
  const datetime = `${date} ${time}`;
  return {
    "year": year,
    "month" :month,
    "day": day,
    "date": date,
    "hours": hours,
    "min": min,
    "sec": sec,
    "time": time,
    "datetime": datetime
  }
}
function getMonthly({year,json}){
  //取得每月 2020-01-01~2020-02-01~2020-03-01
  const arr = []
  const array = []
  const yearNumber = (new Date().getFullYear()-Number(year))+1
  Array.from(Array(yearNumber)).forEach((y, y_i) => {
    Array.from(Array(12)).forEach((m, m_i) => {
      arr.push(`${Number(year)+y_i}-${('0'+(m_i+1)).slice(-2)}-01`)
    })
  })
  arr.forEach(function(o){
    const oDtae = o.split('-')
    const value = json.find(function(item){
      const itemDtae = item.date.split('-')
      if(itemDtae[0]+'-'+itemDtae[1]==oDtae[0]+'-'+oDtae[1] && item.date>=o){
        return item
      }
    })
    if(value){
      array.push(value);
    }
  })
  return array;
}
function getSort({obj,number}){
  if(obj){
    return JSON.parse(obj).slice(-1*Number(number))
    .sort((o1,o2)=>Number(o2.date.split('-').join(''))-Number(o1.date.split('-').join('')));
  }else{
    return false;
  }
}
function getAccumulate({obj}){
  //累加
  // obj = JSON.parse(obj)
  let array = [];
  let sum = 0;
  // console.log(obj)
  for(let n of obj) {
    sum += Number(n);
    array.push(sum.toFixed(2))
  }
  return array;
}
function getMa(dayCount, data) {
  var result = [];
  for (var i = 0, len = data.length; i < len; i++) {
    if (i < dayCount) {
      result.push('-');
      continue;
    }
    var sum = 0;
    for (var j = 0; j < dayCount; j++) {
      console.log(i,j,data[i - j],data[i - j]['close'])
      sum += +data[i - j]['close'];
    }
    result.push((sum / dayCount).toFixed(2));
  }
  return result;
}
function stockAvenge(startPrice,endPrice){
  return (((endPrice-startPrice)/startPrice)*100).toFixed(2)+'%'
}
function stockYieldPrice(yielddata,stockdata){
  console.log(`stockYieldPrice,股利便宜昂貴價`)
  //判斷沒值
  // console.log(`stockYieldPrice,${yielddata.length},${stockdata.length}`)
  if(!yielddata.length){console.log(`stockYieldPrice,沒有股利資料`)}
  if(!stockdata.length){console.log(`stockYieldPrice,沒有股票資料`)}
  if(!yielddata.length || !stockdata.length){
    const json = [];
    const dt = getNowTimeObj();
    const year = dt['year']; //今年
    const before_year = ((year*1)-1); //前年
    let before5_year = ((year*1)-5); //5前年
    for(before5_year;before5_year<=before_year;before5_year++){
      json.push({
        'nowYear': before5_year,
        'dividend': '0',
        'yield': '0',
      })
    }
    return {
      stockYield: json,//各年殖利率
      yearLength: '0',//年數
      average: '0', //平均股利
      averageYield: '0', //平均殖利率
      nowYield:'0',//目前殖利率
      cheapPrice: '0', //便宜 
      fairPrice: '0', //合理
      expensivePrice: '0', //昂貴
    }
  }

  //有值
  //(5年)平均股利
  const yearTotle = yielddata.reduce((previous,current)=>previous+Number(current.dividend),0)
  const yearLength = yielddata.length
  const average = Number((yearTotle/yearLength).toFixed(2))
  // console.log(`stockYieldPrice,yearLength,${yearLength}`)

  //平均殖利率
  const averageYieldFn = (yielddata)=>{
    // console.log(`stockYieldPrice,yielddata,${JSON.stringify(yielddata)}`)
    const yearTotle = yielddata.reduce((previous,current)=>previous+Number(current.yield),0)
    // console.log(`stockYieldPrice,yearTotle,${yearTotle}`)
    const yearLength = yielddata.length
    // console.log(`stockYieldPrice,yearLength,${yearLength}`)
    return (yearTotle/yearLength).toFixed(2)+'%';
  }

  //n天殖利率(股票殖利率 = 現金股利 ÷ 股價)
  const yieldFn = (stockdata,average,day)=>{
    const nowClose = stockdata[stockdata.length-day]?.close
    if(nowClose){
      const num = ((average/nowClose)*100).toFixed(2)+'%'
      return {yield:num,close:nowClose};
    }else{
      return {yield:'0%',close:0};
    }
  }

  //不到5年捕5年
  const stockYieldFn = (yielddata)=>{
    // console.log(`yielddata,${JSON.stringify(yielddata)}`)
    const yieldLength = yielddata.length
    let json = JSON.parse(JSON.stringify(yielddata))
    //加百分比
    json = json.map(item=>{
      // console.log(`map,${JSON.stringify(item)},${item.nowYear},${item.dividend},${item.yield}`)
      return{
        'nowYear': item.date,
        'dividend': item.dividend,
        'yield': `${item.yield}%`,
      }
    })
    // console.log(`json,${JSON.stringify(json)}`)
    if(yieldLength<5){
      const dt = getNowTimeObj();
      const year = dt['year']; //今年
      const before_year = ((year*1)-1); //前年
      let before5_year = ((year*1)-5); //5前年
      for(before5_year;before5_year<=before_year;before5_year++){
        const isYear = json.every(item=>{
          // console.log(`every,${item.nowYear},${before5_year},${item.nowYear == before5_year}`)
          return item.nowYear != before5_year;
        })
        // console.log(`isYear,${before5_year},${Boolean(isYear)}`)
        if(isYear){
          json.unshift({
            'nowYear': before5_year,
            'dividend': '0',
            'yield': '0',
          })
        };
      }
    }
    //小到大
    json.sort((o1,o2)=>{
      return Number(o1['nowYear'])-Number(o2['nowYear']);
    })
    // console.log(`yielddata,${JSON.stringify(yielddata)}`)
    // console.log(`json,${JSON.stringify(json)}`)
    return json;
  }

  return {
    // monthYield: yieldFn(stockdata,average,20)['yield'],
    // threeMonthYield: yieldFn(stockdata,average,60)['yield'],
    // halfYearYield: yieldFn(stockdata,average,120)['yield'],
    // yearYield: yieldFn(stockdata,average,240)['yield'],
    // exdividendBefore: yearArray[0]?yearArray[0].yearExdividend:0,
    // exdividendBefore1: yearArray[1]?yearArray[1].yearExdividend:0,
    // exdividendBefore2: yearArray[2]?yearArray[2].yearExdividend:0,
    // average,
    // yearArray:JSON.stringify(yearArray), //殖利率資料
    yearLength: yearLength,//年數
    average: `${yearLength}年,${average}`, //平均股利
    averageYield: `${yearLength}年,${averageYieldFn(yielddata)}`, //平均殖利率
    nowYield: yieldFn(stockdata,average,1)['yield'],//目前殖利率
    stockYield: stockYieldFn(yielddata),//各年殖利率
    cheapPrice: (average*16).toFixed(2), //便宜 
    fairPrice: (average*20).toFixed(2), //合理
    expensivePrice: (average*32).toFixed(2), //昂貴
  }
}
function stockPay(stockdata,time){
  console.log('跑股票報酬')
  const end = stockdata[stockdata.length-1]['close']
  const start = stockdata[stockdata.length-(1+time)]?.close
  //https://bobbyhadz.com/blog/javascript-cannot-read-property-of-undefined
  if(start){
    // const percentage = (((end-start)/start)*100).toFixed(2)+'%'
    // console.log(time,end,start,percentage)
    return stockAvenge(start,end)
  }else{
    return '0%'
  }
}
function stockPayOneYear(stockdata,year){
  if(!stockdata.length)return;
  // console.log(`跑${year}報酬`)
  // stockdata = JSON.parse(stockdata)
  const array = stockdata.filter(({date})=>{
    return date>=`${year}-01-01` && date<=`${year}-12-31`;
  })
  // console.log(array)
  if(array.length){
    const start = array[0]['close']
    const end = array.pop()['close']
    const avenge = stockAvenge(start,end)
    // console.log(avenge)
    return avenge;
  }else{
    return '0';
  }
}
function stockPayMoreYear(stockdata,number){
  console.log(`stockPayMoreYear,跑最近${number}年每年報酬`)
  const row = []
  const nowTimeObj = getNowTimeObj()
  let year = nowTimeObj['year'] - number + 1;

  //沒值
  if(!stockdata.length){console.log('stockYieldPrice,沒有股利資料')}
  if(!number){console.log('stockYieldPrice,沒有年數')}
  if(!stockdata.length || !number){
    // let year = nowTimeObj['year'] - number;
    while (year <= nowTimeObj['year']){
      row.push({
        'year': year,
        'avenge': '0'
      })
      year++
    }
    return row;
  }

  //有值
  while (year <= nowTimeObj['year']){
    // const obj = {}
    // obj[`${year}`] = stockPayOneYear(stockdata,year)
    // obj['year'] = year+'';
    // obj['avenge'] = stockPayOneYear(stockdata,year);
    // row.push(obj)
    row.push({
      'year': year+'',
      'avenge': stockPayOneYear(stockdata,year)
    })
    year++
  }
  return row;
}
function stockPayMoreMonth(stockdata){
  console.log(`stockPayMoreMonth,跑每月報酬`)
  const nowTimeObj = getNowTimeObj()
  const year = nowTimeObj['year']
  const nowMonth = nowTimeObj['month']
  const row = []
  //沒值
  if(!stockdata.length){
    console.log('stockPayMoreMonth,沒有股票資料')
    for(let i=1;i<=nowMonth;i++){
      row.push({
        'month': ('0'+i).slice(-2),
        'avenge': '0'
      })
    }
    return row;
  }
  //有值
  for(let i=1;i<=nowMonth;i++){
    const obj = {}
    const month = ('0'+i).slice(-2)
    // console.log(`${year}-${month}-01`)
    const dates = stockdata.filter(({date})=>{
      return date>=`${year}-01-01` && date<=`${year}-${month}-31`;
    })
    obj['month'] = month
    if(dates.length){
      // obj['Date_s'] = date[0]['Date']
      // obj['Date_e'] = date[date.length-1]['Date']
      // obj['Close_s'] = date[0]['Close'].toString()
      // obj['Close_e'] = date[date.length-1]['Close'].toString()
      obj['avenge'] = stockAvenge(dates[0]['close'],dates[dates.length-1]['close'])
    }else{
      obj['avenge'] = 0
    }
    row.push(obj)
  }
  return row;
}
function stockCagr(stockPayYear){
  console.log(`stockCagr,跑年化報酬率`)
  //年化報酬率(%) = (總報酬率+1)^(1/年數) -1
  // 投資案A. 費時10年，總報酬率200%
  // (200%+1)^(1/10)-1 = 3^(0.1)-1 = (1.116–1)*100 = 11.6%
  // 3^(0.1)==3**(0.1) 指數運算子 js寫法
  
  //year
  const date = stockPayYear.filter(({avenge})=>{
    return avenge.includes('%');
  })
  //total
  const total = date.reduce((accumulator, currentValue, currentIndex, array)=>{
    const avengeValue = currentValue.avenge.split('%')[0]*1;
    return accumulator + avengeValue;
  },0).toFixed(2) 
  //結果
  // console.log(`total,${Boolean(total)},date,${Boolean(date.length)}`)
  if(total && date.length>0){
    // console.log(`626${(((total/100+1)**(1/date.length)-1)*100).toFixed(2)}`)
    return (((total/100+1)**(1/date.length)-1)*100).toFixed(2);
  }else {
    console.log(`stockCagr,沒有資料`)
    return '0';
  }
}
function stockHighLowPrice(stockdata,year){
  // console.log(`stockHighLowPrice,跑${year}年高低點`)
  //有值
  let maxClose = stockdata.reduce((a,b)=>a.close>=b.close?a:b)['close']
  let minClose = stockdata.reduce((a,b)=>a.close<=b.close?a:b)['close']
  let diffind = (((maxClose-minClose)/maxClose)*100).toFixed(2)+'%'
  return {'max':Number(maxClose).toFixed(2),'min':Number(minClose).toFixed(2),'diffind': diffind,'year':year} 
}
function stockHighLowPriceMoreYear(stockdata,number){
  if(!stockdata.length){console.log(`stockHighLowPriceMoreYear,沒有股票資料`)}
  if(!number){console.log(`stockHighLowPriceMoreYear,沒有年資料`)}
  console.log(`stockHighLowPriceMoreYear,${number}年高低點`)
  const json = [];
  const nowTimeObj = getNowTimeObj();
  let before_year = nowTimeObj['year'] - number;
  // while (before_year <= nowTimeObj['year']){
  for(before_year;before_year<=nowTimeObj['year']; before_year++){
    // console.log(`before_year,${before_year}`)
    if(!stockdata.length || !number){
      console.log(`stockHighLowPriceMoreYear,datalength,沒有值`)
      json.push({'max':'0','min':'0','diffind': '0','year':before_year}) 
      continue;
    }
    // console.log(`stockHighLowPriceMoreYear,stockdata,${JSON.stringify(stockdata)}`)
    const data = stockdata.filter(item=>item.date.split('-')[0]==before_year)
    if(!data.length){
      console.log(`stockHighLowPriceMoreYear,data,沒有值`)
      json.push({'max':'0','min':'0','diffind': '0','year':before_year}) 
      continue;
    }
    // console.log(`data,${JSON.stringify(data)}`)
    json.push(stockHighLowPrice(data,before_year))
  }
  // console.log(`stockHighLowPriceMoreYear,json,${JSON.stringify(json)}`)
  return json;
}
function stockKdData(stockdata,day){
  let K = 0
  let D = 0
  day = day?day:9
  const kdData = []
  const kdFn = function(nineDayData){
    // 最近九天的最低價,最高價
    let minClose = nineDayData.reduce((pre,cur)=>pre.close<cur.close?pre:cur).close
    let maxClose = nineDayData.reduce((pre,cur)=>pre.close>cur.close?pre:cur).close
    // 今日收盤價
    let todayClose = nineDayData[nineDayData.length-1].close
    //RSV = ( 今日收盤價 - 最近九天的最低價 ) / ( 最近九天的最高價 - 最近九天最低價 )
    let rsv = 100 * (todayClose-minClose) / (maxClose - minClose)
    //K = 2/3 * ( 昨日K值 ) + 1/3 * ( 今日RSV )
    K = (2/3) * K + (1/3) * rsv
    //D = 2/3 * ( 昨日D值 ) + 1/3 * ( 今日K值 )
    D = (2/3) * D + (1/3) * K
    return {
      date: nineDayData[nineDayData.length-1].date,
      K: (K).toFixed(2),
      D: (D).toFixed(2)
    }
  }
  stockdata.forEach((element,index) => {
    const ind = index+1;
    if(ind>day){
      const star = ind-day
      const end =  ind
      //取0~9,1~10 資料
      const nineDayData = stockdata.slice(star,end)
      // console.log(`取${star}~${end}資料,${JSON.stringify(nineDayData)}`)
      kdData.push(kdFn(nineDayData))
    }
  });
  return kdData
}
function stockKdFn(stockdata){
  console.log(`stockKdFn,跑KD`)
  // console.log(`stockKdFn,${stockdata}`)
  if(!stockdata.length){
    console.log(`stockKdFn,沒有股票資料`)
    return {
      'datas': '0',
      'last_data': '0',
      'last_date': '0',
      'last_d': '0',
      'last_k': '0',
    }
  }
  //有值
  const kdDatas = stockKdData(stockdata)
  return {
    'datas': kdDatas,
    'last_data': kdDatas[kdDatas.length-1],
    'last_date': kdDatas[kdDatas.length-1]['date'],
    'last_d': kdDatas[kdDatas.length-1]['D'],
    'last_k': kdDatas[kdDatas.length-1]['K'],
  }
}
function stockGetkdDataX(stockdata,day){
  let K = 0
  let D = 0
  let kdData = []
  let kdFn = function(nineDayData){
    // 最近九天的最低價,最高價
    let minClose = nineDayData.reduce((pre,cur)=>pre.close<cur.close?pre:cur).close
    let maxClose = nineDayData.reduce((pre,cur)=>pre.close>cur.close?pre:cur).close
    // 今日收盤價
    let todayClose = nineDayData[nineDayData.length-1].close
    //RSV = ( 今日收盤價 - 最近九天的最低價 ) / ( 最近九天的最高價 - 最近九天最低價 )
    let rsv = 100 * (todayClose-minClose) / (maxClose - minClose)
    //K = 2/3 * ( 昨日K值 ) + 1/3 * ( 今日RSV )
    K = (2/3) * K + (1/3) * rsv
    //D = 2/3 * ( 昨日D值 ) + 1/3 * ( 今日K值 )
    D = (2/3) * D + (1/3) * K
    return {
      date: nineDayData[nineDayData.length-1].date,
      K: (K).toFixed(2),
      D: (D).toFixed(2)
    }
  }
  stockdata.forEach((element,index) => {
    let ind = index+1;
    if(ind>day){
      let star = ind-day
      let end =  ind
      //0~9,1~10
      let nineDayData = stockdata.slice(star,end)
      kdData.push(kdFn(nineDayData))
    }
  });
  return kdData
}
function stockKdFnX(stockdata,stockno,stockname,method,dataSymbol){
  // console.log(`kdFn get ${stockno} data`)
  let kdDatas = stockGetkdData(stockdata)
  let kdData = kdDatas[kdDatas.length-1]
  let nowValue = ''
  let message = `${kdData['date']},${stockname}(${stockno}),目前${dataSymbol}值${kdData[dataSymbol]} `
  if(~method.indexOf('<')){
    nowValue = Number(method.split('<')[1])
    if(Number(kdData[dataSymbol])<nowValue){
      message += `【有符合】${dataSymbol}值<${nowValue}`
    }else{
      message += `【沒有符合】${dataSymbol}值<${nowValue}`
    }
  }
  if(~method.indexOf('>')){
    nowValue = Number(method.split('>')[1])
    if(Number(kdData[dataSymbol])>nowValue){
      message += `【有符合】${dataSymbol}值>${nowValue}`
    }else{
      message += `【沒有符合】${dataSymbol}值>${nowValue}`
    }
  }
  console.log('kdFn_message',message)
  return message;
}
function stockMethod({stockno,stockname,method,stockdata}) {
  //kd
  console.log(`stockMethod ${stockno}`)
  if(~method.indexOf('k')){
    return stockKdFn(stockdata,stockno,stockname,method,'K')
  }
  if(~method.indexOf('d')){
    return stockKdFn(stockdata,stockno,stockname,method,'D')
  }
};
function stockdataFn_w(stockdata){
  console.log('stockdataFn_w,(周)')
  if(!stockdata.length){
    console.log('stockdataFn_w,沒有資料跳出')
    return false;
  }
  return stockdata.filter(item=>new Date(item.date).getDay()==5)
  // const stockdata_w = stockdata.filter(data=>new Date(data.Date).getDay()==5)
  // console.log(`stockdataFn_w,資料${JSON.stringify(stockdata_w)}`)
  // return stockdata_w;
  
}
module.exports={
  stockMethod,
  stockdataFn_w,
  stockPay,
  stockHighLowPrice,
  stockHighLowPriceMoreYear,
  stockYieldPrice,
  getNowTimeObj,
  stockPayMoreYear,
  stockPayMoreMonth,
  stockKdFn,
  stockCagr,
  getMonthly,
  getSort,
  getMa,
  getAccumulate
}
