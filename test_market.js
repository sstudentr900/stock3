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
async function stockIsGetValue({stockdata,fnName,stockno=''}){
  const timObj = getNowTimeObj()
  const nowDate = timObj['date']
  if(stockdata){
    // console.log(`stockIsGetValue,stockdata,${stockdata}`)
  // if(Array.isArray(stockdata)&&stockdata.length){
    stockdata = JSON.parse(stockdata)
    // console.log(`stockIsGetValue,stockdata,${stockdata}`)
    // console.log(`stockIsGetValue,stockdata,${JSON.stringify(stockdata[stockdata.length-1])}`)
    //最後一筆
    let dataDate = stockdata[stockdata.length-1]['date'] || stockdata[stockdata.length-1]['Date']
    // console.log(`stockIsGetValue,dataDate,${dataDate}`)
    if(dataDate==nowDate){
      console.log(`stockIsGetValue,抓取範圍,${dataDate}~${nowDate} 一樣跳出`)
      return false;
    }else if(dataDate>nowDate){
      console.log(`stockIsGetValue,資料日期:${dataDate},不能大於今天日期:${nowDate} 跳出`)
      return false;
    }else{
      console.log(`stockIsGetValue,有值,抓取範圍${dataDate}以上`)
      const datas = await fnName({nowDate,dataDate,stockno})
      // console.log(`stockIsGetValue,有值,${JSON.stringify(datas)}`)
      if(!datas || !datas.length){
        console.log(`stockIsGetValue,有值,抓取不到資料跳出`)
        return false;
      }
      for(data of datas){
        console.log(`stockIsGetValue,有值,抓取資料存入${JSON.stringify(data)}`)
        stockdata.push(data)
      }
      // console.log(`stockIsGetValue全部資料:${stockdata}`)
      return JSON.stringify(stockdata);
    }
  }
  //沒有值
  stockdata = await fnName({nowDate,stockno})
  if(!stockdata){
    console.log(`stockIsGetValue,沒有值,抓取不到資料跳出`)
    return false;
  } 
  console.log(`stockIsGetValue,沒有值,抓取資料數量:${stockdata.length}`)
  return JSON.stringify(stockdata);
}
async function stockGetThreeCargo(dataDate){
  console.log(`stockGetThreeCargo,抓取3大法人買賣超,指數高低點成交量,融資融卷`)
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
      // if(dataDate && !(dataDate<=obj['date'])){continue;}
      console.log(`stockGetThreeCargo,${dataDate},${obj['date']},${dataDate>=obj['date']}`)
      if(dataDate && dataDate>=obj['date']){continue;}
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
      json.push(obj)
    }
    //排序小到大
    json.sort((o1,o2)=>{
      o1 = Number(o1['date'].split('-').join(''))
      o2 = Number(o2['date'].split('-').join(''))
      return o1-o2;
    })
    // console.log(json)
    return json
  })
  .catch((error)=>{
    console.log(`stockGetThreeCargo,抓取錯誤,${error}`)
    return false
  })
}
async function stockGetListedUpDown(dataDate){
  console.log(`stockGetListedUpDown,抓取上市類股漲跌`)
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
    const json = []
    const stocks = $("table.p4_2.row_bg_2n.row_mouse_over tr[align='right']");
    for (let i = 1; i < stocks.length; i++) {
      const obj = {}
      const td = stocks.eq(i).find('td');
      obj['date'] = getNowTimeObj()['date']
      // console.log(`stockGetUpDownNumber,${dataDate},${obj['date']},${dataDate>=obj['date']}`)
      if(dataDate && dataDate>=obj['date']){continue;}
      obj['name'] = td.eq(0).text().trim()//名稱
      obj['price'] = td.eq(1).text().trim();//價位
      obj['undulation'] = td.eq(2).text().trim();//漲跌
      obj['percentage'] = td.eq(2).text().trim();//%
      json.push(obj)
    }
    return json
  })
  .catch((error)=>{
    console.log(`stockGetListedUpDown,抓取錯誤,${error}`)
    return false
  })
}
async function stockGetExdividend(dataDate){
  console.log(`stockGetExdividendData,抓取除息股票`)
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
    const json=[]
    const exdividend = $("div.b1.r10.box_shadow table[style='width:100%;font-size:11pt'] tr");
    for (let i = 1; i < exdividend.length; i++) {
      const obj = {}
      const td = exdividend.eq(i).find('td');
      if(td.length==4){
        // console.log(td.text())
        obj['date'] = getNowTimeObj()['date']
        // console.log(`stockGetUpDownNumber,${dataDate},${obj['date']},${dataDate>=obj['date']}`)
        if(dataDate && dataDate>=obj['date']){continue;}
        obj['name'] = td.eq(0).text().trim()//名稱
        obj['ex_date'] = td.eq(1).text().trim();//日期
        obj['exdividend'] = `${td.eq(2).text().trim()} ${td.eq(3).text().trim()}`;//股利
        json.push(obj)
      }
    }
    return json
  })
  .catch((error)=>{
    console.log(`stockGetExdividendData,抓取錯誤,${error}`)
    return false
  })
}
async function stockGetUpDownNumber(dataDate){
  console.log(`stockUpDownNumber,上下跌家數大盤上下漲`)
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
    const stocks = $("div.table-responsive-lg table.table.table-sm.box-table-boarded.table-hover tr");
    for (let i = 1; i < stocks.length; i++) {
      const obj = {}
      const td = stocks.eq(i).find('td');
      if(td.length==8){
        obj['date'] = td.eq(0).text().trim()//日期
        // console.log(`stockGetUpDownNumber,${dataDate},${obj['date']},${dataDate>=obj['date']}`)
        if(dataDate && dataDate>=obj['date']){continue;}
        obj['uphome'] = td.eq(1).text().trim();//上漲
        obj['downhome'] = td.eq(2).text().trim();//下跌
        obj['Diffhome'] = td.eq(3).text().trim();//差數
        obj['upweighted'] = td.eq(4).text().trim();//大盤上漲
        obj['downweighted'] = td.eq(5).text().trim();//大盤下跌
        obj['annotation'] = td.eq(7).text().trim();//註解
        json.push(obj)
      }
    }
    //排序小到大
    json.sort((o1,o2)=>{
      o1 = Number(o1['date'].split('-').join(''))
      o2 = Number(o2['date'].split('-').join(''))
      return o1-o2;
    })
    return json
  })
  .catch((error)=>{
    console.log(`stockGetUpDownNumber,抓取上下跌家數錯誤,${error}`)
    return false
  })
}
async function stockGetShareholder(dataDate){
  console.log(`stockGetShareholder,抓取股東增減`)
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
    const json = []
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
        // console.log(`stockGetShareholder,${dataDate},${obj['date']},${dataDate>=obj['date']}`)
        if(dataDate && dataDate>=obj['date']){continue;}
        obj['name'] = td.eq(0).text().trim();//名稱
        obj['number'] = td.eq(1).text().trim();//數量
        obj['annotation'] = shareholder_annotation;//數量
        json.push(obj)
      }
    }
    return json;
  })
  .catch((error)=>{
    console.log(`stockGetShareholder,抓取上下跌家數錯誤,${error}`)
    return false
  })
}
async function stockGetRetail(dataDate){
  console.log(`stockGetShareholder,抓取羊群增減`)
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
    const json= [];
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
        if(dataDate && dataDate>=obj['date']){continue;}
        obj['name'] = td.eq(0).text().trim();//名稱
        obj['number'] = td.eq(1).text().trim();//數量
        obj['annotation'] = 'add';//數量
        json.push(obj)
      }
    }
    for (let i = 1; i < flock2.length; i++) {
      const obj = {}
      const td = flock2.eq(i).find('td');
      if(td.length==2){
        obj['date'] = flock_date//日期
        if(dataDate && dataDate>=obj['date']){continue;}
        obj['name'] = td.eq(0).text().trim();//名稱
        obj['number'] = td.eq(1).text().trim();//數量
        obj['annotation'] = 'reduce';//數量
        json.push(obj)
      }
    }
    // console.log(json)
    return json;
  })
  .catch((error)=>{
    console.log(`stockGetRetail,抓取錯誤,${error}`)
    return false
  })
}
async function stockGetThreeFutures(dataDate){
  console.log(`stockGetThreeFutures,3大法人期貨`)
  const json = []
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
        let date = td.eq(0).text().split('/');//日期
        obj['date'] = `${date[0]*1+1911}-${date[1]}-${date[2]}` //112/06/30=>2023-06-30
        if(dataDate && dataDate>=obj['date']){continue;}
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
    console.log(`stockGetThreeFutures,抓取錯誤,${error}`)
    return false
  })
}
async function stockGetProsperity(dataDate){
  console.log(`stockProsperity,景氣對策信號`)
  // console.log(`stockGetProsperity,抓取景氣對策信號`)
  // const json = []
  // const dt = getNowTimeObj();
  // const year = dt['year']; //抓取前年
  let time = '200001';
  if(dataDate){
    //時間轉換
    const dataDateArray = dataDate.split('-')
    // console.log(`dataDateArray,${dataDateArray}`)
    time = dataDateArray[0]+dataDateArray[1]
  }
  // console.log(`stockGetProsperity,time,${time},${dataDate}`)
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
    // console.log(`stockGetProsperity,datas,${datas}`)
    const json = datas.filter(row=>{
      console.log(`${row.x},${time},${row.x>time}`)
      return row.x>time && row.y
    })
    .map(row=>{
      let date = row.x
      date = `${date.substr(0,4)}-${date.substr(4,5)}-01`
      return {'date':date,'point':row.y}
    })
    // console.log(`stockGetProsperity,json,${json}`)
    return json
  })
  .catch((error)=>{
    console.log(`stockGetProsperity,抓取三大法人買賣錯誤,${error}`)
    return false
  })
}
async function stockGetData2({dataDate,stockno,nowDate}){
  console.log(`stockGetData2,抓取個股`)
  const year = nowDate.split('-')[0]
  const options  = {
    url: `https://goodinfo.tw/tw/ShowK_Chart.asp?STOCK_ID=${stockno}&CHT_CAT2=DATE`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }
  return await stockPromise(options)
  .then(body=>{
    // console.log(body)
    const $ = cheerio.load(body);
    const json=[]
    const trs = $("#divPriceDetail table#tblPriceDetail tbody tr[align='center']");
    for (let i = 1; i < trs.length; i++) {
      const obj = {}
      const td = trs.eq(i).find('td');
      const dates = td.eq(0).text().trim().split('/')//日期
      obj['date'] = `${year}-${dates[0]}-${dates[1]}`
      // console.log(`stockGetData2,${dataDate},${obj['date']},${dataDate>=obj['date']}`)
      if(dataDate && dataDate>=obj['date']){continue;}
      obj['open'] = td.eq(1).text().trim();
      obj['hight'] = td.eq(2).text().trim();
      obj['low'] = td.eq(3).text().trim();
      obj['close'] = td.eq(4).text().trim();
      obj['volume'] = td.eq(8).text().trim();
      json.push(obj)
    }
    //排小到大
    json.sort((o1,o2)=>{
      o1 = o1['Date'].split('-').join('')
      o2 = o2['Date'].split('-').join('')
      return o1-o2;
    })
    return json
  })
  .catch((error)=>{
    console.log(`stockGetData2,抓取錯誤,${error}`)
    return false
  })
}
async function stockGetStockThreeCargo({dataDate='2015-01-01',stockno,nowDate}){
  console.log(`stockGetStockThreeCargo,抓取個股法人買賣超和融資融劵`)
  const year = nowDate.split('-')[0]
  const options  = {
    url: `https://goodinfo.tw/tw/ShowK_Chart.asp?STOCK_ID=${stockno}&CHT_CAT2=DATE`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }
  return await stockPromise(options)
  .then(body=>{
    // console.log(body)
    const $ = cheerio.load(body);
    const json=[]
    const trs = $("#divPriceDetail table#tblPriceDetail tbody tr[align='center']");
    for (let i = 1; i < trs.length; i++) {
      const obj = {}
      const td = trs.eq(i).find('td');
      const dates = td.eq(0).text().trim().split('/')//日期
      obj['date'] = `${year}-${dates[0]}-${dates[1]}`
      // console.log(`stockGetStockThreeCargo,${dataDate},${obj['date']},${dataDate>=obj['date']}`)
      if(dataDate>=obj['date']){continue;}
      obj['foreign'] = td.eq(12).text().trim();//外資
      obj['letter'] = td.eq(13).text().trim();//投信
      obj['proprietor'] = td.eq(14).text().trim();//自營
      obj['totle'] = td.eq(15).text().trim();//合計
      obj['foreignhold'] = td.eq(16).text().trim();//外資持股
      obj['financing'] = td.eq(18).text().trim();//融資餘額
      obj['lending'] = td.eq(20).text().trim();//融劵餘額
      json.push(obj)
    }
    //排小到大
    json.sort((o1,o2)=>{
      o1 = o1['date'].split('-').join('')
      o2 = o2['date'].split('-').join('')
      return o1-o2;
    })
    return json
  })
  .catch((error)=>{
    console.log(`stockGetStockThreeCargo,抓取錯誤,${error}`)
    return false
  })
}
async function stockGetStockHolder({dataDate='2015-01-01',stockno}){
  console.log(`stockGetStockHolder,抓取股東持股分級週統計圖`)
  // const year = nowDate.split('-')[0]
  const options  = {
    url: `https://goodinfo.tw/tw/EquityDistributionClassHis.asp?STOCK_ID=${stockno}`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }
  return await stockPromise(options)
  .then(body=>{
    // console.log(body)
    const $ = cheerio.load(body);
    const json=[]
    const trs = $("table#tblDetail tbody tr[align='center']");
    for (let i = 1; i < trs.length; i++) {
      const obj = {}
      const td = trs.eq(i).find('td');
      const year = td.eq(0).text().trim().split('W')[0]
      const dates = td.eq(1).text().trim().split('/')//日期
      obj['date'] = `20${year}-${dates[0]}-${dates[1]}`
      // console.log(`stockGetStockHolder,${dataDate},${obj['date']},${dataDate>=obj['date']}`)
      if(dataDate>=obj['date']){continue;}
      obj['big10'] = td.eq(7).text().trim();//大於10張
      obj['big50'] = td.eq(8).text().trim();//大於50張
      obj['big100'] = td.eq(9).text().trim();//大於100張
      obj['big200'] = td.eq(10).text().trim();//大於200張
      obj['big400'] = td.eq(11).text().trim();
      obj['big800'] = td.eq(12).text().trim();
      obj['big1000'] = td.eq(13).text().trim();
      json.push(obj)
    }
    //排小到大
    json.sort((o1,o2)=>{
      o1 = o1['date'].split('-').join('')
      o2 = o2['date'].split('-').join('')
      return o1-o2;
    })
    return json
  })
  .catch((error)=>{
    console.log(`stockGetStockThreeCargo,抓取錯誤,${error}`)
    return false
  })
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
  //3大法人買賣超
  // const threeCargo = await await stockIsGetValue({'fnName': stockGetThreeCargo,'stockdata':[{ date: '2023-08-01'}]})
  // console.log(threeCargo)
  //3大法人期貨
  // const threeFutures =  await stockIsGetValue({'fnName': stockGetThreeFutures,'stockdata':''})
  // console.log(threeFutures)
  //抓取上市類股漲跌
  // const listedUpDown = await stockIsGetValue({'fnName': stockGetListedUpDown,'stockdata':[{ date: '2023-08-01'}]})
  // console.log(listedUpDown)
  //抓取除息股票
  // const exdividend = await stockIsGetValue({'fnName': stockGetExdividend,'stockdata':[{ date: '2023-09-03'}]})
  // console.log(exdividend)
  //抓取上下跌家數
  // const upDownNumber = await stockIsGetValue({'fnName': stockGetUpDownNumber,'stockdata':[{ date: '2023-08-01'}]})
  // console.log(upDownNumber)
  //股東增減
  // const shareholder = await stockIsGetValue({'fnName': stockGetShareholder,'stockdata':[{ date: '2023-09-01'}]})
  // console.log(shareholder)
  //羊群增減
  // const stockRetail = await stockIsGetValue({'fnName': stockGetRetail,'stockdata':[{ date: '2023-09-01'}]})
  // console.log(stockRetail)
  //景氣對策信號
  // const prosperity = await stockIsGetValue({'fnName': stockGetProsperity,stockdata:''})
  // console.log(prosperity)
  //抓取個股
  // const stockdataValue = await stockGetData2({dataDate:'2023-01-01',stockno:'00888',nowDate:'2023-01-01'})
  // console.log(stockdataValue)
  //抓取個股法人買賣超和融資融劵
  // const StockThreeCargo = await stockIsGetValue({'fnName': stockGetStockThreeCargo,stockno:'00888','stockdata':JSON.stringify([{ date: '2023-08-01'}])})
  // console.log(StockThreeCargo)
  //抓取股東持股分級週統計圖
  const stockHolder = await stockIsGetValue({'fnName': stockGetStockHolder,stockno:'00888','stockdata':''})
  console.log(stockHolder)
}
aa()