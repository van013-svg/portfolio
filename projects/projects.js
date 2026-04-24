import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');

const titleEl = document.querySelector('.projects-title');

if (titleEl) {
  titleEl.textContent = `${projects.length} Projects`;
}

renderProjects(projects, projectsContainer, 'h2');