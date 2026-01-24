"use strict";

function randomHomeInfo() {
    let infos = [
        "It works in my container!",
        "It works on my machine!",
        "Immutable images, mutable feelings.",
        "Rolling updates, rolling eyes.",
        "Everything is a file; some are feelings.",
        "<code>unexpected EOF</code>",
        "<code>pacman: there is nothing to do</code>",
        "<code>cat /dev/random > /dev/null</code>",
    ];
    return infos[Math.floor(Math.random() * infos.length)];
}

(() => {
    let s = document.getElementById("random-home-info");
    if (!s) {
        return;
    }
    s.innerHTML = randomHomeInfo();
})();
