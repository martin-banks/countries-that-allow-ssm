/* global topojson */
/* eslint-disable */
// event needs a bound import to function correctly
import * as event from 'd3-selection'
// import locationContent from './content/locations'
import Content from './content/index'
const d3 = Object.assign(
	{},
	require('d3-geo'),
	require('d3-selection'),
	require('d3-drag'),
	require('d3-transition'),
	require('d3-interpolate'),
)
d3.event = event
/* eslint-enable */

// TODO - move to globals
let locationIndex = 0
let previousIndex = 0

const projectionTypes = {
	globe: {
		type: d3.geoOrthographic().rotate([0, 0]).center([0, 0]),
		clip: 90,
	},
	flat: {
		type: d3.geoEquirectangular().rotate([0, 0]).center([0, 0]),
		clip: 0,
	},
}

function renderGlobe({ world, names, mapTopo, mapGeo } = {}) {
	// set globe size
	const width = window.innerWidth
	const height = window.innerHeight
	const sens = 0.25
	let focused = null // used in drag events, currently disabled

	// Setting projection
	const { type, scale } = Content.parts[locationIndex].location
	const proj = projectionTypes[type]
	// console.log(proj)
	// const projectionFrom = projectionTypes[Content.parts[previousIndex].location.type].type
	// const projectionTo = projectionTypes[Content.parts[locationIndex].location.type].type
	// console.log(projectionTween(projectionFrom, projectionTo))

	let projection = projectionTypes[type].type
	// const projection = projectionTween(projectionFrom, projectionTo)
		.scale(Math.min(width, height) * scale)
		.rotate([0, 0])
		.translate([width / 2, height / 2])
		.clipAngle(proj.clip)

	let path = d3.geoPath()
		.projection(projection)

	// SVG container
	const svg = d3.select('#globeContainer')
		.append('svg')
		.attr('width', width)
		.attr('height', height)
		.attr('class', 'globe')


	// Adding water background
	svg.append('path')
		.datum({ type: 'Sphere' })
		.attr('class', 'water')
		.attr('d', path)

	// adding globe grid lines
	svg.append('path')
		.datum(d3.geoGraticule())
		.attr('class', 'graticule')
		.attr('d', path)


	const countryTooltip = d3
		.select('#globeContainer')
		.append('div')
		.attr('class', 'countryTooltip')


	// country names are missing from world data, find them by matching id to name and filter anything missing
		const countries = topojson.feature(world, world.objects.countries).features
		// const countries = world.objects.countries.geometries
		.map(country => {
			const foundName = names.find(n => parseInt(n.id, 10) === parseInt(country.id, 10))
			const output = country
			const nameToUse = (foundName ? foundName.name : '')
			output.name = nameToUse
			return output
		})
		.filter(country => country.name)

	const countryById = countries.reduce((output, country) => {
		const countryUpdate = output
		countryUpdate[country.id] = country.name
		return countryUpdate
	}, {})

	const getRotationPosition = () => {
		const r = projection.rotate()
		return { x: r[0] / sens, y: -r[1] / sens }
	}

	const dragRotate = () => {
		// if (/iPad|Android|webOS|iPhone|iPod|Blackberry/.test(navigator.userAgent) && !window.MSStream) return
		// const rotate = projection.rotate();

		// // TODO - rewrite to support v4
		// // https://stackoverflow.com/questions/43772975/drag-rotate-projection-in-d3-v4
		// // https://jsfiddle.net/usze5ej2/
		// projection.rotate([d3.event.x * sens, -d3.event.y * sens, rotate[2]]);
		// svg.selectAll("path.land").attr("d", path);
		// svg.selectAll("path.circle").attr("d", path);
		// svg.selectAll("path.graticule").attr("d", path);
		// svg.selectAll(".focused").classed("focused", focused = false);
	}


	// TODO - refactor into main content obj and refactor refernces



	const locations = Content.parts.map(l => {
		const updateLocations = l.location
		const { country } = l.location
		updateLocations.country = countries.filter(c => c.name.toLowerCase().includes(country))[0]
		return updateLocations
	})

	const sections = document.querySelectorAll('[data-type="editorialsection"]')

	window.addEventListener('scroll', () => {
		sections.forEach(section => {
			const thisIndex = parseInt(section.getAttribute('data-index'), 10)
			if (thisIndex === locationIndex) return
			const { top } = section.getBoundingClientRect()
			if (top < window.innerHeight && top > 0) {
				previousIndex = locationIndex
				locationIndex = thisIndex
				transition()
			}
		})
	})

	// render globe background 'water' lement
	const svgWater = svg.selectAll('path.water') // eslint-disable-line
		.call(d3.drag()
			.subject(getRotationPosition)
			.on('drag', dragRotate))

	// Drawing countries on the globe
	const svgWorld = svg.selectAll('path.land') // eslint-disable-line
		.data(countries)
		.enter()
		.append('path')
		.attr('class', 'land')
		.attr('d', path)
		.call(d3 // add drag behaviour
			.drag()
			.subject(getRotationPosition)
			.on('drag', dragRotate)
		)
		.on('mousemove', function (d) {
			countryTooltip
				.text(countryById[d.id])
				.style('left', `${d3.mouse(this)[0] + 7}px`)
				.style('top', `${d3.mouse(this)[1] - 15}px`)
				.style('display', 'block')
				.style('opacity', 1)
			})
			// .on('mouseout', d => {
			// 	countryTooltip
			// 		.style('opacity', 1)
			// 		.style('display', 'block')
			// })
			// .on('mousemove', d => {
			// 	countryTooltip
			// 		.style('left', `${d3.event.pageX + 7}px`)
			// 		.style('top', `${d3.event.pageY - 15}px`)
			// 		.style('display', 'block')
			// 		.style('opacity', 1)
		// })

	// add circle mapped to projection - tester
	// TODO - refactor from main content
	const circleStart = () => {
		const { country, circle } = locations[locationIndex]
		return {
			angle: 50 * circle,
			origin: country ? country.geometry.coordinates[0][0][0] : [0, 0],
		}
	}

	// TODO - create factories for SVG templates
	const svgCircle = svg
		.append('path')
		.datum(d3
			.geoCircle()
			.center([0, 0])
			.radius([circleStart().angle])()
		)
		.attr('class', 'circle')
		.attr('d', path)
		.call(d3.drag()
			.subject(getRotationPosition)
			.on('drag', dragRotate)
		)

		function update(option) {
			svg.selectAll("path")
				.interrupt()
				.transition()
				.duration(1000)
				// .ease(d3.easeLinear)
				.attrTween("d", projectionTween(projection, projection = option))
			// d3.timeout(loop, 1000)
		}
		function projectionTween(projection0, projection1) {
			// console.log('changing projection')
			return function(d) {
				// console.log('d', { d })
				var t = 0;
				var projection = d3.geoProjection(project)
						.scale(1)
						.translate([width / 2, height / 2]);
				var path = d3.geoPath(projection);
				function project(λ, φ) {
					λ *= 180 / Math.PI, φ *= 180 / Math.PI;
					var p0 = projection0([λ, φ]), p1 = projection1([λ, φ]);
					return [(1 - t) * p0[0] + t * p1[0], (1 - t) * -p0[1] + t * -p1[1]];
				}
				return function(_) {
					t = _;
					return path(d);
				};
			};
		}
	// Country focus on option select
	function transition() {
		// const rotate = projection.rotate() // unused
		// console.log('focussed', locations, locationIndex)
		const focusedCountry = locations[locationIndex].country
		if (!focusedCountry) return
		const p = d3.geoCentroid(focusedCountry) // TODO - remove single latter naming
		const circleTweenFromAngle = circleStart().angle
		const newAngle = (50 * locations[locationIndex].circle)
		circleStart().angle = newAngle
		d3.transition()
			.duration(2500)
			.tween('scale', () => {
				const r = d3.interpolate(projection.rotate(), [-p[0], -p[1]]);
				const circleTweenAngle = d3.interpolate(circleTweenFromAngle, newAngle)
				// console.log(locations[locationIndex])
				const scaleTweenFrom = projection.scale()
				const scaleTweenTo = (Math.min(width, height) * locations[locationIndex].scale)
				const scaleTween = d3.interpolate(scaleTweenFrom, scaleTweenTo)

				const projectionFrom = projectionTypes[Content.parts[previousIndex].location.type].type
				const projectionTo = projectionTypes[Content.parts[locationIndex].location.type].type
				// console.log({ projectionFrom, projectionTo })
				// update(projectionTo)
				// console.log(previousIndex, locationIndex)

				// projectionTween(projectionFrom, projectionTo)
				return t => {
					svgCircle
						.datum(d3
							.geoCircle()
							.radius(circleTweenAngle(t))
						)
						.attr('d', path);

					projection
						.rotate(r(t))
						.scale(scaleTween(t))

					svg
						.selectAll('path')
						.attr('d', path)
						// .attrTween("d", projectionTween(projection, projection = projectionTo))
						// TODO - what is this?
						.classed('focused', d => d.id === focusedCountry.id ? focused = d : false)
				};
			})
	}
	transition()

}


export default renderGlobe
