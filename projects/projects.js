import { fetchJSON, renderProjects } from "../global.js";

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