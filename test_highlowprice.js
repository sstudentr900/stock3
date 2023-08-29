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
function stockHighLowPrice(stockdata,year){
  //有值
  let maxClose = stockdata.reduce((a,b)=>a.Close>=b.Close?a:b)['Close']
  let minClose = stockdata.reduce((a,b)=>a.Close<=b.Close?a:b)['Close']
  let diffind = (((maxClose-minClose)/maxClose)*100).toFixed(2)+'%'
  return {'max':maxClose,'min':minClose,'diffind': diffind,'year':year} 
}
function stockHighLowPriceMoreYear(stockdata,number){
  if(!stockdata.length){console.log(`stockHighLowPriceMoreYear,沒有股票資料`)}
  if(!number){console.log(`stockHighLowPriceMoreYear,沒有年資料`)}
  console.log(`跑${number}年高低點`)
  const json = [];
  const nowTimeObj = getNowTimeObj();
  let before_year = nowTimeObj['year'] - number + 1;
  // while (before_year <= nowTimeObj['year']){
  for(before_year;before_year<nowTimeObj['year']; before_year++){
    // console.log(`before_year,${before_year}`)
    if(!stockdata.length || !number){
      console.log(`stockHighLowPriceMoreYear,沒有值`)
      json.push({'max':'0','min':'0','diffind': '0','year':before_year}) 
      continue;
    }
    const data = stockdata.filter(item=>item.Date.split('-')[0]==before_year)
    if(!data.length){
      console.log(`stockHighLowPriceMoreYear,data.length年沒有值`)
      json.push({'max':'0','min':'0','diffind': '0','year':before_year}) 
      continue;
    }
    // console.log(`data,${JSON.stringify(data)}`)
    json.push(stockHighLowPrice(data,before_year))
  }
  // console.log(`stockHighLowPriceMoreYear,json,${JSON.stringify(json)}`)
  return json;
}
const obj = [
  {"Date":"2019-09-20","Close":20},
  {"Date":"2019-09-19","Close":10},
  {"Date":"2020-09-21","Close":30},
  {"Date":"2020-09-22","Close":40.99},
  {"Date":"2020-09-25","Close":50.96},
  {"Date":"2021-09-26","Close":60.82},
  {"Date":"2023-09-27","Close":70.87},
  {"Date":"2021-09-20","Close":20},
  {"Date":"2023-09-19","Close":10},
  {"Date":"2023-09-21","Close":30},
  {"Date":"2022-09-22","Close":40.99},
  {"Date":"2022-09-25","Close":50.96},
  {"Date":"2022-09-26","Close":60.82},
  {"Date":"2021-09-27","Close":70.87}
]

const value = stockHighLowPriceMoreYear(obj,4);
console.log(value)