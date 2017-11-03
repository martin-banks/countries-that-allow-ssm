// import Config from './config.json'
// import Styles from './app.sass'
// import Content from './content/index'
import start from './startApp'
import layout from './layout'

// import world from './content/world_medium.json'
import world from './content/world-110m.json'
import countryNames from './content/world-country-names.json'
import mapTopo from './content/mapTopo.json'
import mapGeo from './content/mapGeo.json'

import renderGlobe from './d3_globe'

console.log(world)

// Start and Render app
const APP = start({ inner: layout() })
APP.render()

setTimeout(function() {
	renderGlobe({ world, names: countryNames, mapTopo, mapGeo })
	
}, 1000);
