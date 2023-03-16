let map: google.maps.Map, infoWindow: google.maps.InfoWindow, activeMarkers: google.maps.Marker[];

interface ChargingStation {
    Name: string;
    PhoneNumber: string;
    IntersectionDirections: string;
    AccessTime: string;
    Connectors: string[];
    Network: string;
    Pricing: string;
    FacilityType: string;
    RestrictedAccess: boolean;
    CntLevel2Chargers: number;
    CntLevel3Chargers: number;
}

interface Location {
    StreetAddress: string;
    City: string;
    State: string;
    Country: string;
    Zip: string;
    GeocodeStatus: string;
    Coordinates: number[];
    CoordinateString: string;
    Stations: ChargingStation[];
}

interface ChargingLocation {
    Dist: number;
    Loc: Location;
}

interface Position {
    lat: number;
    lng: number;
}

function loadNearestStations(map: google.maps.Map, pos: Position) {
    const distanceText = document.getElementById("dist") as HTMLInputElement;
    const countText = document.getElementById("countlimit") as HTMLInputElement;

    var dist = 10;
    if (distanceText != null) {
        var inputDist = Number(distanceText.value)
        if (!isNaN(inputDist) && inputDist > 0) {
            dist = inputDist
        }
    }

    var countLimit = 10;
    if (countText != null) {
        var inputCount = Number(countText.value)
        if (!isNaN(inputCount) && inputCount > 0) {
            countLimit = inputCount
        }
    }
    const req = fetch("https://kevinfwu.com/getnearest", {
        method: 'POST',
        body: JSON.stringify({ latitude: pos.lat, longitude: pos.lng, distance: dist, countlimit: countLimit }),
        headers: { 'Content-Type': 'application/json' }
    });

    req.then((response) => {
        if (response.status >= 400) {
            console.error('HTTP Error: ' + response.status + ' - ' + response.statusText);
        }
        else {
            response.text().then((respBody) => {
                let stations: ChargingLocation[] = JSON.parse(respBody);

                if (stations.length == 0) {
                    return;
                }

                // For each location, get the icon, name and location.
                const bounds = new google.maps.LatLngBounds();

                if (activeMarkers != null) {
                    activeMarkers.forEach((marker) => {
                        marker.setMap(null);
                    });
                }
                activeMarkers = [];

                for (let i = 0; i < stations.length; i++) {
                    let station = stations[i];

                    const stationPos = { lat: station.Loc.Coordinates[0], lng: station.Loc.Coordinates[1] };

                    // Create a marker for each place.
                    activeMarkers.push(
                        new google.maps.Marker({
                            map: map,
                            title: station.Loc.Stations[0].Name,
                            position: stationPos,
                        })
                    );

                    //        if (place.geometry.viewport) {
                    //          // Only geocodes have viewport.
                    //          bounds.union(place.geometry.viewport);
                    //        } else {
                    bounds.extend(stationPos);
                    //        }
                }
                map.fitBounds(bounds);
            }).catch((error) => {
                console.error("Error parsing JSON" + error);
            })
        }
    }).catch((error) => {
        console.error("Error fetching nearest" + error);
    })
}

function addMapButton(map: google.maps.Map, btn: HTMLButtonElement, location: number) {

    // Set CSS for the control.
    btn.style.backgroundColor = '#fff';
    btn.style.border = '2px solid #fff';
    btn.style.borderRadius = '3px';
    btn.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    btn.style.color = 'rgb(25,25,25)';
    btn.style.cursor = 'pointer';
    btn.style.fontFamily = 'Roboto,Arial,sans-serif';
    btn.style.fontSize = '16px';
    btn.style.lineHeight = '38px';
    btn.style.margin = '4px 8px 4px 22px';
    btn.style.textAlign = 'center';
    var computedStyle = getComputedStyle(btn);

    var elementHeight = btn.clientHeight;  // height with padding
    var elementWidth = btn.clientWidth;   // width with padding

    elementHeight -= parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
    elementWidth -= parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);

    if (elementWidth < 38) {
        const padding = (38 - elementWidth)/2;
        console.log("padding is " + padding.toString());
        btn.style.padding = '0 ' + padding.toString() + 'px 0 ' + padding.toString() + 'px';
    }

    map.controls[location].push(btn);
}

