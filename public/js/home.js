window.onload=async function(){
  console.log(pageJson)
  // const prosperity = echarts.init(document.querySelector('.prosperity .customTable'),'dark');
  // prosperity.setOption(pageJson['prosperity_option']);
  // const weighted = echarts.init(document.querySelector('.weighted .customTable'),'dark');
  // weighted.setOption(pageJson['weighted_option']);
  //加權指數
  // $.getJSON('https://data.jianshukeji.com/stock/history/000001', function (data) {
  //   if(data.code !== 1) {
  //     alert('读取股票数据失败！');
  //     return false;
  //   }
    Highcharts.setOptions({
        lang: {
            rangeSelectorZoom: ''
        }
    });
    data = pageJson['data'];
    // console.log(data)
    var ohlc = [],
      volume = [],
      dataLength = data.length,
      // set the allowed units for data grouping
      groupingUnits = [[
          'week',                         // unit name
          [1]                             // allowed multiples
      ], [
          'month',
          [1, 2, 3, 4, 6]
      ]],
      i = 0;
    for (i; i < dataLength; i += 1) {
      ohlc.push([
        Date.parse(data[i][0]), // the date
        Number(data[i][1]), // open
        Number(data[i][2]), // high
        Number(data[i][3]), // low
        Number(data[i][4]),// close
      ]);
      volume.push([
        Date.parse(data[i][0]), // the date
        Number(data[i][5].split(',').join('')),// the volume
      ]);
    }
    console.log(volume)
    // create the chart
    Highcharts.stockChart('weighted_chart', {
      chart: {
        backgroundColor: 'none',
      },
      scrollbar: {
        // barBorderRadius: 0,
        // barBorderWidth: 1,
        // buttonsEnabled: true,
        // height: 12,
        // margin: 0,
        // rifleColor: '#333',
        // trackBackgroundColor: '#f2f2f2',
        // trackBorderRadius: 0
        showFull: false,
        enabled: false,//關閉航海家
      },
      rangeSelector: {
        // selected: 0.3,
        // inputDateFormat: '%Y-%m-%d',
        enabled: false,//時間範圍
      },
      navigator: {
        enabled: false,//關閉航海家
      },
      title: {
          text: null
      },
      credits:{
        enabled: false // 禁用版权信息
      },
      xAxis: {
        dateTimeLabelFormats: {
          millisecond: '%H:%M:%S.%L',
          second: '%H:%M:%S',
          minute: '%H:%M',
          hour: '%H:%M',
          day: '%m-%d',
          week: '%m-%d',
          month: '%y-%m',
          year: '%Y'
        },
        labels: {
          style: {
            color: '#7d7b8a'
          }
        },
      },
      tooltip: {
        split: false,
        shared: true,
      },
      yAxis: [{
        labels: {
          align: 'left',
          // x: -3,
          style: {
            color: '#7d7b8a'
          }
        },
        title: {
          // text: '股价'
          text: null,
        },
        height: '65%',
        resize: {
          enabled: true
        },
        gridLineColor: '#333', //網格線
        lineWidth: 1
      }, {
        labels: {
          align: 'left',
          // x: -3,
          style: {
            color: '#7d7b8a'
          }
        },
        title: {
          // text: '成交量'
          text: null,
        },
        top: '65%',
        height: '35%',
        offset: 0,
        gridLineColor: '#333', //網格線
        lineWidth: 1
      }],
      series: [{
        type: 'candlestick',
        name: '加權指數',
        color: 'green',
        lineColor: 'green',
        upColor: 'red',
        upLineColor: 'red',
        tooltip: {
        },
        // navigatorOptions: {
        //   color: Highcharts.getOptions().colors[0]
        // },
        data: ohlc,
        dataGrouping: {
          units: groupingUnits
        },
        // id: 'sz'
      },{
        type: 'column',
        name: '成交量',
        data: volume,
        yAxis: 1,
        dataGrouping: {
          units: groupingUnits
        }
      }]
    });
  // });
  //景氣燈號
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