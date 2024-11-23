/*
Bootup process windows 96
Copyright (C) Windows 96 Team 2019. All rights reserved.
*/

var bootup_proc = {
    /** @param {HtmlDivElement} gfxEl */
    showBootscreen: function(gfxEl)
    {
        gfxEl.innerHTML = "";
        var customcss = "";
        var file = "./system36/gl_textures/boot/m96_startup.gif";
        //Check if plus edition
        if(localStorage.getItem("c:/system36/gfxboot.json") != null) {
            var bootObject = JSON.parse(localStorage.getItem("c:/system36/gfxboot.json").trim());
            file = bootObject.src;
            if(bootObject.css != null) customcss = bootObject.css;
        }
        
        gfxEl.innerHTML = `<style>html {
            overflow:hidden;
            }</style><img draggable="false" style="${customcss} height: 100vh;width: 100vw;box-sizing: border-box;user-select: none;" src="${file}">`;
    }
}