function initSearchBar(map: google.maps.Map) {
    // Create the search box and link it to the UI element.
    const input = document.getElementById("searchloc") as HTMLInputElement;
    const searchBox = new google.maps.places.SearchBox(input);

    map.controls[google.maps.ControlPosition.TOP_CENTER].push(input);

    // Bias the SearchBox results towards current map's viewport.
    map.addListener("bounds_changed", () => {
        searchBox.setBounds(map.getBounds() as google.maps.LatLngBounds);
    });

    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener("places_changed", () => {
        var filters = document.getElementById("filters") as HTMLDivElement;
        filters.style.display = "none";
        const places = searchBox.getPlaces();
    
        if (typeof places === 'undefined' || places.length == 0) {
            return;
        }

        const pos = places[0]?.geometry?.location;

        if (typeof pos === 'undefined') {
            return
        }

        loadNearestStations(map, { lat: pos.lat(), lng: pos.lng()});
    });
}

function initCurrentLoc(map: google.maps.Map) {
    infoWindow = new google.maps.InfoWindow();
    const confirmingtsentry = new google.maps.InfoWindow();

    const locationButton = document.getElementById("currentloc") as HTMLButtonElement;

    locationButton.addEventListener("click", () => {
        // Try HTML5 geolocation.
        if (navigator.geolocation && confirmingtsentry != null) {
            navigator.geolocation.getCurrentPosition(
                (position: GeolocationPosition) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };

                    var filters = document.getElementById("filters") as HTMLDivElement;
                    filters.style.display = "none";
                    infoWindow.setPosition(pos);
                    infoWindow.setContent("Location found.");
                    infoWindow.open(map);
                    map.setCenter(pos);
                    loadNearestStations(map, pos);
                },
                () => {
                    handleLocationError(true, infoWindow, map.getCenter()!);
                }
            );
        } else {
            // Browser doesn't support Geolocation
            handleLocationError(false, infoWindow, map.getCenter()!);
        }
    });

    addMapButton(map, locationButton, google.maps.ControlPosition.RIGHT_CENTER);
}

function initFilters(map: google.maps.Map) {

    var filters = document.getElementById("filters") as HTMLDivElement;
    const filtersButton = document.getElementById("filtersBtn") as HTMLButtonElement;
    const closeFilters = document.getElementById("closeFiltersBtn") as HTMLSpanElement;

    addMapButton(map, filtersButton, google.maps.ControlPosition.RIGHT_CENTER);
    
    filtersButton.addEventListener("click", () => {
        filters.style.display = "block";
    });
    map.controls[google.maps.ControlPosition.RIGHT_CENTER].push(filtersButton);
    closeFilters.addEventListener("click", () => {
        filters.style.display = "none";
    });
    window.addEventListener("click", (event) => {
        if (event.target == filters) {
            filters.style.display = "none";
        }
    });
    initSearchBar(map);
    initCurrentLoc(map);
}

function initMap() {
    const headerHeight = document.getElementById("header-desktop")?.offsetHeight;
    var mapElem = document.getElementById("map") as HTMLElement;

    var map = new google.maps.Map(
        mapElem,
        {
            center: { lat: 40.7128, lng: -74.006 },
            zoom: 13,
            mapTypeId: "roadmap",
        }
    );
    if (headerHeight != 0) {
        mapElem.style.top = headerHeight?.toString()+"px";
        mapElem.style.height = "calc(100% - " + headerHeight?.toString()+"px)";
    }

    initFilters(map);
}

function handleLocationError(
    browserHasGeolocation: boolean,
    infoWindow: google.maps.InfoWindow,
    pos: google.maps.LatLng
) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(
        browserHasGeolocation
            ? "Error: The Geolocation service failed."
            : "Error: Your browser doesn't support geolocation."
    );
    infoWindow.open(map);
}

declare global {
    interface Window {
        initMap: () => void;
    }
}
window.initMap = initMap;

export { };