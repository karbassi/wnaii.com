var map = L.map('map').setView([41.88, -87.63], 10);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var mapzen_key = "search-F2Xk0nk";
var url = 'https://search.mapzen.com/v1/autocomplete';
var inputElement = document.getElementsByTagName('input')[0];
var dataListEl = document.getElementsByTagName('datalist')[0];
var API_RATE_LIMIT = 1000;

/* TO-DO:
- Build out error handling
- Figure out workaround for datalist HTML only matching exactly
*/

/*
var autocomplete = throttle(function() {
  if (inputElement.value.length > 0) {
    var params = {
      api_key: mapzen_key,
      text: inputElement.value
    };
    callPelias(url, params);
  }
}, API_RATE_LIMIT);
*/

function callPelias(search_url, search_params) {
  AJAX.request(search_url, search_params, function (err, results) {
    if (err) {
      console.log(err);
    }
    if (results && results.features) {
      while (dataListEl.firstChild) {
        dataListEl.removeChild(dataListEl.firstChild);
      };
      if (results.features.length >= 5) {
        for (var i = 0; i < 5; ++i) {
          var option = document.createElement('option');
          option.value = results.features[i].properties.label;
          option.text = results.features[i].properties.label;
          dataListEl.appendChild(option);
        };
      }
      else {
        for (var i = 0; i < results.features.length; ++i) {
          var option = document.createElement('option');
          option.value = results.features[i].properties.label;
          option.text = results.features[i].properties.label;
          dataListEl.appendChild(option);
        };
      }
    }
  });
};

inputElement.addEventListener('keyup', throttle(function() {
  if (inputElement.value.length > 0) {
    var params = {
      api_key: mapzen_key,
      "focus.point.lon": -87.63,
      "focus.point.lat": 41.88,
      text: inputElement.value
    };
    console.log(inputElement.value);
    callPelias(url, params);

  }
}, API_RATE_LIMIT));

var pt = {
  "type": "Feature",
  "properties": {
    "marker-color": "#0f0"
  },
  "geometry": {
    "type": "Point",
    "coordinates": [-87.663906, 41.968421]
  }
};

$.ajax({
  dataType: "json",
  url: "chi-neighborhoods.geojson",
  success: function(data) {
    var chi_neighborhoods = data;

    for (var i = 0; i < chi_neighborhoods.features.length; ++i) {
      if (turf.inside(pt, chi_neighborhoods.features[i])) {
        console.log(chi_neighborhoods.features[i].properties.name);
        break;
      }
    };

    //L.geoJson(chi_neighborhoods).addTo(map);
  }
}).error(function() {});

var AJAX = {
  serialize: function (params) {
    var data = '';

    for (var key in params) {
      if (params.hasOwnProperty(key)) {
        var param = params[key];
        var type = param.toString();
        var value;

        if (data.length) {
          data += '&';
        }

        switch (type) {
          case '[object Array]':
          value = (param[0].toString() === '[object Object]') ? JSON.stringify(param) : param.join(',');
          break;
          case '[object Object]':
          value = JSON.stringify(param);
          break;
          case '[object Date]':
          value = param.valueOf();
          break;
          default:
          value = param;
          break;
        }

        data += encodeURIComponent(key) + '=' + encodeURIComponent(value);
      }
    }

    return data;
  },
  http_request: function (callback, context) {
    if (window.XDomainRequest) {
      return this.xdr(callback, context);
    } else {
      return this.xhr(callback, context);
    }
  },
  xhr: function (callback, context) {
    var xhr = new XMLHttpRequest();

    xhr.onerror = function (e) {
      xhr.onreadystatechange = L.Util.falseFn;
      var error = {
        code: xhr.status,
        message: xhr.statusText
      };

      callback.call(context, error, null);
    };

    xhr.onreadystatechange = function () {
      var response;
      var error;

      if (xhr.readyState === 4) {
        // Handle all non-200 responses first
        if (xhr.status !== 200) {
          error = {
            code: xhr.status,
            message: xhr.statusText
          };
          callback.call(context, error, null);
        } else {
          try {
            response = JSON.parse(xhr.responseText);
          } catch (e) {
            response = null;
            error = {
              code: 500,
              message: 'Parse Error'
            };
          }

          if (!error && response.error) {
            error = response.error;
            response = null;
          }

          xhr.onerror = L.Util.falseFn;

          callback.call(context, error, response);
        }
      }
    };

    return xhr;
  },
  xdr: function (callback, context) {
    var xdr = new window.XDomainRequest();

    xdr.onerror = function (e) {
      xdr.onload = L.Util.falseFn;

      // XDRs have no access to actual status codes
      var error = {
        code: 500,
        message: 'XMLHttpRequest Error'
      };
      callback.call(context, error, null);
    };

    // XDRs have .onload instead of .onreadystatechange
    xdr.onload = function () {
      var response;
      var error;

      try {
        response = JSON.parse(xdr.responseText);
      } catch (e) {
        response = null;
        error = {
          code: 500,
          message: 'Parse Error'
        };
      }

      if (!error && response.error) {
        error = response.error;
        response = null;
      }

      xdr.onerror = L.Util.falseFn;
      callback.call(context, error, response);
    };

    return xdr;
  },
  request: function (url, params, callback, context) {
    var paramString = this.serialize(params);
    var httpRequest = this.http_request(callback, context);

    httpRequest.open('GET', url + '?' + paramString);

    setTimeout(function () {
      httpRequest.send(null);
    }, 0);
  }
};

/*
* throttle Utility function (borrowed from underscore)
*/
function throttle (func, wait, options) {
  var context, args, result;
  var timeout = null;
  var previous = 0;
  if (!options) options = {};
  var later = function () {
    previous = options.leading === false ? 0 : new Date().getTime();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) context = args = null;
  };
  return function () {
    var now = new Date().getTime();
    if (!previous && options.leading === false) previous = now;
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
};
