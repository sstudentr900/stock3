const { dbQuery,dbInsert,dbUpdata,dbDelete } = require('../plugin/db')
const { 
  getNowTimeObj,
  getMonthly,
  getSort,
  getMa,
  getAccumulate
} = require("../plugin/stockFn");
async function search(req, res) {
  let rows = await dbQuery( 'SELECT * from market' )
  // console.log(rows[0]['monthlystatistics'])
  if(!rows.length){console.log(`serch,dbQuery失敗跳出`)}
  for (const row of rows) {
     //加權指數
    const data = JSON.parse(row['twii'])
    // const twii = data.slice(-132)
    const twii = data
    row['twii_date'] = twii.map(item=>item.date)
    row['twii_price'] = twii.map(item=>[item.open,item.close,item.low,item.high])
    row['twii_vol'] = twii.map(item=>item.volume)
    row['wii_ma5'] = getMa(5,twii)
    row['wii_ma10'] = getMa(10,twii)
    row['wii_ma20'] = getMa(20,twii)
    //時間
    row['date'] = getNowTimeObj({'date':row['updated_at']})['date']
    //上市三大法人排名
    row['ranking'] = getSort({obj:row['ranking'],number:18})
    //3大法人_買賣超融資卷
    row['threecargofinancing'] = getSort({obj:row['threecargo'],number:10})
    const threecargo = JSON.parse(row['threecargo'])
    //3大法人_日期
    row['threecargo_date'] = threecargo.map(({date})=>date)
    //3大法人_合計累加
    row['threecargo_data'] = getAccumulate({obj:threecargo.map(({total})=>Number(total))})
    // row['threecargo_data'] = threecargo.map(({total})=>Number(total))
    //3大法人_融資
    row['threecargo_data_financing'] = threecargo.map(({financing})=>financing.split(',').join(''))
    //3大法人_加權指數
    row['threecargo_market'] = threecargo.map(({date})=>{
      const obj = data.find(obj=>date==obj.date)
      return obj?Number(obj.close):0
    })
    //月統計
    row['monthlystatistics'] = getSort({obj:row['monthlystatistics'],number:12,sort:'asc'})

    //期貨買賣超
    const threefutures = JSON.parse(row['threefutures'])
    row['threefutures'] = getSort({obj:row['threefutures'],number:10})
    //期貨買賣超_日期
    row['threefutures_date'] = threefutures.map(({date})=>date)
    //期貨買賣超_資料
    row['threefutures_data'] = threefutures.map(({foreign,letter,proprietor})=>(Number(foreign)+Number(letter)+Number(proprietor)).toFixed(2))
    // row['threefutures_data'] = getAccumulate({obj:threefutures_data})
    // row['threefutures_data'] = threefutures.map(({foreign})=>foreign)
    //期貨買賣超_加權指數
    row['threefutures_market'] = threefutures.map(({date})=>{
      let number = 0
      const obj = data.find((obj,index)=>{
        number = index;
        return date==obj.date
      })
      return obj?Number(obj.close):Number(data[number].close)
    })
    //大股東增減
    row['holder'] = getSort({obj:row['holder'],number:20})
    //羊群增減
    row['retail'] = getSort({obj:row['retail'],number:20})
    //貪婪指數
    if(row['greedy']){
      const greedy = JSON.parse(row['greedy'])
      //貪婪指數日期
      row['greedy_date'] = greedy.map(({date})=>date)
      //貪婪指數資料
      row['greedy_data'] = greedy.map(({data})=>Number(data))
      //貪婪指數_加權指數
      let greedy_number = 0
      row['greedy_market'] = greedy.map(({date})=>{
        const obj = data.find((obj,index)=>{
          if(date==obj.date){
            greedy_number = index;
          }
          return date==obj.date
        })
        // console.log(date,number,data[greedy_number].close,obj?.close)
        return obj?Number(obj.close):Number(data[greedy_number].close)
      })
      delete row.greedy
    }
    //景氣對策信號
    if(row['prosperity']){
      //const prosperity =  JSON.parse(row['prosperity']).slice(-100)
      const prosperity =  JSON.parse(row['prosperity'])
      //日期
      // row['prosperity_date'] = prosperity.map(({date})=>`${date.split('-')[0].slice(-2)}-${date.split('-')[1]}`)
      row['prosperity_date'] = prosperity.map(({date})=>date)
      //景氣對策信號
      row['prosperity_data'] = prosperity.map(({point})=>point)
      //景氣對策信號_加權指數
      row['prosperity_market'] = prosperity.map(({date})=>{
        const obj = data.find(obj=>{
          return (date.split('-')[0]+'-'+date.split('-')[1])==(obj.date.split('-')[0]+'-'+obj.date.split('-')[1])
        })
        return obj?Number(obj.close):0
      })
    }
    //美金
    if(row['dollars']){
      // const dollars = getMonthly({ year:'2018',json:JSON.parse(row['dollars']) })
      const dollars = JSON.parse(row['dollars']) 
      //日期
      // row['dollars_date'] = dollars.map(({date})=>`${date.split('-')[0].slice(-2)}-${date.split('-')[1]}`)
      row['dollars_date'] = dollars.map(({date})=>date)
      //美金資料
      row['dollars_data'] = dollars.map(({dollars})=>Number(dollars))
      //美金_加權指數
      row['dollars_market'] = dollars.map(({date})=>{
        // const obj = data.find(obj=>date==obj.date)
        // return obj?Number(obj.close):0
        let number = 0
        const obj = data.find((obj,index)=>{
          number = index;
          return date==obj.date
        })
        return obj?Number(obj.close):Number(data[number].close)
      })
    }
    //散戶多空比
    if(row['smallhouseholds']){
      const smallhouseholds = JSON.parse(row['smallhouseholds'])
      //散戶多空比_日期
      row['smallhouseholds_date'] = smallhouseholds.map(({date})=>date)
      //散戶多空比_資料
      row['smallhouseholds_data'] = smallhouseholds.map(({data})=>Number(data))
      //散戶多空比_加權指數
      row['smallhouseholds_market'] = smallhouseholds.map(({date})=>{
        let number = 0
        const obj = data.find((obj,index)=>{
          number = index;
          return date==obj.date
        })
        return obj?Number(obj.close):Number(data[number].close)
      })
      delete row.smallhouseholds
    }
    //大盤融資
    if(row['bigcargo']){
      const bigcargo = JSON.parse(row['bigcargo'])
      //日期
      row['bigcargo_date'] = bigcargo.map(({date})=>date)
      //資料
      row['bigcargo_data'] = bigcargo.map(({ma})=>Number(ma))
      //加權指數
      row['bigcargo_market'] = bigcargo.map(({date})=>{
        let number = 0
        const obj = data.find((obj,index)=>{
          number = index;
          return date==obj.date
        })
        return obj?Number(obj.close):Number(data[number].close)
      })
      delete row.bigcargo
    }
    // //上下跌家數
    // const updownnumber = JSON.parse(row['updownnumber'])
    // row['updownnumber'] = getSort({obj:row['updownnumber'],number:10})
    // //上下跌家數_日期
    // row['updownnumber_date'] = updownnumber.map(({date})=>date)
    // //上下跌家數_資料
    // row['updownnumber_data'] = updownnumber.map(({Diffhome})=>Number(Diffhome))
    // //上下跌家數__加權指數
    // row['updownnumber_market'] = updownnumber.map(({date})=>{
    //   let number = 0
    //   const obj = data.find((obj,index)=>{
    //     number = index;
    //     return date==obj.date
    //   })
    //   return obj?Number(obj.close):Number(data[number].close)
    // })
    // //上市類股漲跌
    // row['listed'] = getSort({obj:row['listed'],number:54})
    // //除息股票
    // row['exdividend'] = getSort({obj:row['exdividend'],number:54}).filter((item,index)=>{
    //   console.log()
    //   const date = item.ex_date.split('/').join('-')
    //   if(date>=getNowTimeObj()['date']){
    //     return item;
    //   }
    // })
    // //恐慌指數
    // if(row['vix']){
    //   const vix = JSON.parse(row['vix'])
    //   //恐慌指數日期
    //   row['vix_date'] = vix.map(({date})=>date)
    //   //恐慌指數資料
    //   row['vix_data'] = vix.map(({number})=>Number(number))
    //   //恐慌指數_加權指數
    //   // row['vix_market'] = vix.map(({date})=>{
    //   //   const obj = data.find(obj=>date==obj.date)
    //   //   return obj?Number(obj.close):0
    //   // })
    //   row['vix_market'] = vix.map(({date})=>{
    //     let number = 0
    //     const obj = data.find((obj,index)=>{
    //       number = index;
    //       return date==obj.date
    //     })
    //     return obj?Number(obj.close):Number(data[number].close)
    //   })
    //   delete row.vix
    // }
    


    //移除不需要的值和值沒有轉JSON.parse
    //delete row.bigcargo
    delete row.vix
    delete row.updownnumber
    delete row.listed
    delete row.exdividend
    delete row.threecargo
    delete row.prosperity
    delete row.dollars
    delete row.twii
    delete row.id
    delete row.updated_at
  }
  console.log(rows[0])
  res.render('home',{
    'active': 'home',
    'data': rows[0],
  })
}
// async function stockAdd(req, res) {
//   console.log(`---------增加股票---------`)
//   const params = req.body
//   if(!params.stockname || !params.stockno){
//     console.log(`來源資料錯誤:${params.stockname}-${params.stockno}-${JSON.stringify(params)}`)
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
//     const jsons = await stockStart({'stockno':stockno})
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
//     data['networth'] = jsons['networth']

//     //儲存資料
//     // console.log(`儲存資料,jsons,${JSON.stringify(jsons)}`)
//     const rows = await dbInsert('stock',params)
//     const insertId = rows.insertId
//     jsons['sort'] = insertId
//     jsons['networth'] = data['networth']
//     await dbUpdata('stock',jsons,insertId)

//     //id
//     data['id'] = insertId

//     //移除不需要的值
//     delete data.stockdata
//     delete data.updated_at

//     res.json({result:'true',data: data })
//   }
// }
// async function stockDelet(req, res) {
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
// async function stockSort(req, res) {
//   console.log(`---------排序股票報酬---------`)
//   const params = req.body
//   for (const param of params) {
//     // console.log(param['sort'],param['id'])
//     await dbUpdata('stock',{'sort':param['sort']},param['id'])
//   }
//   res.json({result:'true',message: '股票排序成功'})
// }

module.exports = { 
  search
}