"use strict";

function randomHomeInfo() {
    let infos = [
        "情况嘛就是这么个情况，具体什么情况还得看情况",
        "这么晚还没睡的人应该还没睡吧",
        "在令人失望这件事情上，咱从来不让人失望",
        "如果你和大多数人一样的话，那么和大多数人一样，你不知道自己和大多数人一样",
        "努力不一定被别人看到，但休息一定会",
        "后天的努力最重要，今天和明天先睡大觉",
        "<code>cat /dev/random > /dev/null</code>",
        "谁都可以睡，但是不能笑",
        "让我们说中文",
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
