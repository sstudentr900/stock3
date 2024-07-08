window.onload=async function(){
  console.log(pageJson,Number(pageJson['expensivePrice']))
  if(!pageJson){
    alert('找不到資料')
    window.location = './';
    return false;
  }
  const line_chart = echarts.init(document.getElementById('line_chart'));
  //殖利率的便宜合理昂貴價
  // const stockYieldPrice_chart = echarts.init(document.getElementById('stockYieldPrice_chart'));
  //三大法人和融資融劵
  const threecargo_chart = echarts.init(document.getElementById('threecargo_chart'));
  const financing_chart = echarts.init(document.getElementById('financing_chart'));
  //股東持股人數
  const holder_chart = echarts.init(document.getElementById('holder_chart'));
  window.addEventListener('resize', function() {
    line_chart.resize();
    threecargo_chart.resize();
    holder_chart.resize();
    financing_chart.resize();
  });
  let color = {
    up: '#c40f0fd3',
    down: '#058296',
    vol: '#6f9196',
    ma5: '#dea805',
    ma10: '#46A3FF',
    ma20: '#ca0199',
    //ma60: '#D94600'
  };
  const line_chart_option = {
    animation: true,
    title: {
      text: `${pageJson['stockname']?pageJson['stockname']:''} 日K線`,
    },
    legend: {
      top: 3,
      //left: 'center',
      right: '2%',
      data: ['MA5', 'MA10', 'MA20']
    },
    grid: [{
      left: '39rem',
      right: '2%',
      height: '55%'
    }, {
      left: '39rem',
      right: '2%',
      bottom: '12%',
      height: '10%'
    }],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      triggerOn: 'mousemove',
      backgroundColor: 'rgba(245, 245, 245, 0.7)',
      borderWidth: 1,
      borderColor: '#ccc',
      padding: 10,
      textStyle: {
        color: '#777',
      },
      extraCssText: 'width: 170px',
      position: function(pos, params, el, elRect, size) {
        var obj = {
          top: 10
        };
        obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
        return obj;
      },
    },
    axisPointer: {
      link: {
        xAxisIndex: 'all'
      },
      label: {
        backgroundColor: '#888'
      }
    },
    xAxis: [{
      scale: true,
      type: 'category',
      data: pageJson['stock_date']

    }, {
      scale: true,
      type: 'category',
      gridIndex: 1,
      data: pageJson['stock_date'],
      axisLabel: {
        show: false
      },
    }],
    yAxis: [{
      scale: true,
      axisLine: {
        show: true //邊線
      },
      splitArea: {
        show: true
      }
    }, {
      scale: true,
      gridIndex: 1,
      splitNumber: 2,
      axisLabel: {
        show: true
      },
      axisLine: {
        show: true
      },
    }],
    dataZoom: [
      {
        type: 'slider',
        // handleIcon: 'M10.7,11.9H9.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
        xAxisIndex: [0, 1],//控制第一二窗口
        start: 98,//0-100 左從哪邊開始
        end: 100,//結束
        showDetail: false,//顯示日期
        // zoomLock: true,//不能縮放,只能平移
        brushSelect: false,//關閉內選 刷選
      }
    ],
    series: [{
      name: '日K線',
      type: 'candlestick',
      itemStyle: {
        normal: {
          color: color.up,
          color0: color.down,
          borderColor: color.up,
          borderColor0: color.down
        }
      },
      data: pageJson['stock_price']
    }, {
      name: 'MA5',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: pageJson['stock_ma5'],
      itemStyle: {
        color: color.ma5
      },
      lineStyle: {
        opacity: 0.5,
      },
    }, {
      name: 'MA10',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: pageJson['stock_ma10'],
      itemStyle: {
        color: color.ma10
      },
      lineStyle: {
        opacity: 0.5,
      },
    }, {
      name: 'MA20',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: pageJson['stock_ma20'],
      itemStyle: {
        color: color.ma20
      },
      lineStyle: {
        opacity: 0.5,
      },
    }, {
      name: '成交量',
      type: 'bar',
      itemStyle: {
        color: color.vol
      },
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: pageJson['stock_vol']
    }]
  };
  // const stockYieldPrice_chart_option = {
  //   title: {
  //     show: false //標題
  //   },
  //   grid: {
  //     left: 50, //畫面編距
  //     right: 80,
  //     top: 30,
  //     bottom: 50
  //   },
  //   tooltip: {
  //     trigger: 'axis',
  //     axisPointer: { type: 'cross' }
  //   },
  //   legend: {
  //     show: false //圖例
  //   },
  //   xAxis: [
  //     {
  //       type: 'category',
  //       axisTick: {
  //         // alignWithLabel: true,
  //         show: false,//刻度
  //       },
  //       // axisLine: {
  //       //   show: false,//線
  //       // },
  //       data: pageJson['threecargo_date']
  //     }
  //   ],
  //   yAxis: [
  //     // {
  //     //   type: 'value',
  //     //   position: 'right',
  //     //   // scale: true, //顯示最大
  //     // },
  //     {
  //       type: 'value',
  //       position: 'left',
  //       min: function(value) {
  //         return Math.floor(value.min>pageJson['cheapPrice']?pageJson['cheapPrice']:value.min)
  //       },
  //       max: function(value) {
  //         return Math.ceil(value.max>pageJson['cheapPrice']?value.max:pageJson['cheapPrice'])
  //       },
  //       // scale: true, //顯示最大
  //       // splitLine: {
  //       //   show: false, //分線關閉
  //       // },
  //     }
  //   ],
  //   series: [
  //     {
  //       type:"line",
  //       // yAxisIndex: 0,
  //       markLine:{   //警戒線
  //         data:[ 
  //           {
  //             yAxis: Number(pageJson['expensivePrice']),
  //             // yAxis: 48.76,
  //             lineStyle:{color:'#F95F53'},
  //             label:{
  //               // show: false,
  //               color:'#F95F53',
  //               fontSize:10,
  //             }
  //           },
  //           {
  //             yAxis: Number(pageJson['fairPrice']),
  //             // yAxis: 46,
  //             lineStyle:{color:'#F95F53'},
  //             label:{
  //               // show: false,
  //               color:'#F95F53',
  //               fontSize:10,
  //             }
  //           },
  //           {
  //             yAxis: Number(pageJson['cheapPrice']),
  //             // yAxis: 45,
  //             lineStyle:{color:'#F95F53'},
  //             // lineStyle:{color:'#E28909'},
  //             label:{
  //               // show: false,
  //               // color:'#E28909',
  //               color:'#F95F53',
  //               fontSize:10,
  //             }
  //           },
  //         ],
  //         silent: true, //鼠標移入線變粗
  //         symbol:false,
  //         //警戒線 颜色，宽度，類型
  //         lineStyle:{ 
  //           color:'red',
  //           type:'dashed',//虚線
  //           width: 1
  //         },
  //       }
  //     },
  //     {
  //       name: pageJson['stockno'],
  //       type: 'line',
  //       smooth: true,
  //       // yAxisIndex: 0,
  //       data: pageJson['threecargo_market'],
  //       lineStyle: {
  //         color: '#058296', //線颜色
  //         width: 3,      //線寬
  //       },
  //       itemStyle: {
  //         opacity: 0, //點
  //       }
  //     }
  //   ]
  // };
  const threecargo_chart_option = {
    title: {
      show: false //標題
    },
    grid: {
      left: 50, //畫面編距
      right: 80,
      top: 30,
      bottom: 50
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      show: false //圖例
    },
    xAxis: [
      {
        type: 'category',
        axisTick: {
          // alignWithLabel: true,
          show: false,//刻度
        },
        // axisLine: {
        //   show: false,//線
        // },
        data: pageJson['threecargo_date']
      }
    ],
    yAxis: [
      {
        type: 'value',
        position: 'right',
        scale: true, //顯示最大
      },
      {
        type: 'value',
        position: 'left',
        scale: true, //顯示最大
        splitLine: {
          show: false, //分線關閉
        },
      }
    ],
    series: [
      {
        name: '合計累加',
        type: 'bar',
        yAxisIndex: 0,
        data: pageJson['threecargo_data'],
        itemStyle: {
          color: '#a3b3b5', // 柱子颜色
        }
      },
      {
        name: pageJson['stockno'],
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: pageJson['threecargo_market'],
        lineStyle: {
          color: '#058296', //線颜色
          width: 3,      //線寬
        },
        itemStyle: {
          opacity: 0, //點
        }
      }
    ]
  };
  const financing_chart_option = {
    title: {
      show: false //標題
    },
    grid: {
      left: 50, //畫面編距
      right: 80,
      top: 30,
      bottom: 50
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      show: false //圖例
    },
    xAxis: [
      {
        type: 'category',
        axisTick: {
          alignWithLabel: true,
          show: false,//刻度
        },
        // axisLine: {
        //   show: false,//線
        // },
        data: pageJson['financing_date']
      }
    ],
    yAxis: [
      {
        type: 'value',
        position: 'right',
        scale: true, //顯示最大
      },
      {
        type: 'value',
        position: 'left',
        scale: true, //顯示最大
        splitLine: {
          show: false, //分線關閉
        },
      }
    ],
    series: [
      {
        name: '融資餘額',
        type: 'bar',
        yAxisIndex: 0,
        data: pageJson['financing_data'],
        itemStyle: {
          color: '#a3b3b5', // 柱子颜色
        }
      },
      {
        name: pageJson['stockno'],
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: pageJson['financing_market'],
        lineStyle: {
          color: '#058296', //線颜色
          width: 3,      //線寬
        },
        itemStyle: {
          opacity: 0, //點
        }
      }
    ]
  };
  const holder_chart_option = {
    title: {
      show: false //標題
    },
    grid: {
      left: 50, //畫面編距
      right: 80,
      top: 30,
      bottom: 50
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      show: false //圖例
    },
    xAxis: [
      {
        type: 'category',
        axisTick: {
          alignWithLabel: true,
          show: false,//刻度
        },
        // axisLine: {
        //   show: false,//線
        // },
        data: pageJson['holder_date']
      }
    ],
    yAxis: [
      {
        type: 'value',
        position: 'right',
        scale: true, //顯示最大
      },
      {
        type: 'value',
        position: 'left',
        scale: true, //顯示最大
        splitLine: {
          show: false, //分線關閉
        },
      }
    ],
    series: [
      {
        name: '400張以上累加',
        type: 'bar',
        yAxisIndex: 0,
        data: pageJson['holder_data'],
        itemStyle: {
          color: '#a3b3b5', // 柱子颜色
        }
      },
      {
        name: pageJson['stockno'],
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: pageJson['holder_market'],
        lineStyle: {
          color: '#058296', //線颜色
          width: 3,      //線寬
        },
        itemStyle: {
          opacity: 0, //點
        }
      }
    ]
  };
  // stockYieldPrice_chart.setOption(stockYieldPrice_chart_option);
  line_chart.setOption(line_chart_option);
  threecargo_chart.setOption(threecargo_chart_option);
  holder_chart.setOption(holder_chart_option);
  financing_chart.setOption(financing_chart_option);
}