console.log("IT'S ALIVE");

let pages = [
{url: '', title: 'Home'},
{url: 'projects/', title: 'Projects'},
{url: 'contact/', title: 'Contact'},
{url: 'CV/', title: 'CV'},
{url: 'https://github.com/dar0010', title: 'My GitHub'},
];

let nav = document.createElement('nav');
document.body.prepend(nav);

const BASE_PATH = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? "/"
    : "/website/";

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const autoLabel = prefersDark ? 'Automatic (Dark)' : 'Automatic (Light)';

for(let p of pages) {
    let url = p.url;
    let title = p.title;

    url = !url.startsWith('http') ? BASE_PATH + url : url;
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);
    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add('current');
    }
    if (a.host !== location.host){
        a.target = "_blank";
    }
}

document.body.insertAdjacentHTML(
    'afterbegin',
    `
      <label class="color-scheme">
          Theme:
          <select>
              <option value="light dark">${autoLabel}</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
          </select>
      </label>`,
  );

let select = document.querySelector('select');


if ('colorScheme' in localStorage) {
    let savedScheme = localStorage.colorScheme;
    document.documentElement.style.setProperty('color-scheme', savedScheme);
    select.value = savedScheme;
}

select.addEventListener('input', function(event) {
    let selectedScheme = event.target.value;
    console.log('color scheme changed to', selectedScheme);
    localStorage.colorScheme = selectedScheme;
    document.documentElement.style.setProperty('color-scheme', selectedScheme);

});

let form = document.querySelector('form');
form?.addEventListener('submit',  function(event) {
    event.preventDefault();
    const data = new FormData(form);
    let params = [];
    for (let [name, value] of data) {
        params.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
    }

    const queryString = params.join('&');
    const url = `${form.action}?${queryString}`;

    console.log(url);
    location.href = url;
});