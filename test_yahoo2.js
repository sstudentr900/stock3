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
async function stockGetData(stockno,monthLength=3){
  let stockdata = []
  //['20220701','20220801','20220901']
  let dates = getTimes(monthLength)
  for(let date of dates){   
    console.log(date)
    // let jsonUrl = "https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=" + date + "&stockno=" + stockno;
    // let body = ''
    // console.log('jsonUrl',jsonUrl)
    // try{
    //   body = await stockPromise({url: jsonUrl,method: "GET"})
    //   body = JSON.parse(body)
    // }catch(error){
    //   //請求錯誤訊息
    //   console.log(`stockGetData ${stockno} request ${date} date ${error}`)
    //   return `stockGetData ${stockno} request ${date} date ${error}`
    // }
    // //請求成功但沒有資料
    // if(body.stat!='OK'){
    //   console.log(`stockGetData_body ${stockno} request ${date} date ${body.stat}`)
    //   return `stockGetData_body ${stockno} request ${date} date ${body.stat}`
    // }
    // let jsons = body.data
    // // console.log('jsons',jsons)
    // let array = jsons.map(json=>{
    //   return {
    //     // 'Date':Number(json[0].split('/').join('')),
    //     'Date':json[0],
    //     'Open':Number(json[3]),
    //     'Hight':Number(json[4]),
    //     'Low':Number(json[5]),
    //     'Close':Number(json[6]),
    //     'Volume':Number(json[8].replace(/,/g,''))
    //   };
    // })
    // stockdata = stockdata.concat(array)
  }
  // stockdata.sort((o1,o2)=>o1.Date.split('/').join('')-o2.Date.split('/').join(''))
  // return stockdata
}

//
stockGetData('00598').then((jsons)=>{
  console.log('21',jsons)
}).catch((jsons)=>{
  console.log('23',jsons)
})
// async function aa(){
//   const jsons = await stockGetData('00692','2023-07-24','2023-08-24')
//   console.log(jsons)
// }
// aa()