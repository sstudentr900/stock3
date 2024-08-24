const { dbQuery,dbInsert,dbUpdata,dbDelete } = require('../plugin/db')
const request = require("request");//抓取整個網頁的程式碼
const puppeteer = require('puppeteer');
const cheerio = require("cheerio");//後端的 jQuery
const yahooFinance = require('yahoo-finance');
const { getNowTimeObj,getToISOString } = require("./stockFn");
function sleep(ms) {
  return new Promise(resolve=>setTimeout(resolve, ms));
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
      console.log(`stockIsGetValue,資料庫有值,抓取範圍${dataDate}以上`)
      // console.log('stockdata',stockdata)
      const datas = await fnName({nowDate,dataDate,stockno,stockdata})
      // console.log(`stockIsGetValue,資料庫有值,${JSON.stringify(datas)}`)
      if(!datas || !datas.length){
        console.log(`stockIsGetValue,資料庫有值,抓取不到資料跳出`)
        return false;
      }
      for(data of datas){
        console.log(`stockIsGetValue,資料庫有值,抓取資料存入${JSON.stringify(data)}`)
        stockdata.push(data)
      }
      // console.log(`stockIsGetValue全部資料:${stockdata}`)
      return JSON.stringify(stockdata);
    }
  }
  //沒有值
  stockdata = await fnName({nowDate,stockno})
  if(!stockdata){
    console.log(`stockIsGetValue,資料庫沒有值,抓取不到資料跳出`)
    return false;
  } 
  // console.log(`stockIsGetValue,沒有值,抓取資料數量:${JSON.stringify(stockdata)}`)
  console.log(`stockIsGetValue,資料庫沒有值,抓取資料數量:${stockdata.length}`)
  return JSON.stringify(stockdata);
}
async function stockGetThreeCargo({dataDate}){
  console.log(`stockGetThreeCargo,抓取3大法人買賣超融資融卷,https://goodinfo.tw/tw/ShowK_Chart.asp?STOCK_ID=%E5%8A%A0%E6%AC%8A%E6%8C%87%E6%95%B8&CHT_CAT2=DATE&PERIOD=365`)
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const url = 'https://goodinfo.tw/tw/ShowK_Chart.asp?STOCK_ID=%E5%8A%A0%E6%AC%8A%E6%8C%87%E6%95%B8&CHT_CAT2=DATE&PERIOD=365';
  await page.goto(url);
  // 等待元素載入完成
  await page.waitForSelector("#divPriceDetail");
  //把網頁的body抓出來
  const body = await page.content();
  // console.log('stockGetThreeCargo-body',body)
  //接著我們把他丟給cheerio去處理
  const $ = await cheerio.load(body);
  const table = await $("table#tblPriceDetail tbody tr[align='center']");
  const json = []
  for (let i = 1; i < table.length; i++) {
    const obj = {}
    const td = table.eq(i).find('td');
    // const dates = td.eq(0).text().split('/')
    // //1月變12月，年要減1
    // if(table.eq(i-1).find('td').eq(0).text().split('/')[0]==1 && dates[0]==12){year = year-1}
    // const date = `${year}-${dates[0]}-${dates[1]}`
    const dates = td.eq(0).text().replace("'","").split('/')
    const date = `20${dates[0]}-${dates[1]}-${dates[2]}`
    // if(dataDate && !(dataDate<=obj['date'])){continue;}
    // console.log(`stockGetThreeCargo,${dataDate},${date},${dataDate>=date}`)
    if(dataDate && dataDate>=date){continue;}
    // obj['open'] = td.eq(1).text();//指數
    // obj['high'] = td.eq(2).text();//指數
    // obj['low'] = td.eq(3).text();//指數
    // obj['close'] = td.eq(4).text();//指數收盤
    // obj['Volume'] = td.eq(8).text();//指數
    obj['date'] = date
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
  await browser.close();
  return json
}
async function stockGetBigCargo({dataDate}){
  console.log(`stockGetBigCargo,大盤融資,https://kgiweb.moneydj.com/b2brwdCommon/jsondata/32/06/4a/twstockdata.xdjjson?x=afterHours-market0002-1&b=d&c=61&revision=2018_07_31_1`)
  const options  = {
    url: `https://kgiweb.moneydj.com/b2brwdCommon/jsondata/32/06/4a/twstockdata.xdjjson?x=afterHours-market0002-1&b=d&c=61&revision=2018_07_31_1`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }
  return await stockPromise(options)
  .then(body=>{
    const infos = JSON.parse(body).ResultSet.Result;
    //console.log(infos.length)
    const json = []
    for (let i = 0; i < infos.length; i++) {
      const obj = {}
      //console.log(i,infos[i],infos[i]['V1'])
      obj['date'] = infos[i]['V1'].replace(/\//g, '-');//日期
      //console.log(`stockGetBigCargo,${dataDate},${obj['date']},${dataDate>=obj['date']}`)
      if(dataDate && dataDate>=obj['date']){continue;}
      //obj[''] = infos[i][''];//融資增減(億)
      obj['fi'] = infos[i]['V3'];//融資餘額(億)
      //obj[''] = infos[i][''];//融券增減(張)
      obj['se'] = infos[i]['V4'];//融券餘額(張)
      obj['ma'] = infos[i]['V6'];//融資維持率(%)
      json.push(obj)
    }
    //排序小到大
    json.sort((o1,o2)=>{
      o1 = Number(o1['date'].split('-').join(''))
      o2 = Number(o2['date'].split('-').join(''))
      return o1-o2;
    })
    //console.log(json)
    return json;
  })
  .catch((error)=>{
    console.log(`stockGetBigCargo,大盤融資,${error}`)
    return false
  })
}
async function stockGetMonthlystatistics({stockdata}){
  console.log(`stockGetMonthlystatistics,月統計,https://goodinfo.tw/tw/StockHisAnaMonth.asp?STOCK_ID=%E5%8A%A0%E6%AC%8A%E6%8C%87%E6%95%B8`)
  await sleep(20000)
  return await stockPromise({
    url: `https://goodinfo.tw/tw/StockHisAnaMonth.asp?STOCK_ID=%E5%8A%A0%E6%AC%8A%E6%8C%87%E6%95%B8`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  })
  .then(body=>{
    const year = getNowTimeObj()['year']; 
    // console.log('stockdata',stockdata[0]['year'])
    if(stockdata && !(year>stockdata[0]['year'])){
      console.log(`stockGetMonthlystatistics,當前年${year},資料年${stockdata[0]['year']},跳出`)
      return false;
    }
    const json = []
    const $ = cheerio.load(body);
    const trs = $("div.r0_10.box_shadow").eq(0).find("table tr[align='center']");
    // console.log(trs.text())
    for (let i = 0; i < trs.length; i++) {
      const td = trs.eq(i).find('td');
      //1月份
      const obj = {}
      // console.log(td.eq(0).text())
      obj['year'] = year
      obj['date'] = td.eq(0).text()
      obj['years'] = td.eq(1).text();//年數
      obj['rises'] = td.eq(2).text();//上漲次數
      obj['drops'] = td.eq(3).text();//下跌次數
      obj['statistics'] = td.eq(7).text();// 統計
      json.push(obj)
      //7月份
      const obj2 = {}
      obj2['year'] = year
      obj2['date'] = td.eq(8).text()
      obj2['years'] = td.eq(9).text();//年數
      obj2['rises'] = td.eq(10).text();//上漲次數
      obj2['drops'] = td.eq(11).text();//下跌次數
      obj2['statistics'] = td.eq(15).text();// 統計
      json.push(obj2)
  
    }
    //排序小到大
    json.sort((o1,o2)=>Number(o1['date'])-Number(o2['date']))
    // console.log(json)
    return json
  })
  .catch((error)=>{
    console.log(`stockGetMonthlystatistics,抓取錯誤,${error}`)
    return false
  })
}
async function stockGetListedUpDown({dataDate}){
  console.log(`stockGetListedUpDown,抓取上市類股漲跌,https://goodinfo.tw/tw/StockIdxDetail.asp?STOCK_ID=%E5%8A%A0%E6%AC%8A%E6%8C%87%E6%95%B8`)
  await sleep(20000)
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
async function stockGetExdividend({stockdata}){
  console.log(`stockGetExdividend,抓取除息股票,https://goodinfo.tw/tw/StockIdxDetail.asp?STOCK_ID=%E5%8A%A0%E6%AC%8A%E6%8C%87%E6%95%B8`)
  await sleep(20000)
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
    const ex_date = stockdata?stockdata[stockdata.length-1]['ex_date']:'1911-01-01'
    for (let i = 1; i < exdividend.length; i++) {
      const obj = {}
      const td = exdividend.eq(i).find('td');
      if(td.length==4){
        // console.log(td.text())
        obj['date'] = getNowTimeObj()['date']
        obj['ex_date'] = td.eq(1).text().trim().split('/').join('-');//日期
        // console.log(`stockGetExdividend,${obj['ex_date']},${ex_date},${obj['ex_date']<ex_date}`)
        if(obj['ex_date']<=ex_date){continue;}
        obj['name'] = td.eq(0).text().trim()//名稱
        obj['exdividend'] = `${td.eq(2).text().trim()} ${td.eq(3).text().trim()}`;//股利
        json.push(obj)
      }
    }
    return json
  })
  .catch((error)=>{
    console.log(`stockGetExdividend,抓取錯誤,${error}`)
    return false
  })
}
async function stockGetUpDownNumber({dataDate}){
  console.log(`stockUpDownNumber,上下跌家數大盤上下漲,https://agdstock.club/lgpd/2330-%E5%8F%B0%E7%A9%8D%E9%9B%BB`)
  // const dt = getNowTimeObj();
  // const year = dt['year']; //抓取前年
  const options  = {
    url: `https://agdstock.club/lgpd/2330-%E5%8F%B0%E7%A9%8D%E9%9B%BB`,
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
async function stockGetShareholder({dataDate}){
  console.log(`stockGetShareholder,上市大股東增減排名,https://agdstock.club/eqc/2330-%E5%8F%B0%E7%A9%8D%E9%9B%BB`)
  const options  = {
    url: `https://agdstock.club/eqc/2330-%E5%8F%B0%E7%A9%8D%E9%9B%BB`,
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
    // console.log('shareholder_date',shareholder_date)
    let shareholder_annotation = 'add';
    for (let i = 1; i < shareholder.length; i++) {
      const obj = {}
      const td = shareholder.eq(i).find('td');
      if(i>1 && td.length==1)shareholder_annotation = 'reduce';//註解
      if(td.length==2){
        obj['date'] = shareholder_date//日期
        // console.log(`stockGetShareholder,${dataDate},${obj['date']},${dataDate>=obj['date']}`)
        if(dataDate && dataDate>=obj['date']){continue;}
        const texts = td.eq(0).text().trim().split(' ')
        // console.log('texts',texts)
        obj['name'] = texts[0].trim()+' '+texts.at(-1).trim();//名稱
        obj['number'] = td.eq(1).text().trim();//數量
        obj['annotation'] = shareholder_annotation;//數量
        json.push(obj)
      }
    }
    console.log('stockGetShareholder',json)
    return json;
  })
  .catch((error)=>{
    console.log(`stockGetShareholder,上市大股東增減排名,${error}`)
    return false
  })
}
async function stockRanking({dataDate}){
  console.log(`stockRanking,抓取上市三大法人排名,https://agdstock.club/lgpd/2330-%E5%8F%B0%E7%A9%8D%E9%9B%BB`)
  const options  = {
    url: `https://agdstock.club/lgpd/2330-%E5%8F%B0%E7%A9%8D%E9%9B%BB`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }
  return await stockPromise(options)
  .then(body=>{
    // console.log(body)
    const $ = cheerio.load(body);
    //上市三大法人排名
    const card = $("aside>div.row>.col-12").eq(0).find('.card');
    const date = card.find('.row .col-5.box-title.text-right').text().trim();
    // if(!date){
    //   console.log(`stockRanking,抓取上市三大法人排名,${date}`)
    // }
    // console.log(848,dataDate,date)
    if(!date || dataDate>=date){
      console.log(`stockRanking,抓取上市三大法人排名,${dataDate}>=${date},跳出`);
      return false;
    }
    const trs = card.find('.row+.box-sub-title+.table-responsive-md tr');
    const trs2 = card.find('.row+.box-sub-title+.table-responsive-md+.box-sub-title+.table-responsive-md tr');
    const json = [
      {'name':trs.eq(1).find('.read-more-dark').text().trim(),'number':trs.eq(1).find('.box-text').text().trim(),'annotation':'add','people':'foreign','date':date},
      {'name':trs.eq(2).find('.read-more-dark').text().trim(),'number':trs.eq(2).find('.box-text').text().trim(),'annotation':'add','people':'foreign','date':date},
      {'name':trs.eq(3).find('.read-more-dark').text().trim(),'number':trs.eq(3).find('.box-text').text().trim(),'annotation':'add','people':'foreign','date':date},
      {'name':trs.eq(5).find('.read-more-dark').text().trim(),'number':trs.eq(5).find('.box-text').text().trim(),'annotation':'add','people':'letter','date':date},
      {'name':trs.eq(6).find('.read-more-dark').text().trim(),'number':trs.eq(6).find('.box-text').text().trim(),'annotation':'add','people':'letter','date':date},
      {'name':trs.eq(7).find('.read-more-dark').text().trim(),'number':trs.eq(7).find('.box-text').text().trim(),'annotation':'add','people':'letter','date':date},
      {'name':trs.eq(9).find('.read-more-dark').text().trim(),'number':trs.eq(9).find('.box-text').text().trim(),'annotation':'add','people':'proprietor','date':date},
      {'name':trs.eq(10).find('.read-more-dark').text().trim(),'number':trs.eq(10).find('.box-text').text().trim(),'annotation':'add','people':'proprietor','date':date},
      {'name':trs.eq(11).find('.read-more-dark').text().trim(),'number':trs.eq(11).find('.box-text').text().trim(),'annotation':'add','people':'proprietor','date':date},
      {'name':trs2.eq(1).find('.read-more-dark').text().trim(),'number':trs2.eq(1).find('.box-text').text().trim(),'annotation':'reduce','people':'foreign','date':date},
      {'name':trs2.eq(2).find('.read-more-dark').text().trim(),'number':trs2.eq(2).find('.box-text').text().trim(),'annotation':'reduce','people':'foreign','date':date},
      {'name':trs2.eq(3).find('.read-more-dark').text().trim(),'number':trs2.eq(3).find('.box-text').text().trim(),'annotation':'reduce','people':'foreign','date':date},
      {'name':trs2.eq(5).find('.read-more-dark').text().trim(),'number':trs2.eq(5).find('.box-text').text().trim(),'annotation':'reduce','people':'letter','date':date},
      {'name':trs2.eq(6).find('.read-more-dark').text().trim(),'number':trs2.eq(6).find('.box-text').text().trim(),'annotation':'reduce','people':'letter','date':date},
      {'name':trs2.eq(7).find('.read-more-dark').text().trim(),'number':trs2.eq(7).find('.box-text').text().trim(),'annotation':'reduce','people':'letter','date':date},
      {'name':trs2.eq(9).find('.read-more-dark').text().trim(),'number':trs2.eq(9).find('.box-text').text().trim(),'annotation':'reduce','people':'proprietor','date':date},
      {'name':trs2.eq(10).find('.read-more-dark').text().trim(),'number':trs2.eq(10).find('.box-text').text().trim(),'annotation':'reduce','people':'proprietor','date':date},
      {'name':trs2.eq(11).find('.read-more-dark').text().trim(),'number':trs2.eq(11).find('.box-text').text().trim(),'annotation':'reduce','people':'proprietor','date':date},
    ]
    // console.log(json)
    return json;
  })
  .catch((error)=>{
    console.log(`stockRanking,抓取上市三大法人排名,${error}`)
    return false
  })
}
async function stockGetRetail({dataDate}){
  console.log(`stockGetRetail,抓取羊群增減,https://agdstock.club/flock-p`)
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
    let nowDates = getNowTimeObj()['date']
    nowDates = nowDates.split('-')
    let date = $("main>div.row>div.col-12").eq(5).find("div.row>div.col-12").eq(0).text().split('/');//日期
    const flock1 = $("main>div.row>div.col-12").eq(5).find("div.row>div.col-12").eq(1).find("tbody tr");
    const flock2 = $("main>div.row>div.col-12").eq(5).find("div.row>div.col-12").eq(2).find("tbody tr");
    date = `${nowDates[0]}-${date[0]}-${date[1]}` 
    //console.log(dataDate,obj['date'])
    for (let i = 1; i < flock1.length; i++) {
      const obj = {}
      const td = flock1.eq(i).find('td');
      if(td.length==2){
        obj['date'] = date
        if(dataDate && dataDate>=obj['date']){continue;}
        obj['name'] = td.eq(0).text().replace(/\s/g, '');//名稱
        obj['number'] = td.eq(1).text().trim();//數量
        obj['annotation'] = 'add';//數量
        json.push(obj)
      }
    }
    for (let i = 1; i < flock2.length; i++) {
      const obj = {}
      const td = flock2.eq(i).find('td');
      if(td.length==2){
        obj['date'] = date//日期
        if(dataDate && dataDate>=obj['date']){continue;}
        obj['name'] = td.eq(0).text().replace(/\s/g, '');//名稱
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
async function stockGetThreeFutures({dataDate}){
  console.log(`stockGetThreeFutures,3大法人期貨,https://stock.wearn.com/taifexphoto.asp`)
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
async function stockGetProsperity({dataDate}){
  console.log(`stockProsperity,景氣對策信號,https://index.ndc.gov.tw/n/zh_tw/data/eco/indicators_table1`)
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
  // .then(body=>{
  //   console.log(body)
  //   const $ = cheerio.load(body);
  //   const trs = $("tbody tr");
  //   for (let i = 1; i < trs.length; i++) {
  //     const obj = {}
  //     const td = trs.eq(i).find('td');
  //     let date = td.eq(0).text();//日期
  //     obj['date'] = `${date}-01` //2023-06-30
  //     console.log(dataDate,obj['date'],dataDate>=obj['date'])
  //     if(dataDate && dataDate>=obj['date']){continue;}
  //     obj['point'] = td.eq(2).text();//景氣對策信號(分)
  //     json.unshift(obj)
  //   }
  //   return json
  // })
  .then(body=>JSON.parse(body)['line']['12']['data'])
  .then(datas=>{
    // console.log(`stockGetProsperity,datas,${datas}`,time)
    const json = datas.filter(row=>{
      // console.log(`stockProsperity,${row.x},${time},${row.x>time}`)
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
    console.log(`stockGetProsperity,景氣對策信號錯誤,${error}`)
    return false
  })
}
async function stockDollars({dataDate}){
  console.log(`stockDollars,抓取美金,https://www.taifex.com.tw/cht/3/dailyFXRate`)
  const nowDates = getNowTimeObj()['date']
  let queryEndDate = nowDates.split('-')
  queryEndDate = `${queryEndDate[0]}/${queryEndDate[1]}/${queryEndDate[2]}`;
  let queryStartDate = getNowTimeObj({'date':nowDates,'year':'-1'})['date'].split('-');
  queryStartDate = `${queryStartDate[0]}/${queryStartDate[1]}/${queryStartDate[2]}`;
  if(dataDate){
    const dataDates = dataDate.split('-')
    queryStartDate = `${dataDates[0]}/${dataDates[1]}/${dataDates[2]}`
  }
  const options  = {
    url: `https://www.taifex.com.tw/cht/3/dailyFXRate`,
    method: 'POST',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
    },
    form: {
      'queryStartDate': queryStartDate,
      'queryEndDate': queryEndDate
    },
  }
  return await stockPromise(options)
  .then(async (body)=>{
    const $ = cheerio.load(body);
    const json=[]
    const trs = $("#printhere table.table_c tr");
    for (let i = 1; i < trs.length; i++) {
      const obj = {}
      const td = trs.eq(i).find('td');
      if(!td){continue;}
      let date = td.eq(0).text().split('/');//日期
      obj['date'] = `${date[0]}-${date[1]}-${date[2]}` //112/06/30=>2023-06-30
      if(dataDate && dataDate>=obj['date']){continue;}
      obj['dollars'] = td.eq(1).text().trim();//美金
      json.push(obj)
    }
    if(!json.length){console.log(`stockDollars 沒有值`);return false;}
    //排小到大
    // json.sort((o1,o2)=>{
    //   o1 = o1['date'].split('-').join('')
    //   o2 = o2['date'].split('-').join('')
    //   return o1-o2;
    // })
    return json
  })
  .catch((error)=>{
    console.log(`stockDollars,錯誤,${error}`)
    return false;
  })
}
async function stockVix({dataDate}){
  console.log(`stockVix,抓取恐慌指數,https://histock.tw/index/VIX`)
  const options  = {
    url: `https://histock.tw/index/VIX`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
    },
  }
  return await stockPromise(options)
  .then(async (body)=>{
    // console.log(body)
    const $ = cheerio.load(body);
    const json=[]
    const trs = $("#LBlock_23 table tr");
    for (let i = 1; i < trs.length; i++) {
      const obj = {}
      const td = trs.eq(i).find('td');
      const date = trs.eq(i).find('th').text().trim().split('/').join('-');
      // console.log(dataDate,date,!date,dataDate>=date)
      if(!td || !date || dataDate && dataDate>=date){continue;}
      obj['date'] = date;
      obj['number'] = td.eq(0).text().trim();//指數
      json.push(obj)
    }
    if(!json.length){console.log(`stockVix 沒有值`);return false;}
    //排小到大
    json.sort((o1,o2)=>{
      o1 = o1['date'].split('-').join('')
      o2 = o2['date'].split('-').join('')
      return o1-o2;
    })
    // console.log(json);
    return json
  })
  .catch((error)=>{
    console.log(`stockVix 錯誤,${error}`)
    return false;
  })
}
async function stockGreedy({dataDate}){
  console.log(`stockGreedy,抓取貪婪指數,https://production.dataviz.cnn.io/index/fearandgreed/graphdata`)
  const options  = {
    url: `https://production.dataviz.cnn.io/index/fearandgreed/graphdata`,
    method: 'GET',
    headers:{
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7,vi;q=0.6,zh-CN;q=0.5',
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
    },
  }
  return await stockPromise(options)
  .then(async (body)=>{
    const data = JSON.parse(body)['fear_and_greed_historical']['data'];
    if(!data){console.log(`stockGreedy 沒有值`)}
    const json=[];
    for (let i = 1; i < data.length; i++) {
      const date = getToISOString(data[i].x)
      const preDate = i>1?getToISOString(data[i-1].x):0
      // console.log(`stockGreedy ${date},${dataDate},${dataDate>date}`)
      if(dataDate && dataDate>=date || i>1 && preDate==date){continue;}
      let text = '';
      if(data[i].rating=='greed'){
        text = '貪婪'
      }else if(data[i].rating=='extreme greed'){
        text = '極度貪婪'
      }else if(data[i].rating=='neutral'){
        text = '中性的'
      }else if(data[i].rating=='fear'){
        text = '恐懼'
      }else if(data[i].rating=='extreme fear'){
        text = '極度恐懼'
      }
      json.push({
        date: date,
        data: Math.round(data[i].y),
        text: text
      })
    }
    return json
  })
  .catch((error)=>{
    console.log(`stockGreedy,貪婪指數錯誤,${error}`)
    return false;
  })
}
async function stockYield({stockno,yielddata}){
  console.log(`stockYield,殖利率,https://histock.tw/stock/${stockno}/%E9%99%A4%E6%AC%8A%E9%99%A4%E6%81%AF`)
  yielddata = yielddata?JSON.parse(yielddata):yielddata
  const before_year = ((getNowTimeObj()['year']*1)-1)+''; //前年
  const yield = async function(before_year){
    const options  = {
      url: `https://histock.tw/stock/${stockno}/%E9%99%A4%E6%AC%8A%E9%99%A4%E6%81%AF`,
      method: 'GET',
      headers:{
        'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
      }
    }
    return await stockPromise(options)
    .then(body=>{
      // console.log(body)
      const $ = cheerio.load(body);
      const trs = $("table.tb-stock.text-center.tbBasic tr");
      const json = [];
      let dividend = '';//現金股利
      let yield = '';//平均殖利率
      for (let i = 1; i < trs.length; i++) {
        //判斷有td
        const td = trs.eq(i).find('td');
        if(!td.html())continue;
        //判斷年是數字且不能抓今年
        const date = td.eq(1).text();//除息年
        if(!isNaN(Number(date,10)) && date<= before_year){
          // 上一筆和這筆年一樣
          const last = json[json.length-1]
          dividend = td.eq(6).text();//現金股利
          yield = td.eq(9).text().split('%')[0];//平均殖利率
          //判斷年一樣就累加
          if(json.length && last['date'] == date){
            last['dividend'] = (Number(last['dividend'])+Number(dividend)).toFixed(2)
            last['yield'] = (Number(last['yield'])+Number(yield)).toFixed(2)
          }else{
            json.push(Object.assign({ date, dividend, yield }))
          }
          if(json.length>4)break; //最多抓5年
        }
      }
      //小到大
      json.sort((o1,o2)=>{
        return Number(o1['date'])-Number(o2['date']);
      })

      if(!json.length){
        console.log(`stockYield,抓取資料失敗`)
        return false;
      }
      console.log(`stockYield,抓取資料量:${json.length})}`)
      return JSON.stringify(json);
    })
    .catch((error)=>{
      console.log(`stockYield,抓取${stockno}殖利率錯誤,${error}`)
      return false;
    })
  }
  if(yielddata && yielddata.slice(-1)[0]['date']==before_year){
    console.log(`stockYield,有值,前年${before_year}和資料年${yielddata.slice(-1)[0]['date']}一樣跳出`)
    return false;
  }
  if(yielddata && yielddata.slice(-1)[0]['date']<before_year){
    console.log(`stockYield,有值,前年${before_year}和資料年${yielddata.slice(-1)[0]['date']}不同,抓取`)
    return await yield(before_year);
  }
  if( !yielddata ){
    console.log(`stockYield,資料庫沒有值,抓取`)
    return await yield(before_year);
  }
}
async function stockNetWorth({stockno,dataDate}){
  if(!stockno){console.log(`stockNetWorth,${stockno},沒有值`);return false;}
  console.log(`stockNetWorth,抓淨值,https://www.moneydj.com/ETF/X/Basic/Basic0003.xdjhtm?etfid=${stockno}.TW`)
  //延遲1秒
  // await sleep(2000);
  const options  = {
    url: `https://www.moneydj.com/ETF/X/Basic/Basic0003.xdjhtm?etfid=${stockno}.TW`,
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
    const trs = $('#Repeater1 tr')
    for (let i = 1; i < trs.length; i++) {
      const obj = {}
      const td = trs.eq(i).find('td');
      if(!td){continue;}
      const date = td.eq(0).text().trim().split('/')
      obj['date'] = `${date[0]}-${date[1]}-${date[2]}` //112/06/30=>2023-06-30
      // console.log(obj['date'] )
      if(dataDate && dataDate>=obj['date']){continue;}
      obj['networth'] = Number(td.eq(1).text().trim()).toFixed(2)+'';//淨值
      obj['price'] = Number(td.eq(2).text().trim()).toFixed(2)+'';//價格
      json.push(obj)
    }
    const trs1 = $('#Repeater2 tr')
    for (let i = 1; i < trs1.length; i++) {
      const obj = {}
      const td = trs1.eq(i).find('td');
      if(!td){continue;}
      const date = td.eq(0).text().trim().split('/')
      obj['date'] = `${date[0]}-${date[1]}-${date[2]}` //112/06/30=>2023-06-30
      // console.log(obj['date'] )
      if(dataDate && dataDate>=obj['date']){continue;}
      obj['networth'] = Number(td.eq(1).text().trim()).toFixed(2)+'';//淨值
      obj['price'] = Number(td.eq(2).text().trim()).toFixed(2)+'';//價格
      json.push(obj)
    }
    // console.log(json)
    if(!json.length){
      console.log(`stockNetWorth,抓取不到淨值跳出`)
      return false;
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
    console.log(`stockNetWorth,淨值錯誤,${error}`)
    return false;
  })
}
async function stocksharpe({stockno,nowDate}){
  if(!stockno){console.log(`stocksharpe,${stockno},沒有值`);return false;}
  console.log(`stocksharpe,抓夏普值,https://www.moneydj.com/ETF/X/Basic/Basic0010.xdjhtm?etfid=${stockno}.TW`)
  //延遲1秒
  // await sleep(2000);
  const options  = {
    url: `https://www.moneydj.com/ETF/X/Basic/Basic0010.xdjhtm?etfid=${stockno}.TW`,
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
    const trs = $('#ctl00_ctl00_MainContent_MainContent_stable tr')
    const array = ['',`${stockno}`,'同投資類型平均','同投資類型排名','同投資區域平均','同投資區域排名','同投資標的平均','同投資標的排名']
    for (let i = 1; i < trs.length; i++) {
      const obj = {}
      const td = trs.eq(i).find('td');
      if(!td){continue;}
      obj['date'] = nowDate;//日期
      obj['name'] = array[i];
      obj['sharpe'] = td.eq(1).text().trim();//夏普值
      obj['beta'] = td.eq(2).text().trim();//Beta
      obj['deviation'] = td.eq(3).text().trim();//標準差
      json.push(obj)
    }
    // console.log(json)
    if(!json.length){
      console.log(`stocksharpe,抓取不到夏普值跳出`)
      return false;
    }
    //排小到大
    // json.sort((o1,o2)=>{
    //   o1 = o1['date'].split('-').join('')
    //   o2 = o2['date'].split('-').join('')
    //   return o1-o2;
    // })
    return json
  })
  .catch((error)=>{
    console.log(`stocksharpe,夏普值錯誤,${error}`)
    return false;
  })
}
async function stockGetData3({dataDate,stockno,nowDate}){
  stockno = stockno.split('.')[0];
  stockno = stockno=='^TWII'?'加權指數':stockno
  console.log(`stockGetData3,抓取資料,https://goodinfo.tw/tw/ShowK_Chart.asp?STOCK_ID=${stockno}&CHT_CAT2=DATE&PERIOD=365`)
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const url = encodeURI(`https://goodinfo.tw/tw/ShowK_Chart.asp?STOCK_ID=${stockno}&CHT_CAT2=DATE&PERIOD=365`);
  await page.goto(url);
  // 等待元素載入完成
  await page.waitForSelector("#divPriceDetail tr[align='center']");
  //把網頁的body抓出來
  const body = await page.content();
  //接著我們把他丟給cheerio去處理
  const json=[]
  // let year = nowDate.split('-')[0]
  const $ = cheerio.load(body);
  const trs = $("table#tblPriceDetail tbody tr[align='center']");
  // console.log('stockGetData3-trs',trs.text())
  for (let i = 0; i < trs.length; i++) {
    const obj = {}
    const td = trs.eq(i).find('td');
    //日期
    const dates = td.eq(0).text().trim().replace("'","").split('/')
    const date = `20${dates[0]}-${dates[1]}-${dates[2]}`
    // console.log(`stockGetData3,${dates},${date}`)
    if(dataDate && dataDate>=date){
      // console.log(`stockGetData3,抓取加權資料,${dataDate}>=${date},${dataDate>=date},跳出`)
      continue;
    }
    obj['date'] = date
    obj['open'] = td.eq(1).text().trim().split(',').join('');
    obj['high'] = td.eq(2).text().trim().split(',').join('');
    obj['low'] = td.eq(3).text().trim().split(',').join('');
    obj['close'] = td.eq(4).text().trim().split(',').join('');
    obj['volume'] = td.eq(8).text().trim().split(',').join('');
    json.push(obj)
  }
  //排小到大
  json.sort((o1,o2)=>{
    o1 = o1['date'].split('-').join('')
    o2 = o2['date'].split('-').join('')
    return o1-o2;
  })
  await browser.close();
  return json
}
async function stockGetData2({dataDate,stockno,nowDate}){
  // await sleep(2000);
  stockno = stockno.split('.')[0];
  stockno = stockno=='^TWII'?'加權指數':stockno
  // console.log(`stockGetData2,抓取個股,https://goodinfo.tw/tw/ShowK_Chart.asp?STOCK_ID=${stockno}&CHT_CAT2=DATE`)
  console.log(`stockGetData2,抓取加權資料,https://goodinfo.tw/tw/ShowK_Chart.asp?STOCK_ID=${stockno}&CHT_CAT2=DATE&PERIOD=365`)
  await sleep(20000)
  const options  = {
    url: encodeURI(`https://goodinfo.tw/tw/ShowK_Chart.asp?STOCK_ID=${stockno}&CHT_CAT2=DATE&PERIOD=365`),
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }
  return await stockPromise(options)
  .then(body=>{
    // console.log('stockGetData2-body',body)

    const json=[]
    // let year = nowDate.split('-')[0]
    const $ = cheerio.load(body);
    const trs = $("table#tblPriceDetail tbody tr[align='center']");
    // console.log('stockGetData2-trs',trs.text())
    for (let i = 0; i < trs.length; i++) {
      const obj = {}
      const td = trs.eq(i).find('td');
      //日期
      const dates = td.eq(0).text().trim().replace("'","").split('/')
      const date = `20${dates[0]}-${dates[1]}-${dates[2]}`
      console.log(`stockGetData2,${dates},${date}`)
      if(dataDate && dataDate>=date){
        console.log(`stockGetData2,抓取加權資料,${dataDate}>=${date},${dataDate>=date},跳出`)
        continue;
      }
      obj['date'] = date
      obj['open'] = td.eq(1).text().trim().split(',').join('');
      obj['high'] = td.eq(2).text().trim().split(',').join('');
      obj['low'] = td.eq(3).text().trim().split(',').join('');
      obj['close'] = td.eq(4).text().trim().split(',').join('');
      obj['volume'] = td.eq(8).text().trim().split(',').join('');
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
    console.log(`stockGetData2,抓取錯誤,${error}`)
    return false
  })
}
async function stockGetData({stockno,dataDate,nowDate}){
  // console.log(`stockGetData: ${stockno,from,to}`)
  if(dataDate){
    dataDate = getNowTimeObj({'date':dataDate,'day':1})['date']
  }else{
    dataDate = '2015-01-01';
  }
  console.log(`stockGetData,yahooFinance,抓取時間,${dataDate},${nowDate}`)
  return await yahooFinance.historical({
    symbol: `${stockno}`,
    from: dataDate,
    to: nowDate,
    period: 'd'
    // period: 'd'  // 'd' (daily), 'w' (weekly), 'm' (monthly), 'v' (dividends only)
  }).then(async function(jsons){

    // console.log(`stockGetData,jsons資料: ${JSON.stringify(jsons)}`)
    if(!jsons && jsons.length){
      console.log(`stockGetData,yahooFinance沒有資料跑stockGetData2`)
      stockno = stockno.split('.')[0];
      jsons = await stockGetData2({dataDate,stockno,nowDate})
      if(!jsons.length){
        console.log(`stockGetData2,goodinfo沒有資料跳出`)
        return false
      }
      return jsons;
    }

    //修改和移除空白 jsons
    const array = [] 
    jsons.forEach(json=>{
      // const date = new Date(json['date']).toLocaleDateString().replace(/\//g,'-')
      if(json['close']){
        let date = new Date(json['date']).toLocaleDateString().split('/')
        date = `${date[0]}-${date[1]>9?date[1].toString():'0'+ date[1]}-${date[2]>9?date[2].toString():'0'+ date[2]}`
        // let close = Number(json['close']).toFixed(2)
        //在驗證一次大於等於資料庫最後一筆時間
        if(date >= dataDate){
          array.push({
            'date': date,
            'open': Math.round((Number(json['open']+ Number.EPSILON) * 100)) / 100,
            'high': Math.round((Number(json['high']+ Number.EPSILON) * 100)) / 100,
            'low': Math.round((Number(json['low']+ Number.EPSILON) * 100)) / 100,
            'close': Math.round((Number(json['close']+ Number.EPSILON) * 100)) / 100,
            // 'symbol': json['symbol']
            'volume': (Number(json['volume'])/1000).toFixed(2)
          })
        }
      }
    })
    // console.log(943,array)
    if(!array.length){
      console.log(`stockGetData,array,沒有資料跳出`)
      return false
    }
    // console.log(`抓取資料: ${JSON.stringify(array)}`)

    //排小到大
    array.sort((o1,o2)=>{
      o1 = o1['date'].split('-').join('')
      o2 = o2['date'].split('-').join('')
      return o1-o2;
    })

    return array;
  }).catch(reason=>{
    console.log('crud error',reason)
    return false
  });
}
async function stockindustry({stockno,dataDate}){
  if(!stockno){console.log(`stockindustry,${stockno},沒有值`);return false;}
  console.log(`stockindustry,抓產業,https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid=${stockno}.TW`)
  const options  = {
    url: `https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid=${stockno}.TW`,
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
    const trs = $('#ctl00_ctl00_MainContent_MainContent_stable2 tr')
    const date = $('#ctl00_ctl00_MainContent_MainContent_sdate2').text().trim().split('：')[1].split('/')
    for (let i = 1; i < trs.length; i++) {
      const obj = {}
      const td = trs.eq(i).find('td');
      if(!td){continue;}
      obj['date'] = `${date[0]}-${date[1]}-${date[2]}` //112/06/30=>2023-06-30
      if(dataDate && dataDate>=obj['date']){continue;}
      obj['name'] = td.eq(1).text().trim();//產業
      obj['proportion'] = td.eq(3).text().trim();//比例
      json.push(obj)
    }
    // console.log(json)
    if(!json.length){
      console.log(`stockindustry,抓取不到資料跳出`)
      return false;
    }
    return json
  })
  .catch((error)=>{
    console.log(`stockindustry,抓取產業錯誤,${error}`)
    return false;
  })
}
async function stockShareholding({stockno,dataDate}){
  if(!stockno){console.log(`stockShareholding,${stockno},沒有值`);return false;}
  console.log(`stockShareholding,抓持股,https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid=${stockno}.TW`)
  const options  = {
    url: `https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid=${stockno}.TW`,
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
    const trs1 = $('#ctl00_ctl00_MainContent_MainContent_stable3 tr')
    const date1 = $('#ctl00_ctl00_MainContent_MainContent_sdate3').text().trim().split('：')[1].split('/')
    for (let i = 1; i < trs1.length; i++) {
      const obj = {}
      const td = trs1.eq(i).find('td');
      if(!td){continue;}
      obj['date'] = `${date1[0]}-${date1[1]}-${date1[2]}` //112/06/30=>2023-06-30
      if(dataDate && dataDate>=obj['date']){continue;}
      obj['name'] = td.eq(0).text().trim();//產業
      obj['proportion'] = td.eq(1).text().trim();//比例
      json.push(obj)
    }
    // console.log(json)
    if(!json.length){
      console.log(`stockShareholding,抓取不到資料跳出`)
      return false;
    }
    return json
  })
  .catch((error)=>{
    console.log(`stockShareholding,抓取持股錯誤,${error}`)
    return false;
  })
}
async function stockGetStockThreeCargo({dataDate='2015-01-01',stockno}){
  console.log(`stockGetStockThreeCargo,抓取個股法人買賣超,https://agdstock.club/lgpd/${stockno}`)
  const options  = {
    url: `https://agdstock.club/lgpd/${stockno}`,
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
    const trs = $("table.table.table-sm.table-hover.box-table-boarded tr");
    for (let i = 0; i < trs.length; i++) {
      const obj = {}
      const td = trs.eq(i).find('td');
      // console.log('1388',td.text())
      obj['date'] = td.eq(0).text().trim()
      // console.log(`stockGetStockThreeCargo,${dataDate},${obj['date']},${dataDate>=obj['date']}`)
      if(dataDate>=obj['date']){continue;}
      obj['foreign'] = td.eq(1).text().trim().split(',').join('');//外資
      obj['letter'] = td.eq(3).text().trim().split(',').join('');//投信
      obj['proprietor'] = td.eq(4).text().trim().split(',').join('');//自營
      obj['totle'] = (Number(obj['foreign'])+Number(obj['letter'])+Number(obj['proprietor']))+'';//合計
      obj['foreignhold'] = td.eq(2).text().trim().split(',').join('');//外資持股
      obj['proprietor_hedging'] = td.eq(5).text().trim().split(',').join('');//自營避險
      json.push(obj)
    }

    if(!json.length){
      console.log(`stockGetStockThreeCargo,抓取不到資料跳出`)
      return false;
    }
    //排小到大
    json.sort((o1,o2)=>{
      o1 = o1['date'].split('-').join('')
      o2 = o2['date'].split('-').join('')
      return o1-o2;
    })
    return json;
  })
  .catch((error)=>{
    console.log(`stockGetStockThreeCargo,抓取錯誤,${error}`)
    return false
  })
}
async function stockGetfinancing({dataDate='2015-01-01',stockno}){
  console.log(`stockGetfinancing,抓取個股融資融劵,https://agdstock.club/LoanAndLending/${stockno}`)
  const options  = {
    url: `https://agdstock.club/LoanAndLending/${stockno}`,
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
    const trs = $("table.table.table-sm.table-hover.box-table-boarded tr");
    for (let i = 0; i < trs.length; i++) {
      const obj = {}
      const td = trs.eq(i).find('td');
      obj['date'] = td.eq(0).text().trim()
      // console.log(`stockGetfinancing,${dataDate},${obj['date']},${dataDate>=obj['date']}`)
      if(dataDate>=obj['date']){continue;}
      obj['financing'] = td.eq(1).text().trim().split(',').join('');//融資	
      obj['financing_balance'] = td.eq(2).text().trim().split(',').join('');//融資餘額
      obj['lending'] = td.eq(3).text().trim().split(',').join('');//融劵
      obj['lending_balance'] = td.eq(4).text().trim().split(',').join('');//融劵餘額
      obj['Borrow'] = td.eq(5).text().trim().split(',').join('');//借券	
      obj['Borrow_balance'] = td.eq(6).text().trim().split(',').join('');//借券餘額
      json.push(obj)
    }
    if(!json.length){
      console.log(`stockGetfinancing,抓取不到融資融劵資料跳出`)
      return false;
    }
    //排小到大
    json.sort((o1,o2)=>{
      o1 = o1['date'].split('-').join('')
      o2 = o2['date'].split('-').join('')
      return o1-o2;
    })
    return json;
  })
  .catch((error)=>{
    console.log(`stockGetfinancing,抓取融資融劵錯誤,${error}`)
    return false
  })
}
async function stockGetStockHolder({dataDate='2015-01-01',stockno}){
  // await sleep(2000);
  console.log(`stockGetStockHolder,抓取股東持股人數,https://agdstock.club/EquityDistribution/${stockno}`)
  // await sleep(20000)
  // const year = nowDate.split('-')[0]
  const options  = {
    url: `https://agdstock.club/EquityDistribution/${stockno}`,
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
    const trs = $("#t04 tr");
    for (let i = 1; i < trs.length; i++) {
      const obj = {}
      const td = trs.eq(i).find('td');
      obj['date'] = td.eq(0).text().trim()
      // console.log(`stockGetStockHolder,${dataDate},${obj['date']},${dataDate>=obj['date']}`)
      if(dataDate>=obj['date']){continue;}
      obj['totle'] = td.eq(1).text().trim().split(',').join('');//總人數
      obj['big50'] = td.eq(2).text().trim().split(',').join('');//大於10張
      obj['big100'] = td.eq(3).text().trim().split(',').join('');//大於50張
      obj['big400'] = td.eq(4).text().trim().split(',').join('');//大於100張
      obj['big800'] = td.eq(5).text().trim().split(',').join('');//大於200張
      obj['big1000'] = td.eq(6).text().trim().split(',').join('');
      obj['big1001'] = td.eq(7).text().trim().split(',').join('');
      json.push(obj)
    }

    if(!json.length){
      console.log(`stockGetStockHolder,抓取不到資料跳出`)
      return false;
    }
    //排小到大
    json.sort((o1,o2)=>{
      o1 = o1['date'].split('-').join('')
      o2 = o2['date'].split('-').join('')
      return o1-o2;
    })
    return json;
  })
  .catch((error)=>{
    console.log(`stockGetStockHolder,抓取錯誤,${error}`)
    return false
  })
}
async function stockGetname({stockno}){
  console.log(`stockname,抓取股名,https://agdstock.club/stock/${stockno}`)
  const options  = {
    url: `https://agdstock.club/stock/${stockno}`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }
  return await stockPromise(options)
  .then(body=>{
    // console.log(body)
    const $ = cheerio.load(body);
    const name = $("h1.page-title").text().split('-')[0].split(' ')[1]
    if(!name){
      console.log(`stockname,抓取不到資料跳出`)
      return false;
    }
    return name;
  })
  .catch((error)=>{
    console.log(`stockname,抓取錯誤,${error}`)
    return false
  })
}
async function stockSmallhouseholds({dataDate}){
  console.log(`stockSmallhouseholds(散戶多空比),https://ai-all-e25e5ccde503.herokuapp.com/get-sheet-data`)
  return await stockPromise({
    url: `https://ai-all-e25e5ccde503.herokuapp.com/get-sheet-data`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  })
  .then(body=>{
    body = JSON.parse(body);
    const json=[];
    const labels = body['labels']; //日期
    // console.log(body)
    for (let i = 0; i < labels.length; i++) {
      const date = labels[i].replaceAll('/','-')
      // console.log('1227',dataDate,date,dataDate>=date)
      if(dataDate && dataDate>=date){continue;}
      json.push({
        date: date,
        data: body['percentageData'][i],//多空比
        // indexData: body['indexData'][i],//加權
        // realRetailRatios: body['realRetailRatios'][i], //真實散戶多空比
        // realRetailPositions: body['realRetailPositions'][i], //真實散戶未平倉口數
      })
    }
    return json;
  })
  .catch((error)=>{
    console.log(`stockSmallhouseholds(散戶多空比),抓取錯誤,${error}`)
    return false
  })
}
async function stockCrawler({id,stockno,stockdata,yielddata,networthdata,threecargo,financing,holder,stockname,shareholding,industry,sharpedata}){
  console.log(`stockCrawler,開始`)
  //result
  const result = {}
  result.stockno = stockno;

  if(!stockname){
    console.log(`抓取${stockno}股名`)
    const stocknameValue = await stockGetname({stockno})
    if(stocknameValue){
      result.stockname = stocknameValue
    }else{
      return false;
    }
  }

  console.log(`抓取${stockno}股票資料`)
  const stockdataValue = await stockIsGetValue({'fnName': stockGetData3,'stockdata':stockdata,'stockno':`${stockno}.TW`})
  stockdataValue?result.stockdata = stockdataValue:'';

  console.log(`抓取${stockno}殖利率`)
  const yieldValue = await stockYield({stockno,yielddata})
  yieldValue?result.yielddata = yieldValue:'';

  console.log(`抓取${stockno}淨值`)
  const networthValue = await stockIsGetValue({'fnName': stockNetWorth,'stockdata':networthdata,'stockno':stockno})
  networthValue?result.networthdata = networthValue:'';

  console.log(`抓取${stockno}夏普值`)
  const sharpeValue = await stockIsGetValue({'fnName': stocksharpe,'stockdata':sharpedata,'stockno':stockno})
  sharpeValue?result.sharpedata = sharpeValue:'';

  console.log(`抓取${stockno}法人買賣超`)
  const threecargoValue = await stockIsGetValue({'fnName': stockGetStockThreeCargo,'stockdata':threecargo,'stockno':stockno})
  threecargoValue?result.threecargo = threecargoValue:'';

  console.log(`抓取${stockno}融資融劵`)
  const financingValue = await stockIsGetValue({'fnName': stockGetfinancing,'stockdata':financing,'stockno':stockno})
  financingValue?result.financing = financingValue:'';

  console.log(`抓取${stockno}股東持股人數`)
  const holderValue = await stockIsGetValue({'fnName': stockGetStockHolder,'stockdata':holder,'stockno':stockno})
  holderValue?result.holder = holderValue:'';

  console.log(`抓取${stockno}產業`)
  const industryValue = await stockIsGetValue({'fnName': stockindustry,'stockdata':industry,'stockno':stockno})
  industryValue?result.industry = industryValue:'';

  console.log(`抓取${stockno}持股`)
  const shareholdingValue = await stockIsGetValue({'fnName': stockShareholding,'stockdata':shareholding,'stockno':stockno})
  shareholdingValue?result.shareholding = shareholdingValue:'';

  //判斷沒有資料跳出
  if(!Object.values(result).length){
    console.log(`stockCrawler沒有資料跳出`)
    return false;
  }else{
    //存資料庫
    if(id){
      console.log(`stockCrawler,更新`)
      await dbUpdata('stock',result,id)
    }else{
      console.log(`stockCrawler,新增`)
      const rows = await dbInsert('stock',result)
      const id =  rows.insertId
      await dbUpdata('stock',{sort:id},id)
      result['id'] = id
      return result;
    }
  }
  console.log(`stockCrawler,結束`)
}
async function stockCrawler_market({id,twii,smallhouseholds,monthlystatistics,threecargo,ranking,threefutures,exdividend,listed,updownnumber,holder,retail,prosperity,dollars,vix,greedy,bigcargo}){
  console.log(`stockCrawler_market開始`)
  //result
  const result = {}

  console.log(`抓取加權資料`)
  const twiiValue = await stockIsGetValue({'fnName': stockGetData3,'stockdata':twii,'stockno':'^TWII'})
  twiiValue?result.twii = twiiValue:'';

  console.log(`上市三大法人排名`)
  const rankingValue = await stockIsGetValue({'fnName': stockRanking,'stockdata':ranking})
  rankingValue?result.ranking = rankingValue:'';

  console.log(`抓取3大法人買賣超融資融卷`)
  const threeCargo = await stockIsGetValue({'fnName': stockGetThreeCargo,'stockdata':threecargo})
  threeCargo?result.threecargo = threeCargo:'';

  console.log(`大盤融資`)
  const bigCargo = await stockIsGetValue({'fnName': stockGetBigCargo,'stockdata':bigcargo})
  bigCargo?result.bigcargo = bigCargo:'';


  console.log(`3大法人期貨`)
  const threeFutures =  await stockIsGetValue({'fnName': stockGetThreeFutures,'stockdata':threefutures})
  threeFutures?result.threefutures = threeFutures:'';

  console.log(`月統計`)
  const monthlystatisticsValue = await stockIsGetValue({'fnName': stockGetMonthlystatistics,'stockdata':monthlystatistics})
  monthlystatisticsValue?result.monthlystatistics = monthlystatisticsValue:'';

  console.log(`上市大股東增減排名`)
  const shareholder = await stockIsGetValue({'fnName': stockGetShareholder,'stockdata':holder})
  shareholder?result.holder = shareholder:'';

  console.log(`羊群增減`)
  const stockRetail = await stockIsGetValue({'fnName': stockGetRetail,'stockdata':retail})
  stockRetail?result.retail = stockRetail:'';

  console.log(`景氣對策信號`)
  const prosperityData = await stockIsGetValue({'fnName': stockGetProsperity,'stockdata':prosperity})
  prosperityData?result.prosperity = prosperityData:'';

  console.log(`美元`)
  const dollarsData = await stockIsGetValue({'fnName': stockDollars,'stockdata':dollars})
  dollarsData?result.dollars = dollarsData:'';

  console.log(`貪婪指數`)
  const greedyData = await stockIsGetValue({'fnName': stockGreedy,'stockdata':greedy})
  greedyData?result.greedy = greedyData:'';

  console.log(`散戶多空比`)
  const smallhouseholdsData = await stockIsGetValue({'fnName': stockSmallhouseholds,'stockdata':smallhouseholds})
  smallhouseholdsData?result.smallhouseholds = smallhouseholdsData:'';



  // console.log(`判斷沒有資料跳出`)
  if(!Object.values(result).length){
    console.log(`stockCrawler_market,沒有資料跳出`)
    // return false;
  }else{
    //存資料庫
    // console.log(`stockCrawler_market,更新`)
    // await dbUpdata('market',result,id)
    if(id){
      console.log(`stockCrawler_market,更新`)
      await dbUpdata('market',result,id)
    }else{
      console.log(`stockCrawler_market,新增`)
      await dbInsert('market',result)
    }
  }
  console.log(`stockCrawler_market,結束`)
}
module.exports={
  stockCrawler_market,
  stockCrawler,
  sleep
}
