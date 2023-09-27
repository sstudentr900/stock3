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
function stockYieldPrice(yielddata,stockdata){
  console.log('跑股利便宜昂貴價')
  //(5年)平均股利
  const yearTotle = yielddata.reduce((previous,current)=>previous+Number(current.dividend),0)
  const yearLength = yielddata.length
  console.log(`yearTotle,${yearTotle}`)
  const average = Number((yearTotle/yearLength).toFixed(2))

  //n天殖利率(股票殖利率 = 現金股利 ÷ 股價)
  // const yieldFn = (stockdata,average,day)=>{
  //   const nowClose = stockdata[stockdata.length-day]?.Close
  //   if(nowClose){
  //     const num = ((average/nowClose)*100).toFixed(2)+'%'
  //     return {yield:num,close:nowClose};
  //   }else{
  //     return {yield:'0%',close:0};
  //   }
  // }

  return {
    yearLength: yearLength,//前年
    average: average, //平均股利
    // nowYield: yieldFn(stockdata,average,1)['yield'],//目前殖利率
    cheapPrice: average*16, //便宜 
    fairPrice: average*20, //合理
    expensivePrice: average*32, //昂貴
  }
}
async function aa(){
  const jsons = await stockYield({stockno:'00713'})
  console.log(`jsons,${jsons}`)
  // if(jsons.length){
  //   console.log(`jsons,${jsons}`)
  //   const Price = stockYieldPrice(jsons)
  //   console.log(`Price,${JSON.stringify(Price)}`)
  // }
  // console.log(`繼續執行其他程式`)
}
aa()