import { fetchJSON, renderProjects, fetchGithubData } from "./global.js";

const projects = await fetchJSON('./lib/projects.json');
console.log(projects)
const latestProjects = projects.slice(0,3);

const projectsContainer = document.querySelector('.projects');

renderProjects(latestProjects, projectsContainer, 'h3');

const githubData = await fetchGithubData('dar0010');

const profileStats = document.querySelector('#profile-stats');

if (profileStats) {
    profileStats.innerHTML = `
        <h2>My GitHub Stats</h2>
        <dl>
            <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
            <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
            <dt>Followers:</dt><dd>${githubData.followers}</dd>
            <dt>Following:</dt><dd>${githubData.following}</dd>
        </dl>
    `;
}