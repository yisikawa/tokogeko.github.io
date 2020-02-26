L.Playback = L.Playback || {};
var urlName = 'https://tokogeko.net';

L.Playback.Control = L.Control.extend({
  _html : '<footer class="lp">'
      + '  <div class="transport">'
      + '    <div class="navbar">'
      + '      <div class="navbar-inner">'
      + '        <ul class="nav">'
      + '          <li class="ctrl">'
      + '            <a id="play-pause" href="#"><i id="play-pause-icon" class="fa fa-play fa-lg"></i></a>'
      + '          </li>'
      + '          <li class="ctrl dropup">'
      + '            <a id="clock-btn" class="clock" data-toggle="dropdown" href="#">'
      + '              <span id="cursor-date"></span><br/>'
      + '            </a>'
      + '          </li>'
      + '        </ul>'
      + '        <ul class="nav pull-right">'
      + '          <li>'
      + '            <div id="time-slider"></div>'
      + '          </li>'
      + '          <li class="ctrl dropup">'
      + '            <a id="speed-btn" data-toggle="dropdown" href="#"><i class="fa fa-dashboard fa-lg"></i> <span id="speed-icon-val" class="speed">1</span>x</a>'
      + '            <div class="speed-menu dropdown-menu" role="menu" aria-labelledby="speed-btn">'
      + '              <div id="speed-slider"></div>'
      + '            </div>'
      + '          </li>'
      + '        </ul>'
      + '      </div>'
      + '    </div>'
      + '  </div>'
      + '</footer>',

  initialize : function(playback) {
    this.playback = playback;
    playback.addCallback(this._clockCallback);
  },

  onAdd : function(map) {
    var html = this._html;
    $('#map').after(html);
    this._setup();

    // just an empty container
    // TODO: dont do this
    return L.DomUtil.create('div');
  },

  _setup : function() {
    var self = this;
    var playback = this.playback;
    $('#play-pause').click(function() {
      if (playback.isPlaying() === false) {
        playback.start();
        $('#play-pause-icon').removeClass('fa-play');
        $('#play-pause-icon').addClass('fa-pause');
      } else {
        playback.stop();
        $('#play-pause-icon').removeClass('fa-pause');
        $('#play-pause-icon').addClass('fa-play');
      }
    });

    var startTime = playback.getStartTime();
    $('#cursor-date').html(
        new Date(startTime).toLocaleDateString() + " "
            + L.Playback.Util.TimeStr(startTime));

    $('#time-slider').slider({
      min : playback.getStartTime(),
      max : playback.getEndTime(),
      step : playback.getTickLen(),
      value : playback.getTime(),
      slide : function(event, ui) {
        playback.setCursor(ui.value);
      }
    });

    $('#speed-slider').slider({
      min : 0,
      max : 59,
      step : 1,
      value : self._speedToSliderVal(this.playback.getSpeed()),
      orientation : 'vertical',
      slide : function(event, ui) {
        var speed = self._sliderValToSpeed(parseFloat(ui.value));
        playback.setSpeed(speed);
        $('.speed').html(speed).val(speed);
      }
    });
    
    $("#route-view").on("click", function(e) {
      var selectDate = $("#select-date").val();
      var togeko = $("#togeko input[type='radio']:checked").val();
      var childs = $("#child-list input[type='checkbox']:checked");
      playback.clearData();
      var userid = 0;
      $.each(childs, function(i, elm) {
        $.ajax(
            {
              type : 'GET',
              url : urlName+'/api/route?userid=' + $(elm).val() + '&date='
                  + selectDate.replace(/\//g, "") + '&type=' + togeko,
              dataType : 'text'
            })
            .then(function(data) {
              try {
                var tracks = L.Playback.Util.ParseGPX(data);
              } catch (e) {
                console.error('Unable to load tracks!');
                return;
              }
              var match = child.data.filter(function(item, index) {
                if (item.user_id === $(elm).val()) return true;
              });
              btxId = match[0].btx_id;
              if (tracks.properties.time.length > 0) {
                playback.addData(tracks);
                var startTime = playback.getStartTime();
                $('#cursor-date').html(
                    new Date(startTime).toLocaleDateString() + " "
                        + L.Playback.Util.TimeStr(startTime));
                $('#time-slider').slider({
                  min : startTime,
                  max : playback.getEndTime(),
                  value : startTime
                });
                playback.setCursor(startTime);
              }
            }, function() {
              message("インターネットにつながっている確認してください。");
            });
      });
    });
  },

  _clockCallback : function(ms) {
    $('#cursor-date').html(
        new Date(ms).toLocaleDateString() + " "
            + L.Playback.Util.TimeStr(ms));
    $('#time-slider').slider('value', ms);
  },

  _speedToSliderVal : function(speed) {
    if (speed < 1)
      return -10 + speed * 10;
    return speed - 1;
  },
  _sliderValToSpeed : function(val) {
    if (val < 0)
      return parseFloat((1 + val / 10).toFixed(2));
    return val + 1;
  }
});