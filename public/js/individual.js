window.onload=async function(){
  console.log(pageJson )
  if(!pageJson){
    alert('找不到資料')
    window.location = './';
    return false;
  }
  const line_chart = echarts.init(document.getElementById('line_chart'));
  //三大法人和融資融劵
  const threecargo_chart = echarts.init(document.getElementById('threecargo_chart'));
  const financing_chart = echarts.init(document.getElementById('financing_chart'));
  //股東持股分級週統計圖
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
      type: 'inside',
      xAxisIndex: [0, 1],
      start: 0,
      end: 100
    },
    {
      type: 'slider',
      handleIcon: 'M10.7,11.9H9.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
      xAxisIndex: [0, 1],
      start: 0,
      end: 100
    }],
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
  const threecargo_chart_option = {
    title: {
      show: false // 隐藏标题
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
      show: false // 隐藏图例
    },
    xAxis: [
      {
        type: 'category',
        axisTick: {
          alignWithLabel: true
        },
        data: pageJson['threecargo_date']
      }
    ],
    yAxis: [
      {
        type: 'value',
        position: 'right',
      },
      {
        type: 'value',
        position: 'left',
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
          color: '#058296', // 线条颜色
          width: 3,      // 线条宽度
        },
        itemStyle: {
          opacity: 0, //點隱蔽
        }
      }
    ]
  };
  const financing_chart_option = {
    title: {
      show: false // 隐藏标题
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
      show: false // 隐藏图例
    },
    xAxis: [
      {
        type: 'category',
        axisTick: {
          alignWithLabel: true
        },
        data: pageJson['financing_date']
      }
    ],
    yAxis: [
      {
        type: 'value',
        position: 'right',
      },
      {
        type: 'value',
        position: 'left',
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
          color: '#058296', // 线条颜色
          width: 3,      // 线条宽度
        },
        itemStyle: {
          opacity: 0, //點隱蔽
        }
      }
    ]
  };
  const holder_chart_option = {
    title: {
      show: false // 隐藏标题
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
      show: false // 隐藏图例
    },
    xAxis: [
      {
        type: 'category',
        axisTick: {
          alignWithLabel: true
        },
        data: pageJson['holder_date']
      }
    ],
    yAxis: [
      {
        type: 'value',
        position: 'right',
      },
      // {
      //   type: 'value',
      //   position: 'left',
      //   splitLine: {
      //     show: false, //分線關閉
      //   },
      // }
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
      // {
      //   name: pageJson['stockno'],
      //   type: 'line',
      //   smooth: true,
      //   yAxisIndex: 1,
      //   data: pageJson['holder_market'],
      //   lineStyle: {
      //     color: '#058296', // 线条颜色
      //     width: 3,      // 线条宽度
      //   },
      //   itemStyle: {
      //     opacity: 0, //點隱蔽
      //   }
      // }
    ]
  };
  line_chart.setOption(line_chart_option);
  threecargo_chart.setOption(threecargo_chart_option);
  holder_chart.setOption(holder_chart_option);
  financing_chart.setOption(financing_chart_option);
}