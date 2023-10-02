function creatChart(data){
  const chart = echarts.init(document.getElementById('chart'));
  window.addEventListener('resize', function() {
    chart.resize();
  });
  const chart_option = {
    title: {
      show: false // 隐藏标题
    },
    grid: {
      left: 50, //畫面編距
      right: 30,
      top: 40,
      bottom: 20,
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      // show: false // 隐藏图例
    },
    xAxis: [
      {
        type: 'category',
        data: data.date,
        axisTick: {
          // alignWithLabel: true,
          show: false,//刻度
        },
        axisLine: {
          show: false,//線
        }
        // data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      }
    ],
    yAxis:  {
      type: 'value',
      axisLabel: {
        formatter: '{value} %'
      }
    },
    series: data.data,
    // series: [
    //   {
    //     name: 'Email',
    //     type: 'line',
    //     data: [120, 132, 101, 134, 90, 230, 210]
    //   },
    //   {
    //     name: 'Union Ads',
    //     type: 'line',
    //     data: [220, 182, 191, 234, 290, 330, 310]
    //   },
    //   {
    //     name: 'Video Ads',
    //     type: 'line',
    //     data: [150, 232, 201, 154, 190, 330, 410]
    //   },
    //   {
    //     name: 'Direct',
    //     type: 'line',
    //     data: [320, 332, 301, 334, 390, 330, 320]
    //   },
    //   {
    //     name: 'Search Engine',
    //     type: 'line',
    //     data: [820, 932, 901, 934, 1290, 1330, 1320]
    //   }
    // ]
  };
  chart.setOption(chart_option);
}
function serchStrock(){
  const publicForm = document.querySelector('.publicForm')
  const stocks = [...publicForm.querySelectorAll('[name="stock[]"]')].map(el=>el.value).filter(el => el)
  const date_start = publicForm.querySelector('[name="date_start"]').value
  const date_end = publicForm.querySelector('[name="date_end"]').value
  // console.log(stock,date_start,date_end)
  if(!stocks.length){
    alert('比較股號未填')
  }
  if(!date_start){
    alert('開始時間未填')
  }
  if(!date_end){
    alert('結束時間未填')
  }
  const serch = publicForm.querySelector('.serch')
  serch.onclick = null
  serch.classList.add('active')
  getJSON({
    'url': './remuneration',
    'method': 'POST',
    'body': {
      'stocks': stocks,
      'date_start': date_start,
      'date_end': date_end,
    }
  }).then(function (json) {
    console.log(json)
    //load
    serch.onclick = serchStrock
    serch.classList.remove('active')
    if(json.result=='false'){alert(json.message);return false;}
    creatChart(json.data)
  });
}
window.onload=async function(){
  console.log(pageJson)
  if(!pageJson){
    alert('找不到資料')
    window.location = './';
    return false;
  }
  const publicForm = document.querySelector('.publicForm')
  const stocks = [...publicForm.querySelectorAll('[name="stock[]"]')]
  publicForm.querySelector('[name="date_start"]').value = pageJson.date_start;
  publicForm.querySelector('[name="date_end"]').value = pageJson.date_end;
  pageJson.stocks.forEach((el,index)=>{
    stocks[index].value = el
  })
  creatChart(pageJson)
}