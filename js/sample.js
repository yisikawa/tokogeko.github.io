/**
 *  サンプルプログラム　by densotechno
 */
var map_101; // 背景Map
var gpx_101; // 経路
var rod_101; // 通学路
var token_tex = undefined;
// var url_nam = 'http://localhost:10080';
var url_nam = 'https://tokogeko.net';
// 本日の設定
function getToday() {
  var today = new Date();
  today.setDate(today.getDate());
  var yyyy = today.getFullYear();
  var mm = ("0" + (today.getMonth() + 1)).slice(-2);
  var dd = ("0" + today.getDate()).slice(-2);
  document.getElementById("school_date").value = yyyy + '-' + mm + '-' + dd;
}

function _id(id) { return document.getElementById(id); }

// Login & get user
function loginUser(obj) {
  var userName = _id("userid");
  var passWord = _id("password");

  //Token取得
  token_tex = undefined;
  $.ajax({
    url: url_nam + '/api/login',
    type: 'POST',
    data: { userid: userName.value, password: passWord.value },
    async: false,
    success: function (data, textStatus, request) {
      token_tex = request.getResponseHeader("Authorization");
    },
    error: function (request, textStatus, errorThrown) {
      alert("Can't login " + userName.value);
    }
  });
  if( token_tex==undefined ) return;
  // Ajax set token
  $.ajaxSetup({
    beforeSend: function (xhr, settings) {
      xhr.setRequestHeader('Authorization', token_tex);
    }
  });
  // ユーザー取得  
  var userSelect = document.getElementById("btxID");
  while (userSelect.firstChild) {
    userSelect.removeChild(userSelect.firstChild);
  }
  
  $.ajax({
    type: 'GET',
    url: url_nam + '/api/auth',
    dataType: 'json',
    success: function (data) {
      data.forEach(function (value) {
        var option = document.createElement('option');
        option.value = value.btx_id;
        option.text = value.user_id;
        userSelect.appendChild(option);
      });
    },
    error: function (data) {
      alert('error occured! cuser');
    }
  });
}
// HTML BODY 初期化
function init() {

  map_101 = L.map('map_kariya').setView([35.000081, 137.004055], 15);
  L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
    attribution: "<<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
  }).addTo(map_101);
  // 本日の設定
  getToday();
}

// ﾕｰｻﾞｰ、日付、登下校の変更時に呼ばれて、あれば経路を表示する
function paraChange() {
  var userSelect = _id("btxID");
  var dateSelect = _id("school_date");
  var gekoSelect = document.getElementsByName("AMPM");
  var userIdx = userSelect.selectedIndex;
  var userVal = userSelect.options[userIdx].value;
  var userTex = userSelect.options[userIdx].text;
  var tempTex = dateSelect.value;
  var dateTex = tempTex.substr(0, 4) + tempTex.substr(5, 2) + tempTex.substr(8, 2);
  var gekoTex = "";
  _id('s_date').textContent = "";
  _id('s_time').textContent = "";
  _id('e_time').textContent = "";
  _id('dist').textContent = "";
  for (var val of gekoSelect) {
    if (val.checked) {
      gekoTex = val.value;
      break;
    }
  }
  //  console.log('/api/route?userid='+userTex+'&date='+dateTex+'&type='+gekoTex)
  if (gpx_101 != null) {
    map_101.removeLayer(gpx_101);
  }
  if (userVal.length > 0) {
    $.ajax({
      type: 'GET',
      url: url_nam + '/api/route?userid=' + userTex + '&date=' + dateTex + '&type=' + gekoTex,
      dataType: 'text',
      success: function (data) {
        gpx_101 = new L.GPX(data,
          {
            async: true,
            marker_options: {
              startIconUrl: 'img/pin-icon-start.png',
              endIconUrl: 'img/pin-icon-end.png',
              shadowUrl: 'img/pin-shadow.png'
            }
          }).on('loaded', function (e) {
            var lines
            var gps = e.target;
            map_101.fitBounds(gps.getBounds());
//            _id('s_date').textContent = gps.get_start_time().toLocaleDateString();
            _id('s_time').textContent = "開始:" + gps.get_start_time().toLocaleTimeString();
            _id('e_time').textContent = "終了:" + gps.get_end_time().toLocaleTimeString();
            _id('dist').textContent = "距離：" + gps.get_distance().toFixed(0) + "m";
          }).addTo(map_101);
      },
      error: function (data) {
        alert('error occured!02');
      }
    });
  }
}
// ﾕｰｻﾞｰ切り替え時に通学路を表示する
function userChange(obj) {
  var userIdx = obj.selectedIndex;
  var userVal = obj.options[userIdx].value;
  var userTex = obj.options[userIdx].text;
  //  console.log('/api/schoolroute?userid='+userTex);
  if (rod_101 != null) {
    map_101.removeLayer(rod_101);
  }
  if (userVal.length > 0) {
    $.ajax({
      type: 'GET',
      url: url_nam + '/api/schoolroute?userid=' + userTex,
      dataType: 'json',
      success: function (data) {
        rod_101 = L.geoJson(data, {
          onEachFeature: function (feature, layer) {
            if (layer instanceof L.Polyline) {
              layer.setStyle({
                'color': "red",
                'weight': 7
              });
            }
          }
        }).addTo(map_101);
      },
      error: function (data) {
        alert('error occured!03');
      }
    });
  }
  paraChange();
}
