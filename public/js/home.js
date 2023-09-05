window.onload=async function(){
  console.log(pageJson)
  // const prosperity = echarts.init(document.querySelector('.prosperity .customTable'),'dark');
  // prosperity.setOption(pageJson['prosperity_option']);
  // const weighted = echarts.init(document.querySelector('.weighted .customTable'),'dark');
  // weighted.setOption(pageJson['weighted_option']);

  Highcharts.chart('prosperity_chart', {
    chart: {
      zoomType: 'xy',
      backgroundColor: 'none',
    },
    title: {
        text: null
    },
    credits:{
      enabled: false // 禁用版权信息
    },
    // subtitle: {
    //     text: '数据来源: WorldClimate.com'
    // },
    xAxis: [{
        categories: pageJson['prosperity_date'],
        crosshair: true,
        labels: {
          style: {
            color: '#7d7b8a'
          }
        },
    }],
    yAxis:[{ 
       // Secondary yAxis
      labels: {
        // format: '{value} mm',
        style: {
          color: '#7d7b8a'
        }
      },
      title: {
        // text: '景氣燈號',
        text: null,
        // style: {
        //   color: '#D8D9E3'
        // }
      },
      gridLineColor: '#333', //網格線
      opposite: true
    }, 
    { 
      // Primary yAxis
      labels: {
        // format: '{value}°C',
        style: {
          color: '#7d7b8a'
        }
      },
      title: {
        // text: '大盤指數',
        text: null,
        // style: {
        //   color: '#D8D9E3'
        // }
      },
      gridLineColor: '#333', //網格線
    }],
    // tooltip: {
    //     shared: true
    // },
    legend: {
      layout: 'vertical',
      align: 'left',
      x: 45,
      verticalAlign: 'bottom',
      y: -40,
      floating: true,
      backgroundColor:'#FFFFFF'
    },
    // plotOptions: {
    //   series: [{
    //     color: '#FF0000'
    //   }]
    // },
    series: [{
      name: '景氣燈號',
      type: 'area',
      // type: 'column',
      yAxis: 1,
      data: pageJson['prosperity_data'],
      lineWidth: 2, //線寬
      color: 'rgba(58,97,246)',
      fillColor: {
        linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
        stops: [
            [0,'rgba(58,97,246)'],
            [1,'rgba(0,0,0,0)']
        ]
      },
      // tooltip: {
      //     valueSuffix: ' mm'
      // }
    },{
      name: '大盤指數',
      type: 'spline',
      data: pageJson['prosperity_market'],
      lineWidth: 2, //線寬
      color: '#808191',
      // tooltip: {
      //     valueSuffix: '°C'
      // }
    }]
  });
}