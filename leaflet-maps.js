let leafletMap = null;

function displayStickyMap(lat, long, zoom) {
  /* DEBUGGING
  console.log("Displaying map:", { lat, long, zoom });
  const container = document.getElementById("sticky-map-container");
  console.log("Container dimensions:", {
    width: container.clientWidth,
    height: container.clientHeight,
    display: window.getComputedStyle(container).display,
  });
  */

  if (!leafletMap) {
    createStickyMap(lat, long, zoom);
  } else {
    moveStickyMapLocation(lat, long, zoom);
  }
  // leafletMap.invalidateSize();
}

function moveStickyMapLocation(lat, long, zoom) {
  const options = {
    duration: 1.0, // Duration of the animation in seconds
    easeLinearity: 0.1, // How "smooth" the flyTo animation is
    noMoveStart: false, // Whether to trigger movestart event
  };
  leafletMap.flyTo([lat, long], zoom, options);
}

function createStickyMap(lat, long, zoom) {
  leafletMap = L.map("sticky-map-container", {
    center: [lat, long],
    zoom: zoom,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(leafletMap);

  leafletMap.scrollWheelZoom.disable();

  handleResizeEvents();
}

function handleResizeEvents() {
  // Add event listener to handle display changes
  const mapContainer = document.getElementById("sticky-map-container");
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "style") {
        const display = window.getComputedStyle(mapContainer).display;
        if (display !== "none") {
          leafletMap.invalidateSize();
        }
      }
    });
  });

  observer.observe(mapContainer, {
    attributes: true,
    attributeFilter: ["style"],
  });
}
