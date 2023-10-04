window.onload=async function(){
  // console.log(pageJson)
  if(!pageJson){
    alert('找不到資料')
    window.location = './';
    return false;
  }
  //大盤
  const weighted_chart = echarts.init(document.getElementById('weighted_chart'));
  //三大買賣
  const threecargo_chart = echarts.init(document.getElementById('threecargo_chart'));
  //期貨買賣
  const threefutures_chart = echarts.init(document.getElementById('threefutures_chart'));
  //上下跌家數
  const updownnumber_chart = echarts.init(document.getElementById('updownnumber_chart'));
  //景氣
  const prosperity_chart = echarts.init(document.getElementById('prosperity_chart'));
  //美元
  const dollars_chart = echarts.init(document.getElementById('dollars_chart'));
  //恐慌指數
  const vix_chart = echarts.init(document.getElementById('vix_chart'));
  //貪婪指數
  const greedy_chart = echarts.init(document.getElementById('greedy_chart'));
  window.addEventListener('resize', function() {
    prosperity_chart.resize();
    threecargo_chart.resize();
    threefutures_chart.resize();
    updownnumber_chart.resize();
    dollars_chart.resize();
    weighted_chart.resize();
    vix_chart.resize();
    greedy_chart.resize();
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
  const weighted_chart_option = {
    animation: true,
    title: {
      text: '加權指數',
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
      data: pageJson['twii_date']

    }, {
      scale: true,
      type: 'category',
      gridIndex: 1,
      data: pageJson['twii_date'],
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
        start: 95,//0-100 左從哪邊開始
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
      data: pageJson['twii_price']
    }, {
      name: 'MA5',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: pageJson['wii_ma5'],
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
      data: pageJson['wii_ma10'],
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
      data: pageJson['wii_ma20'],
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
      data: pageJson['twii_vol']
    }]
  };
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
          alignWithLabel: true,
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
        name: '融資',
        type: 'line',
        yAxisIndex: 0,
        data: pageJson['threecargo_data_financing'],
        lineStyle: {
          color: '#56934f', 
          width: 3,      //線寬
        },
        itemStyle: {
          opacity: 0, //點隱蔽
        }
      },
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
        name: '大盤指數',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: pageJson['threecargo_market'],
        lineStyle: {
          color: '#058296', // 线条颜色
          width: 3,      //線寬
        },
        itemStyle: {
          opacity: 0, //點隱蔽
        }
      }
    ]
  };
  const threefutures_chart_option = {
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
        data: pageJson['threefutures_date']
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
        name: '合計',
        type: 'bar',
        yAxisIndex: 0,
        data: pageJson['threefutures_data'],
        itemStyle: {
          color: '#a3b3b5', // 柱子颜色
        }
      },
      {
        name: '大盤指數',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: pageJson['threefutures_market'],
        lineStyle: {
          color: '#058296', // 线条颜色
          width: 3,      //線寬
        },
        itemStyle: {
          opacity: 0, //點隱蔽
        }
      }
    ]
  };
  const updownnumber_chart_option = {
    title: {
      show: false //標題
    },
    grid: {
      left: 50, //畫面編距
      right: 50,
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
        data: pageJson['updownnumber_date']
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
        name: '合計家數',
        type: 'bar',
        yAxisIndex: 0,
        data: pageJson['updownnumber_data'],
        itemStyle: {
          color: '#a3b3b5', // 柱子颜色
        }
      },
      {
        name: '大盤指數',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: pageJson['updownnumber_market'],
        lineStyle: {
          color: '#058296', // 线条颜色
          width: 3,      //線寬
        },
        itemStyle: {
          opacity: 0, //點隱蔽
        }
      }
    ]
  };
  const prosperity_chart_option = {
    title: {
      show: false //標題
    },
    grid: {
      left: 50, //畫面編距
      right: 30,
      top: 30,
      bottom: 20
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
        data: pageJson['prosperity_date']
      }
    ],
    yAxis: [
      {
        type: 'value',
        // name: '景氣燈號',
        min: 3,
        position: 'right',
        scale: true, //顯示最大
      },
      {
        type: 'value',
        scale: true, //顯示最大
        position: 'left',
        splitLine: {
          show: false, //分線關閉
        },
      }
    ],
    series: [
      {
        type:"line",
        markLine:{   //警戒線
          data:[ 
            {
              yAxis: 36,
              lineStyle:{color:'#F95F53'},
              label:{
                // show: false,
                color:'#F95F53',
                fontSize:10,
              }
            },
            {
              yAxis: 16,
              lineStyle:{color:'#F95F53'},
              // lineStyle:{color:'#E28909'},
              label:{
                // show: false,
                // color:'#E28909',
                color:'#F95F53',
                fontSize:10,
              }
            },
          ],
          silent: true, //鼠標移入線變粗
          symbol:false,
          //警戒線 颜色，宽度，類型
          lineStyle:{ 
            color:'red',
            type:'dashed',//虚線
            width: 1
          },
        }
      },
      {
        name: '景氣燈號',
        type: 'bar',
        yAxisIndex: 0,
        data: pageJson['prosperity_data'],
        itemStyle: {
          color: '#a3b3b5', // 柱子颜色
        }
      },
      {
        name: '大盤指數',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: pageJson['prosperity_market'],
        lineStyle: {
          color: '#058296', // 线条颜色
          width: 3,      //線寬
        },
        itemStyle: {
          opacity: 0, //點隱蔽
        }
      }
    ]
  };
  const dollars_chart_option = {
    title: {
      show: false //標題
    },
    grid: {
      left: 50, //畫面編距
      right: 30,
      top: 30,
      bottom: 20
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
        data: pageJson['dollars_date']
      }
    ],
    yAxis: [
      {
        type: 'value',
        // name: '美金',
        min: 26,
        position: 'right',
        scale: true, //顯示最大
      },
      {
        type: 'value',
        // name: '大盤指數',
        scale: true, //顯示最大
        position: 'left',
        splitLine: {
          show: false, //分線關閉
        },
      }
    ],
    series: [
      {
        name: '美金',
        type: 'bar',
        yAxisIndex: 0,
        data: pageJson['dollars_data'],
        itemStyle: {
          color: '#a3b3b5', // 柱子颜色
          // borderColor: 'green', // 柱子边框颜色
          // borderWidth: 2, // 柱子边框宽度
          // barBorderRadius: 5, // 柱子边框圆角
          // shadowBlur: 10, // 阴影模糊度
          // shadowColor: 'rgba(0, 0, 0, 0.5)' // 阴影颜色
        }
      },
      {
        name: '大盤指數',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: pageJson['dollars_market'],
        lineStyle: {
          color: '#058296', // 线条颜色
          width: 3,      //線寬
        },
        itemStyle: {
          opacity: 0, //點隱蔽
        }
      }
    ]
  };
  const vix_chart_option = {
    title: {
      show: false //標題
    },
    grid: {
      left: 50, //畫面編距
      right: 30,
      top: 30,
      bottom: 20
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
        data: pageJson['vix_date']
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
        scale: true, //顯示最大
        position: 'left',
        splitLine: {
          show: false, //分線關閉
        },
      }
    ],
    series: [
      {
        name: '恐慌指數',
        type: 'bar',
        yAxisIndex: 0,
        data: pageJson['vix_data'],
        itemStyle: {
          color: '#a3b3b5', // 柱子颜色
          // borderColor: 'green', // 柱子边框颜色
          // borderWidth: 2, // 柱子边框宽度
          // barBorderRadius: 5, // 柱子边框圆角
          // shadowBlur: 10, // 阴影模糊度
          // shadowColor: 'rgba(0, 0, 0, 0.5)' // 阴影颜色
        }
      },
      {
        name: '大盤指數',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: pageJson['vix_market'],
        lineStyle: {
          color: '#058296', // 线条颜色
          width: 3,      //線寬
        },
        itemStyle: {
          opacity: 0, //點隱蔽
        }
      }
    ]
  };
  const greedy_chart_option = {
    title: {
      show: false //標題
    },
    grid: {
      left: 50, //畫面編距
      right: 30,
      top: 30,
      bottom: 20
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
        data: pageJson['greedy_date']
      }
    ],
    yAxis: [
      {
        type: 'value',
        scale: true, //顯示最大
        position: 'right',
      },
      {
        type: 'value',
        scale: true, //顯示最大
        position: 'left',
        splitLine: {
          show: false, //分線關閉
        },
      }
    ],
    series: [
      {
        name: '貪婪指數',
        type: 'bar',
        yAxisIndex: 0,
        data: pageJson['greedy_data'],
        itemStyle: {
          color: '#a3b3b5', // 柱子颜色
          // borderColor: 'green', // 柱子边框颜色
          // borderWidth: 2, // 柱子边框宽度
          // barBorderRadius: 5, // 柱子边框圆角
          // shadowBlur: 10, // 阴影模糊度
          // shadowColor: 'rgba(0, 0, 0, 0.5)' // 阴影颜色
        }
      },
      {
        name: '大盤指數',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: pageJson['greedy_market'],
        lineStyle: {
          color: '#058296', // 线条颜色
          width: 3,      //線寬
        },
        itemStyle: {
          opacity: 0, //點隱蔽
        }
      },
      {
        type:"line",
        markLine:{   //警戒線
          data:[ 
            {
              yAxis: 75,
              lineStyle:{color:'#F95F53'},
              label:{
                // show: false,
                color:'#F95F53',
                fontSize:10,
                // formatter:(e)=>{returne.value}   //警戒線值 
              }
            },
            {
              yAxis: 25,
              lineStyle:{color:'#F95F53'},
              // lineStyle:{color:'#E28909'},
              label:{
                // show: false,
                // color:'#E28909',
                color:'#F95F53',
                fontSize:10,
              }
            },
          ],
          silent: true, //鼠標移入線變粗
          symbol:false,
          //警戒線 颜色，宽度，類型
          lineStyle:{ 
            color:'red',
            type:'dashed',//虚線
            width: 1
          },
        }
      },
    ],
  };
  // 使用刚指定的配置项和数据显示图表。
  weighted_chart.setOption(weighted_chart_option);
  threecargo_chart.setOption(threecargo_chart_option);
  threefutures_chart.setOption(threefutures_chart_option);
  updownnumber_chart.setOption(updownnumber_chart_option);
  prosperity_chart.setOption(prosperity_chart_option);
  dollars_chart.setOption(dollars_chart_option);
  vix_chart.setOption(vix_chart_option);
  greedy_chart.setOption(greedy_chart_option);

}