//!W96-DRIVER
/*
Console VGA driver.

Copyright (C) Windows 96 Team 2019. All rights reserved.
*/

var vga_container = document.getElementById("convga");

var vga_driver = {
    putString: function(str, customcss, htmlText)
    {
        var str_elem = document.createElement("span");
        str_elem.classList.add("vga_con_line");
        if(!htmlText) str_elem.innerText = str;
        else str_elem.innerHTML = str;
        if(customcss != null) str_elem.setAttribute("style", customcss);
        vga_container.appendChild(str_elem);
    },
    cls: function()
    {
        for(var e in vga_container.children)
        {
            vga_container.innerHTML = "";
        }
    },
    close: function()
    {
        document.body.removeChild(vga_container);
    }
}