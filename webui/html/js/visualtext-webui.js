"use strict";

var WEBUI_CONFIG = {
  html: {
    searchButtonID: 'searchButton',
    searchElementID: 'searchText',
    regex: '/\n/g',
    pattern: ' ',
    bySpace: ' ',
    numberWordsInBlock: 10,
    maxWords: 1000,
    maxWordsExceptionMessage: 'You can\'t send more then 1000 words.',
    exceptionID: 'exception',
    exceptionMessage: 'Request is empty or could not get data from ',
    picturesGalleryID: 'picturesGallery',
    thumbnailCardID: 'thumbnailCard',
    scrollSpeed: 2000
  },
  http: {
    type: "PUT",
    contentType: "application/json",
    protocol: window.location.protocol,
    host: window.location.hostname,
    port: window.location.port,
    api_url: '/to-image'
  },
  spinner: {
    spinnerOpts: {
      lines: 11, // The number of lines to draw
      length: 17, // The length of each line
      width: 10, // The line thickness
      radius: 18, // The radius of the inner circle
      corners: 1, // Corner roundness (0..1)
      rotate: 7, // The rotation offset
      direction: 1, // 1: clockwise, -1: counterclockwise
      color: '#434343', // #rgb or #rrggbb or array of colors
      speed: 1.1, // Rounds per second
      trail: 60, // Afterglow percentage
      shadow: false, // Whether to render a shadow
      hwaccel: false, // Whether to use hardware acceleration
      className: 'spinner', // The CSS class to assign to the spinner
      zIndex: 2e9, // The z-index (defaults to 2000000000)
      top: 'auto', // Top position relative to parent
      left: '50%' // Left position relative to parent
    },
    spinnerAnchorID: 'spinnerAnchor'
  }
};

function BaseListener() {
  this.target = '';
  this.type = '';
  this.callback = {};

  (function() {
    this.setTarget = function(target) {
      this.target = target;

      return this;
    };
    this.setType = function(type) {
      this.type = type;

      return this;
    };
    this.setCallback = function(callback) {
      this.callback = callback;

      return this;
    };
    this.add = function() {
      var callback = this.callback;

      this.target.addEventListener(this.type, function() {
        callback.run();
      });

      return this;
    }
  }).call(BaseListener.prototype);
}

function TextHandler() {
  this.elementID = '';
  this.text = '';

  (function() {
    this.setText = function(text) {
      this.text = text;
    };
    this.getText = function() {
      this.getSearchTextByElementId();
      this.splitTextIntoBlocks();

      return this.text;
    };
    this.setElementID = function(elementID) {
      this.elementID = elementID;
    };
    this.getElementID = function() {
      return this.elementID;
    };
    this.getSearchTextByElementId = function() {
      var elementID = this.getElementID();
      var regex = WEBUI_CONFIG.html.regex;
      var pattern = WEBUI_CONFIG.html.pattern;
      var searchTextElement = document.getElementById(elementID);
      var text = searchTextElement.value.replace(regex, pattern);

      this.text = text;
    };
    this.splitTextIntoBlocks = function() {
        var splitedTextBySpace = this.text.split(WEBUI_CONFIG.html.bySpace),
            wordsBoxMap = new Map,
            initBoxNumber = 0,
            wordsBox = [];

        console.log('splitedTextBySpace: ' + splitedTextBySpace);

        // try {
        //     if(splitedTextBySpace.length > WEBUI_CONFIG.html.maxWords) {
        //         throw new RangeError(WEBUI_CONFIG.html.maxWordsExceptionMessage);
        //     }

            splitedTextBySpace.forEach(function (word, i) {
                if(!(i % WEBUI_CONFIG.html.numberWordsInBlock) && i > 0) {
                    wordsBoxMap.set(initBoxNumber, wordsBox);
                    initBoxNumber++;
                    wordsBox = [];
                }

                wordsBox[i] = word;
            });

            wordsBoxMap.set(initBoxNumber, wordsBox);

            console.log('initBoxNumber, wordsBox, wordsBoxMap: ', initBoxNumber, wordsBox, wordsBoxMap);
            this.text = wordsBoxMap;
            // this.text = wordsBoxMap.size > 0 ? wordsBoxMap : wordsBoxMap.set(initBoxNumber, wordsBox);
        // } catch (e) {
        //     var htmlResponseBuilder = new HTMLResponseBuilder();
        //
        //     htmlResponseBuilder.publish(e);
        // }
    };
  }).call(TextHandler.prototype);
}

function RequestBuilder() {
  var requestsMap = [];
  this.protocol = WEBUI_CONFIG.http.protocol;
  this.host = WEBUI_CONFIG.http.host;
  this.port = WEBUI_CONFIG.http.port;
  this.api_url = WEBUI_CONFIG.http.api_url;
  this.request = {
    type: WEBUI_CONFIG.http.type,
    contentType: WEBUI_CONFIG.http.contentType,
    url: '',
    data: ''
  };

  (function() {
    this.buildUrl = function() {
      this.request.url = this.protocol + "//" + this.host + ":" + this.port + this.api_url;
    };
    this.buildData = function(text) {
      this.request.data = '{"text":"' + text.join(' ') + '", "ignoreCache":false}';
    };
    this.getRequest = function(text) {
      this.buildUrl();
      this.buildData(text);

      return this.request;
    };
  }).call(RequestBuilder.prototype);
}

