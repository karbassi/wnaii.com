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
