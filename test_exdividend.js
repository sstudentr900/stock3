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
async function stockGetExdividend({stockdata}){
  console.log(`stockGetExdividendData,抓取除息股票,https://goodinfo.tw/tw/StockIdxDetail.asp?STOCK_ID=%E5%8A%A0%E6%AC%8A%E6%8C%87%E6%95%B8`)
  // await sleep(20000)
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
        obj['ex_date'] = td.eq(1).text().trim().split('/').join('-');//日期
        // obj['ex_date'] = `${dates[0]}-${dates[1]}-${dates[2]}`;//日期
        console.log(`stockGetExdividend,${ex_date},${obj['ex_date']},${ex_date>=obj['ex_date']}`)
        if(ex_date>=obj['ex_date']){continue;}
        obj['date'] = getNowTimeObj()['date']
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
async function aa(){
  const jsons = await stockGetExdividend({})
  console.log(`jsons,${JSON.stringify(jsons)}`)
}
aa()