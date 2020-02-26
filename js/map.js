//初期化処理の直後のイベント
$(document).on('pagecreate', function (e, d) {

  var tokenText = document.getElementById("token");
  tokenText.textContent = localStorage.getItem('Authorization');
  /* 認証情報設定 */
  $.ajaxSetup({
    beforeSend: function (xhr, settings) {
      xhr.setRequestHeader('Authorization', $("#token").text());
      // xhr.setRequestHeader( 'Authorization', 'Bearer '+ $("#token").text() );
    }
  });

  // 日付の初期値を設定
  today = new Date();
  today.setHours(0);
  today.setMinutes(0);
  today.setSeconds(0);
  today.setMilliseconds(0);
  var selectDate = today.getFullYear() + "/" + ('00' + (today.getMonth() + 1)).slice(-2) + "/" + ('00' + today.getDate()).slice(-2);
  $("#select-date").val(selectDate);

  // 評価初期化
  rating.init();
});

// ページのロード完了後のイベント
$(window).load(function () {
  // 地図設定
  map = L.map('map', {
    center: [35.003081, 137.002055],
    zoom: 16,
    zoomControl: true,
    maxBounds: [[35.007000, 136.997500], [34.998500, 137.005500]],   // 左上:右下の制限座標
    minZoom: 16,
    layers: [t_pale]
  });
  L.control.layers(Map_b, null, null).addTo(map);

  // 地図メモダイアログ
  var left = ($("#map").width() - 300 - 20) / 2;
  var options = {
    size: [300, 155],
    anchor: [-5, left],
    position: 'topleft',
    initOpen: false
  };
  var contents = "<div id='map-memo'>" +
    "<form>" +
    "<fieldset class='ui-controlgroup'><button id='marker-icon'></button></fieldset>" +
    "<fieldset data-role='controlgroup' data-type='horizontal' id='marker-type' data-mini='true'>" +
    "<input type='radio' id='marker-radio-d' name='marker-radio' value='red' checked><label for='marker-radio-d'>危険</label>" +
    "<input type='radio' id='marker-radio-w' name='marker-radio' value='orange'><label for='marker-radio-w'>注意</label>" +
    "<input type='radio' id='marker-radio-s' name='marker-radio' value='blue'><label for='marker-radio-s'>安全</label>" +
    "</fieldset>" +
    "<textarea id='marker-comment' rows='2' placeholder='コメントを記入してください。'></textarea>" +
    "<div class='ui-input-btn ui-btn ui-btn-inline ui-mini dlg-footer'>キャンセル<input type='button' data-inline='true' value='cancel'></div>" +
    "<div class='ui-input-btn ui-btn ui-btn-inline ui-mini dlg-footer'>削除<input type='button' data-inline='true' value='delete'></div>" +
    "<div class='ui-input-btn ui-btn ui-btn-inline ui-mini dlg-footer'>更新<input type='button' data-inline='true' value='update'></div>" +
    "<div class='ui-input-btn ui-btn ui-btn-inline ui-mini dlg-footer'>登録<input type='button' data-inline='true' value='create'></div>" +
    "</form>" +
    "</div>";
  // ダイアログ生成
  var markerDialog = L.control.dialog(options)
    .setContent(contents)
    .addTo(map);
  // マーカー種別のラジオボタンにjqmのスタイルを適用
  $("#marker-type input").checkboxradio({ icon: false, mini: true });
  $("#marker-type").controlgroup();
  // マーカーアイコン設定
  $("#marker-icon").iconpicker({
    cols: 6,
    footer: false,
    header: false,
    icon: 'fas fa-comment-dots',
    iconset: {
      iconClass: 'fas',
      iconClassFix: 'fa-',
      icons: [
        'comment-dots',
        'car-crash',
        'bomb',
        'award',
        'star',
        'exclamation',
        'question',
        'thumbs-up',
        'grin-alt',
        'grin-beam-sweat',
        'grin-squint',
        'angry'
      ]
    },
    placement: 'top',
    rows: 2,
    search: false,
    selectedClass: 'btn-warning',
    unselectedClass: ''
  });
  // 地図メモ　登録・更新・削除・キャンセル
  $("#map-memo input[type=button]").on("click", function (e) {
    if (e.target.value === "create") {
      // DBにマーカー情報を登録
      btxid = mapMemo.create(memoMarker)
      memoMarker.dragging.disable();
    } else if (e.target.value === "update") {
      // DB上のマーカー情報を更新
      mapMemo.update(memoMarker);
      memoMarker.dragging.disable();
    } else if (e.target.value === "delete") {
      // DB上のマーカー情報を削除
      mapMemo.delete(memoMarker);
      // 地図上のマーカーを削除
      map.removeLayer(memoMarker);
    } else if (e.target.value === "cancel") {
      if (memoMarker.btxid == undefined) {
        // 新規登録の場合、編集中の地図上のマーカーを削除
        map.removeLayer(memoMarker);
      } else {
        // 更新の場合、変更内容を元に戻す
        var icon = L.AwesomeMarkers.icon({
          icon: memoMarker.oriIcon,
          prefix: 'fa',
          markerColor: memoMarker.oriType
        });
        memoMarker.setIcon(icon);
        if (memoMarker.oriComment == undefined) {
          memoMarker.closePopup().unbindPopup();
        } else {
          var comment = memoMarker.oriComment;
          memoMarker.bindPopup(comment.replace(/\r?\n/g, '<br>')).openPopup();
        }
        memoMarker.setLatLng(L.latLng(memoMarker.oriLatLng.lat, memoMarker.oriLatLng.lng));
        memoMarker.dragging.disable();
      }
    }
    markerDialog.close();
    map.setZoom(zoomLevel);
    memoMarker = null;
  });

  // 評価ボタン
  L.easyButton({
    id: 'rating-btn',
    position: 'topleft',
    states: [{
      icon: 'fa-star fa-lg',
      title: '評価',
      onClick: function (btn, map) {
        $("#rating-icon img").attr('src', icon.get()[0]);
        var match = rating.data.filter(function (item, index) {
          if (item.ratingDate === $("#select-date").val()) return true;
        });
        var matchRating = 0;
        var readonly = false;
        if (match.length == 0) {
          readonly = true;
        } else if (match[0].rating != null) {
          matchRating = match[0].rating;
        }

        $("#rating-popup div.rating").rateYo({
          rating: matchRating,
          starWidth: "50px",
          fullStar: true,
          readOnly: readonly,
          onSet: function (value, rateYoInstance) {
            // 紙ふぶきを停止
            $("#map").snowfall("clear");
            // 評価データを更新
            rating.data[0].rating += (value - match[0].rating);
            match[0].rating = value;
            match[0].updflg = 1;
            // 評価した場合、ボタンの色を変更する
            if (match[0].rating > 0) {
              $(".easy-button-button .fa-star").css('color', '#F49B12');
            } else {
              $(".easy-button-button .fa-star").css('color', '');
            }
            // メニューの本日、選択日、週間評価を更新する
            $("#rating div.rating").rateYo("rating", value);
            $("#rating-list div.select-date").rateYo("rating", value);

            // アイコンが変わる場合、進化の演出を追加する
            var img = icon.get()[0];
            if ($("#rating-icon img").attr('src') != img) {
              $("#rating-icon img").animate({
                width: "10%",
                height: "10%"
              }, {
                duration: 3000,
                step: function (num) {
                  $(this).css({
                    transform: 'rotate(' + (num * 30) + 'deg)'
                  });
                },
                complete: function () {
                  $("#rating img").attr('src', img);
                  $("#rating-icon img").attr('src', img);
                  $("#rating-icon img").load(function () {
                    $("#rating-icon img").removeAttr("style");
                    // XXX なぜかflakeCountが加算され、ダイアログを閉じないと振る量が増えていく
                    $("#map").snowfall({
                      flakeCount: 100,
                      flakeColor: "#FFF",
                      flakeIndex: "800",
                      minSize: 5,
                      maxSize: 30,
                      minSpeed: 1,
                      maxSpeed: 2,
                      round: false,
                      shadow: false,
                      image: "/img/star.png"
                    });
                  });
                  // 経路のアイコンを切替
                  var selectDate = $("#select-date").val();
                  var togeko = 1;
                  if ($("#select-togeko").hasClass("active-geko")) {
                    togeko = 2;
                  }
                  route.set(selectDate, togeko);
                }
              });
            }
            rating.update();
          }
        });
        $("#rating-popup").popup("open");
      }
    }]
  }).addTo(map);

  // 現在地表示ボタン
  L.easyButton({
    id: 'location-btn',
    position: 'topright',
    states: [{
      stateName: 'pulse-start',
      icon: 'fa-crosshairs fa-lg',
      title: '今どこ？',
      onClick: function (btn, map) {
        // 現在地をパルス表示
        var selectUser = $("#child-list input[type='radio']:checked").val();
        if (pulseMaker != undefined) {
          map.removeLayer(pulseMaker);
        }
        $.getJSON(urlName + '/location?userid=' + selectUser, function (data) {
          if (data.features[0].geometry.coordinates.toString() != "0,0") {
            pulseMaker = L.geoJson(data, {
              pointToLayer: function (feature, latlng) {
                var pulseIcon = L.icon.pulse({
                  iconSize: [15, 15],
                  color: 'red',
                  animate: true,
                  heartbeat: 1
                });
                return L.marker(latlng, { icon: pulseIcon });
              }
            }).addTo(map);
            btn.state('pulse-stop');
          } else {
            message("現在地を見つけられませんでした。");
          }
        })
          .fail(function (jqXHR, textStatus, errorThrown) {
            message("現在地を見つけられませんでした。");
          });
      }
    }, {
      stateName: 'pulse-stop',
      icon: 'fa-crosshairs fa-lg faa-tada animated',
      title: '今どこ？',
      onClick: function (btn, map) {
        btn.state('pulse-start');
        // 現在地のパルス表示を終了
        if (pulseMaker != undefined) {
          map.removeLayer(pulseMaker);
        }
      }
    }]
  }).addTo(map);

  // 初期表示時の各種データ設定
  $.when(
    child.get(),
    mapMemo.get()
  ).done(function () {
    var selectUser = $("#child-list input[type='radio']:checked").val();
    var selectDate = $("#select-date").val();
    schoolroute.get(selectUser);
    rating.get(selectUser, selectDate);
  })
    .done(function () {
      var selectUser = $("#child-list input[type='radio']:checked").val();
      var selectDate = $("#select-date").val();
      schoolroute.get(selectUser);
      var togeko = 2;
      route.get(selectUser, selectDate, togeko);
    })
    .fail(function () {
      message("インターネットにつながっている確認してください。");
    });

  // 日付
  $("#select-date").datepicker({
    dateFormat: 'yy/mm/dd',
    constrainInput: true,
    showMonthAfterYear: true,
    yearSuffix: '年',
    monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    dayNamesMin: ['日', '月', '火', '水', '木', '金', '土'],
    maxDate: "0d"  // 現在日以降は選択不可
  });

  // 児童切替時の処理
  $("#child-list div.ui-controlgroup-controls").on('change', function () {
    $("#menu").panel("close");

    // 通学路、経路を再描画
    var selectUser = $("#child-list input[type='radio']:checked").val();
    var selectDate = $("#select-date").val();
    var togeko = 1;
    if ($("#select-togeko").hasClass("active-geko")) {
      togeko = 2;
    }
    $.when(
      schoolroute.get(selectUser),
      rating.get(selectUser, selectDate)
    )
      .done(function () {
        route.get(selectUser, selectDate, togeko);
      })
      .fail(function () {
        message("インターネットにつながっている確認してください。");
      });
  });

  // 地図メモ
  // 右クリックは禁止する
  $("*").on("contextmenu", function (e) {
    return false;
  });

  var taptimer;
  var markerLatlon;
  $("#map").on("vmousedown", function (e) {
    markerLatlon = map.mouseEventToLatLng(e);
  });
  $("#map").on("touchstart", function (e) {
    // ダイアログが非表示で指1本のみtouchしている場合、マーカーダイアログを表示する
    if ($(".leaflet-control-dialog").css("visibility") === "hidden"
      && e.originalEvent.touches.length === 1) {
      taptimer = setTimeout(function () {
        if (e.target.id === "map") {
          // 登録、キャンセルボタンを表示し、更新、削除ボタンを非表示
          $("#map-memo input[type='button'][value='create']").parent().show();
          $("#map-memo input[type='button'][value='update']").parent().hide();
          $("#map-memo input[type='button'][value='delete']").parent().hide();
          $("#marker-type input[type='radio'][value='red']").prop('checked', true);
          $("#marker-type input[type='radio']").checkboxradio('refresh');
          $("#marker-icon").iconpicker('setIcon', 'fa-comment-dots');
          $("#marker-comment").val("");
          // 新規にマーカーを追加
          var icon = L.AwesomeMarkers.icon({
            icon: 'comment-dots',
            prefix: 'fa',
            markerColor: 'red'
          });
          memoMarker = L.marker(markerLatlon, {
            draggable: true,
            riseOnHover: true,
            icon: icon
          }).addTo(map);
          zoomLevel = map.getZoom();
          map.setView(L.latLng(markerLatlon.lat, markerLatlon.lng), 18, 'animate');
          markerDialog.hideClose().open();
        } else {
          var zindex = null;
          if ($(e.target).hasClass("awesome-marker")) {
            zindex = Number($(e.target).css("z-index"));
          } else if ($(e.target.parentElement).hasClass("awesome-marker")) {
            zindex = Number($(e.target.parentElement).css("z-index"));
          }
          if (zindex != null) {
            map.eachLayer(function (layer) {
              if (zindex == layer._zIndex + layer.options.riseOffset || zindex == layer._zIndex) {
                if (layer.btxid === 0) {
                  message("自分で登録したマーカー以外は変更できません。");
                } else {
                  memoMarker = layer;
                  memoMarker.oriType = layer.options.icon.options.markerColor;
                  $("#marker-type input[type='radio']").val([memoMarker.oriType]);
                  $("#marker-type input[type='radio']").checkboxradio('refresh');
                  memoMarker.oriIcon = layer.options.icon.options.icon;
                  $("#marker-icon").iconpicker('setIcon', 'fa-' + memoMarker.oriIcon);
                  var comment = "";
                  if (layer.getPopup() != undefined && layer.getPopup() != null) {
                    memoMarker.oriComment = layer.getPopup().getContent();
                    comment = memoMarker.oriComment;
                    // brを改行コードに変換する
                    comment = comment.replace(/<br>/gi, '\r\n')
                  }
                  $("#marker-comment").val(comment);
                  memoMarker.oriLatLng = layer.getLatLng();
                  layer.dragging.enable();
                  zoomLevel = map.getZoom();
                  map.setView(L.latLng(layer.getLatLng().lat, layer.getLatLng().lng), 18, 'animate');
                  // 登録、キャンセルボタンを非表示、更新、削除ボタンを表示
                  $("#map-memo input[type='button'][value='create']").parent().hide();
                  $("#map-memo input[type='button'][value='update']").parent().show();
                  $("#map-memo input[type='button'][value='delete']").parent().show();
                  markerDialog.hideClose().open();
                }
              }
            });
          }
        }
      }, 750);
    }
    //    console.log(e.type + ":" + taptimer);
  });
  $("#map").on("vmouseup mouseup swipe touchend touchmove", function (e) {
    // ダイアログが表示済みの場合、再表示しない
    //    console.log(e.type + ":" + taptimer);
    if ($(".leaflet-control-dialog").css("visibility") === "hidden") {
      clearTimeout(taptimer);
    }
  });

  $("#map").on("vmousedown vmouseup mousedown mouseup swipe touchstart touchend touchmove taphold", function (e) {
    console.log(e.type);
  });


  // 地図メモダイアログで値変更時の処理
  $("#marker-icon, #marker-type").on('change', function (e) {
    if (memoMarker != undefined) {
      var icon = L.AwesomeMarkers.icon({
        icon: $("#marker-icon>input[type=hidden]").val().substr(3),
        prefix: 'fa',
        markerColor: $("#marker-type input[name='marker-radio']:checked").val()
      });
      memoMarker.setIcon(icon);
    }
  });
  $("#marker-comment").on('change', function (e) {
    if (memoMarker != undefined) {
      var comment = $("#marker-comment").val();
      // 改行コードをbrに変換し、ポップアップに設定する
      memoMarker.bindPopup(comment.replace(/\r?\n/g, '<br>')).openPopup();
      if (comment === "") {
        memoMarker.closePopup().unbindPopup();
      }
    }
  });

  // 評価ポップアップを閉じた時の処理
  $("#rating-popup").on({
    popupafterclose: function () {
      $("#map").snowfall("clear");
      $("#rating-icon img").off("load");
      $("#rating-popup div.rating").rateYo("destroy");
    }
  });
});

