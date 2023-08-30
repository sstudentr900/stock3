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
  // console.log(`stockGetExdividendData,抓取除息股票和上市類股`)
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
      obj['name'] = td.eq(0).text()//名稱
      obj['price'] = td.eq(1).text();//價位
      obj['undulation'] = td.eq(2).text();//漲跌
      obj['percentage'] = td.eq(2).text();//%
      jsonObj.stocks.push(obj)
    }
    //除息股票
    const exdividend = $("div.b1.r10.box_shadow table[style='width:100%;font-size:11pt'] tr");
    for (let i = 1; i < exdividend.length; i++) {
      const obj2 = {}
      const td2 = exdividend.eq(i).find('td');
      if(td2.length==4){
        console.log(td2.text())
        obj2['name'] = td2.eq(0).text()//名稱
        obj2['date'] = td2.eq(1).text();//價位
        obj2['exdividend'] = `${td2.eq(2).text()}/${td2.eq(3).text()}`;//股利
        jsonObj.exdividend.push(obj2)
      }
    }
    console.log(jsonObj)
    return jsonObj
  })
  .catch((error)=>{
    console.log(`stockPromise,抓取三大法人買賣錯誤,${error}`)
    return false
  })
}
async function stockGetThreePersonData(dataDate){
  // console.log(`stockGetThreePersonData,抓取3大法人買賣超`)
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
    console.log(`stockPromise,抓取三大法人買賣錯誤,${error}`)
    return false
  })
}
async function stockThreePerson(stockdata){
  console.log(`stockThreePerson,3大法人買賣超`)
  const timObj = getNowTimeObj()
  const nowDate = timObj['date']
  if(stockdata){
    let dataDate = stockdata[0]['date']
    //抓取日期要加1
    dataDate = getNowTimeObj({'date':dataDate,'day':1})['date']
    if(dataDate!=nowDate && dataDate<nowDate){
      // if(typeof datas=='string')return message.push(datas);//回傳錯誤請求
      console.log(`stockThreePerson,抓取範圍,${dataDate}以上`)
      const datas = await stockGetThreePersonData(dataDate)
      // console.log(`datas:${Boolean(datas.length)}`)
      if(datas.length){
        for(data of datas){
          console.log('stockThreePerson,抓取資料存入:',data)
          stockdata.unshift(data)
        }
        console.log('stockThreePerson,資料:',stockdata)
        return stockdata;
      }else{
        console.log('stockThreePerson,抓取不到資料跳出')
        return false;
      }
    }else if(dataDate==nowDate){
      console.log(`stockThreePerson,抓取範圍,${dataDate}~${nowDate} 一樣跳出`)
      return false;
    }else{
      console.log(`stockThreePerson,資料日期:${dataDate},不能小於今天日期:${nowDate} 跳出`)
      return false;
    }
  }
  if(!stockdata){
    stockdata = await stockGetThreePersonData()
    if(stockdata){
      console.log('stockThreePerson,抓取資料數量:',stockdata.length)
      return stockdata
    }else{
      console.log('stockThreePerson,抓取不到資料跳出')
      return false;
    }
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
  // const threePerson = await stockThreePerson(obj)
  const exdividendData = await stockGetExdividendData()
}
aa()