var TIMEOUT_TIME = 750;

var map;
var geocoder;
var timeoutPID;
var inputElement;
var canvasElement;
var answerElement;
var marker;
var RESET_TITLE;
var RESET_CENTER;
var RESET_ZOOM;
var FOUNT_ZOOM;

var initialize = function() {
    RESET_TITLE = document.title;
    RESET_CENTER = new google.maps.LatLng(41.875696, -87.624207);
    RESET_ZOOM = 12;
    FOUNT_ZOOM = 15;
    canvasElement = document.getElementsByTagName('div')[0];


    var mapOptions = {
        center: RESET_CENTER,
        zoom: RESET_ZOOM,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true
    };

    map = new google.maps.Map(
        canvasElement,
        mapOptions
    );

    google.maps.Map.prototype.clearOverlays = function() {
        for (var i = 0; i < markersArray.length; i++ ) {
            markersArray[i].setMap(null);
        }
    };

    geocoder = new google.maps.Geocoder();

    var keyup = function() {
        updateMap(this.value, false);
    };

    var blur = function(event) {
        updateMap(this.value, true);
        ga('send', 'event', 'form', event.type);
        return false;
    };

    var updateMap = function(address, toFormat) {
        window.clearTimeout(timeoutPID);

        timeoutPID = window.setTimeout(function() {
            codeAddress(address, toFormat);
        }, TIMEOUT_TIME);
    };

    var form = document.getElementsByTagName('form')[0];
    inputElement = document.getElementsByTagName('input')[0];
    answerElement = document.getElementsByTagName('p')[0];

    addListener(inputElement, 'keyup', keyup);
    addListener(inputElement, 'blur', blur);
    addListener(form, 'submit', blur);
};

var centerMap = function() {
    var position = RESET_CENTER;
    var zoom = RESET_ZOOM;

    if (marker != null) {
        position = marker.position;
        zoom = FOUNT_ZOOM;
    }

    map.setCenter(position);
    map.setZoom(zoom);
};

var codeAddress = function(address, toFormat) {
    if (address.length === 0) {
        resetMap();
        return;
    }

    var findType = function(result, type) {
        var i = 0;
        var l = result.address_components.length;
        var component;

        for(; i < l; i++) {
            component = result.address_components[i];
            if (component.types[0] == type) {
                return component;
            }
        }

        return false;
    };

    var callback = function(results, status) {
        if (status != google.maps.GeocoderStatus.OK) {
            resetMap();
            ga('send', 'event', 'result', 'failed');
            return;
        }

        var result = results[0];


        var neighborhood = findType(result, 'neighborhood').long_name;

        if (!neighborhood || !neighborhood.length) {
            inputElement.className = 'invalid';
            resetMap();
            return;
        }

        inputElement.className = 'valid';

        var country = findType(result, 'country').long_name;
        var administrative_area_level_1 = findType(result, 'administrative_area_level_1').long_name;

        ga('send', 'event', 'country', country);
        ga('send', 'event', 'state', administrative_area_level_1);
        ga('send', 'event', 'neighborhood', neighborhood);

        map.setZoom(FOUNT_ZOOM);
        map.setCenter(result.geometry.location);

        if (marker == null) {
            marker = new google.maps.Marker({
                map: map,
                position: result.geometry.location
            });
        } else {
            marker.setPosition(result.geometry.location);
        }

        updateNeighborhood(neighborhood);

        if (toFormat) {
            inputElement.value = result.formatted_address;
        }
    };

    geocoder.geocode( { 'address': address }, callback);
};

var resetMap = function() {
    document.title = RESET_TITLE;
    answerElement.style.display = 'none';
    answerElement.innerHTML = '';

    if (marker) {
        marker.setMap(null);
        marker = null;
    }

    centerMap();
};

var updateNeighborhood = function(neighborhood) {

    if (!neighborhood || neighborhood.length === 0) {
        resetMap();
        return;
    }

    var text = 'You live in "' + neighborhood + '".';

    document.title = text;

    answerElement.style.display = 'block';
    answerElement.innerHTML = text;

};

google.maps.event.addDomListener(window, 'load', initialize);
google.maps.event.addDomListener(window, 'resize', centerMap);

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)})(window,document,'script','//www.google-analytics.com/analytics.js','ga');ga('create', 'UA-40976307-3', 'dev.mn');ga('send', 'pageview');

/**
 * Utility to wrap the different behaviors between W3C-compliant browsers
 * and IE when adding event handlers.
 *
 * @param {Object} element Object on which to attach the event listener.
 * @param {string} type A string representing the event type to listen for
 *     (e.g. load, click, etc.).
 * @param {function()} callback The function that receives the notification.
 */
function addListener(element, type, callback) {
    if (element.addEventListener) element.addEventListener(type, callback);
    else if (element.attachEvent) element.attachEvent('on' + type, callback);
}
