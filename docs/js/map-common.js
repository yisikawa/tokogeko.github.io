var today;                  // 本日日付
var map;                    // マップレイヤー
var schoolRouteLayer;       // 通学路レイヤー
var timeDimensionControl;   // 経路表示コントローラー
var routeLayer;             // 経路レイヤー
var pulseMaker;             // 現在地マーカー
var memoMarker;             // 地図メモ用マーカー
var zoomLevel;              // ズームレベル
var markerLayer;            // 地図メモレイヤー
// var urlName = 'http://localhost:10080';
var urlName = 'https://tokogeko.net';

var t_std = new L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
    attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
});
var t_pale = new L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
    attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
});
var t_ort = new L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg', {
    attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>"
});
//var o_std = new L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
var o_std = new L.tileLayer('https://j.tile.openstreetmap.jp/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
});
var Map_b = {
    "地理院地図 標準": t_std,
    "地理院地図 淡色": t_pale,
    "地理院地図 オルソ": t_ort,
    "OpenStreetMap 標準": o_std
};

/*
 * アイコン情報
 */
var icon = {
    img: ['img/geko_tamago.png', 'img/geko_otama1_gentle.gif',
        'img/geko_otama2_gentle.gif', 'img/geko_otama3_gentle.gif', 'img/geko_otama4_gentle.gif',
        'img/geko_15ya.gif', 'img/geko_15ya.gif', 'img/usagi_15ya.gif'],
    width: [382, 400, 554, 621, 592, 543, 543, 793],
    height: [327, 316, 376, 394, 557, 470, 470, 549],

    /*
     * 経路表示、評価表示用のアイコンオブジェクトを取得する
     * @return  {Object}                アイコンオブジェクト(imgのパス,width,height)
     */
    get: function() {
        var idx = 0;
        if (rating.data != null) {
            var match = rating.data.filter(function(item, index) {
                if (index != 0 && item.rating > 0) return true;
            });
            idx = match.length;
            if (idx === 5) {
                if (rating.data[0].rating === 25) {
                    idx = 7;
                } else if (rating.data[0].rating > 20) {
                    idx = 6;
                }
            }
        }
        return [icon.img[idx], icon.width[idx], icon.height[idx]];
    }
};
/*
 * 児童情報
 */
var child = {
    data: null,
    /*
     * ユーザ情報を取得する
     */
    get: function() {
        var defer = $.Deferred();
        $.ajax({
            type: 'GET',
            url: urlName+'/api/auth',
            contentType:'application/json',
            dataType: 'json'
        }).then(
            function(json) {
                if (json.length > 0) {
                    child.data = json;
                    child.set();
                } else {
                    message("登下校を確認できるお子様が設定されていません。");
                }
                defer.resolve();
            },
            function() {
                // ERROR
                defer.reject();
                message("インターネットにつながっている確認してください。");
            }
        );
        return defer.promise();
    },
    /*
     * メニューの児童選択リストにユーザ情報を設定する
     */
    set: function() {
        // 参照可能な児童情報を設定
        child.data.forEach(function(data) {
            $("#child-list fieldset div.ui-controlgroup-controls").append(
                    "<input type='radio' id='child-" + data.user_id + "' name='child-list' value='" + data.user_id +"'/>" +
                    "<label for='child-" + data.user_id + "'>" + data.note + "</label>");
        });
        $("#child-list input[type='radio']:first").attr('checked', true);
        $("#child-list input[type='radio'][name='child-list']").checkboxradio();
        
        // 対象児童が1名の場合、リストを非表示とする
        if (child.data.length <= 1) {
            $("#child-list").hide();
        }
    }
    
};
/*
 * 通学路情報
 */
var schoolroute = {
    data: null,
    /*
     * 通学路情報を取得し、地図上に赤線で表示する
     * @param   {user}      ユーザID
     */
    get: function(user) {
        $.getJSON(urlName+'/api/schoolroute?userid=' + user, function(json) {
            schoolroute.data =  json;
            schoolroute.set(user);
        });
    },
    /*
     * 通学路情報をmap layerに設定する
     * @param   {user}      ユーザID
     */
    set: function(user) {
        // 表示済みの通学路を削除
        if (schoolRouteLayer != undefined) {
            map.removeLayer(schoolRouteLayer);
        }
        // 通学路をmap layerに設定する
        schoolRouteLayer = L.geoJson(schoolroute.data, {
            onEachFeature: function (feature, layer) {
                if (layer instanceof L.Polyline) {
                    layer.setStyle({
                       'color': "red",
                       'weight': 7
                    });
                }
            }
        }).addTo(map);
    }
};
/*
 * 経路情報
 */
