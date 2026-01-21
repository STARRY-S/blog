"use strict";

function randomHomeInfo() {
    let infos = [
        "<code>cat /dev/random > /dev/null</code>",
        "It works in my container!",
        "It works on my machine!",
        "<code>OOMKilled</code>",
        "<code>CrashLoopBackOff</code>",
        "<code>ImagePullBackOff</code>",
        "<code>net/http: TLS handshake timeout</code>",
        "<code>read: connection reset by peer</code>",
        "<code>x509: certificate signed by unknown authority</code>",
        "<code>unexpected EOF</code>",
        "<code>i/o timeout</code>",
        "<code>EOF</code>",
        "<code>unexpected EOF</code>",
        "<code>context deadline exceeded</code>",
        "<code>there is nothing to do</code>",
        "<code>\"use strict\";</code>",
        "<code>undefined</code>",
        "Immutable images, mutable feelings.",
        "Rolling updates, rolling eyes.",
        "Everything is a file; some are feelings.",
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