function SpinnerHandler() {
    this.spinner;
    this.spinnerOpts = WEBUI_CONFIG.spinner.spinnerOpts;
    this.spinnerTargetAnchorID = WEBUI_CONFIG.spinner.spinnerAnchorID;
    this.spinnerTargetAnchor = document.getElementById(this.spinnerTargetAnchorID);

    (function () {
        this.run = function () {
            this.spinner = new Spinner(this.spinnerOpts).spin(this.spinnerTargetAnchor);
        };
        this.stop = function () {
            this.spinner.stop(this.spinnerTargetAnchor);
        }
    }).call(SpinnerHandler.prototype)
}

function NetworkTransporter() {
    this.send = function(request, callback, wordsBoxID) {
      $.ajax({
        type: request.type,
        url: request.url,
        contentType: request.contentType,
        data: request.data,
        error: function(){
          var exceptionMessage = WEBUI_CONFIG.html.exceptionMessage + request.url;

          callback.publish(exceptionMessage, wordsBoxID);
        }
      }).then(function(data) {
        callback.publish(data, wordsBoxID);
      });
    };
}

function HTMLResponseBuilder() {
  var buildImgTag = function(response, key, index, wordsBoxID) {
    $("#" + wordsBoxID + '_' + index + " div .caption").text(response[key]['word']);

    if (response[key]['image'] === null) {
      $("#" + wordsBoxID + '_' + index + " div img").remove();
      $("<i class=\"fa fa-question-circle-o fa-7\" aria-hidden=\"true\" id=\"unknownWord\"></i>").insertBefore("#" + wordsBoxID + '_' + index + " .caption");
      $("#unknownWord").css("font", "normal normal normal 50px/1 FontAwesome");
    } else {
      $("#" + wordsBoxID + '_' + index + " div img").attr("src", "data:image/gif;base64," + response[key]['image']);
    }
  };
  (function() {
    this.publish = function(response, wordsBoxID) {
      if (typeof response === 'object') {
        Object.keys(response).map(function(key, index) {
          $("#thumbnailCard").clone().appendTo("#picturesGallery-" + wordsBoxID).attr("id", wordsBoxID + '_' + index);
          buildImgTag(response, key, index, wordsBoxID);
        });
      } else {
        $(".exception").html(response).css("color", "red");
      }
    };
  }).call(HTMLResponseBuilder.prototype);
}

function VisualTextController() {
  this.text = '';
  this.textHandler = {};
  this.requestsMap = {};
  this.requestBuilder = {};
  this.transport = {};
  this.response = {};
  this.publisher = {};

  (function() {
    this.getText = function() {
      var elementID = WEBUI_CONFIG.html.searchElementID;

      this.textHandler.setElementID(elementID);
      this.text = this.textHandler.getText();

      return this;
    };
    this.getRequest = function() {
      var textMap = this.text,
          requestsMap = new Map();

        console.log('textMap: ', textMap);

        for(var i = 0; i < textMap.size; i++) {
            var text = textMap.get(i),
                requestBuilder = new RequestBuilder(),
                request = requestBuilder.getRequest(text);

            requestsMap.set(i, request);
        }
        console.log('requestsMap: ', requestsMap);

        this.requestsMap = requestsMap;

        console.log('this.requestsMap: ', this.requestsMap);

      return this;
    };
    this.sendRequest = function() {
        var spinner = new SpinnerHandler();

        spinner.run();

        var requestsMap = this.requestsMap;

        for(var i = 0; i < requestsMap.size; i++) {
            var request = requestsMap.get(i),
                callback = new HTMLResponseBuilder(),
                wordsBoxID;

            this.transport.send(request, callback, i);

            wordsBoxID = i;

            $("#picturesGallery").clone().appendTo("#pictures").attr("id", "picturesGallery-" + wordsBoxID);
        }

        scrollToID('#picturesGallery-' + wordsBoxID, 2000);
        $("#picturesGallery").remove();

        // spinner.stop();

        return this;
    };
    this.setResponse = function(response) {
      this.response = response;

      return this;
    };
    this.publishResponse = function() {
      this.publisher.publish(this.response);

      return this;
    };
    this.setTextHandler = function(textHandler) {
      this.textHandler = textHandler;

      return this;
    };
    this.setRequestBuilder = function(requestBuilder) {
      this.requestBuilder = requestBuilder;

      return this;
    };
    this.setTransport = function(transporter) {
      this.transport = transporter;

      return this;
    };
    this.setPublisher = function(requestBuilder) {
      this.publisher = requestBuilder;

      return this;
    };
    this.clearUI = function() {
      $("#picturesGallery div").remove();
      // var searchRequest = document.getElementById("searchText");
      // searchRequest.value = '';

      $(".exception").html('');

      return this;
    };
    this.run = function() {
      this
          .getText()
          .getRequest()
          .sendRequest()
          .clearUI();

      return this
    }
  }).call(VisualTextController.prototype);
}

function scrollToID(id, speed){
    var offSet = 50;
    var targetOffset = $(id).offset().top - offSet;
    $('html,body').animate({
        scrollTop:targetOffset
    }, speed);
};

document.addEventListener("DOMContentLoaded", function() {
  var textHandler = new TextHandler();
  var requestBuilder = new RequestBuilder();
  var networkTransporter = new NetworkTransporter();
  var publisher = new HTMLResponseBuilder();
  var clickListener = new BaseListener();
  var visualTextController = new VisualTextController();

  visualTextController
      .setTextHandler(textHandler)
      .setRequestBuilder(requestBuilder)
      .setTransport(networkTransporter)
      .setPublisher(publisher);

  clickListener
      .setTarget(document.getElementById('searchButton'))
      .setType('click')
      .setCallback(visualTextController)
      .add();
});