var route = {
    data: null,
    /*
     * 経路情報を取得する
     * @param   {user}      ユーザID
     * @param   {date}      選択日
     * @param   {togeko}    登下校種別
     */
    get: function(user, date, togeko) {
        $.ajax({
            type: 'GET',
            url: urlName+'/api/route?userid=' + user + '&date=' + date.replace(/\//g, "") + '&type=' + togeko,
            dataType: 'xml'
        }).then(
            function(json) {
                route.data = json;
                route.set(date, togeko);
            },
            function() {
                message("インターネットにつながっている確認してください。");
            }
        );
    },
    /*
     * 経路情報を地図上に青線でアニメーション表示する
     * アイコンは評価結果に応じて切り替える
     * @param   {date}      選択日
     * @param   {togeko}    登下校種別
     */
    set: function(date, togeko) {
        // 表示済みの経路を削除する
        if (timeDimensionControl != undefined) {
            map.removeControl(timeDimensionControl);
            map.removeLayer(routeLayer);
        }
        
        // 1秒間隔での描画
        var timeDimension = new L.TimeDimension({
            period: "PT1S",
        });
        map.timeDimension = timeDimension; 
        
        var player = new L.TimeDimension.Player({
            transitionTime: 10, 
            loop: false,
            startOver: true
        }, timeDimension);
        
        // timecontroller設定
        timeDimensionControl = new L.Control.TimeDimension({
            timeDimension: timeDimension,
            position:      'bottomleft',
            backwardButton: false,
            forwardButton:  false,
            displayDate:    true,
            timeSliderDragUpdate: true,
            autoPlay:      true,
            minSpeed:      1,
            maxSpeed:      60,
            speedStep:     1,
            player:        player,
            timeZones:     ["Local"]
        });
        map.addControl(timeDimensionControl);
        
        // 評価に応じたアイコン取得
        var routeIcon = L.icon({
            iconUrl: icon.get()[0],
            iconSize: [50, 50 * icon.get()[2] / icon.get()[1]],
            iconAnchor: [25, 25]
        });
        
        // 経路およびアイコンの挙動を設定
        var gpxLayer = L.geoJson(null, {
            pointToLayer: function (feature, latLng) {
                if (feature.properties.hasOwnProperty('last')) {
                    // TODO ここにセンサー情報により細かい挙動を定義できるかも
                    return new L.Marker(latLng, {
                        icon: routeIcon
                    });
                }
                return L.circleMarker(latLng);
            },
            style: (function(feature) {
                return {
                    "weight": 7,
                    "opacity": 0.7
                    };
            })
        });
        
        // 取得した経路情報をレイヤーに設定
        if ($(route.data).find("trkpt").length > 1) {
            var error;
            function avoidReady() {
                error = true;
            }
            gpxLayer.on('error', avoidReady);
            gpxLayer = omnivore.gpx.parse(route.data, null, gpxLayer);
            gpxLayer.off('error', avoidReady);
            if (!error) {
                gpxLayer.fire('ready');
            }
        }
        
        // 経路レイア―設定
        routeLayer = L.timeDimension.layer.geoJson(gpxLayer, {
            updateTimeDimension: true,
            addlastPoint: true,
            waitForReady: true
        })
        .addTo(map);
    }
};
/*
 * 評価
 */
var rating = {
    data: null,
    /*
     * 評価情報の初期化
     */
    init: function() {
        $("#rating div.rating").rateYo({starWidth: "45px", readOnly: true, rating: 0});
        $("#rating-list li:eq(0) div").rateYo({starWidth:"25px", readOnly: true, rating: 0});
        $("#rating-list li:eq(1) div").rateYo({starWidth:"25px", readOnly: true, rating: 0});
        $("#rating-list li:eq(2) div").rateYo({starWidth:"25px", readOnly: true, rating: 0});
        $("#rating-list li:eq(3) div").rateYo({starWidth:"25px", readOnly: true, rating: 0});
        $("#rating-list li:eq(4) div").rateYo({starWidth:"25px", readOnly: true, rating: 0});
    },
    /*
     * 選択日を含む1週間分の評価情報取得
     * @param   {user}      ユーザID
     * @param   {date}      選択日
     */
    get: function(user, date) {
        var defer = $.Deferred();
        $.ajax({
            type: 'GET',
            url: urlName+'/api/rating?userid=' + user + '&date=' + date.replace(/\//g, ""),
            contentType:'application/json',
            dataType: 'json'
        })
        .then(function(json) {
            rating.data = json;
            // 選択日が評価済みの場合、ボタン色を変更する(土日は除く)
            var match = rating.data.filter(function(item, index) {
                if (item.ratingDate === date) return true;
            });
            if (match.length != 0 && match[0].rating > 0) {
                $(".easy-button-button .fa-star").css('color', '#F49B12');
            } else {
                $(".easy-button-button .fa-star").css('color', '');
            }
            rating.set(date);
            defer.resolve();
        },
        function() {
            defer.reject();
            // ERROR
        }
        );
        return defer.promise();
    },
    /*
     * 評価結果を設定する
     * @param   {date}      選択日
     */
    set: function(date) {
        // アイコン設定
        $("#rating img").attr('src', icon.get()[0]);
        // 本日の評価を更新
        var match = rating.data.filter(function(item, index) {
            if (item.ratingDate === date) return true;
        });
        var ratingValue = 0;
        if (match.length != 0 && match[0].rating > 0) {
            ratingValue = match[0].rating
        }
        $("#rating div.rating").rateYo("rating", ratingValue);
        // 今週の評価を更新
        for (var i in rating.data) {
            if (i != "0") {
                $("#rating-list li:eq(" + (i - 1) + ") label").text(datetostr(rating.data[i].ratingDate));
                $("#rating-list li:eq(" + (i - 1) + ") > div.rating").rateYo("rating", rating.data[i].rating);
                if (rating.data[i].ratingDate === $("#select-date").val()) {
                    $("#rating-list li:eq(" + (i - 1) + ") > div").addClass("select-date");
                } else {
                    $("#rating-list li:eq(" + (i - 1) + ") > div").removeClass("select-date");
                }
            }
        }
    },
    /*
     * 評価結果を更新する
     */
    update: function() {
        // 評価結果を更新する ユーザID,日付,評価値をJSONで送信する
        var upddata = rating.data.filter(function(item, index){
            if (item.updflg === 1) return true;
        })
        if (upddata.length > 0) {
            $.ajax({
                type: 'PUT',
                url: urlName+'/api/rating',
                data: JSON.stringify(upddata),
                contentType:'application/json',
                dataType: 'text'
            }).then(
                function(result) {
                    // 成功した場合
                    return result;
                },
                function() {
                    // ERROR
                    return "error";
                }
            );
        }
    }
};
/*
 * 地図メモ
 */
var mapMemo = {
    /*
     * マーカー情報を取得する
     */
    get: function() {
        $.getJSON(urlName+'/api/marker', function(data) {
            if (markerLayer != undefined) {
                map.removeLayer(markerLayer);
            }
            markerLayer = L.geoJson(data, {
                // TODO 絞込み機能
//                filter: function(feature) {
//                    if (feature.properties.id != 0) {
//                        return true;
//                    }
//                },
                onEachFeature: function (feature, layer) {
                    if (feature.properties.comment) {
                        layer.bindPopup(feature.properties.comment.replace(/\r?\n/g, '<br>'));
                    }
                },
                pointToLayer: function(feature, latlng) {
                    var icon = L.AwesomeMarkers.icon({
                        icon: feature.properties.icon,
                        prefix: 'fa',
                        markerColor: feature.properties.type
                    });
                    var marker = L.marker(latlng, {
                        draggable: false,
                        riseOnHover: true,
                        icon: icon,
                    })
                    .addTo(map);
                    marker.btxid = feature.properties.id
                    return marker;
                }
            }).addTo(map);
        });
    },
    /*
     * マーカー情報を登録する
     * @param   {marker}    対象のマーカー
     */
    create: function(marker) {
        // 登録データ送信用のJSON生成
        var markerData = {
                "lat": marker.getLatLng().lat,
                "lon": marker.getLatLng().lng,
                "markerType": marker.options.icon.options.markerColor,
                "markerIcon": marker.options.icon.options.icon
        };
        if (marker._popup !== undefined && marker._popup !== null) {
            markerData.markerComment = marker._popup._content;
        }
        $.ajax({
            type: 'POST',
            url: urlName+'/api/marker',
            data: JSON.stringify(markerData),
            contentType:'application/json',
            dataType: 'text'
        }).then(
            function(btxid) {
                // 成功した場合
                marker.btxid = btxid;
            },
            function() {
                // ERROR
            }
        );
    },
    /*
     * マーカー情報を更新する
     * @param   {marker}    対象のマーカー
     */
    update: function(marker) {
        // 更新データ送信用のJSON生成
        var markerData = {
                "id": marker.btxid,
                "lat": marker.getLatLng().lat,
                "lon": marker.getLatLng().lng,
                "markerType": marker.options.icon.options.markerColor,
                "markerIcon": marker.options.icon.options.icon
        };
        if (marker._popup !== undefined && marker._popup !== null) {
            markerData.markerComment = marker._popup._content;
        }
        var updcnt = 0;
        $.ajax({
            type: 'PUT',
            url: urlName+'/api/marker',
            data: JSON.stringify(markerData),
            contentType:'application/json',
            dataType: 'text'
        }).then(
            function(result) {
                // 成功した場合
                updcnt = result;
            },
            function() {
                // ERROR
            }
        );
        return updcnt;
    },
    /*
     * マーカー情報を削除する
     * @param   {marker}    対象のマーカー
     */
    delete: function(marker) {
        var delcnt = 0;
        $.ajax({
            type: 'DELETE',
            url: urlName+'/api/marker?id=' + marker.btxid,
            dataType: 'text'
        }).then(
            function(result) {
                // 成功した場合
                delcnt = result;
            },
            function() {
                // ERROR
            }
        );
        return delcnt;
    }
};

/*
 * メッセージ表示
 * @param   {s}   メッセージ文言
 */
function message(s) {
    $("#message").html(s);
    $("#message").popup("open");
//    setTimeout(function() { $("#message").popup("open") }, 500 );
};

/*
 * メニューの今週の評価の日付文字列生成
 * @param   {dateStr}   日付文字列(yyyy/MM/dd)
 */
function datetostr(dateStr) {
    var weekday = ["(日)", "(月)", "(火)", "(水)", "(木)", "(金)", "(土)"];
    var date = new Date(dateStr);
    return dateStr.substr(5) + weekday[date.getDay()];
}
