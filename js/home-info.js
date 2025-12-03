"use strict";

function randomHomeInfo() {
    let infos = [
        "<code>cat /dev/random > /dev/null</code>",
        "It works in my container!",
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
