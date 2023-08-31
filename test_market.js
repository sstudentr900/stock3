const request = require("request");//抓取整個網頁的程式碼
const cheerio = require("cheerio");//後端的 jQuery
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
async function stockGetShareholder(){
  console.log(`stockGetShareholder,抓取股東羊群增減`)
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
    console.log(`stockGetShareholder,抓取上下跌家數錯誤,${error}`)
    return false
  })
}
async function stockShareholder(stockdata){
  console.log(`stockShareholder,股東羊群增減`)
  const timObj = getNowTimeObj()
  const nowDate = timObj['date']
  if(stockdata){
    let dataDate = stockdata[0]['date']
    dataDate = getNowTimeObj({'date':dataDate,'day':1})['date'];//抓取日期要加1
    if(dataDate==nowDate){
      console.log(`stockShareholder,抓取範圍,${dataDate}~${nowDate} 一樣跳出`)
      return false;
    }else if(dataDate>nowDate){
      console.log(`stockShareholder,資料日期:${dataDate},不能小於今天日期:${nowDate} 跳出`)
      return false;
    }else{
      console.log(`stockShareholder,抓取範圍,${dataDate}以上`)
      const datas = await stockGetShareholder(dataDate)
      if(!datas.length){
        console.log('stockShareholder,抓取不到資料跳出')
        return false;
      }
      for(data of datas){
        console.log('stockShareholder,抓取資料存入:',data)
        stockdata.unshift(data)
      }
      console.log('stockShareholder,資料:',stockdata)
      return stockdata;
    }
  }
  if(!stockdata){
    stockdata = await stockGetShareholder()
    if(!stockdata){
      console.log('stockShareholder,抓取不到資料跳出')
      return false;
    }
    console.log('stockShareholder,抓取資料數量:',stockdata)
    return stockdata
  }
}
async function stockGetThreePersonFutures(dataDate){
  // console.log(`stockGetThreePersonFutures,抓取3大法人期貨`)
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
  console.log(`stockThreePersonFutures,3大法人期貨`)
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
async function aa(){
  const obj = [
    {
      date: '2023-08-21',
      open: '16414.14',
      high: '16485.25',
      low: '16347.77',
      close: '16381.49',
      Volume: '2,671.69',
      foreign: '+79.8',
      letter: '+9.11',
      proprietor: '-11.4',
      total: '+77.4',
      financing: '2,164',
      lending: '29.6'
    }
  ]
  // const threePerson = await stockThreePersonCargo(obj)
  // console.log(threePerson)
  // const exdividendData = await stockGetExdividendData()
  // console.log(exdividendData)
  // const upDownNumber = await stockUpDownNumber()
  // console.log(upDownNumber)
  // const shareholder = await stockShareholder()
  // console.log(shareholder)
  // const threePersonFutures = await stockThreePersonFutures()
  // console.log(threePersonFutures)
  //景氣對策信號
  const prosperity = await stockProsperity()
  console.log(prosperity)
}
aa()