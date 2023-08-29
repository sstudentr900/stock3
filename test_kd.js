function stocKdData(stockdata,day){
  let K = 0
  let D = 0
  day = day?day:9
  const kdData = []
  const kdFn = function(nineDayData){
    // 最近九天的最低價,最高價
    let minClose = nineDayData.reduce((pre,cur)=>pre.Close<cur.Close?pre:cur).Close
    let maxClose = nineDayData.reduce((pre,cur)=>pre.Close>cur.Close?pre:cur).Close
    // 今日收盤價
    let todayClose = nineDayData[nineDayData.length-1].Close
    //RSV = ( 今日收盤價 - 最近九天的最低價 ) / ( 最近九天的最高價 - 最近九天最低價 )
    let rsv = 100 * (todayClose-minClose) / (maxClose - minClose)
    //K = 2/3 * ( 昨日K值 ) + 1/3 * ( 今日RSV )
    K = (2/3) * K + (1/3) * rsv
    //D = 2/3 * ( 昨日D值 ) + 1/3 * ( 今日K值 )
    D = (2/3) * D + (1/3) * K
    return {
      date: nineDayData[nineDayData.length-1].Date,
      K: (K).toFixed(2),
      D: (D).toFixed(2)
    }
  }
  stockdata.forEach((element,index) => {
    const ind = index+1;
    if(ind>day){
      const star = ind-day
      const end =  ind
      //取0~9,1~10 資料
      const nineDayData = stockdata.slice(star,end)
      // console.log(`取${star}~${end}資料,${JSON.stringify(nineDayData)}`)
      kdData.push(kdFn(nineDayData))
    }
  });
  return kdData
}
function stocKdFn(stockdata){
  const kdDatas = stocKdData(stockdata)
  return {
    'datas': kdDatas,
    'last_data': kdDatas[kdDatas.length-1],
    'last_date': kdDatas[kdDatas.length-1]['date'],
    'last_d': kdDatas[kdDatas.length-1]['D'],
    'last_k': kdDatas[kdDatas.length-1]['K'],
  }
}
const obj = [
  {"Date":"2019-09-01","Close":10},
  {"Date":"2019-09-02","Close":20},
  {"Date":"2019-09-03","Close":30},
  {"Date":"2019-09-04","Close":40},
  {"Date":"2019-09-05","Close":50},
  {"Date":"2019-09-06","Close":60},
  {"Date":"2019-09-07","Close":70},
  {"Date":"2019-09-08","Close":20},
  {"Date":"2019-09-09","Close":10},
  {"Date":"2019-09-10","Close":30},
  {"Date":"2019-09-11","Close":40},
  {"Date":"2019-09-12","Close":50},
  {"Date":"2019-09-13","Close":60},
  {"Date":"2019-09-14","Close":70},
  {"Date":"2019-09-15","Close":30},
  {"Date":"2019-09-16","Close":40},
  {"Date":"2019-09-17","Close":50},
  {"Date":"2019-09-18","Close":60},
  {"Date":"2019-09-19","Close":70},
  {"Date":"2019-09-20","Close":30},
  {"Date":"2019-09-21","Close":40},
  {"Date":"2019-09-22","Close":50},
  {"Date":"2019-09-23","Close":60},
  {"Date":"2019-09-24","Close":70},
  {"Date":"2019-09-25","Close":50},
  {"Date":"2019-09-26","Close":60},
  {"Date":"2019-09-27","Close":70},
  {"Date":"2019-09-28","Close":30},
  {"Date":"2019-09-29","Close":40},
  {"Date":"2019-09-30","Close":50},
  {"Date":"2019-09-31","Close":60},
  {"Date":"2019-10-01","Close":70}
] 
const value = stocKdFn(obj)
console.log(value)