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

