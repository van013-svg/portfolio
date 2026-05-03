import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');

let query = '';
let selectedIndex = -1;

function filterProjects() {
  return projects.filter(project =>
    Object.values(project)
      .join(' ')
      .toLowerCase()
      .includes(query)
  );
}

function renderPieChart(projectsGiven) {
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');

  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  const rolled = d3.rollups(
    projectsGiven,
    v => v.length,
    d => d.year
  );

  const data = rolled.map(([year, count]) => ({
    label: year,
    value: count
  }));

  const arcData = d3.pie().value(d => d.value)(data);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

  const color = d3.scaleOrdinal(d3.schemeTableau10);

  svg.selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', arc)
    .attr('fill', (_, i) => color(i))
    .attr('class', (_, i) =>
      i === selectedIndex ? 'selected' : null
    )
    .on('click', (event, d) => {
      const i = d.index;

      selectedIndex = selectedIndex === i ? -1 : i;

      let filtered = filterProjects();

      if (selectedIndex !== -1) {
        const selectedYear = data[selectedIndex].label;
        filtered = filtered.filter(p => p.year === selectedYear);
      }

      renderProjects(filtered, projectsContainer, 'h2');

      svg.selectAll('path')
        .attr('class', (_, idx) =>
          idx === selectedIndex ? 'selected' : null
        );

      legend.selectAll('li')
        .attr('class', (_, idx) =>
          idx === selectedIndex ? 'selected' : null
        );
    });

  legend.selectAll('li')
    .data(data)
    .join('li')
    .attr('style', (_, i) => `--color:${color(i)}`)
    .attr('class', (_, i) =>
      i === selectedIndex ? 'selected' : null
    )
    .html(d => `<span class="swatch"></span> ${d.label} (${d.value})`);
}


renderProjects(projects, projectsContainer, 'h2');
renderPieChart(projects);

searchInput.addEventListener('input', (event) => {
  query = event.target.value.toLowerCase();

  selectedIndex = -1; 

  const filtered = filterProjects();

  renderProjects(filtered, projectsContainer, 'h2');
  renderPieChart(filtered);
});