// 日付切替時の処理
$("#select-date").on('click', function () {
  $("#select-date").datepicker('show');
});
$("#select-date").on('change', function () {
  var selectUser = $("#child-list input[type='radio']:checked").val();
  var selectDate = $("#select-date").val();
  var togeko = 1;
  if ($("#select-togeko").hasClass("active-geko")) {
    togeko = 2;
  }
  $.when(
    rating.get(selectUser, selectDate)
  )
    .done(function () {
      route.get(selectUser, selectDate, togeko);
    })
    .fail(function () {
      message("インターネットにつながっている確認してください。");
    });
});

// 登下校切替時の処理
$("#select-togeko").on('click', function () {
  var selectUser = $("#child-list input[type='radio']:checked").val();
  var selectDate = $("#select-date").val();
  var togeko;
  if ($(this).hasClass("active-geko")) {
    // 登校に切替
    $(this).removeClass("active-geko").addClass("active-toko");
    $(this).children(".fa-home").removeClass("fa-home").addClass("fa-school").next("label").text("登校");
    togeko = 1;
  } else {
    // 下校に切替
    $(this).removeClass("active-toko").addClass("active-geko");
    $(this).children(".fa-school").removeClass("fa-school").addClass("fa-home").next("label").text("下校");
    togeko = 2;
  }
  route.get(selectUser, selectDate, togeko);
});
