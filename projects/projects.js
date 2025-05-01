import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');

const  projectsContainer = document.querySelector('.projects');

function updateProjectCount(projects) {
    const titleElement = document.querySelector('.projects-title');
    
    if (titleElement && Array.isArray(projects)) {
      titleElement.textContent = `${projects.length} Projects`;
    }
  }
  
renderProjects(projects, projectsContainer, 'h2');
updateProjectCount(projects);

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
// let arc = arcGenerator({
//   startAngle: 0,
//   endAngle: 2 * Math.PI,
// });

// d3.select('svg').append('path').attr('d', arc).attr('fill', 'red');

// let data = [1,2];
// let total = 0;

// for(let d of data) {
//   total += d;
// }

// let angle = 0;
// let arcData = [];

// for (let d of data) {
//   let endAngle = angle + (d/total) * 2 * Math.PI;
//   arcData.push({startAngle: angle, endAngle});
//   angle = endAngle;
// }

// let arcs = arcData.map((d) => arcGenerator(d));
// arcs.forEach((arc, idx) => {
//   d3.select('svg')
//   .append('path')
//   .attr('d', arc)
//   .attr('fill', colors[idx]);
// })
let colors = d3.scaleOrdinal(d3.schemeTableau10);

let rolledData = d3.rollups(
  projects,
  (v) => v.length,
  (d) => d.year,
);

let data = rolledData.map(([year, count]) => {
  return {value: count, label: year};
});

let sliceGenerator = d3.pie().value((d) => d.value);
let arcData = sliceGenerator(data);
let arcs = arcData.map((d) => arcGenerator(d));

arcs.forEach((arc, idx) => {
  d3.select('svg')
  .append('path')
  .attr('d', arc)
  .attr('fill', colors(idx));
})

let legend = d3.select('.legend');
data.forEach((d,idx) => {
  legend
  .append('li')
  .attr('class', 'legend-li')
  .attr('style', `--color:${colors(idx)}`)
  .html(`<span class='swatch'></span> ${d.label} <em>(${d.value})</em>`);
});