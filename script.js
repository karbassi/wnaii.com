var map = L.map('map').setView([41.88, -87.63], 10);

L.Icon.Default.imagePath = '/bower_components/leaflet/dist/images';

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var markerLayer = L.geoJson().addTo(map);

var gjStyle = {
    color: "#ff0000",
    weight: 1.5,
    opacity: 0.65
};

function onEachFeature(feature, layer) {
  layer.bindPopup("<strong>Neighborhood:</strong> " + feature.properties.name);
};

// Load geojson into variable to be used later,
// async being false will be deprecated later, but works for now
var chi_json = (function () {
    var chi_json = null;
    $.ajax({
        async: false,
        global: false,
        url: "chi_neighborhoods.geojson",
        dataType: "json",
        success: function (data) {
            chi_json = data;
            var chigeo = L.geoJson(chi_json, {
              style: gjStyle,
              onEachFeature: onEachFeature
            });
            var overlay = { "Neighborhoods": chigeo };
            L.control.layers(null, overlay).addTo(map);
        }
    });
    return chi_json;
})();

// use HTML5 geolocation on page load, otherwise throw error
window.onload = function() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = [position.coords.latitude, position.coords.longitude];
      searchNeighborhoods(pos, chi_json);
      // Make input usable and change placeholder, included twice so that it waits for function completion
      inputElement.placeholder = "Enter an address.";
      inputElement.disabled = false;
    });
  }
  else {
    console.log("Geolocation is not supported");
    inputElement.placeholder = "Enter an address.";
    inputElement.disabled = false;
  }
};

var API_RATE_LIMIT = 500;
var inputElement = document.getElementById("addr-search");
inputElement.disabled = true;
inputElement.placeholder = "Getting location...";

var mapzen_key = "search-6xXbnNY";
var auto_url = 'https://search.mapzen.com/v1/autocomplete';
var search_url = 'https://search.mapzen.com/v1/search';

var addresses = [];

var addr_matches = new Bloodhound({
  datumTokenizer: Bloodhound.tokenizers.whitespace,
  queryTokenizer: Bloodhound.tokenizers.whitespace,
  local: addresses
});

$('.typeahead').typeahead({
  hint: true,
  highlight: true,
  minLength: 1
},
{
  name: 'addresses',
  source: addr_matches
});

function searchAddress(submitAddr) {
  var params = {
    api_key: mapzen_key,
    "focus.point.lon": -87.63,
    "focus.point.lat": 41.88,
    text: inputElement.value
  };
  // if optional argument supplied, call search endpoint
  if (submitAddr === true) {
    callMapzen(search_url, params);
  }
  else if (inputElement.value.length > 0) {
    callMapzen(auto_url, params);
  }
};

function callMapzen(url, search_params) {
  $.ajax({
    url: url,
    data: search_params,
    dataType: "json",
    success: function(data) {
      if (url === auto_url && data.features.length > 0) {
        addr_matches.clear();
        addr_matches.add(data.features.map(function(addr) {return addr.properties.label}));
      }
      else if (url === search_url) {
        if (data && data.features) {
          var pos = [data.features[0].geometry.coordinates[1], data.features[0].geometry.coordinates[0]];
          searchNeighborhoods(pos, chi_json);
        }
      }
    },
    error: function(err) {
      console.error(err.responseText);
    }
  });
}

inputElement.addEventListener('keyup', throttle(searchAddress, API_RATE_LIMIT));

$('.typeahead').bind('typeahead:select', function(ev, suggestion) {
  searchAddress(true);
});

$(".typeahead").keyup(function (e) {
  if (e.keyCode == 13) {
    searchAddress(true);
  }
});

// Use existing throttle function to load autocomplete Mapzen results on keyup
inputElement.addEventListener('keyup', throttle(searchAddress, API_RATE_LIMIT));

function searchNeighborhoods(position, neighborhoods) {
  // create arbitrary geoJSON point to submit to turfjs function
  var pt = {
    type: "Feature",
    properties: {
      "marker-color": "#0f0"
    },
    geometry: {
      type: "Point",
      coordinates: []
    }
  };

  pt.geometry.coordinates = [position[1], position[0]];

  // Get var of p tag that will hold neighborhood answer
  var answerElement = document.getElementById('geo-result');
  answerElement.style.display = 'block';

  // Clear any existing GeoJSON and add marker GeoJSON to existing layer
  markerLayer.clearLayers();
  markerLayer.addData(pt);
  // marker = L.marker([position[0], position[1]]).addTo(map);
  map.setView([position[0], position[1]], 15);

  // Loop through all GeoJSON features, break if one selected, and change answerElement
  for (var i = 0; i <= neighborhoods.features.length; ++i) {
    if (i == neighborhoods.features.length) {
      // if have gone through all neighborhoods and can't find, use Mapzen reverse
      // geocoder to pull a neighborhood name
      $.ajax({
          url: reverse_url,
          data: {
            api_key: mapzen_key,
            point: {
              lat: position[0],
              lon: position[1]
            }
          },
          dataType: "json",
          success: function (data) {
              var neighborhood = data.features[0].properties.neighbourhood;
              // check to make sure neighborhood is defined, display if so
              if (typeof neighborhood !== "undefined") {
                answerElement.innerHTML = "You are in " + '<b>' + neighborhood + '</b>.';
              }
              else {
                answerElement.innerHTML = "Neighborhood can't be found";
              }
          }
      });
    }
    else if (turf.inside(pt, neighborhoods.features[i])) {
      answerElement.innerHTML = "You are in " + '<b>' + neighborhoods.features[i].properties.name + '</b>.';
      break;
    }
  };
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

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})(window,document,'script','//www.google-analytics.com/analytics.js','ga');ga('create', 'UA-40976307-2', 'wnaii.com');ga('send', 'pageview');
