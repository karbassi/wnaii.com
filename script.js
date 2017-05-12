var mapzen_key = "search-6xXbnNY";
var auto_url = 'https://search.mapzen.com/v1/autocomplete';
var search_url = 'https://search.mapzen.com/v1/search';
var reverse_url = 'https://search.mapzen.com/v1/reverse';
var fLat = 41.88;
var fLon = -87.63;
var API_RATE_LIMIT = 500;
var chi_json;

var full_auto_url = auto_url + "?api_key=" + mapzen_key;
full_auto_url += "&focus.point.lon=" + fLon + "&focus.point.lat=" + fLat + "&text=";

var map = L.map('map').setView([41.88, -87.63], 10);

L.Icon.Default.imagePath = '/bower_components/leaflet/dist/images';

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var markerLayer = L.geoJson().addTo(map);
var gjStyle = {
    color: "#ff0000",
    weight: 1.5,
    opacity: 0.65
};

var inputElement = document.getElementById("addr-search");
inputElement.placeholder = "Getting location...";

function onEachFeature(feature, layer) {
  layer.bindPopup("<strong>Neighborhood:</strong> " + feature.properties.name);
};

function loadGeolocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = [position.coords.latitude, position.coords.longitude];
      searchNeighborhoods(pos, chi_json);
      inputElement.placeholder = "Enter an address.";
    });
  }
  else {
    console.log("Geolocation is not supported");
    inputElement.placeholder = "Enter an address.";
  }
}

// use HTML5 geolocation on page load, otherwise throw error
window.onload = function() {
  $.ajax({
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
          // Load geolocation check
          loadGeolocation();
      }
  });
};

var addr_matches = new Bloodhound({
  datumTokenizer: Bloodhound.tokenizers.obj.whitespace("label"),
  queryTokenizer: Bloodhound.tokenizers.whitespace,
  remote: {
      url: full_auto_url,
      rateLimitBy: "throttle",
      rateLimitWait: API_RATE_LIMIT,
      replace: function() {
        var val = inputElement.value;
        var processed_url = full_auto_url + encodeURIComponent(val);
        return processed_url;
      },
      transform: function(response) {
        response.features.map(function(addr) {
            addr.label = addr.properties.label;
            return addr;
          });
        return response.features;
      }
    }
});

addr_matches.initialize();

$('.typeahead').typeahead({
  hint: true,
  highlight: true,
  minLength: 2
},
{
  name: 'addresses',
  display: 'label',
  source: addr_matches
});

function searchAddress() {
  var params = {
    api_key: mapzen_key,
    "focus.point.lon": -87.63,
    "focus.point.lat": 41.88,
    text: inputElement.value
  };
  $.ajax({
    url: search_url,
    data: params,
    dataType: "json",
    success: function(data) {
      if (data && data.features) {
        var pos = [data.features[0].geometry.coordinates[1], data.features[0].geometry.coordinates[0]];
        searchNeighborhoods(pos, chi_json);
      }
    },
    error: function(err) {
      console.error(err.responseText);
    }
  });
};

$('.typeahead').bind('typeahead:select', function(ev, suggestion) {
  searchNeighborhoods(suggestion.geometry.coordinates.reverse(), chi_json);
});

$(".typeahead").keyup(function (e) {
  if (e.keyCode == 13) {
    searchAddress();
  }
});

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
            "point.lat": position[0],
            "point.lon": position[1]
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

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})(window,document,'script','//www.google-analytics.com/analytics.js','ga');ga('create', 'UA-40976307-2', 'wnaii.com');ga('send', 'pageview');
