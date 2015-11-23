var map = L.map('map').setView([41.88, -87.63], 12);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

$.ajax({
  dataType: "json",
  url: "chi-neighborhoods.geojson",
  success: function(data) {
    console.log(data);
    var chi_neighborhoods = data;

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

    for (var i = 0; i < chi_neighborhoods.features.length; ++i) {
      if (turf.inside(pt, chi_neighborhoods.features[i])) {
        console.log(chi_neighborhoods.features[i].properties.name);
        break;
      }
    };

    L.geoJson(chi_neighborhoods).addTo(map);
  }
}).error(function() {});
