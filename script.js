const IP_URL = 'https://ipapi.co/json/';

let focusLat = 41.88;
let focusLon = -87.63;

let loadingElement = document.getElementById('loading');
let resultsElement = document.getElementById('found');
let locationElement = document.getElementById('location');

let neighborhoods;
let map;
let markerLayer;

function createMap() {
	if (map !== undefined) {
		return;
	}

	map = L.map('map', {
		'center': [focusLat, focusLon],
		'zoom': 15,
		'attributionControl': false,
	});

	L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png').addTo(map);

	markerLayer = L.geoJson().addTo(map);
}

function loadGeoJSON(url) {
	// console.log(`Loading "${url}"`);

	fetch(url)
		.then(response => response.json())
		.then(parseGeoDate);
}

function ipLookUp () {
	// console.log("Getting ip-based location.");

	fetch(IP_URL)
		.then(response => response.json())
		.then((response) => {
			// console.log(response);

			let state = (response.region_code || "").toLowerCase()
			url = `geojson/${state}.geojson`;

			loadGeoJSON(url);
		});
}

function searchNeighborhoods() {

	if (neighborhoods === undefined) {
		setTimeout(() => {
			searchNeighborhoods();
		}, 10);
		return;
	}

	// Create arbitrary geoJSON point to submit to turfjs function
	const pt = {
		type: 'Feature',
		properties: {
			'marker-color': '#00FF00'
		},
		geometry: {
			type: 'Point',
			coordinates: [focusLon, focusLat]
		}
	};


	markerLayer.addData(pt);
	map.setView([focusLat, focusLon], 15);

	// Loop through all GeoJSON features, break if one selected, and change answerElement
	for (let i = 0; i <= neighborhoods.features.length; ++i) {
		let feature = neighborhoods.features[i];
		if (gju.pointInPolygon(pt.geometry, feature.geometry)) {
			// Get var of p tag that will hold neighborhood answer
			loadingElement.style.display = 'none';
			resultsElement.style.display = 'block';

			locationElement.innerText = feature.properties.Name;
			break;
		}
	}
}

function loadGeolocation() {
	const success = position => {
		focusLat = position.coords.latitude;
		focusLon = position.coords.longitude;
		searchNeighborhoods();
	};

	const error = err => {
		console.warn(`ERROR(${err.code}): ${err.message}`);
	};

	const options = {
		enableHighAccuracy: true,
		timeout: 60000, // 1 minute
		maximumAge: 60000, // 1 minute
	};

	navigator.geolocation.getCurrentPosition(success, error, options);
}

function parseGeoDate(data) {
	neighborhoods = data;

	function onEachFeature(feature, layer) {
		layer.bindPopup(
			`<strong>Neighborhood:</strong> ${feature.properties.Name}`
		);
	}

	const chigeo = L.geoJson(neighborhoods, {
		style: {
			color: 'rgba(255, 0, 0, 0.4)',
			weight: 1.5
		},
		onEachFeature
	});


	map.addLayer(chigeo);

	const overlay = {
		Neighborhoods: chigeo
	};

	L.control.layers(null, overlay).addTo(map);
}

function init() {
	createMap();
	ipLookUp();

	// Load geolocation check
	loadGeolocation();
}

// Use HTML5 geolocation on page load, otherwise throw error
window.addEventListener('load', init);