const { dbQuery,dbInsert,dbUpdata,dbDelete } = require('../plugin/db')
const { stockCrawler } = require("../plugin/stockCrawler");
const { 
  stockPayMoreYear,
  stockYieldPrice,
  stockPayMoreMonth,
  stockCagr,
  getNowTimeObj,
  stockHighLowPriceMoreYear,
  stockdataFn_w,
  stockKdFn,
  getSort,
  getMa
} = require("../plugin/stockFn");

async function search(req, res) {
  console.log(`---------查詢股票---------`)
  const params = req.params
  console.log(params.stockno)
  if(!params.stockno){
    console.log(`來源資料錯誤:${params.stockno}-${JSON.stringify(params)}`)
    res.render('individual',{
      'active': 'individual',
      'result':'false',
      'message':'來源資料錯誤',
      'data': 0,
    })
    return false;
  }
  const stockno = params.stockno
  const rows = await dbQuery( 'SELECT networthdata,stockname,stockno,stockdata,yielddata,threecargo,holder,shareholding,industry,sharpedata,updated_at from stock WHERE stockno = ?',[stockno] )
  if(!rows.length){
    console.log(`serch,沒有值,重新抓取`)
    res.render('individual',{
      'active': 'individual',
      'result':'false',
      'message':'資料庫沒有值',
      'data': 0,
    })

  }else{
    console.log(`serch,有值`)
    for (const row of rows) {
      console.log(`--stockno:${row['stockno']}--`)
      
      //更新時間
      row['dataDate'] = getNowTimeObj({'date':row['updated_at']})['date']
      //stockdata 
      row['stockdata'] = row['stockdata']?JSON.parse(row['stockdata']):'';
      const data = row['stockdata'].slice(-60)
      row['stock_date'] = data.map(item=>item.date)
      row['stock_price'] = data.map(item=>[item.open,item.close,item.low,item.hight])
      row['stock_vol'] = data.map(item=>item.volume)
      row['stock_ma5'] = getMa(5,data)
      row['stock_ma10'] = getMa(10,data)
      row['stock_ma20'] = getMa(20,data)
      //法人買賣超和融資融劵		
      // row['threecargo'] = row['threecargo']?JSON.parse(row['threecargo']):'';
      const threecargo = JSON.parse(row['threecargo'])
      row['threecargo'] = getSort({obj:row['threecargo'],number:18})
      //法人買賣超_日期
      row['threecargo_date'] = threecargo.map(({date})=>date)
      //法人買賣超
      row['threecargo_data'] = threecargo.map(({totle})=>totle)
      //法人買賣超_加權指數
      row['threecargo_market'] = threecargo.map(({date})=>{
        const obj = row['stockdata'].find(obj=>date==obj.date)
        return obj?Number(obj.close):0
      })
      //股東持股分級週統計圖	
      const holder = JSON.parse(row['holder'])
      row['holder'] = getSort({obj:row['holder'],number:18})
      //法人買賣超_日期
      row['holder_date'] = holder.map(({date})=>date)
      //法人買賣超
      row['holder_data'] = holder.map(({big400})=>big400)
      //法人買賣超_加權指數
      // row['holder_market'] = holder.map(({date})=>{
      //   const obj = row['stockdata'].find(obj=>date==obj.date)
      //   return obj?Number(obj.close):0
      // })
      row['holder_market'] = holder.map(({date})=>{
        const obj = row['stockdata'].find(obj=>{
          return (date.split('-')[0]+'-'+date.split('-')[1])==(obj.date.split('-')[0]+'-'+obj.date.split('-')[1])
        })
        return obj?Number(obj.close):0
      })
      //今年每月報酬
      // row['stockPayMonth'] = stockPayMoreMonth(row['stockdata']);
      //最近5年每年報酬
      row['stockPayYear'] = await stockPayMoreYear(row['stockdata'],5);
      //年化報酬率
      row['stockCagr'] = stockCagr(row['stockPayYear']);
      //淨值
      // row['networthdata'] = row['networthdata']?JSON.parse(row['networthdata']):''
      row['networthdata'] = getSort({obj:row['networthdata'],number:6})
      //殖利率
      row['yielddata'] = row['yielddata']?JSON.parse(row['yielddata']):''
      const yieldObj = stockYieldPrice(row['yielddata'],row['stockdata']);
      row['stockYield'] = yieldObj.stockYield;//每年殖利率
      // row['average'] = yieldObj.average;//平均股利
      // row['averageYield'] =yieldObj.averageYield;//平均殖利率
      row['nowYield'] = yieldObj.nowYield;//目前殖利率
      row['cheapPrice']  = yieldObj.cheapPrice;//便宜 
      row['fairPrice'] = yieldObj.fairPrice;//合理
      row['expensivePrice'] =yieldObj.expensivePrice;//昂貴
      //持股產業
      row['industry'] = row['industry']?JSON.parse(row['industry']):'';
      //持股明細
      row['shareholding'] = row['shareholding']?JSON.parse(row['shareholding']):'';
      //夏普值
      row['sharpedata'] = row['sharpedata']?JSON.parse(row['sharpedata']).slice(-7):'';
      //5年高低點
      row['highLowPrice'] = stockHighLowPriceMoreYear(row['stockdata'],5);
      //周kd
      row['wkd_d'] = stockKdFn(stockdataFn_w(row['stockdata']))['last_d'];
    
      //移除不需要的值
      delete row.stockdata
      delete row.yielddata
      delete row.updated_at
      // console.log(`row,${JSON.stringify(row)}`)
    }
    console.log(rows[0])
    // res.send(rows)
    res.render('individual',{
      'active': 'individual',
      'data': rows[0],
    })
  }
}
// async function add(req, res) {
//   console.log(`---------增加股票---------`)
//   const params = req.body
//   // if(!params.stockname || !params.stockno){
//   if(!params.stockno){
//     // console.log(`來源資料錯誤:${params.stockname}-${params.stockno}-${JSON.stringify(params)}`)
//     console.log(`來源資料錯誤:${params.stockno}-${JSON.stringify(params)}`)
//     res.json({result:'false',message:'來源資料錯誤'})
//     return false;
//   }
//   const stockno = params.stockno
//   const stocknoArray = await dbQuery( 'SELECT id from stock WHERE stockno = ?',[stockno])
//   // console.log(`stocknoArray,${stocknoArray.length}`)
//   if(stocknoArray.length){
//     console.log('false,資料重複')
//     res.json({result:'false',message:'資料重複'})
//     return false;
//   }else{
//     console.log(`stockno:${stockno}`)
//     //抓取資料
//     const jsons = await stockCrawler({'stockno':stockno})
//     if(!jsons){
//       console.log('找不到資料')
//       res.json({result:'false',message:'找不到資料'})
//       return false;
//     }
//     // console.log(jsons)
//     const data = {}
//     //stockdata 轉換 parse
//     // console.log(JSON.stringify(jsons))
//     const stockdata = jsons['stockdata']?JSON.parse(jsons['stockdata']):''
//     // console.log(`抓取數量:${stockdata.length}`)
//     //股名
//     data['stockname'] = jsons['stockName']
//     //股號
//     data['stockno'] = stockno
//     //今年月報酬
//     data['stockPayMonth'] = stockPayMoreMonth(stockdata)
//     //8年報酬
//     data['stockPayYear'] = stockPayMoreYear(stockdata,8)
//     //年化報酬率
//     data['stockCagr'] = stockCagr(data['stockPayYear'])
//     //殖利率
//     const yielddata = jsons['yielddata']?JSON.parse(jsons['yielddata']):'';
//     const yieldObj = stockYieldPrice(yielddata,stockdata);
//     data['stockYield'] = yieldObj.stockYield;//每年殖利率
//     data['average'] = yieldObj.average;//平均股利
//     data['averageYield'] =yieldObj.averageYield;//平均殖利率
//     data['nowYield'] = yieldObj.nowYield;//目前殖利率
//     data['cheapPrice']  = yieldObj.cheapPrice;//便宜 
//     data['fairPrice'] = yieldObj.fairPrice;//合理
//     data['expensivePrice'] =yieldObj.expensivePrice;//昂貴
//     //4年高低點
//     data['highLowPrice'] = stockHighLowPriceMoreYear(stockdata,4);
//     //周kd
//     data['wkd_d'] = stockKdFn(stockdataFn_w(stockdata))['last_d'];
//     //目前淨值
//     if(jsons['networthdata']){
//       let networthdata = JSON.parse(jsons['networthdata']);
//       networthdata = networthdata[networthdata.length-1]
//       // console.log(`networthdata,${networthdata}`)
//       data['networthdata'] = `${networthdata['price']} / ${networthdata['networth']}`
//     }else{
//       data['networthdata'] = 0;
//     }
//     //id
//     data['id'] = jsons['insertId']

//     //移除不需要的值
//     delete data.stockdata
//     delete data.updated_at

//     res.json({result:'true',data: data })
//   }
// }
// async function delet(req, res) {
//   console.log(`---------刪除股票-----------`)
//   const params = req.params
//   const id = params.id
//   console.log(`id:${id}`)
//   if(!id){
//     console.log(`來源資料錯誤:${params}`)
//     res.json({result:'false',message:'來源資料錯誤'})
//     return false;
//   }
//   const rows = await dbDelete('stock',id)
//   if(rows){
//     res.json({result:'true',message:'刪除股票成功'})
//   }else{
//     res.json({result:'false',message:'刪除股票失敗'})
//   }
// }
// async function sort(req, res) {
//   console.log(`---------排序股票報酬---------`)
//   const params = req.body
//   for (const param of params) {
//     // console.log(param['sort'],param['id'])
//     await dbUpdata('stock',{'sort':param['sort']},param['id'])
//   }
//   res.json({result:'true',message: '股票排序成功'})
// }

module.exports = { 
  search,
  // add,
  // delet,
  // sort
}