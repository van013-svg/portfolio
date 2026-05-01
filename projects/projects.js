import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');

const titleEl = document.querySelector('.projects-title');

let query = '';
let selectedIndex = -1;

if (titleEl) {
  titleEl.textContent = projects.length;
}

renderProjects(projects, projectsContainer, 'h2');

function renderPieChart(projectsGiven) {
  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  let data = rolledData.map(([year, count]) => ({
    label: year,
    value: count
  }));

  let sliceGenerator = d3.pie().value(d => d.value);
  let arcData = sliceGenerator(data);

  let arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  let svg = d3.select('#projects-pie-plot');

  svg.selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', d => arcGenerator(d))
    .attr('fill', (_, i) => colors(i))
    .attr('class', (_, i) =>
      i === selectedIndex ? 'selected' : null
    )
    .on('click', (event, d) => {
      const i = arcData.indexOf(d);
      selectedIndex = selectedIndex === i ? -1 : i;
      renderPieChart(projectsGiven);
    });

  let legend = d3.select('.legend');

  legend.selectAll('li')
    .data(data)
    .join('li')
    .attr('style', (d, i) => `--color:${colors(i)}`)
    .attr('class', (_, i) =>
      i === selectedIndex ? 'selected' : null
    )
    .html(d => `<span class="swatch"></span> ${d.label} (${d.value})`);
}

renderPieChart(projects);
searchInput.addEventListener('input', (event) => {
  query = event.target.value;

  let filteredProjects = projects.filter((project) =>
    Object.values(project)
      .join(' ')
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  renderProjects(filteredProjects, projectsContainer, 'h2');
  
  selectedIndex = -1;
  
  renderPieChart(filteredProjects);
});