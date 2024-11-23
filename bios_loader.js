/*
BIOS Loader
Copyright (C) Windows 96 Team 2019. All rights reserved.
*/

var bios = null;

if(!vga_driver) {
    console.error("Convga driver not loaded, won't boot!");
    alert("The convga driver is missing! Click ok to close Windows 96");
    window.close();
}

var BiosLoader = {
    loadBios: function(url) //Url will be a javascript file
    {
        if(bios != null)
        {
            console.error("W96 Rom: Bios is already loaded!");
            window.close();
        }
        var sce = document.createElement("SCRIPT");
        sce.setAttribute("src", url);
        document.body.appendChild(sce);
    }
}