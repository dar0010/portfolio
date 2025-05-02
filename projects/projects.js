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

let colors = d3.scaleOrdinal(d3.schemeTableau10);

let selectedIndex = -1;

function renderPieChart(projectsGiven) {
  const rolledData = d3.rollups(projectsGiven, v => v.length, d => d.year);
  const data = rolledData.map(([year, count]) => ({ value: count, label: year }));
  const sliceGenerator = d3.pie().value(d => d.value);
  const arcData = sliceGenerator(data);
  const arcs = arcData.map(d => arcGenerator(d));

  const svg = d3.select('svg');
  svg.selectAll('path').remove();

  const legend = d3.select('.legend');
  legend.selectAll('li').remove();

  // Draw the wedges
  arcs.forEach((arc, i) => {
    svg.append('path')
      .attr('d', arc)
      .attr('fill', colors(i)) // base color
      .attr('style', `--color: ${colors(i)}`) // assign base color to --color
      .attr('class', i === selectedIndex ? 'selected' : null)
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;

        svg.selectAll('path')
          .attr('class', (_, idx) => (
            idx === selectedIndex ? 'selected' : null
          ));

        legend.selectAll('li')
          .attr('class', (_, idx) => (
            idx === selectedIndex ? 'legend-li selected' : 'legend-li'
          ));

          
        let searchFiltered = getSearchFilteredProjects();
        
          if (selectedIndex === -1) {
          renderProjects(searchFiltered, projectsContainer, 'h2');
          
        } else {
          const selectedYear = data[selectedIndex].label;
          const filtered = searchFiltered.filter(p => p.year === selectedYear);
          renderProjects(filtered, projectsContainer, 'h2');
          
        }
      });
  });

  // Draw the legend
  data.forEach((d, i) => {
    legend.append('li')
      .attr('class', i === selectedIndex ? 'legend-li selected' : 'legend-li')
      .attr('style', `--color: ${colors(i)}`) // base color for swatch
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;

        svg.selectAll('path')
          .attr('class', (_, idx) => (
            idx === selectedIndex ? 'selected' : null
          ));

        legend.selectAll('li')
          .attr('class', (_, idx) => (
            idx === selectedIndex ? 'legend-li selected' : 'legend-li'
          ));
        
        let searchFiltered = getSearchFilteredProjects();
        
        if (selectedIndex === -1) {
          renderProjects(searchFiltered, projectsContainer, 'h2');
          
        } else {
          const selectedYear = data[selectedIndex].label;
          const filtered = searchFiltered.filter(p => p.year === selectedYear);
          renderProjects(filtered, projectsContainer, 'h2');
          
        }
      });
  });
}


function setQuery(queryString) {
  currentSearchQuery = queryString.toLowerCase();
  return projects.filter(project => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(currentSearchQuery);
  });
}

function getSearchFilteredProjects() {
  return projects.filter(project => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(currentSearchQuery);
  });
}


let currentSearchQuery = '';
// Call this function on page load
renderPieChart(projects);



let searchInput = document.querySelector('.searchBar');


searchInput.addEventListener('input', (event) => {
  let filteredProjects = setQuery(event.target.value);
  // re-render legends and pie chart when event triggers
  renderProjects(
    selectedIndex === -1
      ? filteredProjects
      : filteredProjects.filter(p => p.year === data[selectedIndex].label),
    projectsContainer,
    'h2'
  );
  renderPieChart(filteredProjects);
});
