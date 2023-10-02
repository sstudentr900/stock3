const { dbQuery,dbInsert,dbUpdata,dbDelete } = require('../plugin/db')
const request = require("request");//抓取整個網頁的程式碼
const cheerio = require("cheerio");//後端的 jQuery
const yahooFinance = require('yahoo-finance');
const { getNowTimeObj,getToISOString } = require("./stockFn");
function waitForElement({selector, timeout = 10000}) {
  console.log(`等待${selector},加載`)
  return new Promise((resolve, reject) => {
      const start = Date.now();
      const intervalId = setInterval(() => {
          const element = $(selector);
          if (element.length > 0) {
              clearInterval(intervalId);
              resolve();
          } else if (Date.now() - start > timeout) {
              clearInterval(intervalId);
              reject(new Error('等待超时'));
          }
      }, 1000); // 每秒检查一次
  });
}
async function stockGetDataX(stockno,monthLength=3){
  const getTimes = function(monthLength){
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
async function stockExdividendX(stockno){
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
async function stockNetWorthX(stockno,networth){
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
async function stockGetStockHolderX({dataDate='2015-01-01',stockno}){
  // await sleep(2000);
  console.log(`stockGetStockHolder,抓取股東持股分級週統計圖,https://goodinfo.tw/tw/EquityDistributionClassHis.asp?STOCK_ID=${stockno}`)
  await sleep(20000)
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
async function stockNetWorthX({stockno,nowDate}){
  if(!stockno){console.log(`stockNetWorth,${stockno},沒有值`);return false;}
  console.log(`stockNetWorth,goodinfo抓淨值,https://mis.twse.com.tw/stock/data/all_etf.txt?1663653801433`)
  //延遲1秒
  await sleep(2000);
  const json = []
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
    // console.log(`a1s,${JSON.stringify(a1s)}`)
    for(a1 of a1s){
      // console.log(`a1,${JSON.stringify(a1)}`)
      const msgs = a1.msgArray
      if(msgs){
        // console.log(`msgs,${JSON.stringify(msgs)}`)
        for(msg of msgs){
          // console.log(`msg,${JSON.stringify(msg)}`)
          if(msg.a==stockno){
            const obj = {}
            obj['date'] = nowDate;//日期
            obj['price'] = Number(msg.f).toFixed(2);//價格
            obj['networth'] = `${Number(msg.g).toFixed(2)}%`;//淨值
            json.push(obj)
            // json = `${Number(msg.f).toFixed(2)} / ${Number(msg.g).toFixed(2)}%` 
          }
        }
      }
    }
    if(!json.length){
      console.log(`stockNetWorth,抓取不到資料跳出`)
      return false;
    }
    return json
  })
  .catch((error)=>{
    console.log(`stockNetWorth,淨值錯誤,${error}`)
    return false;
  })
}
async function stockdataFn_dX(stockno,stockdata){
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
async function stockGetStockThreeCargoX({dataDate='2015-01-01',stockno,nowDate}){
  // await sleep(2000);
  console.log(`stockGetStockThreeCargo,抓取個股法人買賣超和融資融劵,https://goodinfo.tw/tw/ShowK_Chart.asp?STOCK_ID=${stockno}&CHT_CAT2=DATE`)
  await sleep(20000)
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
    return json
  })
  .catch((error)=>{
    console.log(`stockGetStockThreeCargo,抓取錯誤,${error}`)
    return false
  })
}
async function stockYieldX({stockno,yielddata}){
  console.log(`stockYield,goodinfo殖利率,https://goodinfo.tw/tw/StockDividendPolicy.asp?STOCK_ID=${stockno}`)
  //沒值
  // if(!stockno){console.log(`stockYield,stockno沒有值`);return false;}
  //延遲1秒
  await sleep(2000);
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
      const stockName = $(".bg_h0.fw_normal .link_blue").text().trim().split(/\s+/)[1];
      // console.log(48,$(".bg_h0.fw_normal .link_blue").text().trim().split(/\s+/)[1])
      const json = []
      for (let i = 1; i < table.length; i++) {
        const tr = table.eq(i); 
        const td = tr.find('td');
        if(!td.html())continue;
        const date = td.eq(0).find('b').text();//除息年
        // console.log(判斷年是數字且不能抓今年)
        if(!isNaN(Number(date,10)) && date<= before_year){
          const dividend = td.eq(1).text();//現金股利
          // console.log(dividend,!(!isNaN(Number(dividend,10)) && dividend>0))
          if(!(!isNaN(Number(dividend,10)) && dividend>0))break;//判斷現金是數字大於0
          const yield = td.eq(18).text();//平均殖利率
          json.push(Object.assign({ date, dividend, yield }))
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
      return {'yield':JSON.stringify(json),'stockName':stockName};
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
    console.log(`stockYield,有值,前年${before_year}和資料年${yielddata.slice(-1)[0]['date']}不同,goodinfo抓取`)
    await sleep(20000)
    return await yield(before_year);
  }
  if( !yielddata ){
    console.log(`stockYield,資料庫沒有值,goodinfo抓取`)
    // await sleep(20000)
    return await yield(before_year);
  }
}
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
      console.log(`stockIsGetValue,有值,抓取範圍${dataDate}以上`)
      const datas = await fnName({nowDate,dataDate,stockno,stockdata})
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
  // console.log(`stockIsGetValue,沒有值,抓取資料數量:${JSON.stringify(stockdata)}`)
  console.log(`stockIsGetValue,沒有值,抓取資料數量:${stockdata.length}`)
  return JSON.stringify(stockdata);
}
async function stockGetThreeCargo({dataDate}){
  console.log(`stockGetThreeCargo,抓取3大法人買賣超融資融卷,https://goodinfo.tw/tw/ShowK_Chart.asp?STOCK_ID=%E5%8A%A0%E6%AC%8A%E6%8C%87%E6%95%B8&CHT_CAT2=DATE&PERIOD=365`)
  // await sleep(20000)
  const options  = {
    url: `https://goodinfo.tw/tw/ShowK_Chart.asp?STOCK_ID=%E5%8A%A0%E6%AC%8A%E6%8C%87%E6%95%B8&CHT_CAT2=DATE&PERIOD=365`,
    method: 'GET',
    headers:{
      'user-agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
    }
  }
  return await stockPromise(options)
  .then(body=>{
    const json = []
    let year = getNowTimeObj()['year']; 
    // let moon = ''; 
    // console.log(body)
    const $ = cheerio.load(body);
    const table = $("#divPriceDetail table tr[align='center']");
    for (let i = 1; i < table.length; i++) {
      const obj = {}
      const td = table.eq(i).find('td');
      const dates = td.eq(0).text().split('/')
      //1月變12月，年要減1
      if(table.eq(i-1).find('td').eq(0).text().split('/')[0]==1 && dates[0]==12){year = year-1}
      const date = `${year}-${dates[0]}-${dates[1]}`
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
    return json
  })
  .catch((error)=>{
    console.log(`stockGetThreeCargo,抓取錯誤,${error}`)
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
        if(obj['ex_date']<ex_date){continue;}
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
  console.log(`stockUpDownNumber,上下跌家數大盤上下漲,https://agdstock.club/udc-p`)
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
async function stockGetShareholder({dataDate}){
  console.log(`stockGetShareholder,抓取股東增減,https://agdstock.club/udc-p`)
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
    //股東
    const shareholder_date = $("aside>div.row>div.col-12").eq(2).find("div.col-5.box-title.text-right").text();
    const shareholder = $("aside>div.row>div.col-12").eq(2).find("tbody tr");
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
async function stockRanking({dataDate}){
  console.log(`stockRanking,抓取上市三大法人排名,https://agdstock.club/slgpd-p`)
  const options  = {
    url: `https://agdstock.club/slgpd-p`,
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
    const card = $("aside .row>.col-12").eq(2).find('.card');
    const date = card.find('.row .col-5.box-title.text-right').text().trim();
    if(!date){
      console.log(`stockRanking,抓取上市三大法人排名,${date}`)
    }
    // console.log(848,dataDate,date)
    if(dataDate>=date){console.log(`stockRanking,抓取上市三大法人排名,${dataDate}>=${date}跳出`);return false;}
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
  console.log(`stockProsperity,景氣對策信號,https://index.ndc.gov.tw/n/json/data/eco/indicators`)
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
    console.log(`stockGetProsperity,抓取三大法人買賣錯誤,${error}`)
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
      if(dataDate && dataDate>=date){continue;}
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
async function stockGetData2({dataDate,stockno,nowDate}){
  // await sleep(2000);
  stockno=='^TWII'?'加權指數':stockno
  console.log(`stockGetData2,抓取個股,https://goodinfo.tw/tw/ShowK_Chart.asp?STOCK_ID=${stockno}&CHT_CAT2=DATE`)
  // await sleep(20000)
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
    // console.log(trs.text())
    for (let i = 0; i < trs.length; i++) {
      const obj = {}
      const td = trs.eq(i).find('td');
      const dates = td.eq(0).text().trim().split('/').join('-')//日期
      obj['date'] = `${year}-${dates}`
      // console.log(`stockGetData2,${dataDate},${obj['date']},${dataDate>=obj['date']}`)
      if(dataDate && dataDate>obj['date']){continue;}
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
    if(!jsons.length){
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
  console.log(`stockGetStockHolder,抓取股東持股分級週統計圖,https://agdstock.club/EquityDistribution/${stockno}`)
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
    const trs = $("#t01 tr");
    for (let i = 1; i < trs.length; i++) {
      const obj = {}
      const td = trs.eq(i).find('td');
      obj['date'] = td.eq(0).text().trim()
      // console.log(`stockGetStockHolder,${dataDate},${obj['date']},${dataDate>=obj['date']}`)
      if(dataDate>=obj['date']){continue;}
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
  const stockdataValue = await stockIsGetValue({'fnName': stockGetData,'stockdata':stockdata,'stockno':`${stockno}.TW`})
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

  console.log(`抓取${stockno}股東持股分級週統計圖`)
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
async function stockCrawler_market({id,twii,threecargo,ranking,threefutures,exdividend,listed,updownnumber,holder,retail,prosperity,dollars,vix,greedy}){
  console.log(`stockCrawler_market開始`)
  //result
  const result = {}

  console.log(`抓取加權資料`)
  const twiiValue = await stockIsGetValue({'fnName': stockGetData,'stockdata':twii,'stockno':'^TWII'})
  twiiValue?result.twii = twiiValue:'';

  console.log(`上市三大法人排名`)
  const rankingValue = await stockIsGetValue({'fnName': stockRanking,'stockdata':ranking})
  rankingValue?result.ranking = rankingValue:'';

  console.log(`3大法人買賣超`)
  const threeCargo = await stockIsGetValue({'fnName': stockGetThreeCargo,'stockdata':threecargo})
  threeCargo?result.threecargo = threeCargo:'';

  console.log(`3大法人期貨`)
  const threeFutures =  await stockIsGetValue({'fnName': stockGetThreeFutures,'stockdata':threefutures})
  threeFutures?result.threefutures = threeFutures:'';

  console.log(`抓取上市類股漲跌`)
  const listedUpDown = await stockIsGetValue({'fnName': stockGetListedUpDown,'stockdata':listed})
  listedUpDown?result.listed = listedUpDown:'';

  console.log(`抓取除息股票`)
  const exdividendData = await stockIsGetValue({'fnName': stockGetExdividend,'stockdata':exdividend})
  exdividendData?result.exdividend = exdividendData:'';

  console.log(`抓取上下跌家數`)
  const upDownNumber = await stockIsGetValue({'fnName': stockGetUpDownNumber,'stockdata':updownnumber})
  upDownNumber?result.updownnumber = upDownNumber:'';

  console.log(`股東增減`)
  const shareholder = await stockIsGetValue({'fnName': stockGetShareholder,'stockdata':holder})
  shareholder?result.holder = shareholder:'';

  console.log(`羊群增減`)
  const stockRetail = await stockIsGetValue({'fnName': stockGetRetail,'stockdata':retail})
  stockRetail?result.retail = stockRetail:'';

  console.log(`景氣對策信號`)
  const prosperityData = await stockIsGetValue({'fnName': stockGetProsperity,'stockdata':prosperity})
  prosperityData?result.prosperity = prosperityData:'';

  console.log(`美金`)
  const dollarsData = await stockIsGetValue({'fnName': stockDollars,'stockdata':dollars})
  dollarsData?result.dollars = dollarsData:'';

  console.log(`恐慌指數`)
  const vixData = await stockIsGetValue({'fnName': stockVix,'stockdata':vix})
  vixData?result.vix = vixData:'';

  console.log(`貪婪指數`)
  const greedyData = await stockIsGetValue({'fnName': stockGreedy,'stockdata':greedy})
  greedyData?result.greedy = greedyData:'';

  //判斷沒有資料跳出
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
  // return false;
}
module.exports={
  stockCrawler_market,
  stockCrawler,
  sleep
}
