"use strict";
// Write your custom JavaScript code here.

function addScript(url){
	var script = document.createElement("script");
	script.setAttribute("type","text/javascript");
	script.setAttribute("src", "https://www.googletagmanager.com/gtag/js?id=G-70DHXLE02Z");
    script.setAttribute("async");
	document.getElementsByTagName("head")[0].appendChild(script);
}

addScript();
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag("js", new Date());

gtag("config", "G-70DHXLE02Z");
