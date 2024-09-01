"use strict";

function randomHomeInfo() {
    let zh = [
        "情况嘛就是这么个情况，具体什么情况还得看情况",
        "这么晚还没睡的人应该还没睡吧",
        "在令人失望这件事情上，咱从来不让人失望",
        "如果你和大多数人一样的话，那么和大多数人一样，你不知道自己和大多数人一样",
        "努力不一定被别人看到，但休息一定会",
        "后天的努力最重要，今天和明天先睡大觉",
        "<code>cat /dev/random > /dev/null</code>",
        "小心福瑞控",
        "这里是福瑞控，该小心的是你",
    ];
    let en = [
        "Morning.",
        "Don't try to be a hero.",
        "<code>cat /dev/random > /dev/null</code>",
    ]

    let infos = zh;
    const pathname = window.location.pathname;
    if (pathname.startsWith("/en/")) {
        infos = en;
    }
    return infos[Math.floor(Math.random() * infos.length)];
}

(() => {
    let s = document.getElementById("random-home-info");
    if (!s) {
        return;
    }
    s.innerHTML = randomHomeInfo();
})();
