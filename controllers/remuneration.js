const { dbQuery,dbInsert,dbUpdata,dbDelete } = require('../plugin/db')
const { stockCrawler } = require("../plugin/stockCrawler");
const { stockAvenge,getNowTimeObj } = require("../plugin/stockFn");

async function nowPage({stocks,date_start,date_end}) {
  console.log(`nowPage,stockno,date_start,date_end,${stocks,date_start,date_end}`)
  let data = [];
  let date = []
  for(const stockno of stocks) {
    console.log(`nowPage,stockno,${stockno}`)
    let stockdata = await dbQuery( 'SELECT stockdata from stock WHERE stockno = ?',[stockno])
    stockdata = stockdata[0]['stockdata']
    console.log(`nowPage,stockdata.length,${stockdata.length}`)
    if(!stockdata.length){
      let jsons = await stockCrawler({'stockno':stockno})
      jsons = JSON.parse(jsons['stockdata'])
      console.log(`nowPage,jsons,${jsons}`)
      if(!jsons){
        console.log(`nowPage,找不到資料`)
        data = []
        // res.json({result:'false',message:'找不到資料'})
        return false;
        break;
      }
      stockdata = jsons
    }
    // console.log(`nowPage,抓取資料1,${date_start,date_end}}`)
    //抓取資料
    stockdata = JSON.parse(stockdata).filter(function(obj){
      if(obj.date<=date_end && obj.date>=date_start){
        return obj;
      }
    })
    // console.log(`nowPage,抓取資料2,${stockdata},${JSON.stringify(stockdata)}`)
    const obj = {}
    obj.name = stockno
    obj.type = 'line'
    obj.data = []
    for (let index = 0; index < stockdata.length; index++) {
      if(index==0){
        obj.data.push(0)
      }else{
        obj.data.push(stockAvenge(stockdata[0].close, stockdata[index].close))
      }
    }
    // obj.data = stockdata.map(el=>el.close)
    data.push(obj)
    date = stockdata.map(el=>el.date)
  }
  console.log(`nowPage,data,${JSON.stringify(data)},date,${date}`)
  // res.json({ result:'true',data: {data:data,date:date} })
  return {
    data:data,
    date:date,
  };
}
async function search(req, res) {
  // console.log(`---------查詢股票---------`)
  const stocks = ['0050','0056','00713']
  const date_start = '2020-01-01'
  const date_end = getNowTimeObj()['date']
  const data = await nowPage({
    stocks: stocks,
    date_start: date_start,
    date_end: date_end
  })
  data.date_start=date_start  
  data.date_end=date_end  
  data.stocks=stocks  
  res.render('remuneration',{
    'active': 'remuneration',
    'data': data,
  })
}
async function search_post(req, res) {
  const params = req.body
  if(!params.stocks.length || !params.date_start || !params.date_end ){
    console.log(`search_post,資料錯誤,${JSON.stringify(params)}`)
    res.json({result:'false',message:'資料錯誤'})
    return false;
  }
  // await nowPage({stocks:params.stocks,date_start:params.date_start,date_end:params.date_end,res:res})
  const data = await nowPage({stocks:params.stocks,date_start:params.date_start,date_end:params.date_end})
  // console.log(`search_post,${data}`)
  if(!data.data){
    res.json({result:'false',message:'找不到資料'})
    return false;
  }
  res.json({result:'true',data: data})
}

module.exports = { 
  search,
  search_post
}