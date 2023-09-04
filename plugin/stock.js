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
function getNowTimeObj(obj){
  const objDate = obj?.date
  const objDay = obj?.day
  const objYear= obj?.year
  const dt = objDate?new Date(objDate):new Date();
  objDay?dt.setDate(dt.getDate()+objDay):'';//加減日
  objYear?dt.setDate(dt.getFullYear()+objYear):'';//加減日
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
function sleep(ms) {
  return new Promise(resolve=>setTimeout(resolve, ms));
}
function stockAvenge(startPrice,endPrice){
  return (((endPrice-startPrice)/startPrice)*100).toFixed(2)+'%'
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
async function stockGetExdividendData(){
  // console.log(`stockGetExdividendData,抓取除息股票和上市類股漲跌`)
  // const dt = getNowTimeObj();
  // const year = dt['year']; //抓取前年
  const options  = {
    url: `https://goodinfo.tw/tw/StockIdxDetail.asp?STOCK_ID=%E5%8A%A0%E6%AC%8A%E6%8C%87%E6%95%B8`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }
  return await stockPromise(options)
  .then(body=>{
    // console.log(body)
    const $ = cheerio.load(body);
    const jsonObj = {
      'stocks':[],
      'exdividend':[]
    }
    //上市類股
    const stocks = $("table.p4_2.row_bg_2n.row_mouse_over tr[align='right']");
    for (let i = 1; i < stocks.length; i++) {
      const obj = {}
      const td = stocks.eq(i).find('td');
      obj['name'] = td.eq(0).text().trim()//名稱
      obj['price'] = td.eq(1).text().trim();//價位
      obj['undulation'] = td.eq(2).text().trim();//漲跌
      obj['percentage'] = td.eq(2).text().trim();//%
      jsonObj.stocks.push(obj)
    }
    //除息股票
    const exdividend = $("div.b1.r10.box_shadow table[style='width:100%;font-size:11pt'] tr");
    for (let i = 1; i < exdividend.length; i++) {
      const obj2 = {}
      const td2 = exdividend.eq(i).find('td');
      if(td2.length==4){
        console.log(td2.text())
        obj2['name'] = td2.eq(0).text().trim()//名稱
        obj2['date'] = td2.eq(1).text().trim();//價位
        obj2['exdividend'] = `${td2.eq(2).text().trim()} ${td2.eq(3).text().trim()}`;//股利
        jsonObj.exdividend.push(obj2)
      }
    }
    console.log(jsonObj)
    return jsonObj
  })
  .catch((error)=>{
    console.log(`stockGetExdividendData,抓取三大法人買賣錯誤,${error}`)
    return false
  })
}
async function stockGetThreePersonCargo(dataDate){
  // console.log(`stockGetThreePersonCargo,抓取3大法人買賣超,指數高低點成交量,融資融卷`)
  const json = []
  const dt = getNowTimeObj();
  const year = dt['year']; //抓取前年
  const options  = {
    url: `https://goodinfo.tw/tw/ShowK_Chart.asp?STOCK_ID=%E5%8A%A0%E6%AC%8A%E6%8C%87%E6%95%B8&CHT_CAT2=DATE`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }
  return await stockPromise(options)
  .then(body=>{
    // console.log(body)
    const $ = cheerio.load(body);
    const table = $("#divPriceDetail table tr[align='center']");
    for (let i = 1; i < table.length; i++) {
      const obj = {}
      const td = table.eq(i).find('td');
      const dates = td.eq(0).text().split('/')
      obj['date'] = `${year}-${dates[0]}-${dates[1]}`
      if(dataDate && !(dataDate<=obj['date'])){continue;}
      obj['open'] = td.eq(1).text();//指數
      obj['high'] = td.eq(2).text();//指數
      obj['low'] = td.eq(3).text();//指數
      obj['close'] = td.eq(4).text();//指數收盤
      obj['Volume'] = td.eq(8).text();//指數
      obj['foreign'] = td.eq(10).text();//外資
      obj['letter'] = td.eq(11).text();//投信
      obj['proprietor'] = td.eq(12).text();//自營商
      obj['total'] = td.eq(13).text();// 合計
      obj['financing'] = td.eq(14).text();// 融資
      obj['lending'] = td.eq(16).text();// 融卷
    
      // console.log(obj)
      json.unshift(obj)
    }
    // console.log(json)
    return json
  })
  .catch((error)=>{
    console.log(`stockGetThreePersonCargo,抓取三大法人買賣錯誤,${error}`)
    return false
  })
}
async function stockThreePersonCargo(stockdata){
  console.log(`stockThreePersonCargo,3大法人買賣超`)
  const timObj = getNowTimeObj()
  const nowDate = timObj['date']
  if(stockdata){
    let dataDate = stockdata[0]['date']
    //抓取日期要加1
    dataDate = getNowTimeObj({'date':dataDate,'day':1})['date']
    if(dataDate==nowDate){
      console.log(`stockThreePersonCargo,抓取範圍,${dataDate}~${nowDate} 一樣跳出`)
      return false;
    }else if(dataDate>nowDate){
      console.log(`stockThreePersonCargo,資料日期:${dataDate},不能小於今天日期:${nowDate} 跳出`)
      return false;
    }else{
      // if(typeof datas=='string')return message.push(datas);//回傳錯誤請求
      console.log(`stockThreePersonCargo,抓取範圍,${dataDate}以上`)
      const datas = await stockGetThreePersonCargo(dataDate)
      // console.log(`datas:${Boolean(datas.length)}`)
      if(datas.length){
        for(data of datas){
          console.log('stockThreePersonCargo,抓取資料存入:',data)
          stockdata.unshift(data)
        }
        console.log('stockThreePersonCargo,資料:',stockdata)
        return stockdata;
      }else{
        console.log('stockThreePersonCargo,抓取不到資料跳出')
        return false;
      }
    }
  }
  if(!stockdata){
    stockdata = await stockGetThreePersonCargo()
    if(!stockdata){
      console.log('stockThreePersonCargo,抓取不到資料跳出')
      return false;
    } 
    console.log('stockThreePersonCargo,抓取資料數量:',stockdata.length)
    return stockdata
  }
}
async function stockGetUpDownNumber(){
  // console.log(`stockGetUpDownNumber,抓取上下跌家數`)
  // const dt = getNowTimeObj();
  // const year = dt['year']; //抓取前年
  const options  = {
    url: `https://agdstock.club/udc-p`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }
  return await stockPromise(options)
  .then(body=>{
    // console.log(body)
    const $ = cheerio.load(body);
    const json = []
    //上市類股
    const stocks = $("div.table-responsive-lg table.table.table-sm.box-table-boarded.table-hover tr");
    for (let i = 1; i < stocks.length; i++) {
      const obj = {}
      const td = stocks.eq(i).find('td');
      if(td.length==8){
        obj['date'] = td.eq(0).text().trim()//日期
        obj['uphome'] = td.eq(1).text().trim();//上漲
        obj['downhome'] = td.eq(2).text().trim();//下跌
        obj['Diffhome'] = td.eq(3).text().trim();//差數
        obj['upweighted'] = td.eq(4).text().trim();//上漲
        obj['downweighted'] = td.eq(5).text().trim();//下跌
        obj['annotation'] = td.eq(7).text().trim();//註解
        json.push(obj)
      }
    }
    // console.log(json)
    return json
  })
  .catch((error)=>{
    console.log(`stockGetUpDownNumber,抓取上下跌家數錯誤,${error}`)
    return false
  })
}
async function stockUpDownNumber(stockdata){
  console.log(`stockUpDownNumber,上下跌家數`)
  const timObj = getNowTimeObj()
  const nowDate = timObj['date']
  if(stockdata){
    let dataDate = stockdata[0]['date']
    //抓取日期要加1
    dataDate = getNowTimeObj({'date':dataDate,'day':1})['date']
    if(dataDate!=nowDate && dataDate<nowDate){
      // if(typeof datas=='string')return message.push(datas);//回傳錯誤請求
      console.log(`stockUpDownNumber,抓取範圍,${dataDate}以上`)
      const datas = await stockGetUpDownNumber(dataDate)
      // console.log(`datas:${Boolean(datas.length)}`)
      if(datas.length){
        for(data of datas){
          console.log('stockUpDownNumber,抓取資料存入:',data)
          stockdata.unshift(data)
        }
        console.log('stockUpDownNumber,資料:',stockdata)
        return stockdata;
      }else{
        console.log('stockUpDownNumber,抓取不到資料跳出')
        return false;
      }
    }else if(dataDate==nowDate){
      console.log(`stockUpDownNumber,抓取範圍,${dataDate}~${nowDate} 一樣跳出`)
      return false;
    }else{
      console.log(`stockUpDownNumber,資料日期:${dataDate},不能小於今天日期:${nowDate} 跳出`)
      return false;
    }
  }
  if(!stockdata){
    stockdata = await stockGetUpDownNumber()
    if(stockdata){
      console.log('stockUpDownNumber,抓取資料數量:',stockdata.length)
      return stockdata
    }else{
      console.log('stockUpDownNumber,抓取不到資料跳出')
      return false;
    }
  }
}
async function stockGetHolder(){
  console.log(`stockGetHolder,抓取股東羊群增減`)
  // const dt = getNowTimeObj();
  // const year = dt['year']; //抓取前年
  const options  = {
    url: `https://agdstock.club/flock-p`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }
  return await stockPromise(options)
  .then(body=>{
    // console.log(body)
    const $ = cheerio.load(body);
    const jsonObj = {
      'shareholder':[],
      'flock':[],
    }
    //股東
    const shareholder_date = $("aside>div.row>div.col-12").eq(1).find("div.col-5.box-title.text-right").text();
    const shareholder = $("aside>div.row>div.col-12").eq(1).find("tbody tr");
    let shareholder_annotation = 'add';
    for (let i = 1; i < shareholder.length; i++) {
      const obj = {}
      const td = shareholder.eq(i).find('td');
      if(i>1 && td.length==1)shareholder_annotation = 'reduce';//註解
      if(td.length==2){
        obj['date'] = shareholder_date//日期
        obj['name'] = td.eq(0).text().trim();//名稱
        obj['number'] = td.eq(1).text().trim();//數量
        obj['annotation'] = shareholder_annotation;//數量
        jsonObj.shareholder.push(obj)
      }
    }
    //羊群
    const flock_date = $("main>div.row>div.col-12").eq(2).find("div.col-12.box-sub-title").eq(0).text();
    const flock1 = $("main>div.row>div.col-12").eq(2).find("div.col-12.col-md-6").eq(0).find("tbody tr");
    const flock2 = $("main>div.row>div.col-12").eq(2).find("div.col-12.col-md-6").eq(1).find("tbody tr");
    // console.log(flock_date)
    for (let i = 1; i < flock1.length; i++) {
      const obj = {}
      const td = flock1.eq(i).find('td');
      if(td.length==2){
        obj['date'] = flock_date//日期
        obj['name'] = td.eq(0).text().trim();//名稱
        obj['number'] = td.eq(1).text().trim();//數量
        obj['annotation'] = 'add';//數量
        jsonObj.flock.push(obj)
      }
    }
    for (let i = 1; i < flock2.length; i++) {
      const obj = {}
      const td = flock2.eq(i).find('td');
      if(td.length==2){
        obj['date'] = flock_date//日期
        obj['name'] = td.eq(0).text().trim();//名稱
        obj['number'] = td.eq(1).text().trim();//數量
        obj['annotation'] = 'reduce';//數量
        jsonObj.flock.push(obj)
      }
    }
    // console.log(jsonObj)
    return jsonObj;
  })
  .catch((error)=>{
    console.log(`stockGetHolder,抓取上下跌家數錯誤,${error}`)
    return false
  })
}
async function stockHolder(stockdata){
  console.log(`stockHolder,股東羊群增減`)
  const timObj = getNowTimeObj()
  const nowDate = timObj['date']
  if(stockdata){
    let dataDate = stockdata[0]['date']
    dataDate = getNowTimeObj({'date':dataDate,'day':1})['date'];//抓取日期要加1
    if(dataDate==nowDate){
      console.log(`stockHolder,抓取範圍,${dataDate}~${nowDate} 一樣跳出`)
      return false;
    }else if(dataDate>nowDate){
      console.log(`stockHolder,資料日期:${dataDate},不能小於今天日期:${nowDate} 跳出`)
      return false;
    }else{
      console.log(`stockHolder,抓取範圍,${dataDate}以上`)
      const datas = await stockGetHolder(dataDate)
      if(!datas.length){
        console.log('stockHolder,抓取不到資料跳出')
        return false;
      }
      for(data of datas){
        console.log('stockHolder,抓取資料存入:',data)
        stockdata.unshift(data)
      }
      console.log('stockHolder,資料:',stockdata)
      return stockdata;
    }
  }
  if(!stockdata){
    stockdata = await stockGetHolder()
    if(!stockdata){
      console.log('stockHolder,抓取不到資料跳出')
      return false;
    }
    console.log('stockHolder,抓取資料數量:',stockdata)
    return stockdata
  }
}
async function stockGetThreePersonFutures(dataDate){
  // console.log(`stockGetThreePersonFutures,抓取3大法人期貨買賣`)
  const json = []
  const dt = getNowTimeObj();
  const year = dt['year']; //抓取前年
  const options  = {
    url: `https://stock.wearn.com/taifexphoto.asp`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }
  return await stockPromise(options)
  .then(body=>{
    // console.log(body)
    const $ = cheerio.load(body);
    const trs = $("tbody tr");
    // console.log(trs.text())
    for (let i = 1; i < trs.length; i++) {
      const obj = {}
      const td = trs.eq(i).find('td');
      if(td.length>5){
        obj['date'] = td.eq(0).text();//日期
        obj['topfive'] = td.eq(1).text();//前5
        obj['topten'] = td.eq(2).text();//前10
        obj['foreign'] = td.eq(5).text();//外資
        obj['letter'] = td.eq(6).text();//投信
        obj['proprietor'] = td.eq(7).text();//自營商
        obj['close'] = td.eq(8).text();// 期貨收盤
        json.unshift(obj)
      }
    }
    // console.log(json)
    return json
  })
  .catch((error)=>{
    console.log(`stockGetThreePersonFutures,抓取三大法人買賣錯誤,${error}`)
    return false
  })
}
async function stockThreePersonFutures(stockdata){
  console.log(`stockThreePersonFutures,3大法人期貨買賣`)
  const timObj = getNowTimeObj()
  const nowDate = timObj['date']
  if(stockdata){
    let dataDate = stockdata[0]['date']
    //抓取日期要加1
    dataDate = getNowTimeObj({'date':dataDate,'day':1})['date']
    if(dataDate==nowDate){
      console.log(`stockThreePersonFutures,抓取範圍,${dataDate}~${nowDate} 一樣跳出`)
      return false;
    }else if(dataDate>nowDate){
      console.log(`stockThreePersonFutures,資料日期:${dataDate},不能小於今天日期:${nowDate} 跳出`)
      return false;
    }else{
      // if(typeof datas=='string')return message.push(datas);//回傳錯誤請求
      console.log(`stockThreePersonFutures,抓取範圍,${dataDate}以上`)
      const datas = await stockGetThreePersonFutures(dataDate)
      // console.log(`datas:${Boolean(datas.length)}`)
      if(datas.length){
        for(data of datas){
          console.log('stockThreePersonFutures,抓取資料存入:',data)
          stockdata.unshift(data)
        }
        console.log('stockThreePersonFutures,資料:',stockdata)
        return stockdata;
      }else{
        console.log('stockThreePersonFutures,抓取不到資料跳出')
        return false;
      }
    }
  }
  if(!stockdata){
    stockdata = await stockGetThreePersonFutures()
    if(!stockdata){
      console.log('stockThreePersonFutures,抓取不到資料跳出')
      return false;
    } 
    console.log('stockThreePersonFutures,抓取資料數量:',stockdata.length)
    return stockdata
  }
}
async function stockGetProsperity(dataDate){
  // console.log(`stockGetProsperity,抓取景氣對策信號`)
  const json = []
  const dt = getNowTimeObj();
  const year = dt['year']; //抓取前年
  const options  = {
    url: `https://index.ndc.gov.tw/n/json/data/eco/indicators`,
    method: 'POST',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }
  return await stockPromise(options)
  .then(body=>JSON.parse(body)['line']['12']['data'])
  .then(datas=>{
    const json = datas.filter(row=>row.x>'200001' && row.y)
    .map(row=>{
      let date = row.x
      date = `${date.substr(0,4)}-${date.substr(4,5)}-01`
      return {'date':date,'point':row.y}
    })
    // console.log(json)
    return json
  })
  .catch((error)=>{
    console.log(`stockGetProsperity,抓取三大法人買賣錯誤,${error}`)
    return false
  })
}
async function stockProsperity(stockdata){
  console.log(`stockProsperity,景氣對策信號`)
  const timObj = getNowTimeObj()
  const nowDate = timObj['date']
  if(stockdata){
    let dataDate = stockdata[0]['date']
    //抓取日期要加1
    dataDate = getNowTimeObj({'date':dataDate,'day':1})['date']
    if(dataDate==nowDate){
      console.log(`stockProsperity,抓取範圍,${dataDate}~${nowDate} 一樣跳出`)
      return false;
    }else if(dataDate>nowDate){
      console.log(`stockProsperity,資料日期:${dataDate},不能小於今天日期:${nowDate} 跳出`)
      return false;
    }else{
      // if(typeof datas=='string')return message.push(datas);//回傳錯誤請求
      console.log(`stockProsperity,抓取範圍,${dataDate}以上`)
      const datas = await stockGetProsperity(dataDate)
      // console.log(`datas:${Boolean(datas.length)}`)
      if(datas.length){
        for(data of datas){
          console.log('stockProsperity,抓取資料存入:',data)
          stockdata.unshift(data)
        }
        console.log('stockProsperity,資料:',stockdata)
        return stockdata;
      }else{
        console.log('stockProsperity,抓取不到資料跳出')
        return false;
      }
    }
  }
  if(!stockdata){
    stockdata = await stockGetProsperity()
    if(!stockdata){
      console.log('stockProsperity,抓取不到資料跳出')
      return false;
    } 
    console.log('stockProsperity,抓取資料數量:',stockdata.length)
    return stockdata
  }
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
  // console.log(`stockGetData: ${stockno,from,to}`)
  return await yahooFinance.historical({
    symbol: `${stockno}.TW`,
    from: from,
    to: to,
    period: 'd'
    // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
  }).then(jsons=>{
    // console.log(`jsons資料: ${JSON.stringify(jsons)}`)
    if(!jsons.length){
      console.log(`stockGetData,沒有資料跳出`)
      return false
    }

    //修改和移除空白 jsons
    const array = [] 
    jsons.forEach(json=>{
      // const date = new Date(json['date']).toLocaleDateString().replace(/\//g,'-')
      if(json['close']){
        let date = new Date(json['date']).toLocaleDateString().split('/')
        date = `${date[0]}-${date[1]>9?date[1].toString():'0'+ date[1]}-${date[2]>9?date[2].toString():'0'+ date[2]}`
        let close = Number(json['close']).toFixed(2)
        array.push({
          'Date': date,
          'Open':json['open'],
          'Hight':json['high'],
          'Low':json['low'],
          'Close': close,
          // 'symbol': json['symbol']
          'Volume':json['volume']
        })
      }
    })
    // console.log(`抓取資料: ${JSON.stringify(array)}`)

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
  console.log('跑除息')
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
async function stockNetWorth(stockno,networth){
  // console.log(`stockNetWorth,跑淨值`)
  //沒值
  if(!stockno){console.log(`stockNetWorth,${stockno},沒有值`);return false;}
  //淨值
  const options  = {
    url: `https://mis.twse.com.tw/stock/data/all_etf.txt?1663653801433`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }
  return await stockPromise(options)
  .then(body=>JSON.parse(body))
  .then(data=>data.a1)
  .then(a1s=>{
    let json = '';
    // console.log(`a1s,${JSON.stringify(a1s)}`)
    for(a1 of a1s){
      // console.log(`a1,${JSON.stringify(a1)}`)
      const msgs = a1.msgArray
      if(msgs){
        // console.log(`msgs,${JSON.stringify(msgs)}`)
        for(msg of msgs){
          // console.log(`msg,${JSON.stringify(msg)}`)
          if(msg.a==stockno){
            json = `${Number(msg.f).toFixed(2)} / ${Number(msg.g).toFixed(2)}%` 
          }
        }
      }
    }
    if(json==networth){
      console.log(`stockNetWorth,值一樣不需更新`);return false;
    }else{
      console.log(`stockNetWorth,json${JSON.stringify(json)}`)
      return json;
    }
  })
  .catch(error=>{
    console.log(`stockNetWorth,淨值錯誤,${error}`)
    return false;
  })
}
async function stockYieldX(stockno,stockdata,yielddata){
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
        console.log(body)
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
async function stockYield(stockno,yielddata){
  //沒值
  if(!stockno){console.log(`stockYield,stockno沒有值`);return false;}

  //延遲1秒
  await sleep(1000);

  // console.log(`stockYield,殖利率`)
  yielddata = yielddata?JSON.parse(yielddata):yielddata
  const dt = getNowTimeObj();
  const year = dt['year']; //今年
  const before_year = ((year*1)-1)+''; //前年
  const yield = async function(before_year){
    const options  = {
      url: `https://goodinfo.tw/tw/StockDividendPolicy.asp?STOCK_ID=${stockno}`,
      method: 'GET',
      headers:{
        'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
      }
    }
    return await stockPromise(options)
    .then(body=>{
      // console.log(body)
      const $ = cheerio.load(body);
      const table = $("#tblDetail tbody tr");
      const json = []
      for (let i = 1; i < table.length; i++) {
        const tr = table.eq(i); 
        const td = tr.find('td');
        if(!td.html())continue;
        const nowYear = td.eq(0).find('b').text();//除息年
        // console.log(判斷年是數字且不能抓今年)
        if(!isNaN(Number(nowYear,10)) && nowYear<= before_year){
          const dividend = td.eq(1).text();//現金股利
          // console.log(dividend,!(!isNaN(Number(dividend,10)) && dividend>0))
          if(!(!isNaN(Number(dividend,10)) && dividend>0))break;//判斷現金是數字大於0
          const yield = td.eq(18).text();//平均殖利率
          json.push(Object.assign({ nowYear, dividend, yield }))
          if(json.length>4)break; //最多抓5年
        }
      }
      //小到大
      json.sort((o1,o2)=>{
        return Number(o1['nowYear'])-Number(o2['nowYear']);
      })

      if(!json.length){
        console.log(`stockYield,抓取資料失敗`)
        return false;
      }

      console.log(`stockYield,抓取資料:${JSON.stringify(json)}`)
      return JSON.stringify(json);
    })
    .catch((error)=>{
      console.log(`stockYield,抓取${stockno}殖利率錯誤,${error}`)
      return false;
    })
  }
  if( !yielddata ){
    console.log(`stockYield,資料庫沒有值`)
    return await yield(before_year);
  }else if(yielddata && yielddata.slice(-1)[0]['nowYear']<before_year){
    console.log(`stockYield,有值,前年${before_year}和資料年${yielddata.slice(-1)[0]['nowYear']}不同抓取股利`)
    return await yield(before_year);
  }else{
    console.log(`stockYield,有值,前年${before_year}和資料年${yielddata.slice(-1)[0]['nowYear']}一樣跳出`)
    return false;
  }
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
    const nowClose = stockdata[stockdata.length-day]?.Close
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
        'nowYear': item.nowYear,
        'dividend': item.dividend,
        'yield': `${item.yield}%`,
      }
    })
    // console.log(`json,${JSON.stringify(json)}`)
    if(yieldLength<=5){
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
  if(!stockdata.length)return;
  // console.log(`跑${year}報酬`)
  // stockdata = JSON.parse(stockdata)
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
function stockPayMoreYear(stockdata,number){
  console.log(`stockPayMoreYear,跑最近${number}年每年報酬`)
  const row = []
  const nowTimeObj = getNowTimeObj()
  let year = nowTimeObj['year'] - number;

  //沒值
  if(!stockdata.length){console.log('stockYieldPrice,沒有股利資料')}
  if(!number){console.log('stockYieldPrice,沒有年數')}
  if(!stockdata.length || !number){
    let year = nowTimeObj['year'] - number;
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
    const date = stockdata.filter(({Date})=>{
      return Date>=`${year}-01-01` && Date<=`${year}-${month}-31`;
    })
    obj['month'] = month
    if(date.length){
      // obj['Date_s'] = date[0]['Date']
      // obj['Date_e'] = date[date.length-1]['Date']
      // obj['Close_s'] = date[0]['Close'].toString()
      // obj['Close_e'] = date[date.length-1]['Close'].toString()
      obj['avenge'] = stockAvenge(date[0]['Close'],date[date.length-1]['Close'])
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
  let maxClose = stockdata.reduce((a,b)=>a.Close>=b.Close?a:b)['Close']
  let minClose = stockdata.reduce((a,b)=>a.Close<=b.Close?a:b)['Close']
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
  for(before_year;before_year<nowTimeObj['year']; before_year++){
    // console.log(`before_year,${before_year}`)
    if(!stockdata.length || !number){
      console.log(`stockHighLowPriceMoreYear,datalength,沒有值`)
      json.push({'max':'0','min':'0','diffind': '0','year':before_year}) 
      continue;
    }
    const data = stockdata.filter(item=>item.Date.split('-')[0]==before_year)
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
async function stockdataFn_d(stockno,stockdata){
  // console.log('跑stockdataFn_d(日)')
  const timObj = getNowTimeObj()
  const nowDate = timObj['date']
  if(stockdata){
    // stockdata = JSON.parse(stockdata)
    let dataDate = stockdata[stockdata.length-1]['Date']
    //資料日期和今天日期不一樣且資料日期不能大於今天日期
    // console.log(`stockdataFn_d,資料庫有值,資料日期${dataDate},今天日期${nowDate}`)
    //抓取日期要加1
    dataDate = getNowTimeObj({'date':dataDate,'day':1})['date']
    if(dataDate!=nowDate && dataDate<nowDate){
      // if(typeof datas=='string')return message.push(datas);//回傳錯誤請求
      console.log(`stockdataFn_d,抓取範圍,${dataDate}~${nowDate}`)
      const datas = await stockGetData(stockno,dataDate,nowDate)
      // console.log(`datas:${Boolean(datas.length)}`)
      if(datas.length){
        for(data of datas){
          console.log('stockdataFn_d,抓取資料存入:',data)
          stockdata.push(data)
        }
        //updata stockdata
        return stockdata;
        // // console.log('抓取資料數',datas.length)
        // const dataDateLast = datas[datas.length-1]['Date']
        // //資料日期和抓取最後一天日期不一樣
        // if(dataDate!=dataDateLast){
        //   console.log('抓取日期和資料最後一天日期不一樣')
        //   //刪除第一筆
        //   if(datas.length>1){
        //     console.log('刪除第一筆')
        //     datas.splice(0,1)
        //   }
        //   for(data of datas){
        //     console.log('抓取資料存入:',data)
        //     stockdata.push(data)
        //   }
        // }
      }else{
        console.log('stockdataFn_d,抓取不到資料跳出')
        return false;
      }
    }else if(dataDate==nowDate){
      console.log(`stockdataFn_d,抓取範圍,${dataDate}~${nowDate} 一樣跳出`)
      return false;
    }else{
      console.log(`stockdataFn_d,資料日期:${dataDate},不能小於今天日期:${nowDate} 跳出`)
      return false;
    }
    // else
    // {
    //   //old stockdata
    //   return stockdata;
    // }
    // console.log(`stockdata:${stockdata[0].Date}`)
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
    console.log(`stockdataFn_d,資料庫沒有值,抓取範圍${starDate}~${nowDate}`)
    stockdata = await stockGetData(stockno,starDate,nowDate)
    if(stockdata){
      console.log('stockdataFn_d,抓取資料數量:',stockdata.length)
      // result.stockdata = JSON.stringify(stockdata)
      return stockdata
    }else{
      console.log('stockdataFn_d,抓取不到資料跳出')
      return false;
    }
    // if(typeof value=='string')return message.push(value);//回傳錯誤請求
  }
}
function stockdataFn_w(stockdata){
  console.log('stockdataFn_w,(周)')
  if(!stockdata.length){
    console.log('stockdataFn_w,沒有資料跳出')
    return false;
  }
  return stockdata.filter(data=>new Date(data.Date).getDay()==5)
  // const stockdata_w = stockdata.filter(data=>new Date(data.Date).getDay()==5)
  // console.log(`stockdataFn_w,資料${JSON.stringify(stockdata_w)}`)
  // return stockdata_w;
  
}
async function stockNowPrice(stockdata){
  console.log('跑今日收盤價')
  if(!stockdata.length){
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
async function stockCrawler({stockno,stockdata,yielddata,networth,stockname,method}){
  // console.log(`stockStart`)
  //result
  const result = {}

  //stockdata
  stockdata = stockdata?JSON.parse(stockdata):''
  const stockdataValue = await stockdataFn_d(stockno,stockdata)
  if(stockdataValue){
    result.stockdata = JSON.stringify(stockdataValue);
    stockdata = stockdataValue
  }
  // if(!stockdata && !stockdataValue){
  //   return false;
  // }
  // stockdataValue?result.stockdata_w = JSON.stringify(await stockdataFn_w(stockdataValue)):''
  // stockdata = stockdataValue?stockdataValue:JSON.parse(stockdata) //
  
  //yield 殖利率
  const yield = await stockYield(stockno,yielddata)
  yield?result.yielddata = yield:'';


  //netWorth 目前淨值
  const networthValue = await stockNetWorth(stockno,networth) 
  networthValue?result.networth = networthValue:'';


  //3年高低點
  // const yearPrice = stockYearPrice(value)
  // result.yearHightPrice = yearPrice['max']
  // result.yearLowPrice = yearPrice['min']
  // result.yearDifference = yearPrice['diffind']


  //price
  // result.price = await stockNowPrice(stockdataValue);

  //volume
  // if(!todayData?.Volume || todayData.Volume<201){
  //   console.log('沒有今日成交量或小於200')
  //   return false;
  // }
  // result.volume = todayData['Volume']
  
  //股票報酬
  // console.log('跑3,5,20,120,240,480,720日股票報酬')
  // result.dayPrice = stockPay(stockdata,3)
  // result.weekPrice = stockPay(stockdata,5)
  // result.monthPrice = stockPay(stockdata,20)
  // result.halfYearPrice = stockPay(stockdata,120)
  // result.yearPrice = stockPay(stockdata,240)
  // result.twoYearPrice = stockPay(stockdata,480)
  // result.threeYearPrice = stockPay(stockdata,720)



  //exdividend 除息
  // result.exdividendDay = await stockExdividend(stockno)

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

  return Object.values(result).length?result:false;
}
async function stockCrawler_market({stockno,stockdata,yielddata,networth,stockname,method}){
  // console.log(`stockCrawler`)
  //result
  const result = {}

  //3大法人買賣超
  const threePersonCargo = await stockThreePersonCargo(obj)
  threePersonCargo?result.threePersonCargo = threePersonCargo:'';
  //除息股票和上市類股漲跌
  const exdividendData = await stockGetExdividendData()
  exdividendData?result.exdividendData = exdividendData:'';
  //大盤上下跌家數
  const upDownNumber = await stockUpDownNumber()
  upDownNumber?result.upDownNumber = upDownNumber:'';
  //股東羊群增減
  const holder = await stockHolder()
  holder?result.holder = holder:'';
  //3大法人期貨買賣
  const threePersonFutures = await stockThreePersonFutures()
  threePersonFutures?result.threePersonFutures = threePersonFutures:'';
  //景氣對策信號
  const prosperity = await stockProsperity()
  prosperity?result.prosperity = prosperity:'';

  return Object.values(result).length?result:false;
}
module.exports={
  stockCrawler_market,
  stockMethod,
  stockdataFn_w,
  stockGetData,
  stockPay,
  stockHighLowPrice,
  stockNetWorth,
  stockHighLowPriceMoreYear,
  stockYield,
  stockYieldPrice,
  stockCrawler,
  stockPromise,
  getNowTimeObj,
  stockPayMoreYear,
  stockPayMoreMonth,
  stockKdFn,
  stockCagr
}
