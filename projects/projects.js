import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');

const titleEl = document.querySelector('.projects-title');

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
  svg.selectAll('path').remove();

  svg.selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', d => arcGenerator(d))
    .attr('fill', (_, i) => colors(i));

  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  legend.selectAll('li')
    .data(data)
    .join('li')
    .attr('style', (d, i) => `--color:${colors(i)}`)
    .html(d => `<span class="swatch"></span> ${d.label} (${d.value})`);
}

renderPieChart(projects);

let query = '';
let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  query = event.target.value;

  let filteredProjects = projects.filter((project) =>
    Object.values(project)
      .join(' ')
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});
