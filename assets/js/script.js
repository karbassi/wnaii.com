const center = {
  lat: 41.88,
  lon: -87.63,
};

const loadingElement = document.querySelector('.loading');
const resultsElement = document.querySelector('.found');
const locationElement = document.querySelector('.location');

let map;
let point;
let markerLayer;

// Scripts are deferred, so Leaflet and geojson-utils have already run.
// Don't wait for window load: Cloudflare Rocket Loader can run this after it.
init();

function init() {
  createMap(center.lat, center.lon);
  getGeolocation();
}

function createMap(lat, lon) {
  map = L.map('map', {
    center: [lat, lon],
    zoom: 15,
    attributionControl: false,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  markerLayer = L.geoJSON().addTo(map);
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

    switch (err.code) {
      case err.PERMISSION_DENIED:
        showMessage('Please enable location services for this site in your browser settings.');
        break;
      case err.TIMEOUT:
        showMessage('Finding your location timed out. Reload to try again.');
        break;
      default:
        showMessage('Location information is unavailable.');
    }
  };

  if (!navigator.geolocation) {
    showMessage("Your browser doesn't support location services.");
    return;
  }

  navigator.geolocation.getCurrentPosition(success, error, options);
}

function showMessage(message) {
  loadingElement.innerText = message;
}

function centerMap(lat, lon) {
  map.setView([lat, lon], 15);
}

function reverseGeo(lat, lon) {
  const URL = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;

  fetch(URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Reverse geocode failed: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const state = stateCode(data);

      if (!state) {
        showMessage('Sorry, only US neighborhoods are supported.');
        return;
      }

      loadGeoJSON(state);
    })
    .catch((error) => {
      console.error(error);
      showMessage("Sorry, we couldn't look up your location.");
    });
}

function loadGeoJSON(state) {
  const URL = `./assets/geo/${state.toLowerCase()}.min.geojson`;

  fetch(URL)
    .then((response) => {
      if (!response.ok) throw new Error(`No neighborhood data for ${state}`);
      return response.json();
    })
    .then((neighborhoods) => {
      parseGeoData(neighborhoods);
      searchNeighborhoods(neighborhoods);
    })
    .catch((error) => {
      console.error(error);
      showMessage("Sorry, we don't have neighborhood data for your state yet.");
    });
}

function parseGeoData(neighborhoods) {
  const geo = L.geoJSON(neighborhoods, {
    style: {
      color: 'rgba(255, 0, 0, 0.4)',
      weight: 1.5,
    },
    onEachFeature(feature, layer) {
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
  // GeoJSON point used for the marker and the point-in-polygon search
  point = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [lon, lat],
    },
  };

  markerLayer.addData(point);
}

function searchNeighborhoods(neighborhoods) {
  // Show the first neighborhood that contains the point
  for (let i = 0; i < neighborhoods.features.length; i++) {
    const feature = neighborhoods.features[i];
    if (gju.pointInPolygon(point.geometry, feature.geometry)) {
      loadingElement.style.display = 'none';
      resultsElement.style.display = 'block';

      locationElement.innerText = feature.properties.Name;
      return;
    }
  }

  showMessage("You're not inside any neighborhood we know about.");
}
