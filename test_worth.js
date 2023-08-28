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
async function stockYield(stockno){
  const json = []
  const dt = getNowTimeObj();
  const year = ((dt['year']*1)-1)+''; //抓取前年
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
    for (let i = 1; i < table.length; i++) {
      const tr = table.eq(i); 
      const td = tr.find('td');
      if(!td.html())continue;
      const nowYear = td.eq(0).find('b').text();//除息年
      // console.log(判斷年是數字)
      if(!isNaN(Number(nowYear,10)) && nowYear<= year){
        const dividend = td.eq(1).text();//現金股利
        console.log(dividend,!(!isNaN(Number(dividend,10)) && dividend>0))
        if(!(!isNaN(Number(dividend,10)) && dividend>0))break;//判斷現金是數字大於0
        const yield = td.eq(18).text();//平均殖利率
        json.push(Object.assign({ nowYear, dividend, yield }))
        if(json.length>4)break; //最多抓5年
      }
    }
    return json
  })
  .catch((error)=>{
    console.log(`抓取${stockno}殖利率錯誤,${error}`)
    return false
  })
}
async function stockNetWorth(stockno){
  console.log(`stockNetWorth,跑淨值`)
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
            json = `${msg.f} / ${msg.g}%` 
          }
        }
      }
    }
    console.log(`stockNetWorth,json${JSON.stringify(json)}`)
    return json;
  })
  .catch(error=>{
    console.log(`stockNetWorth,抓取${stockno}淨值錯誤,${error}`)
    return false;
  })
}
async function aa(){
  const jsons = await stockNetWorth('0056')
  // if(jsons.length){
  //   console.log(`jsons,${jsons}`)
  //   const Price = stockYieldPrice(jsons)
  //   console.log(`Price,${JSON.stringify(Price)}`)
  // }
  console.log(`繼續執行其他程式`)
}
aa()