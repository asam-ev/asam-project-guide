!function(){"use strict";var o=/^sect(\d)$/,i=document.querySelector(".nav-container"),a=document.querySelector(".nav-toggle");a.addEventListener("click",function(e){if(a.classList.contains("is-active"))return u(e);v(e);var t=document.documentElement;t.classList.add("is-clipped--nav"),a.classList.add("is-active"),i.classList.add("is-active");var n=c.getBoundingClientRect(),e=window.innerHeight-Math.round(n.top);Math.round(n.height)!==e&&(c.style.height=e+"px");t.addEventListener("click",u)}),i.addEventListener("click",v);var e,c,r,s,l=i.querySelector("[data-panel=menu]");function t(){var e,t,n=window.location.hash;if(n&&(n.indexOf("%")&&(n=decodeURIComponent(n)),!(e=l.querySelector('.nav-link[href="'+n+'"]')))){n=document.getElementById(n.slice(1));if(n)for(var i=n,a=document.querySelector("article.doc");(i=i.parentNode)&&i!==a;){var c=i.id;if((c=!c&&(c=o.test(i.className))?(i.firstElementChild||{}).id:c)&&(e=l.querySelector('.nav-link[href="#'+c+'"]')))break}}if(e)t=e.parentNode;else{if(!s)return;e=(t=s).querySelector(".nav-link")}t!==r&&(h(l,".nav-item.is-active").forEach(function(e){e.classList.remove("is-active","is-current-path","is-current-page")}),t.classList.add("is-current-page"),d(r=t),p(l,e))}function d(e){for(var t,n=e.parentNode;!(t=n.classList).contains("nav-menu");)"LI"===n.tagName&&t.contains("nav-item")&&t.add("is-active","is-current-path"),n=n.parentNode;e.classList.add("is-active")}function n(){var e,t,n,i;this.classList.toggle("is-active")&&(e=parseFloat(window.getComputedStyle(this).marginTop),t=this.getBoundingClientRect(),n=l.getBoundingClientRect(),0<(i=(t.bottom-n.top-n.height+e).toFixed())&&(l.scrollTop+=Math.min((t.top-n.top-e).toFixed(),i)))}function u(e){v(e);e=document.documentElement;e.classList.remove("is-clipped--nav"),a.classList.remove("is-active"),i.classList.remove("is-active"),e.removeEventListener("click",u)}function v(e){e.stopPropagation()}function p(e,t){var n=e.getBoundingClientRect(),i=n.height,a=window.getComputedStyle(c);"sticky"===a.position&&(i-=n.top-parseFloat(a.top)),e.scrollTop=Math.max(0,.5*(t.getBoundingClientRect().height-i)+t.offsetTop)}function h(e,t){return[].slice.call(e.querySelectorAll(t))}l&&(e=i.querySelector("[data-panel=explore]"),c=i.querySelector(".nav"),r=l.querySelector(".is-current-page"),(s=r)?(d(r),p(l,r.querySelector(".nav-link"))):l.scrollTop=0,h(l,".nav-item-toggle").forEach(function(e){var t=e.parentElement;e.addEventListener("click",n.bind(t));e=function(e,t){e=e.nextElementSibling;return(!e||!t||e[e.matches?"matches":"msMatchesSelector"](t))&&e}(e,".nav-text");e&&(e.style.cursor="pointer",e.addEventListener("click",n.bind(t)))}),e&&e.querySelector(".context").addEventListener("click",function(){h(c,"[data-panel]").forEach(function(e){e.classList.toggle("is-active")})}),l.addEventListener("mousedown",function(e){1<e.detail&&e.preventDefault()}),l.querySelector('.nav-link[href^="#"]')&&(window.location.hash&&t(),window.addEventListener("hashchange",t)))}();
!function(){"use strict";var e=document.querySelector("aside.toc.sidebar");if(e){if(document.querySelector("body.-toc"))return e.parentNode.removeChild(e);var t=parseInt(e.dataset.levels||2,10);if(!(t<0)){for(var o="article.doc",d=document.querySelector(o),n=[],i=0;i<=t;i++){var r=[o];if(i){for(var a=1;a<=i;a++)r.push((2===a?".sectionbody>":"")+".sect"+a);r.push("h"+(i+1)+"[id]")}else r.push("h1[id].sect0");n.push(r.join(">"))}var c,s,l,u=(c=n.join(","),s=d.parentNode,[].slice.call((s||document).querySelectorAll(c)));if(!u.length)return e.parentNode.removeChild(e);var f={},m=u.reduce(function(e,t){var o=document.createElement("a");o.textContent=t.textContent,f[o.href="#"+t.id]=o;var n=document.createElement("li");return n.dataset.level=parseInt(t.nodeName.slice(1),10)-1,n.appendChild(o),e.appendChild(n),e},document.createElement("ul")),p=e.querySelector(".toc-menu");p||((p=document.createElement("div")).className="toc-menu");var v=document.createElement("h3");v.textContent=e.dataset.title||"Contents",p.appendChild(v),p.appendChild(m);e=!document.getElementById("toc")&&d.querySelector("h1.page ~ :not(.is-before-toc)");e&&((v=document.createElement("aside")).className="toc embedded",v.appendChild(p.cloneNode(!0)),e.parentNode.insertBefore(v,e)),window.addEventListener("load",function(){h(),window.addEventListener("scroll",h)})}}function h(){var t,e=window.pageYOffset,o=1.15*g(document.documentElement,"fontSize"),n=d.offsetTop;if(e&&window.innerHeight+e+2>=document.documentElement.scrollHeight){l=Array.isArray(l)?l:Array(l||0);var i=[],r=u.length-1;return u.forEach(function(e,t){var o="#"+e.id;t===r||e.getBoundingClientRect().top+g(e,"paddingTop")>n?(i.push(o),l.indexOf(o)<0&&f[o].classList.add("is-active")):~l.indexOf(o)&&f[l.shift()].classList.remove("is-active")}),m.scrollTop=m.scrollHeight-m.offsetHeight,void(l=1<i.length?i:i[0])}Array.isArray(l)&&(l.forEach(function(e){f[e].classList.remove("is-active")}),l=void 0),u.some(function(e){return e.getBoundingClientRect().top+g(e,"paddingTop")-o>n||void(t="#"+e.id)}),t?t!==l&&(l&&f[l].classList.remove("is-active"),(e=f[t]).classList.add("is-active"),m.scrollHeight>m.offsetHeight&&(m.scrollTop=Math.max(0,e.offsetTop+e.offsetHeight-m.offsetHeight)),l=t):l&&(f[l].classList.remove("is-active"),l=void 0)}function g(e,t){return parseFloat(window.getComputedStyle(e)[t])}}();
!function(){"use strict";var o=document.querySelector("article.doc"),t=document.querySelector(".toolbar");function i(e){return e&&(~e.indexOf("%")?decodeURIComponent(e):e).slice(1)}function r(e){if(e){if(e.altKey||e.ctrlKey)return;window.location.hash="#"+this.id,e.preventDefault()}window.scrollTo(0,function e(t,n){return o.contains(t)?e(t.offsetParent,t.offsetTop+n):n}(this,0)-t.getBoundingClientRect().bottom)}window.addEventListener("load",function e(t){var n,o;(n=i(window.location.hash))&&(o=document.getElementById(n))&&(r.bind(o)(),setTimeout(r.bind(o),0)),window.removeEventListener("load",e)}),Array.prototype.slice.call(document.querySelectorAll('a[href^="#"]')).forEach(function(e){var t,n;(t=i(e.hash))&&(n=document.getElementById(t))&&e.addEventListener("click",r.bind(n))})}();
!function(){"use strict";var t,e=document.querySelector(".page-versions .version-menu-toggle");e&&(t=document.querySelector(".page-versions"),e.addEventListener("click",function(e){t.classList.toggle("is-active"),e.stopPropagation()}),document.documentElement.addEventListener("click",function(){t.classList.remove("is-active")}))}();
!function(){"use strict";var t=document.querySelector(".navbar-burger");t&&t.addEventListener("click",function(t){t.stopPropagation(),document.documentElement.classList.toggle("is-clipped--navbar"),this.classList.toggle("is-active");var e=document.getElementById(this.dataset.target);e.classList.toggle("is-active")&&(e.style.maxHeight="",t=window.innerHeight-Math.round(e.getBoundingClientRect().top),parseInt(window.getComputedStyle(e).maxHeight,10)!==t&&(e.style.maxHeight=t+"px"))}.bind(t))}();
!function(){"use strict";var s=/^\$ (\S[^\\\n]*(\\\n(?!\$ )[^\\\n]*)*)(?=\n|$)/gm,l=/( ) *\\\n *|\\\n( ?) */g,d=/ +$/gm,r=(document.getElementById("site-script")||{dataset:{}}).dataset;[].slice.call(document.querySelectorAll(".doc pre.highlight, .doc .literalblock pre")).forEach(function(e){var t,n,c,i,a;if(e.classList.contains("highlight"))(c=(t=e.querySelector("code")).dataset.lang)&&"console"!==c&&((i=document.createElement("span")).className="source-lang",i.appendChild(document.createTextNode(c)));else{if(!e.innerText.startsWith("$ "))return;var o=e.parentNode.parentNode;o.classList.remove("literalblock"),o.classList.add("listingblock"),e.classList.add("highlightjs","highlight"),(t=document.createElement("code")).className="language-console hljs",t.dataset.lang="console",t.appendChild(e.firstChild),e.appendChild(t)}(c=document.createElement("div")).className="source-toolbox",i&&c.appendChild(i),window.navigator.clipboard&&((n=document.createElement("button")).className="copy-button",n.setAttribute("title","Copy to clipboard"),"svg"===r.svgAs?((o=document.createElementNS("http://www.w3.org/2000/svg","svg")).setAttribute("class","copy-icon"),(i=document.createElementNS("http://www.w3.org/2000/svg","use")).setAttribute("href",window.uiRootPath+"/img/octicons-16.svg#icon-clippy"),o.appendChild(i),n.appendChild(o)):((a=document.createElement("img")).src=window.uiRootPath+"/img/octicons-16.svg#view-clippy",a.alt="copy icon",a.className="copy-icon",n.appendChild(a)),(a=document.createElement("span")).className="copy-toast",a.appendChild(document.createTextNode("Copied!")),n.appendChild(a),c.appendChild(n)),e.appendChild(c),n&&n.addEventListener("click",function(e){var t=e.innerText.replace(d,"");"console"===e.dataset.lang&&t.startsWith("$ ")&&(t=function(e){var t,n=[];for(;t=s.exec(e);)n.push(t[1].replace(l,"$1$2"));return n.join(" && ")}(t));window.navigator.clipboard.writeText(t).then(function(){this.classList.add("clicked"),this.offsetHeight,this.classList.remove("clicked")}.bind(this),function(){})}.bind(n,t))})}();
;(function () {
    'use strict'

    var hash = window.location.hash
    find('.tabset').forEach(function (tabset) {
      var active
      var tabs = tabset.querySelector('.tabs')
      if (tabs) {
        var first
        find('li', tabs).forEach(function (tab, idx) {
          var id = (tab.querySelector('a[id]') || tab).id
          if (!id) return
          var pane = getPane(id, tabset)
          if (!idx) first = { tab: tab, pane: pane }
          if (!active && hash === '#' + id && (active = true)) {
            tab.classList.add('is-active')
            if (pane) pane.classList.add('is-active')
          } else if (!idx) {
            tab.classList.remove('is-active')
            if (pane) pane.classList.remove('is-active')
          }
          tab.addEventListener('click', activateTab.bind({ tabset: tabset, tab: tab, pane: pane }))
        })
        if (!active && first) {
          first.tab.classList.add('is-active')
          if (first.pane) first.pane.classList.add('is-active')
        }
      }
      tabset.classList.remove('is-loading')
    })

    function activateTab (e) {
      var tab = this.tab
      var pane = this.pane
      find('.tabs li, .tab-pane', this.tabset).forEach(function (it) {
        it === tab || it === pane ? it.classList.add('is-active') : it.classList.remove('is-active')
      })
      e.preventDefault()
    }

    function find (selector, from) {
      return Array.prototype.slice.call((from || document).querySelectorAll(selector))
    }

    function getPane (id, tabset) {
      return find('.tab-pane', tabset).find(function (it) {
        return it.getAttribute('aria-labelledby') === id
      })
    }
  })()
