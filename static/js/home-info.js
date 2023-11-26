"use strict";

function randomHomeInfo() {
    let zh = [
        "情况嘛就是这么个情况，具体什么情况还得看情况",
        "听了你的分析，我决定自己再分析分析",
        "现在的年轻人啊，和老一辈比起来真的年轻",
        "吃饱了就不饿了",
        "睡觉的时候一定要闭上眼，不然会睡不着",
        "这么晚还没睡的人应该还没睡吧",
        "回想起昨天，仿佛在昨天",
        "年轻人不要太年轻",
        "关于明天的事后天就知道了",
        "早餐记得空腹吃哦",
        "每次我不知道说什么的时候我就不知道说什么",
        "在令人失望这件事情上从来不让人失望",
        "能力越大，能力就越大",
        "恭喜你被我恭喜了！",
        "上次见面的时候还是在上次",
        "这白开水怎么没味儿啊",
        "如果你和大多数人一样的话，那么和大多数人一样，你不知道自己和大多数人一样",
        "<code>cat /dev/random > /dev/null</code>",
    ];
    let en = [
        "Morning.",
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
