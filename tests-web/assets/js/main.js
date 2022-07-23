import { makeDropHandler, makeLinkHandler, handleDragOver } from "./files.js";
import { makeOpenTest, loadTests } from "./tests.js";

// TODO The hash changes every time the Rust code does, this is very brittle.
// See https://github.com/thedodd/trunk/issues/230 or stop using trunk.
import { import_osm } from "../osm2streets-npm-54d7959f4e2ba1e6.js";

const useMap = (map) => {
  const container = map.getContainer();
  container.ondrop = makeDropHandler(map);
  container.ondragover = handleDragOver;

  map.loadLink = makeLinkHandler(map);
  map.openTest = makeOpenTest(map);
  console.info("New map created! File drops enabled.", container);

  // Here we read the test name from the URL.
  const q = new URLSearchParams(window.location.search);
  if (q.has("test")) {
    const test = q.get("test");
    console.info("Loading test " + test + " from URL.");
    map.openTest(test);
  }

  loadTests();
};

// Initialize the map
const map = L.map("map", { maxZoom: 21 }).setView([40.0, 10.0], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxNativeZoom: 18,
  maxZoom: 21,
  attribution: "© OpenStreetMap",
}).addTo(map);
useMap(map);

// TODO Should this live elsewhere?
// TODO Is it OK to just assume the button exists when this runs?
document.getElementById("import-view").onclick = async function importCurrentView() {
	if (map.getZoom() < 15) {
		window.alert("Zoom in more to import");
	}

	// Grab OSM XML from Overpass
	// (Sadly toBBoxString doesn't seem to match the order for Overpass)
	const b = map.getBounds();
	const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
	const query = `(nwr(${bbox}); node(w)->.x; <;); out meta;`;
	const url = `https://overpass-api.de/api/interpreter?data=${query}`;
	console.log(`Fetching from overpass: ${url}`);

	const resp = await fetch(url);
	// TODO Error handling and such
	const osmXML = await resp.text();

	console.log(`Got XML response, length ${osmXML.length}`);
	const output = import_osm(osmXML, {
		// TODO Ask overpass
		driving_side: "Right",
	});
	console.log(`Got osm2streets output: ${output}`);

	// TODO Definitely time to think about cleaning up old layers
	L.geoJSON(JSON.parse(output), { style: { color: '#f55' }}).addTo(map);
}