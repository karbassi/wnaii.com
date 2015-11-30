L.Icon.Default.imagePath = 'images';

var map = L.map('map').setView([41.88, -87.63], 10);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var markerLayer = L.geoJson().addTo(map);

var mapzen_key = "search-F2Xk0nk";
var auto_url = 'https://search.mapzen.com/v1/autocomplete';
var search_url = 'https://search.mapzen.com/v1/search';
var inputElement = document.getElementsByTagName('input')[0];
var dataListEl = document.getElementsByTagName('datalist')[0];
var API_RATE_LIMIT = 500;

// Load geojson into variable to be used later,
// async being false will be deprecated later, but works for now
var chi_json = (function () {
    var chi_json = null;
    $.ajax({
        'async': false,
        'global': false,
        'url': "chi_neighborhoods.geojson",
        'dataType': "json",
        'success': function (data) {
            chi_json = data;
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
    });
  }
  else {
    console.log("Geolocation is not supported");
  }
};

// Use existing throttle function to load autocomplete Mapzen results on keyup
inputElement.addEventListener('keyup', throttle(searchAddress, API_RATE_LIMIT));

function searchAddress(submitAddr) {
  var params = {
    api_key: mapzen_key,
    "focus.point.lon": -87.63,
    "focus.point.lat": 41.88,
    text: inputElement.value
  };
  // if optional argument supplied, call search endpoint
  if (submitAddr === true) {
    callPelias(search_url, params);
  }
  else if (inputElement.value.length > 0) {
    callPelias(auto_url, params);
  }
};

function callPelias(url, search_params) {
  AJAX.request(url, search_params, function (err, results) {
    if (err) {
      console.log(err);
    }
    // if autocomplete url provided
    if (url === auto_url) {
      if (results && results.features) {
        // remove all children of datalist until empty, fast way of emptying
        while (dataListEl.firstChild) {
          dataListEl.removeChild(dataListEl.firstChild);
        };
        var optionLength = 5;
        if (results.features.length < 5) {
          optionLength = results.features.length;
        }
        // Loop through first five results (or fewer) and add to options
        // TO-DO: Figure out how to display options that aren't datalist exact matches
        for (var i = 0; i < optionLength; ++i) {
          var option = document.createElement('option');
          option.value = results.features[i].properties.label;
          option.text = results.features[i].properties.label;
          dataListEl.appendChild(option);
        };
      }
    }
    // If search url provided
    else if (url === search_url) {
      if (results && results.features) {
        var pos = [results.features[0].geometry.coordinates[1], results.features[0].geometry.coordinates[0]];
        searchNeighborhoods(pos, chi_json);
      }
    }
  });
};

function searchNeighborhoods(position, neighborhoods) {
  // create arbitrary geoJSON point to submit to turfjs function
  var pt = {
    "type": "Feature",
    "properties": {
      "marker-color": "#0f0"
    },
    "geometry": {
      "type": "Point",
      "coordinates": []
    }
  };

  pt["geometry"]["coordinates"] = [position[1], position[0]];

  // Get var of p tag that will hold neighborhood answer
  var answerElement = document.getElementsByTagName('p')[0];
  answerElement.style.display = 'block';

  // Clear any existing GeoJSON and add marker GeoJSON to existing layer
  markerLayer.clearLayers();
  markerLayer.addData(pt);
  // marker = L.marker([position[0], position[1]]).addTo(map);
  map.setView([position[0], position[1]], 15);

  // Loop through all GeoJSON features, break if one selected, and change answerElement
  for (var i = 0; i < neighborhoods.features.length; ++i) {
    if (turf.inside(pt, neighborhoods.features[i])) {
      answerElement.innerHTML = "You are in " + '<b>' + neighborhoods.features[i].properties.name + '</b>.';
      break;
    }
    else {
      answerElement.innerHTML = "You are outside Chicago";
    }
  };
};

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})(window,document,'script','//www.google-analytics.com/analytics.js','ga');ga('create', 'UA-40976307-2', 'wnaii.com');ga('send', 'pageview');
