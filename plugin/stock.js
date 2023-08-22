const request = require("request");//抓取整個網頁的程式碼
const cheerio = require("cheerio");//後端的 jQuery
const yahooFinance = require('yahoo-finance');
function getTimes(monthLength){
  const dt = new Date();
  let year = Number(dt.getFullYear());//2022
  let month = Number(dt.getMonth())+2;//+2是因為第一次減1
  const date = '01';//日期固定01日
  const monthFn = function(month){
    //2=>02
    return (month>=10?month:'0'+month).toString()
  }
  //['20220701','20220801','20220901']
  return Array.from({
    length: monthLength
  }, (val, index) => {
    month -= 1
    //year 111,110
    //month 12,11,10 
    if(month==0){
      year -= 1
      month = 12
    }

    //'1110301'
    return year.toString()+monthFn(month)+date
  }); 
} 
function stockPromise(obj){
  return new Promise( (resolve, reject) => {
    setTimeout(()=>{
      request(obj,(error, response, body)=>{
        if (error) {
          reject(error);
        } else {
          resolve(body)
        }
      });
    },0)
  })
}
async function stockGetDataX(stockno,monthLength=3){
  let stockdata = []
  //['20220701','20220801','20220901']
  let dates = getTimes(monthLength)
  for(let date of dates){   
    let jsonUrl = "https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=" + date + "&stockno=" + stockno;
    let body = ''
    console.log('jsonUrl',jsonUrl)
    try{
      body = await stockPromise({url: jsonUrl,method: "GET"})
      body = JSON.parse(body)
    }catch(error){
      //請求錯誤訊息
      console.log(`stockGetData ${stockno} request ${date} date ${error}`)
      return `stockGetData ${stockno} request ${date} date ${error}`
    }
    //請求成功但沒有資料
    if(body.stat!='OK'){
      console.log(`stockGetData_body ${stockno} request ${date} date ${body.stat}`)
      return `stockGetData_body ${stockno} request ${date} date ${body.stat}`
    }
    let jsons = body.data
    // console.log('jsons',jsons)
    let array = jsons.map(json=>{
      return {
        // 'Date':Number(json[0].split('/').join('')),
        'Date':json[0],
        'Open':Number(json[3]),
        'Hight':Number(json[4]),
        'Low':Number(json[5]),
        'Close':Number(json[6]),
        'Volume':Number(json[8].replace(/,/g,''))
      };
    })
    stockdata = stockdata.concat(array)
  }
  stockdata.sort((o1,o2)=>o1.Date.split('/').join('')-o2.Date.split('/').join(''))
  return stockdata
}
async function stockGetData(stockno,from,to){
  return await yahooFinance.historical({
    symbol: `${stockno}.TW`,
    from: from,
    to: to,
    period: 'd'
    // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
  }).then(jsons=>{
    console.log('array',jsons)
    if(!jsons){
      return false
    }

    //修改 jsons
    const array = jsons.map(json=>{
      // const date = new Date(json['date']).toLocaleDateString().replace(/\//g,'-')
      let date = new Date(json['date']).toLocaleDateString().split('/')
      date = `${date[0]}-${date[1]>9?date[1].toString():'0'+ date[1]}-${date[2]>9?date[2].toString():'0'+ date[2]}`
      return {
        'Date': date,
        // 'Open':json['open'],
        // 'Hight':json['high'],
        // 'Low':json['low'],
        'Close':json['close'].toFixed(2),
        // 'symbol': json['symbol']
        // 'Volume':json['volume']
      };
    })
    //排小到大
    const stringTryNumber = (text)=>{
      let array = text['Date'].split('-')
      let year = array[0].toString()
      let month = array[1].toString()
      let day = array[2].toString()
      return Number(year+month+day)
    }
    array.sort((o1,o2)=>{
      return stringTryNumber(o1)-stringTryNumber(o2)
    })
    return array;
  }).catch(reason=>{
    console.log('crud error',reason)
    return false
  });
}
async function stockExdividend(stockno){
  //除息
  const jsonUrl = 'https://openapi.twse.com.tw/v1/exchangeReport/TWT48U_ALL'
  const result = 0
  let exdividend = await stockPromise({url: jsonUrl,method: "GET"})
  .then(body=>JSON.parse(body))
  .then(datas=>datas.filter(data=>data.Code==stockno))
  if(exdividend.length){
    result = `${exdividend[0]['Date']} / ${Number(exdividend[0]['CashDividend']).toFixed(2)}`
  }
  return result
}
async function stockNetWorth(stockno){
  console.log('跑淨值')
  //淨值
  const jsonUrl = 'https://mis.twse.com.tw/stock/data/all_etf.txt?1663653801433'
  return await stockPromise({url: jsonUrl,method: "GET"})
  .then(body=>JSON.parse(body))
  .then(data=>data.a1)
  .then(a1s=>{
    let result = 0;
    for(a1 of a1s){
      const msgs = a1.msgArray
      if(msgs){
        for(msg of msgs){
          // console.log(msg.a,stockno)
          if(msg.a==stockno){
            result = `${msg.f} / ${msg.g}%` 
          }
        }
      }
    }
    return result;
  })
}
async function stockYield(stockno,stockdata,yielddata){
  console.log('跑殖利率,股利,便宜昂貴價')
  const dt = new Date();
  const month = Number(dt.getMonth())+1;
  const date = Number(dt.getDate())
  let yearArray = [];

  //沒有值或1/1號就抓取資料
  if(!yielddata || (month==1 && date==1)){
    console.log('沒有股利不是1/1號抓取5年內股利')
    const jsonUrl = 'https://www.twse.com.tw/zh/ETF/etfDiv'
    let year = Number(dt.getFullYear());//2022
    for(let j=0;j<5;j++){
      year -=1
      await stockPromise({url: jsonUrl,method: "POST",form:{stkNo: stockno,startYear: year,endYear: year}})
      .then(body=>{
        const $ = cheerio.load(body);
        const grid_trs = $(".grid tr");
        let exdividends = [];
        let yearExdividend = 0;
        let yearDate = 0;
        if(!grid_trs.eq(1).find('td').eq(2).text()){
          // console.log(year,'no data return')
          return;
        }
        for (let i = 1; i < grid_trs.length; i++) { // 走訪 tr
          const table_td = grid_trs.eq(i).find('td'); // 擷取每個欄位(td)
          // const time = table_td.eq(0).text(); // 代號
          // const latitude = table_td.eq(1).text(); // 證券簡稱	
          const dividendDay = table_td.eq(2).text(); // 除息交易日	
          // const amgnitude = table_td.eq(3).text(); // 收益分配基準日	
          // const depth = table_td.eq(4).text(); // 收益分配發放日	
          const exdividend = table_td.eq(5).text(); // 收益分配金額 (每1受益權益單位)	
          // const location = table_td.eq(6).text(); // 收益分配標準 (102年度起啟用)	
          // const year = table_td.eq(7).text(); // 公告年度
          // 建立物件並(push)存入結果
          // yearArray.push(Object.assign({ dividendDay, exdividend, year }));
          // console.log(table_td.eq(5).text())
          exdividends.push({ dividendDay,exdividend });
          yearExdividend += Number(exdividend);
          yearDate = Number(table_td.eq(7).text())+1911;
        }
        yearExdividend = Number(yearExdividend.toFixed(2))
        yearArray.push({ yearDate,yearExdividend,exdividends });
      })
    }
  }else{
    console.log('取得data傳入股利資料')
    yearArray = JSON.parse(yielddata)
  }

  if(!yearArray.length){
    console.log('沒有股利跳出')
    return {
      nowYield: 0,
      halfYearYield: 0,
      yearYield: 0,
      yearArray:0,
      cheapPrice:0,
      fairPrice: 0,
      expensivePrice: 0,
      exdividendAverage: 0
    }
  }

  if(yearArray.length<=2){
    console.log('沒有股利年數小於2跳出')
    return {
      nowYield: 0,
      halfYearYield: 0,
      yearYield: 0,
      yearArray:0,
      cheapPrice:0,
      fairPrice: 0,
      expensivePrice: 0,
      exdividendAverage: 0
    }
  }

  //(5年)平均股利
  const yearTotle = yearArray.reduce((previous,current)=>previous+current.yearExdividend,0)
  const yearLength = yearArray.length
  const exdividendAverage = Number((yearTotle/yearLength).toFixed(2))

  //n天殖利率(股票殖利率 = 現金股利 ÷ 股價)
  const yieldFn = (stockdata,exdividendAverage,day)=>{
    const nowClose = stockdata[stockdata.length-day]?.Close
    if(nowClose){
      const num = ((exdividendAverage/nowClose)*100).toFixed(2)+'%'
      return {yield:num,close:nowClose};
    }else{
      return {yield:'0%',close:0};
    }
  }

  return {
    // monthYield: yieldFn(stockdata,exdividendAverage,20)['yield'],
    // threeMonthYield: yieldFn(stockdata,exdividendAverage,60)['yield'],
    // halfYearYield: yieldFn(stockdata,exdividendAverage,120)['yield'],
    // yearYield: yieldFn(stockdata,exdividendAverage,240)['yield'],
    // exdividendBefore: yearArray[0]?yearArray[0].yearExdividend:0,
    // exdividendBefore1: yearArray[1]?yearArray[1].yearExdividend:0,
    // exdividendBefore2: yearArray[2]?yearArray[2].yearExdividend:0,
    // exdividendAverage,
    yearArray:JSON.stringify(yearArray), //殖利率資料
    nowYield: yieldFn(stockdata,exdividendAverage,1)['yield'],//殖利率
    cheapPrice: exdividendAverage*16, //便宜 
    fairPrice: exdividendAverage*20, //合理
    expensivePrice: exdividendAverage*32, //昂貴
    exdividendAverage: exdividendAverage //平均股利
  }
}
function stockAvenge(startPrice,endPrice){
  return (((endPrice-startPrice)/startPrice)*100).toFixed(2)+'%'
}
function stockPay(stockdata,time){
  console.log('跑股票報酬')
  const end = stockdata[stockdata.length-1]['Close']
  const start = stockdata[stockdata.length-(1+time)]?.Close
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
  // console.log(`跑${year}報酬`)
  stockdata = JSON.parse(stockdata)
  const array = stockdata.filter(({Date})=>{
    return Date>=`${year}-01-01` && Date<=`${year}-12-31`;
  })
  // console.log(array)
  if(array.length){
    const start = array[0]['Close']
    const end = array.pop()['Close']
    const avenge = stockAvenge(start,end)
    // console.log(avenge)
    return avenge;
  }else{
    return '0';
  }
}
function stockPayMoreYear(stockdata,yearNumber){
  console.log(`跑最近${yearNumber}年每年報酬`)
  const row = []
  const nowTimeObj = getNowTimeObj()
  let year = nowTimeObj['year'] - yearNumber;
  while (year <= nowTimeObj['year']){
    const obj = {}
    // obj[`${year}`] = stockPayOneYear(stockdata,year)
    obj['year'] = year+''
    obj['avenge'] = stockPayOneYear(stockdata,year)
    row.push(obj)
    year++
  }
  return row;
}
function stockPayTodayYearMonth(stockdata){
  console.log(`跑今年每月報酬`)
  const row = []
  const nowTimeObj = getNowTimeObj()
  const year = nowTimeObj['year']
  const nowMonth = nowTimeObj['month']
  stockdata = JSON.parse(stockdata)
  for(let i=1;i<=nowMonth;i++){
    const obj = {}
    const month = ('0'+i).slice(-2)
    // console.log(`${year}-${month}-01`)
    const date = stockdata.filter(({Date})=>{
      return Date>=`${year}-01-01` && Date<=`${year}-${month}-31`;
    })
    if(date.length){
      obj['month'] = month
      obj['Date_s'] = date[0]['Date']
      obj['Date_e'] = date[date.length-1]['Date']
      obj['Close_s'] = date[0]['Close'].toString()
      obj['Close_e'] = date[date.length-1]['Close'].toString()
      obj['avenge'] = stockAvenge(date[0]['Close'],date[date.length-1]['Close'])
      row.push(obj)
    }
  }
  return row;
}
function stockCagr(stockdata){
  //年化報酬率(%) = (總報酬率+1)^(1/年數) -1
  // 投資案A. 費時10年，總報酬率200%
  // (200%+1)^(1/10)-1 = 3^(0.1)-1 = (1.116–1)*100 = 11.6%
  // 3^(0.1)==3**(0.1) 指數運算子 js寫法
  console.log(`跑年化報酬率`)

  //year
  const date = stockdata.filter(({avenge})=>{
    return avenge.includes('%');
  })
  // console.log(date.length)
  // console.log(date)
  //total
  const total = date.reduce((accumulator, currentValue, currentIndex, array)=>{
    const avengeValue = currentValue.avenge.split('%')[0]*1;
    return accumulator + avengeValue;
  },0).toFixed(2) 
  // console.log(total)
  // console.log(total/100)
  // console.log(total/100+1)
  // console.log(1/date.length)
  //結果
  const result = (((total/100+1)**(1/date.length)-1)*100).toFixed(2)
  // console.log(result)
  return result;
}
function stockYearPrice(stockdata){
  console.log('跑一段時間的高低點')
  let maxClose = stockdata.reduce((a,b)=>a.Close>=b.Close?a:b)['Close']
  let minClose = stockdata.reduce((a,b)=>a.Close<=b.Close?a:b)['Close']
  let diffind = (((maxClose-minClose)/maxClose)*100).toFixed(2)+'%'
  return {'max':maxClose,'min':minClose,'diffind': diffind} 
}
function stockGetkdData(stockdata,day){
  let K = 0
  let D = 0
  let kdData = []
  let kdFn = function(nineDayData){
    // 最近九天的最低價,最高價
    let minClose = nineDayData.reduce((pre,cur)=>pre.Close<cur.Close?pre:cur).Close
    let maxClose = nineDayData.reduce((pre,cur)=>pre.Close>cur.Close?pre:cur).Close
    // 今日收盤價
    let todayClose = nineDayData[nineDayData.length-1].Close
    //RSV = ( 今日收盤價 - 最近九天的最低價 ) / ( 最近九天的最高價 - 最近九天最低價 )
    let rsv = 100 * (todayClose-minClose) / (maxClose - minClose)
    //K = 2/3 * ( 昨日K值 ) + 1/3 * ( 今日RSV )
    K = (2/3) * K + (1/3) * rsv
    //D = 2/3 * ( 昨日D值 ) + 1/3 * ( 今日K值 )
    D = (2/3) * D + (1/3) * K
    return {
      date: nineDayData[nineDayData.length-1].Date,
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
function stockKdFn(stockdata,stockno,stockname,method,dataSymbol){
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
function getNowTimeObj(){
  const dt = new Date();
  // const year = Number(dt.getFullYear());//取幾年-2022
  // let month = Number(dt.getMonth())+1;//取幾月-8
  // month = month>9?month:'0'+month//08
  const year = dt.getFullYear();
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
async function stockdataFn(stockno,stockdata){
    console.log('跑stockdataFn')
    const timObj = getNowTimeObj()
    const nowDate = timObj['date']
    //stockdata(日)
    if(stockdata){
      // console.log('have value')
      stockdata = JSON.parse(stockdata)
      const dataDate = stockdata[stockdata.length-1]['Date']
  
      //資料日期和今天日期不一樣
      if(dataDate!=nowDate){
        // if(typeof datas=='string')return message.push(datas);//回傳錯誤請求
        console.log('stockno',stockno,'資料日期:',dataDate,'今天日期:',nowDate)
        const datas = await stockGetData(stockno,dataDate,nowDate)
        if(datas.length){
          // console.log('抓取資料數',datas.length)
          const dataDateLast = datas[datas.length-1]['Date']
          //資料日期和抓取最後一天日期不一樣
          if(dataDate!=dataDateLast){
            console.log('抓取日期和資料最後一天日期不一樣')
            //刪除第一筆
            if(datas.length>1){
              console.log('刪除第一筆')
              datas.splice(0,1)
            }
            for(data of datas){
              console.log('抓取資料存入:',data)
              stockdata.push(data)
            }
          }
        }else{
          console.log('抓取不到資料跳出')
        }
      }
      return stockdata;
      // if(stockdata.length>1300){
      //   console.log('當前資料數加抓取資料數'+stockdata.length+'超過1300筆')
      //   //刪除筆數
      //   stockdata.splice(0,stockdata.length-1300)
      // }
      // result.stockdata = JSON.stringify(stockdata)
    }
    if(!stockdata){
      // let starDay = `${year-5}-${month}-${day}`
      const starDate = `2015-01-01`
      console.log(`沒有資料抓取 ${starDate}-${nowDate}`)
      stockdata = await stockGetData(stockno,starDate,nowDate)
      if(stockdata.length){
        console.log('stockdata,length:',stockdata.length)
        // result.stockdata = JSON.stringify(stockdata)
        return stockdata
      }else{
        console.log('抓取不到資料跳出')
        return false;
      }
      // if(typeof value=='string')return message.push(value);//回傳錯誤請求
    }
    // return {
    //   "stockdata": stockdata,
    //   "stockdata_w": stockdata_w
    // }
    // return stockdata
}
function stockdataFn_w(stockdata){
  console.log('跑stockdata_w(周)')
  if(!stockdata){
    console.log('沒有stockdata_w(周)資料跳出')
    return false;
  }
  // const stockdata_w = stockdata.filter(data=>new Date(data.Date).getDay()==5)
  // result.stockdata_w = JSON.stringify(stockdata_w)
  return stockdata.filter(({Date})=>new Date(Date).getDay()==5);
}
function stockNowPrice(stockdata){
  console.log('跑今日收盤價')
  if(!stockdata){
    console.log('沒有今日收盤價跳出')
    return false;
  }
  // const todayData = stockdata[stockdata.length-1]
  return stockdata[stockdata.length-1]['Close'];
  // if(!todayData?.Close){
  //   console.log('沒有今日收盤價跳出')
  //   return false;
  // }

}
async function stockGrap({stockno,stockdata,yielddata,stockname,method}){
  //result
  const result = {}

  //stockdata
  result.stockdata = await stockdataFn(stockno,stockdata)
  result.stockdata_w = await stockdataFn_w(result.stockdata)
  
  //price
  result.price = await stockNowPrice(result.stockdata)

  //volume
  // if(!todayData?.Volume || todayData.Volume<201){
  //   console.log('沒有今日成交量或小於200')
  //   return false;
  // }
  // result.volume = todayData['Volume']


  //netWorth 目前淨值
  result.networth = await stockNetWorth(stockno) 
  
  //股票報酬
  // console.log('跑3,5,20,120,240,480,720日股票報酬')
  // result.dayPrice = stockPay(stockdata,3)
  // result.weekPrice = stockPay(stockdata,5)
  // result.monthPrice = stockPay(stockdata,20)
  // result.halfYearPrice = stockPay(stockdata,120)
  // result.yearPrice = stockPay(stockdata,240)
  // result.twoYearPrice = stockPay(stockdata,480)
  // result.threeYearPrice = stockPay(stockdata,720)

  //一段時間的高低點
  // const yearPrice = stockYearPrice(value)
  // result.yearHightPrice = yearPrice['max']
  // result.yearLowPrice = yearPrice['min']
  // result.yearDifference = yearPrice['diffind']

  //exdividend 除息
  // result.exdividendDay = await stockExdividend(stockno)

  //yield 殖利率
  const yield = await stockYield(stockno,result.stockdata,yielddata)
  result.yielddata = yield['yearArray'] //殖利率資料
  result.cheapPrice = yield['cheapPrice'] //便宜 
  result.fairPrice = yield['fairPrice'] //合理
  result.expensivePrice = yield['expensivePrice'] //昂貴
  result.nowYield = yield['nowYield'] //殖利率
  result.exdividendAverage= yield['exdividendAverage'] //平均股利
  

  //周kd
  // console.log('跑周kd')
  // const kdData = stockGetkdData(stockdata_w,'5')
  // const kdDataLast = kdData[kdData.length-1]
  // const kValue = kdDataLast['K']
  // result.kdData = JSON.stringify(kdData) //周kd資料
  // result.kValue = kValue //周K值

  //method
  // if(method){
  //   result.methodReturn = stockMethod({stockno,stockname,method,stockdata})
  // }

  return result
}
module.exports={
  stockMethod,
  stockGetData,
  stockPay,
  stockYearPrice,
  stockNetWorth,
  stockExdividend,
  stockYield,
  stockGrap,
  stockPromise,
  getNowTimeObj,
  stockPayMoreYear,
  stockPayTodayYearMonth,
  stockCagr
}
