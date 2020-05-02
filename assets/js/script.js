const center = {
  lat: 41.88,
  lon: -87.63,
};

const loadingElement = document.querySelector(".loading");
const resultsElement = document.querySelector(".found");
const locationElement = document.querySelector(".location");
const states_hash = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  "District Of Columbia": "DC",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

let map;
let point;
let markerLayer;

// Use HTML5 geolocation on page load, otherwise throw error
window.addEventListener("load", init);

function init() {
  createMap(center.lat, center.lon);
  getGeolocation();
}

function createMap(lat, lon) {
  map = L.map("map", {
    center: [lat, lon],
    zoom: 15,
    attributionControl: false,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  markerLayer = L.geoJson().addTo(map);
}

function getGeolocation() {
  const options = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 0,
  };

  const success = function (position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    centerMap(lat, lon);
    createPoint(lat, lon);
    reverseGeo(lat, lon);
  };

  const error = function (err) {
    console.error(`ERROR(${err.code}): ${err.message}`);
  };

  navigator.geolocation.getCurrentPosition(success, error, options);
}

function centerMap(lat, lon) {
  map.setView([lat, lon], 15);
}

function reverseGeo(lat, lon) {
  const URL = `https://api.bigdatacloud.net/data/reverse-geocode-client
				?latitude=${lat}&longitude=${lon}&localityLanguage=en`;

  fetch(URL)
    .then((response) => response.json())
    .then((data) => {
      const state = states_hash[data.principalSubdivision];
      loadGeoJSON(state);
    })
    .catch((error) => {
      console.log(error);
    });
}

function loadGeoJSON(state) {
  const URL = `./assets/geo/${state.toLowerCase()}.geojson`;

  fetch(URL)
    .then((response) => response.json())
    .then((neighborhoods) => {
      parseGeoData(neighborhoods);
      searchNeighborhoods(neighborhoods);
    })
    .catch((error) => {
      console.log(error);
    });
}

function parseGeoData(neighborhoods) {
  const geo = L.geoJson(neighborhoods, {
    style: {
      color: "rgba(255, 0, 0, 0.4)",
      weight: 1.5,
    },
    function(feature, layer) {
      layer.bindPopup(
        `<strong>Neighborhood:</strong> ${feature.properties.Name}`
      );
    },
  });

  map.addLayer(geo);

  const overlay = {
    Neighborhoods: geo,
  };

  L.control.layers(null, overlay).addTo(map);
}

function createPoint(lat, lon) {
  // Create arbitrary geoJSON point to submit to turfjs function
  point = {
    type: "Feature",
    properties: {
      "marker-color": "#00FF00",
    },
    geometry: {
      type: "Point",
      coordinates: [lon, lat],
    },
  };

  markerLayer.addData(point);
}

function searchNeighborhoods(neighborhoods) {
  // Loop through all GeoJSON features, break if one selected, and change answerElement
  for (let i = 0; i < neighborhoods.features.length; i++) {
    const feature = neighborhoods.features[i];
    if (gju.pointInPolygon(point.geometry, feature.geometry)) {
      // Get var of p tag that will hold neighborhood answer
      loadingElement.style.display = "none";
      resultsElement.style.display = "block";

      locationElement.innerText = feature.properties.Name;
      break;
    }
  }
}
