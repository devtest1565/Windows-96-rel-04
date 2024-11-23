/*
SYSTEM36.DLL
Copyright (C) Windows 96 Team 2019. All rights reserved.

This is the NON IE version
*/

var assistantActive = false;
var deskmeterSetupActive = false;

var fs = {
    floppy_a: new cookieFileSystem("a:", false),
    main: new fileSystem("c:", false),
    ram: new fileSystem("e:", true),
    root: new remoteFileSystem("x:", createXhrSimpleSync("/rootfs.json")),
    resolveByPrefix: function(pfx) {
        var fso = Object.keys(this);
        for(var x = 0; x < fso.length; x++) {
            if(fs[fso[x]].prefix == pfx) return fso[x];
        }
        return null;
    }
}

var fsUtils = {
    getStdIcon: function(node, domain, isRemote) {
        var icon = "empty";
        var fn = fs[domain].getNodeName(node);
        if(!fs[domain].isFile(node)) {
            if(fn.trim() == "system36") return w96.desktop_shell.getIconUrl("sys-folder");
            return w96.desktop_shell.getIconUrl("folder");
        }
        var nodefsc = "";
        if(!isRemote) nodefsc = fs[domain].getFileContents(node);
        if(nodefsc.trim().startsWith("#!Win96:shortcut")) {
            var shortcutObject = JSON.parse(nodefsc.replace("#!Win96:shortcut", "").trim());
            icon = shortcutObject.icon;
            return w96.desktop_shell.getIconUrl(icon);
        }
        if(fn.endsWith(".jsx")) icon = "exec";
        if(fn.endsWith(".html")) icon = "html";
        if(fn.endsWith(".js")) icon = "js";
        if(fn.endsWith(".json")) icon = "objtext";
        if(fn.endsWith(".txt")) icon = "text";
        if(fn.endsWith(".sys")) icon = "system";
        if(fn.endsWith(".bat")) icon = "command";
        if(fn.endsWith(".cmd")) icon = "command";
        if(fn.endsWith(".bmp")) icon = "image";
        if(fn.endsWith(".png")) icon = "image3";
        if(fn.endsWith(".jpg")) icon = "image2";
        if(fn.endsWith(".jpeg")) icon = "image2";
        if(fn.endsWith(".gif")) icon = "image3";
        if(fn.endsWith(".ogg")) icon = "music";
        if(fn.endsWith(".mp3")) icon = "music";
        if(fn.endsWith(".m4a")) icon = "music";
        if(fn.endsWith(".wav")) icon = "music";
        if(fn.endsWith(".css")) icon = "css";
        if(fn.endsWith(".iso96")) icon = "iso96";
        if(fn.endsWith(".md")) icon = "markdown";
        if(fn.endsWith(".swf")) icon = "flash";
        if(fn.endsWith(".flv")) icon = "flash";
        if(fn.toLowerCase() == "readme.txt") icon = "help";

        return w96.desktop_shell.getIconUrl(icon);
    }
}

fs.main.label = "WIN96";
fs.ram.label = "RAMDISK";

var createdMenus = 0;
var appMenus = {};
var isMenuAlreadyActive = false;

class StandardAppMenu {
    constructor(mcontainer) {
        this.menuDiv = document.createElement("div");
        this.menuDiv.style.width = "100%";
        this.menuDiv.style.height = "fit-content";
        this.menuDiv.style.color = "black";
        this.rootMenuItems = [];
        this.activeMenu = "";
        mcontainer.appendChild(this.menuDiv);
        this.id = "m_" + (createdMenus++);
        appMenus[this.id] = (this);
    }

    handleMouseEnter(id) {
        if(!isMenuAlreadyActive) return;
        if(id == this.activeMenu) return;
        appMenuUpdateProc();
        this.renderMenu(id);
    }

    addRootItem(id, label, menuItems) {
        var menuItemDiv = document.createElement("span");
        menuItemDiv.innerText = label;
        menuItemDiv.classList.add("menuitem-root");
        menuItemDiv.setAttribute("menuItemId", id);
        menuItemDiv.setAttribute("onclick", `appMenus['${this.id}'].renderMenu('${id}')`);
        menuItemDiv.setAttribute("onmouseenter", `appMenus['${this.id}'].handleMouseEnter('${id}')`);
        //menuItemDiv.setAttribute("menuId", id);
        this.menuDiv.appendChild(menuItemDiv);
        //Add context menu div with all the items in it in an array
        this.rootMenuItems.push({id: id, label: label, subItems: menuItems});
    }

    findRootMenu(menuId) {
        var menu = null;
        for(var x = 0; x < this.rootMenuItems.length; x++) {
            var i = this.rootMenuItems[x];
            if(i.id == menuId) menu = i;
        }
        return menu;
    }

    findRootMenuDiv(menuId) {
        var menu = null;
        for(var x = 0; x < this.menuDiv.children.length; x++) {
            var i = this.menuDiv.children[x];
            if(i.getAttribute("menuitemid") == menuId) menu = i;
        }
        return menu;
    }

    //Display a menu with items
    renderMenu(rootItemId) {
        if(isMenuAlreadyActive) {
            appMenuUpdateProc(); //Close menu
            isMenuAlreadyActive = false;
            this.activeMenu = "";
            return;
        }
        this.activeMenu = rootItemId;
        appMenuUpdateProc(); //Close active app menus
        var rootMenu = this.findRootMenu(rootItemId);
        var rootMenuDiv = this.findRootMenuDiv(rootItemId);
        var menu = document.createElement("div");
        menu.classList.add('menu-basic');
        var options = document.createElement("ul");
        options.classList.add("menu-basic-options");

        for(var j = 0; j < rootMenu.subItems.length; j++) {
            var subItem = rootMenu.subItems[j];
            switch(subItem.type) {
                default:
                    //WTF is this menu item??!?!?!
                    break;
                case "separator":
                    var sep = document.createElement("li");
                    sep.classList.add("menu-basic-separator");
                    options.appendChild(sep);
                    break;
                case "normal":
                    var item = document.createElement("li");
                    item.classList.add("menu-basic-option");
                    item.innerText = subItem.label;
                    item.onclick = subItem.onclick;
                    options.appendChild(item);
                    break;
            }
        }
        menu.appendChild(options);
        var menuRect = rootMenuDiv.getBoundingClientRect();
        var menuY = menuRect.top + menuRect.height;
        var menuX = menuRect.left;
        menu.setAttribute("style", `display: block; top: ${menuY}px; left: ${menuX}px;`);
        //Show menu div
        w96.desktop_shell.desktop.appendChild(menu);
        isMenuAlreadyActive = true;
        this.activeMenu = rootItemId;
    }

    destroy() {
        delete appMenus[this.id];
        delete this;
    }
}

class ContextMenuBasic { //TODO add menu resize option
    constructor() {
        this.menuId = "ctxmenu_" + (createdMenus++);
        this.menuVisible = false;
        this.menu = document.createElement("div");
        this.menu.setAttribute("id", this.menuId);
        this.menu.classList.add("menu-basic");
        this.menuOptions = document.createElement("ul");
        this.menuOptions.setAttribute("id", this.menuId + "_options");
        this.menuOptions.classList.add("menu-basic-options");
        this.menu.appendChild(this.menuOptions);
        window.addEventListener("click", e => {
            if(this.menuVisible) this.toggleMenu("hide");
        });
        document.body.appendChild(this.menu);
    }

    addMenuItem(label, onclick) {
        var muo = document.createElement("li");
        muo.classList.add("menu-basic-option");
        muo.setAttribute("onclick", onclick);
        muo.innerText = label;
        this.menuOptions.appendChild(muo);
    }

    addSeparator() {
        var muo = document.createElement("li");
        muo.classList.add("menu-basic-separator");
        this.menuOptions.appendChild(muo);
    }
    
    toggleMenu(command) {
        this.menu.style.display = command === "show" ? "block" : "none";
        this.menuVisible = !this.menuVisible;
    }

    setPosition(o) {
        this.menu.setAttribute("style", `position: absolute; top: ${o.top}px; left: ${o.left}px;`);
        this.toggleMenu("show");
    }

    addCtxMenuListener(el) {
        el.addEventListener("contextmenu", e => {
            e.preventDefault();
            const origin = {
                left: e.pageX,
                top: e.pageY
            };
            var rect = document.querySelector("#" + this.menuId).getBoundingClientRect();
            console.log(rect);
            if((window.innerHeight - (rect.top + rect.height)) < 1) {
                origin.top = window.innerHeight - rect.height;
            }
            this.setPosition(origin);
            return false;
        });
    }
}

var ControlBoxStyles = {
    WS_CBX_MINMAXCLOSE: "WS_CBX_MINMAXCLOSE",
    WS_CBX_CLOSE: "WS_CBX_CLOSE",
    WS_CBX_MINCLOSE: "WS_CBX_MINCLOSE",
    WS_CBX_NONE: "WS_CBX_NONE"
}

var MbxButtonStyles = {
    WS_MBX_OK: "WS_MBX_OK"
}

var MessageBox = {
    ShowError: function(title, text)
    {

    }
}

var stdWinGid = 1;
var stdTerms = 0;
var createdDialogs = 0;
var _dialogs = {};

var DialogCreator = {
    createDlgBasic: function(title, text, icon) {
        var w = (window.innerWidth/2)-(300/2);
        var h = (window.innerHeight/2)-(150/2);
        var mbxwindow = new StandardWindow(title, 300, 150, w, h, false, null, null, true, "Error");
        mbxwindow.setControlBoxStyle(ControlBoxStyles.WS_CBX_CLOSE);
        var cid = createdDialogs++;
        _dialogs[cid] = mbxwindow;
        mbxwindow.setHtmlContent(`
        <div class="mbx-container">
            <div class="mbx-${icon}-symbol"></div>
            <div class="mbx-text">
                ${text}
            </div>
            <div class="mbx-buttons">
                <button onclick="_dialogs['${cid}'].close()" class="w96-button">Ok</button>
            </div>
        </div>
        `);
        mbxwindow.show();
    }
}

class StandardWindow { //Todo add window to taskbar if app window
    constructor(title, width, height, x, y, resizable, minHeight, minWidth, useAppBar, app_name, touchHints) {
        this._globalId = stdWinGid++;
        this.maximized = false;
        this.m_ox = 0;
        this.m_oy = 0;
        this.m_ow = 0;
        this.m_oh = 0;
        this.initialHeight = height;
        this.initialWidth = width;
        this.minHeight = minHeight;
        this.minWidth = minWidth;
        this.minimized = true;
        this.resizable = resizable;
        this.windowId = w96.windowSystem.createWindowDlgNoResize(title, width, height, x, y, this._globalId);
        this.window = document.getElementById(this.windowId);
        this.window.children[0].children[3].setAttribute("onclick", `w96.windowSystem.hideDialogWindow('${this.windowId}', ${this._globalId})`);
        this.window.children[0].children[2].setAttribute("onclick", `w96.windowSystem.findWindow('${this._globalId}').toggleMaximize()`);
        this.window.children[0].children[1].setAttribute("onclick", `w96.windowSystem.closeDialogWindow('${this.windowId}', ${this._globalId})`);
        this.usesAppbar = useAppBar;
        this.onclose = null;
        if(useAppBar)
        {
            w96.windowSystem.registerAppBar(app_name, this.windowId, this._globalId);
        }
        if(resizable)
        {
            $('#' + this.windowId).resizable({
                handles: 'n, s, w, e, ne, se, sw, nw',
                minHeight: minHeight,
                minWidth: minWidth,
                iframeFix: true,
                start: function(event, ui) {
                    $('iframe').css('pointer-events','none');
                     },
                stop: function(event, ui) {
                    $('iframe').css('pointer-events','auto');
                  }
            });
        }
        if(w96.dev.touch.touchMode) {
            this.setControlBoxStyle(ControlBoxStyles.WS_CBX_CLOSE);
            if(touchHints != null) {
                if(!touchHints.includes("NO_RESIZE")) this.toggleMaximize();
                if(touchHints.includes("CENTER_SCREEN")) {
                    var pos = getScreenMidpointWObject(this.initialWidth, this.initialHeight);
                    this.window.style.top = pos.y + "px";
                    this.window.style.left = pos.x + "px";
                }
            } else { //Defaults if touch hints do not exist
                this.toggleMaximize();
            }
            
            this.setTitlebarFontSize(30);
            this.window.children[0].children[1].setAttribute("style", `background-size: cover;
            height: 22px;
            width: 25px;
            visibility: unset;`);
            document.getElementById(this.windowId + "_content").parentElement.style.paddingTop = "32px";
        }
        w96.windowSystem.windows.push(this);
    }

    /** @description Creates a new window - DO NOT CALL IF WINDOWS HAS BEEN CREATED */
    createWindow() {
        //deprecated
    }

    setTitle(text) {
        var titlebar = document.getElementById(this.windowId + "_titleBar");
        titlebar.innerText = text;
    }

    setContentFontSize(sz) {
        var htmlContent = document.getElementById(this.windowId + "_content");
        htmlContent.style.fontSize = sz + "px";
    }

    setTitlebarFontSize(sz) {
        var titlebar = document.getElementById(this.windowId + "_titleBar");
        titlebar.style.fontSize = sz + "px";
    }

    isActive() {
        return w96.windowSystem.activeWindow == this.windowId;
    }

    unhideOverflow() {
        this.window.children[1].children[0].style.overflow = "auto";
    }

    setMinimized(m) {
        this.minimized = m;
    }

    enableGravity() {
        $('#' + this.windowId).jGravity({
            target: '#' + this.windowId,
            weight: 25,
            drag: true,
            depth: 5
        });
    }

    disableResizing() {
        if(this.resizable) {
            try {
                $("#" + this.windowId).resizable('destroy'); // This is known to cause issues
            } catch(e) {

            }
        }
    }

    close() {
        w96.windowSystem.closeDialogWindow(this.windowId, this._globalId);
    }

    toggleMaximize() {
        this.maximized = !this.maximized;
        if(this.maximized) //maximization has been turned on
        {
            this.window.children[0].children[2].classList.add('titlebar-maxxed');
            this.window.classList.add('nodrag');
            this.m_ox = this.window.style.top;
            this.m_oy = this.window.style.left;
            this.m_ow = this.window.style.width;
            this.m_oh = this.window.style.height;
            this.window.style.height = (window.innerHeight - 35) + "px";
            this.window.style.width = (window.innerWidth-7) + "px";
            this.window.style.left = "0px";
            this.window.style.top = "0px";
            try {
                $("#" + this.windowId).resizable('destroy');
            } catch(e) {

            }
        }
        else
        {
            this.window.children[0].children[2].classList.remove('titlebar-maxxed');
            this.window.classList.remove('nodrag');
            $('#' + this.windowId).resizable({
                handles: 'n, s, w, e, ne, se, sw, nw',
                minHeight: this.minHeight,
                minWidth: this.minWidth,
                iframeFix: true,
                start: function(event, ui) {
                    $('iframe').css('pointer-events','none');
                     },
                stop: function(event, ui) {
                    $('iframe').css('pointer-events','auto');
                  }
            });
            this.window.style.height = this.m_oh;
            this.window.style.width = this.m_ow;
            this.window.style.left = this.m_ox;
            this.window.style.top = this.m_oy;
        }
    }

    center() {
        this.window.style.left = (window.innerWidth/2)-(this.window.offsetWidth/2);
        this.window.style.top = (window.innerHeight/2)-(this.window.offsetHeight/2);
    }

    activate() {
        /*LEGACY CODE
        if(w96.windowSystem.activeWindow != (this.windowId))
        {
            console.log(this.windowId);
            //swap zindex
            if(w96.windowSystem.activeWindow == null) {
                this.window.style.zIndex = 10 + w96.windowSystem.createdWindows + 1;
                w96.windowSystem.activeWindow = this.window.id;
                w96.windowSystem.setAppBarActive(this.window.id, this._globalId);
                return;
            }
            var aw = document.getElementById(w96.windowSystem.activeWindow);
            var activeWindowZI = aw.style.zIndex.toString(); //active window z-index
            aw.style.zIndex = this.window.style.zIndex;
            this.window.style.zIndex = activeWindowZI;
            w96.windowSystem.activeWindow = this.window.id;
            w96.windowSystem.setAppBarActive(this.window.id, this._globalId);
        }*/
        //TEST if the window is shown or not
        w96.windowSystem.activeWindow = this.windowId;
        w96.windowSystem.setAppBarActive(this);
        //if(w96.desktop_shell.desktop.children[w96.desktop_shell.desktop.children.length - 1].id != this.windowId) w96.desktop_shell.desktop.appendChild(this.window);
        var currentZIndex = parseInt(this.window.style.zIndex);
        var highestZIndex = 0;
        for(var x = 0; x < w96.windowSystem.windows.length; x++) {
            var win = w96.windowSystem.windows[x].window;
            var zIndex = parseInt(win.style.zIndex);
            if(zIndex > highestZIndex) highestZIndex = zIndex;
        }
        //Disable other windows by color
        for(var x = 0; x < w96.windowSystem.windows.length; x++) {
            var win = w96.windowSystem.windows[x];
            if(win == null) continue;
            win.window.children[0].style.background = "gray";
        }
        this.window.children[0].style.background = "linear-gradient(to right, #130083, #0884ce)";
        if(currentZIndex == highestZIndex) return; //Is already highest zIndex, leave it alone son!
        this.window.style.zIndex = highestZIndex + 1;
    }

    setCbxButtonStyle(index, style) {
        this.window.children[0].children[index].setAttribute("style", style);
    }

    setControlBoxStyle(cbstyle) {
        switch(cbstyle.trim())
        {
            case "WS_CBX_MINMAXCLOSE":
                this.window.children[0].children[1].style.visibility = "unset";
                this.window.children[0].children[2].style.visibility = "unset";
                this.window.children[0].children[3].style.visibility = "unset";
                break;
            case "WS_CBX_CLOSE":
                this.window.children[0].children[1].style.visibility = "unset";
                this.window.children[0].children[2].style.visibility = "hidden";
                this.window.children[0].children[3].style.visibility = "hidden";
                break;
            case "WS_CBX_MINCLOSE":
                this.window.children[0].children[1].style.visibility = "unset";
                this.window.children[0].children[2].style.visibility = "hidden";
                this.window.children[0].children[3].style.visibility = "unset";
                break;
            case "WS_CBX_NONE":
                this.window.children[0].children[1].style.visibility = "hidden";
                this.window.children[0].children[2].style.visibility = "hidden";
                this.window.children[0].children[3].style.visibility = "hidden";
                break;
        }
    }

    show() { //TODO change app bar state
        this.window.style.visibility = "unset";
        w96.gfx.animation.animate("#" + this.windowId, "rollIn");
        $("#" + this.windowId).draggable({
            cancel: '.nodrag',
            iframeFix: true
        });
        this.minimized = false;
        setTimeout(()=>{this.activate();}, 50);
        w96.windowSystem.setAppBarActive(this.windowId, this._globalId);
    }

    hide() {
        this.minimized = true;
        w96.windowSystem.hideDialogWindow(this.windowId, this._globalId);
    }

    setSize(w, h) {
        this.window.style.width = w + "px";
        this.window.style.height = h + "px";
    }

    setPosition(x, y) {
        this.window.style.left = x + "px";
        this.window.style.top = y + "px";
    }

    getHtmlContainer() {
        return document.getElementById(this.windowId + "_content");
    }

    setHtmlContent(html) {
        var htmlContent = document.getElementById(this.windowId + "_content");
        htmlContent.innerHTML = html;
    }
}

var w96 = {
    debug: {
        activateDebugDrive: function() {
            if(fs.debug == null) {
                fs.floppy
                fs.debug = new fileSystem("g:", true);
                fs.debug.label = "Debug";
                fs.debug.createNewFolder("/Developer");
                fs.debug.createNewFolder("/Developer/MsgBox");
                fs.debug.createNewFolder("/Developer/FileSys");
                fs.debug.createNewFolder("/Developer/Gfx");
                fs.debug.writeFile("/README.txt", " -- Windows 96 Developer Tools --\n\nWelcome to dev tools. This is very simple to use, enjoy!");
                fs.debug.writeFile("/Developer/MsgBox/Error.jsx", "w96.commdlg.msgboxSimple.error('title', 'message', 'buttonText');");
                fs.debug.writeFile("/Developer/MsgBox/Info.jsx", "w96.commdlg.msgboxSimple.info('title', 'message', 'buttonText');");
                fs.debug.writeFile("/Developer/MsgBox/Warning.jsx", "w96.commdlg.msgboxSimple.warning('title', 'message', 'buttonText');");
                fs.debug.writeFile("/Developer/FileSys/ReloadX.jsx", "fs.root = new remoteFileSystem('x:', createXhrSimpleSync('/rootfs.json'));w96.commdlg.msgboxSimple.info('Success', 'Root filesystem successfully reloaded!', 'OK');")
                fs.debug.writeFile("/Developer/FileSys/RootRw.jsx", "fs.root = new fileSystem('x:', false);w96.commdlg.msgboxSimple.info('Success', 'Root filesystem recreated read write!', 'OK');");
                fs.debug.writeFile("/Developer/Gfx/Wireframe.jsx", "w96.debug.enableWireframe();");
            }
            var driveUrl = "win96://openddomain |debug|/"; //Will only work if you used steps from FS example
            w96.desktop_shell.createShortcut("/Desktop/Debug (G:)", driveUrl, "hdd");
        },
        enableWireframe: function() {
            var wfEl = document.createElement('style');
            wfEl.innerHTML = "* { border-style: solid; border-color: blue; border-width: 1px; }";
            document.body.appendChild(wfEl);
            for(var x = 0; x < window.frames.length; x++) {
                wfEl = document.createElement('style');
                wfEl.innerHTML = "* { border-style: solid; border-color: blue; border-width: 1px; }";
                window.frames[x].document.body.appendChild(wfEl);
            }
        }
    },
    commdlg: {
        dialogs: 0,
        dlgClasses: {},
        msgboxSimple: {
            info: function(title, message, buttonText) {
                var m = new w96.commdlg.MessageBox(title, message, "info", buttonText);
                m.show();
                return m;
            },
            error: function(title, message, buttonText) {
                var m = new w96.commdlg.MessageBox(title, message, "error", buttonText);
                m.show();
                return m;
            },
            warning: function(title, message, buttonText) {
                var m = new w96.commdlg.MessageBox(title, message, "warning", buttonText);
                m.show();
                return m;
            }
        },
        MessageBox: class {
            constructor(title, message, icon, buttons, onclose) { //NOTE rename onclose to something else such as dialogresult
                var mid = getScreenMidpointWObject(320, 130);
                this.initialWidth = 320;
                this.initialHeight = 130;
                this.dlgId = "mbx_" + (w96.commdlg.dialogs++);
                this.onclose = onclose;
                this.icon = icon;
                this.dlg = new StandardWindow(title, 320, 130, mid.x, mid.y, false, 0, 0, false, "", ["NO_RESIZE"]);
                this.dlg.setControlBoxStyle(ControlBoxStyles.WS_CBX_CLOSE);
                this.dlg.onclose = onclose;
                this.dlg.setHtmlContent(`<div id="${this.dlgId}" class="mbox" style="
                display: flex;
                flex-direction: column;
                width: 100%;
                height: 100%;
                "><div class="mbox-content" style="
                height: 100%;
                width: 100%;
                display: flex;
                flex-direction: row;
                "><div class="icon" style="
                height: 100%;
                width: 32px;
                min-width: 32px;
                margin-left: 16px;
                margin-right: 16px;
                background: url(./system36/icons96/${icon}.png);
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            "></div><div class="mbox-text" style="
                width: 100%;
                
                margin-right: 16px;
                margin-top: auto;
                margin-bottom: auto;
                font-family: pixarial;
                font-size: 19px;
            ">${message.replace("{dlgId}", this.dlgId)}</div></div>
                <div class="mbox-buttonsgroup" style="
                text-align: center;
                padding: 3px;
            ">
                    <button style="padding-left: 25px; padding-right: 25px;" onclick="w96.commdlg.dlgClasses['${this.dlgId}'].closeDialog()" class="w96-button">${buttons}</button>
                </div>
            </div>`);

                w96.commdlg.dlgClasses[this.dlgId] = this;
            }

            show() {
                this.dlg.show();
                switch(this.icon) {
                    case "error":
                        new Audio("./system36/sounds/supererror.mp3").play();
                        break;
                }
                setTimeout(()=>{this.dlg.activate();}, 100);
            }

            setSize(w, h) {
                this.dlg.setSize(w, h);
                return this;
            }

            closeDialog() {
                if(this.onclose != null) this.dlg.onclose();
                this.dlg.close();
            }
        },
        OpenFileDialog: class {
            constructor(title) {
                var windowTitle = title == null ? "Select a file" : title;
                this.dlgId = "cd_" + (w96.commdlg.dialogs++);
                this.domain = "main";
                this.currentPath = "/";
                this.selectedItem = "";
                this.onFileSelected = null;
                this.onViewUpdateFinished = null;
                var mid = getScreenMidpointWObject(360, 320);
                this.dlg = new StandardWindow(windowTitle, 360, 320, mid.x, mid.y, true, 100, 100, false, "COMMDLG.OCX", []);
                this.dlg.onclose = function() {
                    this.setHtmlContent('');
                };
                this.dlg.setHtmlContent(`
                <header class="explorer-header">
                <input id="filePath${this.dlgId}" type="text" class="textbox-96" style="width: 100%;box-sizing: border-box;"></input>
                <div class="explorer-drive-text" id="eDomain${this.dlgId}">Domain: ${this.domain}</div>
                <div class="explorer-icons">
                    <button class="explorer_nav_button w96-button buttonimg-up" style="height: 22px; width: 22px;" onclick="w96.commdlg.dlgClasses['${this.dlgId}'].goUp()"></button>
                    <button class="explorer_nav_button w96-button buttonimg-newdir" style="height: 22px; width: 22px;" onclick="w96.commdlg.dlgClasses['${this.dlgId}'].showNewFolderDialog()"></button>
                    <button class="explorer_nav_button w96-button buttonimg-newfile" style="height: 22px; width: 22px;" onclick="w96.commdlg.dlgClasses['${this.dlgId}'].showNewFileDialog()"></button>
                </div>
                </header>
                <section id="explorerView${this.dlgId}" class="explorer-view">
                </section>
                <footer id="explorerFooter${this.dlgId}" style="display: flex; flex-direction: row-reverse; justify-content: center;" class="w96-footer">
                    <button class="w96-button" onclick="w96.commdlg.dlgClasses['${this.dlgId}'].conclude(true, w96.commdlg.dlgClasses['${this.dlgId}'].selectedItem)">Accept</button>
                    <button class="w96-button" onclick="w96.commdlg.dlgClasses['${this.dlgId}'].conclude(false, '/Temp/Null')">Cancel</button>
                </footer>`);
                w96.commdlg.dlgClasses[this.dlgId] = this;
            }

            conclude(stat, node) {
                if(!stat) {
                    this.dlg.close();
                    return;
                }
                if(node == "/Temp/Null") {
                    w96.commdlg.msgboxSimple.warning("Error", "Invalid item selected!", "OK");
                    return;
                } else if (!fs[this.domain].fileExists(node)) {
                    w96.commdlg.msgboxSimple.error("Error", "File does not exist.", "OK");
                    return;
                } else {
                    this.onFileSelected(stat, node, this.domain);
                    this.dlg.close();
                }
            }

            show(onFileSelected) {
                //this.dlg.setCbxButtonStyle(ControlBoxStyles.WS_CBX_CLOSE);
                this.dlg.show();
                var navBar = document.getElementById(`filePath${this.dlgId}`);
                navBar.value = this.currentPath;
                this.onFileSelected = onFileSelected;
                this.refreshView();
            }

            goUp() {
                if(this.currentPath == "/")
                {
                    this.currentPath = "computer://";
                    this.refreshView();
                    return;
                }
                else if(this.currentPath == "computer://") return; //Ignore special paths
                var parentDir = fs[this.domain].getParentPath(this.currentPath);
                this.currentPath = parentDir;
                this.refreshView();
            }

            showNewFileDialog() {
                if(this.currentPath == "computer://") return;
                var p = prompt("Enter file name", "Empty");
                var nfp = p != null ? p : "";
                if((nfp != null) || (nfp.trim() != ""))
                {
                    //var nfpn = nfp.replace("/", "");
                    if(this.currentPath == "/") fs[this.domain].createEmptyFile(this.currentPath + nfp);
                    else fs[this.domain].createEmptyFile(this.currentPath + "/" + nfp);
                    this.refreshView();
                }
            }
        
            showNewFolderDialog() {
                if(this.currentPath == "computer://") return;
                var nfp = prompt("Enter folder name", "NewFolder");
                if((nfp != null) || (nfp.trim() != ""))
                {
                    //var nfpn = nfp.replace("/", "");
                    if(this.currentPath == "/") fs[this.domain].createNewFolder(this.currentPath + nfp);
                    else fs[this.domain].createNewFolder(this.currentPath + "/" + nfp);
                    this.refreshView();
                }
            }

            createIconElement(eview, fileName, iconUrl, x, y, onclick, fullPath) {
                var dlg = this;
                var icon = "empty";
                var explorerIcon = document.createElement("div");
                explorerIcon.classList.add("explorer-icon");
                var explorerIconImage = document.createElement("div");
                explorerIconImage.classList.add("explorer-icon-image");
                explorerIconImage.setAttribute("style", `background: url(${iconUrl}); background-size: cover;`);
                var explorerIconText = document.createElement("div");
                explorerIconText.classList.add("explorer-icon-text");
                explorerIconText.innerText = fileName;
                explorerIcon.setAttribute("style", `top: ${y}px;left:${x}px`);
                //if(onclick != null) explorerIcon.setAttribute("ondblclick", onclick);
                if(onclick != null) {
                    if(!w96.dev.touch.touchMode) explorerIcon.setAttribute("ondblclick", onclick);
                    else {
                        //desktopIcon.setAttribute("onclick", onclick);
                        explorerIconImage.setAttribute("onclick", onclick);
                    }
                }
        
                if(!w96.dev.touch.touchMode) {
                    explorerIcon.onclick = function()
                    {
                        var icons = eview.getElementsByClassName("explorer-icon-text");
                        for(var ei in icons)
                        {
                            var textEl = icons[ei];
                            if(typeof(textEl) != 'object') continue;
                            textEl.setAttribute("style", "");
                            var image = textEl.parentNode.children[0];
                            //console.dir(image.outerHTML);
                            if(image != null) {
                                image.style.filter = "";
                            }
                        }
                        explorerIconText.setAttribute("style", "background-color: rgb(0,0,128);border-style: dotted;border-width: 1px;border-color: white;color:white;");
                        explorerIconImage.style.filter = "brightness(0.5) contrast(1.2) sepia(100%) hue-rotate(180deg) saturate(20)";
                        dlg.selectedItem = fullPath;
                    }
                }
                explorerIcon.appendChild(explorerIconImage);
                explorerIcon.appendChild(explorerIconText);
                return explorerIcon;
            }
        
            sortIcons() {
                var explorerView = document.getElementById("explorerView" + this.dlgId);
                var explorerIcons = explorerView.children;
                var currentX = 10;
                var currentY = 10;
                var maxX = this.dlg.window.offsetWidth;
                var icons = 0;
                for(var desktopIconIndex in explorerIcons)
                {
                    var deskIcon = explorerIcons[desktopIconIndex];
                    if(typeof(deskIcon) != 'object') continue;
                    icons++;
                    if((currentX + 74) > (maxX))
                    {
                        currentY += 75;
                        currentX = 10;
                    }
                    deskIcon.style.left = currentX + "px";
                    deskIcon.style.position = "absolute";
                    deskIcon.style.top = currentY + "px";
                    currentX += 85;
                }
            }
        
            switchDir(dirPath) {
                this.currentPath = dirPath;
                this.refreshView();
            }
        
            switchDomain(domain, dirPath) {
                this.domain = domain;
                this.currentPath = dirPath;
                this.refreshView();
            }
        
            refreshView() {
                //Clear explorer view
                var explorerView = document.getElementById("explorerView" + this.dlgId);
                var domainView = document.getElementById("eDomain" + this.dlgId);
                var fpath = document.getElementById("filePath" + this.dlgId);
                domainView.innerText = "Domain: " + this.domain;
                fpath.value = this.currentPath;
                explorerView.innerHTML = "";
                if(!w96.dev.touch.touchMode) {
                    explorerView.onclick = function(e)
                    {
                        if(!fe_elIgnore.includes(e.srcElement.getAttribute("class").trim()))
                        {
                            var icons = explorerView.getElementsByClassName("explorer-icon-text");
                            for(var ei in icons)
                            {
                                var textEl = icons[ei];
                                if(typeof(textEl) != 'object') continue;
                                textEl.setAttribute("style", "");
                                var image = textEl.parentNode.children[0];
                                //console.dir(image.outerHTML);
                                if(image != null) {
                                    image.style.filter = "";
                                }
                            }
                        }
                    }
                }
                
                //this.createIconElement(explorerView, "test", w96.desktop_shell.getIconUrl("folder"), 10, 50);
                if(this.currentPath.trim() == "computer://")
                { //TODO add drive iteration here
                    var w96aIcon = this.createIconElement(explorerView, `FLOPPY (A:)`, w96.desktop_shell.getIconUrl("floppy"), 90, 90, `w96.commdlg.dlgClasses['${this.dlgId}'].switchDomain('floppy_a', '/')`, "/Temp/Null");
                    var w96cIcon = this.createIconElement(explorerView, `WIN96 (C:)`, w96.desktop_shell.getIconUrl("hdd"), 90, 90, `w96.commdlg.dlgClasses['${this.dlgId}'].switchDomain('main', '/')`, "/Temp/Null");
                    var w96dIcon = this.createIconElement(explorerView, `CD-ROM (D:)`, w96.desktop_shell.getIconUrl("cdrom"), 90, 90, "", "/Temp/Null");
                    var w96eIcon = this.createIconElement(explorerView, `RAMDISK (E:)`, w96.desktop_shell.getIconUrl("ram"), 90, 90, `w96.commdlg.dlgClasses['${this.dlgId}'].switchDomain('ram', '/')`, "/Temp/Null");
                    var w96fIcon = this.createIconElement(explorerView, `WIN93 (F:)`, w96.desktop_shell.getIconUrl("netdrive"), 90, 90, 'window.location = "http://windows93.net";', "/Temp/Null");
                    var w96xIcon = this.createIconElement(explorerView, `ROOT (X:)`, w96.desktop_shell.getIconUrl("netdrive"), 90, 90, `w96.commdlg.dlgClasses['${this.dlgId}'].switchDomain('root', '/')`, "/Temp/Null");
                    explorerView.appendChild(w96aIcon);
                    explorerView.appendChild(w96cIcon);
                    explorerView.appendChild(w96dIcon);
                    explorerView.appendChild(w96eIcon);
                    explorerView.appendChild(w96fIcon);
                    explorerView.appendChild(w96xIcon);
                    this.sortIcons();
                    return;
                }
                var nodes = fs[this.domain].getNodes(this.currentPath);
                if(nodes == -1) return;
                var dirs = [];
                var files = [];
                for(var nodeIndex in nodes)
                {
                    var node = nodes[nodeIndex];
                    var nodeName = fs[this.domain].getNodeName(node);
                    if(nodeName.startsWith(".")) continue; //Ignore "hidden" files
                    var icon = "empty";
                    if(!fs[this.domain].isFile(node))
                    {
                        dirs.push(this.createIconElement(explorerView, nodeName, w96.desktop_shell.getIconUrl("folder"), 90, 90, `w96.commdlg.dlgClasses['${this.dlgId}'].switchDir('${node}')`, "/Temp/Null"));
                        continue;
                    }
                    else
                    {
                        //TODO add global function to get file icons
                        files.push(this.createIconElement(explorerView, nodeName, fsUtils.getStdIcon(node, this.domain, fs[this.domain].remote), 90, 90, `w96.commdlg.dlgClasses['${this.dlgId}'].conclude(true, '${node}')`, node));
                        continue;
                    }
                }
        
                for(var dir in dirs)
                {
                    var dirObject = dirs[dir];
                    if(dirObject.style == null) continue;
                    explorerView.appendChild(dirObject);
                }
        
                for(var file in files)
                {
                    var fileObject = files[file];
                    if(fileObject.style == null) continue;
                    explorerView.appendChild(fileObject);
                }
        
                this.sortIcons();
                if(this.onViewUpdateFinished != null) this.onViewUpdateFinished();
            }
        },
        SaveFileDialog: null
    },
    dev: {
        touch: {
            setupShown: false,
            touchMode: false,
            enable: function() {
                localStorage.setItem("touch_enabled", "true");
                window.location.href = window.location.toString();
            },
            disable: function() {
                localStorage.setItem("touch_enabled", "false");
                window.location.href = window.location.toString();
            }
        }
    },
    boot_proc: {
        bootlog: "",
        interrupt: function(reason) {
            clearInterval();
            clearTimeout();
            w96.dllLoader.loadJavascriptDllOnce("./system36/terminal_old.js");
            var gfx = document.getElementById("maingfx");
            if(gfx != null) document.body.removeChild(gfx);
            var consoleDiv = document.createElement("div");
            consoleDiv.setAttribute("id", "term_container");
            document.body.appendChild(consoleDiv);
            setTimeout(()=>{
                var o = new TerminalOptions();
                o.fontFamily = "stdvga";
                o.fontSize = "16px";
                var term = new Terminal("term_container", "100%", "100vh", o);
                consoleDiv.style.boxSizing = "border-box";
                consoleDiv.style.padding = "10px";
                term.termInit();
                term.println("Windows 96 has unexpectedly interrupted.\nReason: " + reason + "\n\nDropping user to system shell...");
                var currentDir = null;
                var currentDomain = null;
                var shellProc = function(t) {
                    if((currentDir != null) && (currentDomain != null)) {
                        t.print(currentDomain + currentDir, false, { foreColor: "royalblue" });
                        t.print(" # ");
                    }
                    else t.print("win96# ");
                    t.input((term2, text)=>{
                        try
                        {
                            if(text.trim() == "") throw "";
                            var cmd = text.split(' ');
                            switch(cmd[0]) {
                                default:
                                    t.print("error: command not found\n", false, {
                                        foreColor: "red"
                                    });
                                    break;
                                case "help":
                                    t.print("[WINDOWS96 System Shell Help]\n", false, {foreColor: "cyan"});
                                    t.print(`cddm <domain> - switch to domain <domain> 
                                    cd <path> - change current directory
                                    clear - clears the screen
                                    fs_status - Get FS status
                                    help - show the help page
                                    lsdomain - list all domains
                                    reattempt_boot - retry live boot with current system state
                                    reboot - reboots the system
                                    `, false);
                                    break;
                                case "fs_status":
                                    t.print("FS status: ", false);
                                    if((fs != null) && (fs.main != null)) {
                                        t.print("ALL OK\n", false, { foreColor: "green" });
                                    } else {
                                        t.print("FS Not Initialized\n", false, { foreColor: "red" });
                                    }
                                    break;
                                case "cd":
                                    if((cmd[1] == null) || (cmd[1].trim() == "")) {
                                        t.print("Error: no valid path specified!\n", false, {foreColor: "red"});
                                        break;
                                    } else if(currentDomain == null) {
                                        t.print("Error: no domain has been selected.\n", false, {foreColor: "red"});
                                        break;
                                    } else if(!fs[cmd[1]].dirExists(cmd[1])) {
                                        t.print("Error: specified dir does not exist!\n", false, {foreColor: "red"});
                                        break;
                                    }
                                    currentDir = cmd[1];
                                    t.print("Directory switched to " + currentDir + "\n", false, {foreColor: "royalblue"});
                                    break;
                                case "cddm":
                                    if((cmd[1] == null) || (cmd[1].trim() == "")) {
                                        t.print("Error: no valid domain specified!\n", false, {foreColor: "red"});
                                        break;
                                    } else if(fs[cmd[1]] == null) {
                                        t.print("Error: domain does not exist.\n", false, {foreColor: "red"});
                                        break;
                                    }
                                    currentDomain = cmd[1];
                                    break;
                                case "lsdomain":
                                    t.print("List of domains:\n", false, {foreColor: "yellow"})
                                    var k = Object.keys(fs);
                                    for(var x in k) {
                                        var ok = k[x];
                                        t.println(ok);
                                    }
                                    break;
                                case "reattempt_boot":
                                    w96.gfx.gfxcontainer = document.createElement("div");
                                    w96.gfx.gfxcontainer.setAttribute("class", "os-container");
                                    w96.gfx.gfxcontainer.setAttribute("id", "maingfx");
                                    w96.gfx.gfxcontainer.setAttribute("style", "width: 100vw;height: 100vh;box-sizing: border-box;background-color: white;color:black;");
                                    document.body.removeChild(consoleDiv);
                                    document.body.appendChild(w96.gfx.gfxcontainer);
                                    w96.init();
                                    break;
                                case "clear":
                                    t.clear();
                                    break;
                                case "reboot":
                                    window.location.href = "/";
                                    break;
                            }
                        }
                        catch(e) {
                            
                        }
                        shellProc(term);
                    });
                }
                shellProc(term);
            }, 1000);
        }
    },
    execFile: function(fileToOpen, domain) {
        var esp = fileToOpen.split('.');
        var ext = esp[esp.length - 1].toLowerCase();
        if(fs[domain] == null) {
            w96.commdlg.msgboxSimple.error("Error", "The drive associated with the file does not exist.", "OK");
            return;
        }
        if(!fs[domain].fileExists(fileToOpen)) {
            w96.commdlg.msgboxSimple.error("Error", "The specified file does not exist.", "WTF?");
            return;
        }
        var contents = fs[domain].getFileContents(fileToOpen);//check if it is a shortcut
        if((contents != null) && contents.startsWith("#!Win96:shortcut")) {
            var shObj = JSON.parse(contents.replace("#!Win96:shortcut", "").trim());
            w96.desktop_shell.exec(shObj.action);
            return;
        }
        switch(ext)
        {
            default:
                //open in textedit
                w96.desktop_shell.exec("win96://texteditor |" + domain + "|" + fileToOpen);
                break;
            case "html": //open in html viewer
                w96.apps_builtin.htmlViewer.start(fileToOpen, domain);
                break;
            case "jsx": //open as js executable
                var sc = document.createElement("script");
                sc.setAttribute("src", `data:text/javascript;base64,${btoa(fs[domain].getFileContents(fileToOpen))}`);
                document.body.appendChild(sc);
                break;
            case "png":
                w96.apps_builtin.imageViewer.start(fileToOpen, domain);
                break;
            case "ogg":
                if(fs[domain].prefix == "x:") {
                    new Audio(fileToOpen).play();
                }
                break;
            case "mp3":
                if(fs[domain].prefix == "x:") {
                    new Audio(fileToOpen).play();
                }
                break;
            case "jpg":
                w96.apps_builtin.imageViewer.start(fileToOpen, domain);
                break;
            case "bmp":
                w96.apps_builtin.imageViewer.start(fileToOpen, domain);
                break;
            case "gif":
                w96.apps_builtin.imageViewer.start(fileToOpen, domain);
                break;
            case "md":
                w96.apps_builtin.markdownViewer.start(fileToOpen, domain);
                break;
        }
    },
    reset: function() {
        localStorage.clear();
        sessionStorage.clear();
        cfs.deleteAllCookies();
        indexedDB.deleteDatabase("w96fs");
        alert("Your installation was successfully reset. Click OK to reboot.");
        document.location.reload();
    },
    apps_builtin: {},
    registry: {
        objects: {},
        hashes: [],
        objectCounter: 0,
        iframeWindowsCount: 0,
        lastRegWindow: "",
        iframeWindows: {},
        appTryRun: {},
        appWindows: {},
        env: {
            W96_VERSION: "IDKLOL",
            W96_RELEASE_STATE: "BETA"
        },
        vpid: {
            random: function() {
                return Math.floor(Math.random() * 1000000);
            },
            pid: {}
        },
        events: {
            kbdDown: {},
            kbdUp: {},
            ctx: {},
            registerEvent: function(eventName, windowId, cb, context) {
                if(this[eventName] == null) return;
                this[eventName][windowId] = cb;
                this.ctx[eventName + "_" + windowId] = context;
            }
        },
        persist: { //Persistent storage
            debugLog: true, //Log events
            useLoginScreen: false,
            userName: "user", //TODO Multi user support as a later feature
            users: {
                "user": {
                    password: null
                }
            },
            nativeHost: {
                enabled: false,
                url: "http://localhost:19960/",
                updateMs: 1000
            }
        },
        savePersist: function() {
            fs.main.writeFile("/SYSTEM.REG", JSON.stringify(w96.registry.persist, null, 4));
        },
        loadPersist: function() {
            if(fs.main.fileExists("/SYSTEM.REG"))
                w96.registry.persist = JSON.parse(fs.main.getFileContents("/SYSTEM.REG"));
            else {
                this.savePersist();
            }
        }
    },
    ui: {
        checkBox: {
            performClick: function() {
                
            }
        }
    },
    gfx: {
        gfxcontainer: document.getElementById("maingfx"),
        setBackground: function(bkColor)
        {
            
        },
        animation: {
            animate: function(element, animationName, callback) {
                const node = document.querySelector(element)
                node.classList.add('animated', animationName)
            
                function handleAnimationEnd() {
                    node.classList.remove('animated', animationName)
                    node.removeEventListener('animationend', handleAnimationEnd)
            
                    if (typeof callback === 'function') callback()
                }
            
                node.addEventListener('animationend', handleAnimationEnd)
            }
        }
    },
    dllLoader: {
        onceLoaded: [],
        loadResDll: function(url)
        {
            var dll = document.createElement("link");
            dll.setAttribute("rel", "stylesheet");
            dll.setAttribute("href", url);
            document.head.appendChild(dll);
            //dbglog.info('loadResDll()', "Loading resource " + url);
        },
        loadJavascriptDll: function(scriptUrl)
        {
            var dll = document.createElement("script");
            dll.setAttribute("src", scriptUrl)
            document.body.appendChild(dll);
            //dbglog.info('loadJavascriptDll()', "Load library " + scriptUrl);
            console.log("Loaded DLL " + scriptUrl);
        },
        loadJavascriptDllOnce: function(scriptUrl)
        {
            if(this.onceLoaded.includes(scriptUrl)) return;
            var dll = document.createElement("script");
            dll.setAttribute("src", scriptUrl)
            document.body.appendChild(dll);
            this.onceLoaded.push(scriptUrl);
            //dbglog.info('loadJavascriptDllOnce()', "Load library " + scriptUrl);
            console.log("Loaded DLL " + scriptUrl);
        },
        loadJavascriptDllOnceNonAsync: function(scriptUrl)
        {
            if(this.onceLoaded.includes(scriptUrl)) return;
            var dll = document.createElement("script");
            dll.setAttribute("src", scriptUrl)
            dll.async = false;
            dll.defer = false;
            document.body.appendChild(dll);
            this.onceLoaded.push(scriptUrl);
            //dbglog.info('loadJavascriptDllOnceNonAsync()', "Load library " + scriptUrl);
            console.log("Loaded DLL " + scriptUrl);
            return dll;
        }
    },
    windowSystem: {
        createdWindows: 0,
        highestZIndex: 0,
        newZI: 10,
        windows: [],
        activeWindow: null,
        hideDialogWindow: function(dlgId, glid) { //TODO add window to taskbar
            w96.windowSystem.deactivateAppBar(dlgId);
            var win = w96.windowSystem.findWindow(glid);
            win.minimized = true;
            //deactivate app bar
            w96.windowSystem.activeWindow = null;
            w96.gfx.animation.animate("#" + dlgId, "bounceOutDown", ()=> {
                var dlg = document.getElementById(dlgId);
                dlg.style.visibility = "hidden";
            });
        },
        findWindow: function(globalId)
        {
            return w96.windowSystem.windows.find((element)=>{ return element._globalId == globalId; });
        },
        closeDialogWindow: function(dlgId, gid) { //TODO destroy appbar if it exists
            //destroy app bar
            if(gid != null) {
                var w = w96.windowSystem.findWindow(gid);
                if(w.onclose != null) w.onclose();
            }
            w96.windowSystem.destroyAppBar(dlgId);
            w96.gfx.animation.animate("#" + dlgId, "fadeOut", ()=> {
                try {
                    var dlg = document.getElementById(dlgId);
                    w96.desktop_shell.desktop.removeChild(dlg);
                    if(w96.windowSystem.activeWindow == dlgId)
                        w96.windowSystem.activeWindow = null;
                } catch(e) {

                }
            });
        },
        registerAppBar: function(app_name, window_id, windowGid, useIcon, iconUrl) {
            var appbar = document.createElement("div");
            if(useIcon) {
                var textDiv = document.createElement("div");
                textDiv.innerText = app_name;
                textDiv.setAttribute("style", "display: inline-block; position: relative; top: -4px; padding-left: 4px;");
                var iconDiv = document.createElement("div");
                iconDiv.setAttribute("style", `height: 16px; width: 16px; display: inline-block; background-image: url(${iconUrl}); position: relative; top: -1px;`);
                appbar.appendChild(iconDiv);
                appbar.appendChild(textDiv);
            } else {
                appbar.innerText = app_name;
            }
            
            appbar.classList.add("taskbar-task");
            appbar.setAttribute("id", window_id + "_appbar");
            //appbar.setAttribute("onclick", `w96.windowSystem.setAppBarActive(w96.windowSystem.findWindow(${windowGid}));`);
            appbar.onclick = function()
            {
                console.log(`loading window ${windowGid}`);
                w96.windowSystem.setAppBarActive(w96.windowSystem.findWindow(windowGid));
            };
            w96.desktop_shell.tasksView.appendChild(appbar);
        },
        destroyAppBar: function(window_id) {
            var appbar = document.getElementById(window_id + "_appbar");
            if(appbar == null) return;
            w96.desktop_shell.tasksView.removeChild(appbar);
        },
        deactivateAppBar: function(window_id) {
            var appbar = document.getElementById(window_id + "_appbar");
            if(appbar == null) return;
            appbar.classList.remove("taskbar-task_active");
        },
        setAppBarActive: function(window) {
            var window_id = window.windowId;
            var wclass = window;
            if(!wclass.usesAppbar) return; //prevent non appbar windows from using the appbar system
            for(var k in Object.keys(w96.desktop_shell.tasksView.children)) {
                var c = w96.desktop_shell.tasksView.children[k];
                if(c == null) continue;
                c.classList.remove("taskbar-task_active");
            }
            if(w96.windowSystem.activeWindow != window.windowId) window.activate();

            var appbar = document.getElementById(window_id + "_appbar");
            if(appbar == null) return;
            appbar.classList.add("taskbar-task_active");
            
            /* LEGACY CODE
            var window = document.getElementById(window_id);
            if(w96.windowSystem.activeWindow != window_id) {
                //swap zindex
                var aw = document.getElementById(w96.windowSystem.activeWindow);
                if(aw == null) return;
                var activeWindowZI = aw.style.zIndex.toString(); //active window z-index
                if(window == null) return;
                aw.style.zIndex = window.style.zIndex;
                window.style.zIndex = activeWindowZI;
                w96.windowSystem.activeWindow = window_id;
            }*/
        },
        createWindowDlgNoResize: function(title, width, height, x, y, globalId) {
            //TODO add functioning close buttons

            var masterWindow = document.createElement("div");
            masterWindow.classList.add("window-dlg");
            masterWindow.setAttribute("style", `width: ${width}px; height: ${height}px; left: ${x}px; top: ${y}px;z-index:${10 + w96.windowSystem.createdWindows};visibility: hidden;`); //old = 10 + w96.windowSystem.createdWindows
            masterWindow.setAttribute("id", "desktop_window_" + w96.windowSystem.createdWindows);
            w96.windowSystem.highestZIndex = 10 + w96.windowSystem.createdWindows;
            var titlebar = document.createElement("div");
            titlebar.classList.add("titlebar");
            
            var theme = w96.desktop_shell.themes[w96.desktop_shell.currentTheme];
            if(theme.windowProperties != null) {
                if(theme.windowProperties.titlebarExpression != null) titlebar.style.background = theme.windowProperties.titlebarExpression;
            }

            var titlebarTitle = document.createElement("div");
            titlebarTitle.classList.add("titlebar-title");
            titlebarTitle.setAttribute("id", masterWindow.id + "_titleBar");
            titlebarTitle.innerText = title;

            var titlebarCloseButton = document.createElement("div");
            titlebarCloseButton.classList.add("nodrag");
            titlebarCloseButton.classList.add("titlebar-closebutton");

            var titlebarMaxButton = document.createElement("div");
            titlebarMaxButton.classList.add("titlebar-maxbutton");
            titlebarMaxButton.classList.add("nodrag");

            var titlebarMinButton = document.createElement("div");
            titlebarMinButton.classList.add("titlebar-minbutton");
            titlebarMinButton.classList.add("nodrag");

            var htmlContent = document.createElement("div");
            htmlContent.classList.add("window-html");

            var htmlContentEditable = document.createElement("div");
            htmlContentEditable.classList.add("window-html-content");
            htmlContentEditable.classList.add("nodrag");
            htmlContentEditable.setAttribute("id", masterWindow.id + "_content");

            titlebar.appendChild(titlebarTitle);
            titlebar.appendChild(titlebarCloseButton);
            titlebar.appendChild(titlebarMaxButton);
            titlebar.appendChild(titlebarMinButton);
            htmlContent.appendChild(htmlContentEditable);
            masterWindow.appendChild(titlebar);
            masterWindow.appendChild(htmlContent);
            masterWindow.onclick = function()
            {
                w96.windowSystem.findWindow(globalId).activate();
            }
            w96.desktop_shell.desktop.appendChild(masterWindow);
            w96.windowSystem.createdWindows++;
            w96.windowSystem.activeWindow = masterWindow.id;
            return masterWindow.id;
        }
    },
    desktop_shell: {
        taskbar: null,
        timebar: null,
        desktop: null,
        tasksView: null,
        startMenuButton: null,
        startMenu: null,
        createShortcut: function(path, action, icon) { //TODO maybe refresh desktop when doing this?
            var icn = icon != null ? icon : "shortcut";
            fs.main.writeFile(path, `#!Win96:shortcut
            {
                "icon": "${icn}",
                "action": "${action}"
            }`);
        },
        updateDesktop: function(animations) {
            var deskIcons = document.querySelectorAll(".desktop-icon");
            for(var x = 0; x < deskIcons.length; x++) {
                deskIcons[x].remove();
            }
            var nodes = fs.main.getNodes("/Desktop");
            if(nodes == -1) return;
            var ni = 1;
            for(var nodeIndex in nodes)
            {
                var node = nodes[nodeIndex];
                //console.log(nodefsc);
                var nodefsc = fs.main.getFileContents(node);
                var icon = "empty";
                if(fs.main.isFile(node))
                {
                    if(nodefsc.startsWith("#!Win96:shortcut"))
                    {
                        var shortcutObject = JSON.parse(nodefsc.replace("#!Win96:shortcut", "").trim());
                        icon = shortcutObject.icon;
                        w96.desktop_shell.addIcon(fs.main.getNodeName(node), w96.desktop_shell.getIconUrl(icon), 10, ni * 30, `w96.desktop_shell.exec('${shortcutObject.action}')`, "di_" + nodeIndex.toString());
                    }
                    else
                    {
                        /*
                        var icon = "empty";
                        
                        if(fn.endsWith(".jsx")) icon = "exec";
                        */
                        var fn = fs.main.getNodeName(node);
                        w96.desktop_shell.addIcon(fn, w96.desktop_shell.getIconUrl(icon), 10, ni * 30, `w96.desktop_shell.exec('win96://openfdomain |main|${node}')`, "di_" + nodeIndex.toString());
                    }
                }
                else
                {
                    icon = "folder";
                    w96.desktop_shell.addIcon(fs.main.getNodeName(node), w96.desktop_shell.getIconUrl(icon), 10, ni * 30, `w96.desktop_shell.exec('win96://opendir ${node}')`, "di_" + nodeIndex.toString());
                }
        
                if(animations) w96.gfx.animation.animate('#' + "di_" + nodeIndex.toString(), "rollIn");
                ni+=2.5;
            }
            
            $(".desktop-icon").draggable();
            //Order all icons
            var desktopIcons = document.getElementsByClassName("desktop-icon");
            var currentX = 10; //each icon needs 70 px y space and 85px x space
            var currentY = 10;
            var maxY = window.innerHeight;
            var ctxM = new ContextMenuBasic();
            ctxM.addMenuItem("");
            for(var desktopIconIndex in desktopIcons)
            {
                var deskIcon = desktopIcons[desktopIconIndex];
                //assign a context menu handler

                if(typeof(deskIcon) != 'object') continue;
                if((currentY + 90) > (maxY))
                {
                    currentX += 85;
                    currentY = 10;
                }
                deskIcon.style.left = currentX + "px";
                deskIcon.style.position = "absolute";
                deskIcon.style.top = currentY + "px";
                currentY += 70;
            } //TODO fix actions for desktop icons
        },
        exec: function(actionUrl) { //shellexec action url, also TODO add folder icons
            switch(actionUrl.trim())
            {
                default:
                    if(actionUrl.startsWith("win96://openfile"))
                    {
                        var fileToOpen = actionUrl.substring(17).trim();
                        if(!fileToOpen.includes("."))
                        {
                            //show open with dlg
                            return;
                        }
                        w96.execFile(fileToOpen, "main");
                    }
                    else if(actionUrl.startsWith("win96://opendir"))
                    {
                        var dirToOpen = actionUrl.substring(16).trim();
                        w96.apps_builtin.explorer.start(dirToOpen, "main");
                    }
                    else if(actionUrl.startsWith("win96://texteditor"))
                    {
                        w96.registry.appTryRun["textEditor"] = setTimeout(4500, ()=>{
                            w96.commdlg.msgboxSimple.warning("Text Editor", "Text editor is taking a while to load. This could be due to a slow connection, please wait.", "OK");
                        });
                        if(!fs.ram.dirExists("/Temp")) fs.ram.createNewFolder("/Temp");
                        var asl = actionUrl.split('|'); //console.log(as);
                        if(!actionUrl.includes("|")) asl = ["win96://textedit", "ram", "/Temp/Untitled"];
                        var domain = asl[1].trim();
                        var path = asl[2].trim();
                        w96.dllLoader.loadJavascriptDllOnceNonAsync("./lib/codemirror/codemirror.js");
                        var lastDll = w96.dllLoader.loadJavascriptDllOnceNonAsync("./lib/codemirror/mode/javascript/javascript.js");
                        if(lastDll != null) {
                            lastDll.onload = ()=>{
                                var te = new TextEditor(path, domain);
                                te.show();
                            };
                        } else {
                            var te = new TextEditor(path, domain);
                            te.show();
                        }
                    }
                    else if(actionUrl.startsWith("win96://openurl"))
                    {
                        var url = actionUrl.substring(16).trim();
                        window.open(url);
                    }
                    else if(actionUrl.startsWith("win96://openddomain"))
                    {
                        var as = actionUrl.split('|'); //console.log(as);
                        var domain = as[1].trim();
                        var path = as[2].trim();
                        w96.apps_builtin.explorer.start(path, domain);
                    }
                    else if(actionUrl.startsWith("win96://openfdomain"))
                    {
                        var as = actionUrl.split('|'); //console.log(as);
                        var domain = as[1].trim();
                        var path = as[2].trim();
                        w96.execFile(path, domain);
                    }
                    else if(actionUrl.startsWith("win96://nodemini")) {
                        var as = actionUrl.split('|'); //console.log(as);
                        var domain = as[1].trim();
                        var path = as[2].trim();
                        w96.dllLoader.loadJavascriptDllOnceNonAsync("./system36/lib/node_mini.js");
                        console.log("Node mini loaded");
                    }
                    else if(actionUrl.startsWith("win96://js"))
                    {
                        eval(actionUrl.substring(11).replace("\\'", "'").replace("\\\"", "\""));
                    }
                    break;
                case "win96://assistant":
                    if(!assistantActive) {
                        var a = new Assistant();
                        a.show();
                    } else {
                        assistant.playSound("already-open");
                    }
                    break;
                case "win96://diskcleanup":

                    break;
                case "win96://testopengl":
                    var glWindow = new StandardWindow("Gl test", 400, 300, 30, 30, true, 200, 100, true, "Gl test");
                    glWindow.setHtmlContent(`<style> .hview { border-style: none; height: 100%; width: 100%; background-color: white; } </style>
                    <iframe class="hview" src="./system36/gltest.html"> </iframe>`);
                    //paintWindow.center();
                    glWindow.show();
                    break;
                case "win96://iexploder":
                    //new InternetExploder().show();
                    break;
                case "win96://touchconfig":
                    //TOUCHCONFIG-APP
                    if(!w96.dev.touch.setupShown) {
                        w96.dev.touch.setupShown = true;
                        var twindow = new StandardWindow("Touch Device Configuration", 0, 0, 0, 0, true, 0, 0, true, "Touch Cfg");
                        if(!w96.dev.touch.touchMode) {
                            twindow.setControlBoxStyle(ControlBoxStyles.WS_CBX_CLOSE);
                            twindow.setCbxButtonStyle(1, `background-size: cover;
                            height: 22px;
                            width: 25px;
                            visibility: unset;`);
                            twindow.toggleMaximize();
                            twindow.setTitlebarFontSize(30);
                        }
                        twindow.onclose = ()=>{w96.dev.touch.setupShown = false};
                        
                        //twindow.setContentFontSize(30); //TODO for testing
                        twindow.setHtmlContent(`<style>.hview { box-sizing: border-box;font-size: 18px; padding:10px;height:100%;width:100%;font-family:windows; }</style>
                        <div class="hview">
                            <b style="font-size: 24px;">Touch Device Setup Utility</b><br>
                            Welcome to TouchDevCfg! This utility will help you optimize Windows96 better for your touch screen device (e.g. iPad, iPhone, Samsung).
                            <br>By default, Windows96 is not optimized and will perform poorly on touch enabled devices.<br><br>
                            Would you like to enable touch screen support? (Note: this will change your website experience and not all apps are supported)<br><br>
                            <button onclick="w96.dev.touch.enable()" style="font-size: 22px;" class="w96-button">Yes, enable it</button><br>
                            <button onclick="w96.dev.touch.disable()" style="font-size: 22px;" class="w96-button">No, do NOT enable it</button><br><br>
                            <br>
                            Changing any of these options will refresh the OS.
                            
                        </div>
                        `);
                        twindow.show();

                    } else {
                        alert("Finish the setup before trying again");
                    }
                    break;
                case "win96://myinstants":
                    var buttonsWindow = new StandardWindow("Buttons", 400, 300, 30, 30, true, 200, 100, true, "Buttons");
                    buttonsWindow.setHtmlContent(`<style> .hview { border-style: none; height: 100%; width: 100%; background-color: white; } </style>
                    <iframe class="hview" src="http://myinstants.com"> </iframe>`);
                    //paintWindow.center();
                    buttonsWindow.show();
                    break;
                case "win96://deskmeter":
                    if(!deskmeterSetupActive) {
                        var dms = new DeskMeterSetup();
                        dms.show();
                    } else {
                        
                    }
                    break;
                case "win96://pumkin":
                    var pumkin = new StandardWindow("Pumkin World", 400, 300, 30, 30, true, 200, 100, true, "Pumkin World");
                    pumkin.setHtmlContent(`<style> .hview { border-style: none; height: 100%; width: 100%; background-color: white; padding-top: 10px; padding-left: 10px; box-sizing: border-box; background-color: #ff811e; } </style>
                    <embed class="hview" src="./system36/apps/pumkin-world/menus/gamesmenu.swf" quality="high" scale="exactfit" allowscriptaccess="sameDomain" type="application/x-shockwave-flash" base="./system36/apps/pumkin-world" pluginspage="http://www.macromedia.com/go/getflashplayer" bgcolor="#ff811e">`);
                    //paintWindow.center();
                    pumkin.show();
                    if(assistant != null) {
                        assistant.playSound("pumkin-love");
                    }
                    break;
                case "win96://mytube":
                    var mtwindow = new StandardWindow("MyTube", 400, 300, 50, 50, true, 200, 100, true, "MyTube");
                    mtwindow.setHtmlContent(`<style> .hview { border-style: none; height: 100%; width: 100%; background-color: white; } </style>
                    <iframe class="hview" src="./system36/apps/mytube/mytube.html"> </iframe>`);
                    //paintWindow.center();
                    mtwindow.show();
                    break;
                case "win96://blocks":
                    var mcwindow = new StandardWindow("Blocks", 400, 300, 50, 50, true, 200, 100, true, "Blocks");
                    mcwindow.setHtmlContent(`<style> .hview { border-style: none; height: 100%; width: 100%; background-color: white; } </style>
                    <iframe class="hview" src="http://classic.minecraft.net"> </iframe>`);
                    //paintWindow.center();
                    mcwindow.show();
                    break;
                case "win96://cclicker":
                    var tcwId = "tc_" + w96.registry.iframeWindowsCount++;
                    var tcwindow = new StandardWindow("Tall Chest", 400, 460, 50, 50, true, 200, 100, true, "Tall Chest");
                    tcwindow.setHtmlContent(`<style> .hview { border-style: none; height: 100%; width: 100%; background-color: white; } </style>
                    <iframe class="hview" src="./system36/apps/cclicker/cclicker.html"> </iframe>`);
                    w96.registry.iframeWindows[tcwId] = tcwindow;
                    w96.registry.lastRegWindow = tcwId;
                    tcwindow.show();
                    break;
                case "win96://help":
                    var helpWindowId = "hw_" + w96.registry.iframeWindowsCount++;
                    var mid = getScreenMidpointWObject(400, 350);
                    var helpWindow = new StandardWindow("Help Docs", 400, 350, mid.x, mid.y, true, 100, 100, true, "Help");
                    helpWindow.setHtmlContent(`<style> .hview { border-style: none; height: 100%; width: 100%; background-color: white; } </style>
                    <iframe class="hview" src="./system36/apps/help/index.html"> </iframe>`);
                    w96.registry.iframeWindows[helpWindowId] = helpWindow;
                    w96.registry.lastRegWindow = helpWindowId;
                    helpWindow.show();
                    break;
                case "win96://pakstore96":
                    var pakWindowId = "hw_" + w96.registry.iframeWindowsCount++;
                    var mid = getScreenMidpointWObject(400, 350);
                    var pakWindow = new StandardWindow("Windows 96 Package Store", 400, 350, mid.x, mid.y, true, 100, 100, true, "PakStore96");
                    pakWindow.setHtmlContent(`<style> .hview { border-style: none; height: 100%; width: 100%; background-color: white; } </style>
                    <iframe class="hview" src="./system36/apps/pak96/store.php"> </iframe>`);
                    w96.registry.iframeWindows[pakWindowId] = pakWindow;
                    w96.registry.lastRegWindow = pakWindowId;
                    pakWindow.show();
                    break;
                case "win96://command":
                    stdTerms++;
                    new TerminalWindow().show();
                    break;
                case "win96://garbage":
                    if(assistant != null) {
                        document.querySelectorAll('.desktop-icon-text').forEach((el)=>{
                            if(el.innerText == "Garbage") {
                                var r = el.getBoundingClientRect();
                                assistant.teleport(r.x, r.y, ()=>{ assistant.playSound("trash"); }); //TODO implement TP
                            }
                        });
                    }
                    w96.desktop_shell.exec("win96://opendir /Garbage");
                    break;
                case "win96://ctrlpanel":
                    new ControlPanelApp().show();
                    break;
                case "win96://paint":
                    var paintWindow = new StandardWindow("Paint", 400, 300, 30, 30, true, 200, 100, true, "Paint");
                    paintWindow.setHtmlContent(`<style> .hview { border-style: none; height: 100%; width: 100%; background-color: white; } </style>
                    <iframe class="hview" src="https://www.piskelapp.com/p/create"> </iframe>`);
                    //paintWindow.center();
                    paintWindow.show();
                    break;
                case "win96://computer":
                    w96.apps_builtin.explorer.start("computer://", "main");
                    break;
                case "win96://gfxtweak": //Open graphics tweaker
                    var gfxWindow = new StandardWindow("gfxtweaker", 350, 200, (window.innerWidth/2)-(400/2), (window.innerHeight/2)-(300/2), true, 200, 100, true, "gfxtweak");
                    gfxWindow.setHtmlContent(`
                    <div class="gfxtweaker-main">
                    <p style="margin-top: 0px;">Welcome to gfxtweaker!<br><br>From here you can corrupt your WINDOWS96(R) graphics card with epic effects.</p>
                    FX: <select id="fxselection" class="w96-select">
                        <option value="none">none</option>
                        <option value="_1930">1930</option>
                        <option value="_3d">3d</option>
                        <option value="airhorn">airhorn</option>
                        <option value="australia">australia</option>
                        <option value="blur">blur</option>
                        <option value="deepfryer">deepfryer</option>
                        <option value="hue">hue</option>
                        <option value="invert">invert</option>
                        <option value="spinner">spinner</option>
                        <option value="twocolor">twocolor</option>
                        <option value="vir">vir</option>
                    </select>
                    <br>
                    <br>
                    <div style="text-align: center;">
                        <button onclick="w96.fx.applyFxByName(document.getElementById('fxselection').value)" class="w96-button">Apply</button>
                        <button onclick="w96.fx.revertAll()" class="w96-button">Revert</button> 
                    </div>
                    </div>`);
                    gfxWindow.show();
                    break;
            }
            
        },
        themes: {
            __empty: {
                author: "MICRO96",
                repo_path: "/",
                iconFmt: "png",
                type: "normal"
            },
            default: {
                author: "MICRO96 and Microsoft",
                repo_path: "./system36/icons96",
                iconFmt: "png",
                type: "normal"
            },
            hd: {
                author: "MICRO96 and Microsoft",
                repo_path: "./system36/themes/windows96/icons96-hd",
                iconFmt: "png",
                type: "mixed",
                parent: "default",
                icons: [
                    "cdrom",
                    "computer",
                    "ctrlpanel",
                    "dll",
                    "empty",
                    "floppy",
                    "folder",
                    "hdd",
                    "netdrive",
                    "ram",
                    "text"
                ]
            },
            classic: {
                author: "MICRO96 and Microsoft",
                repo_path: "./system36/themes/windows96/icons96-classic",
                iconFmt: "png",
                type: "mixed",
                parent: "default",
                icons: [
                    "folder",
                    "floppy",
                    "hdd",
                    "netdrive",
                    "cdrom"
                ]
            },
            windows93: {
                author: "jankenpopp",
                repo_path: "./system36/themes/windows93", 
                iconFmt: "png",
                type: "mixed",
                parent: "default",
                icons: null,
                windowProperties: {
                    titlebarExpression: "linear-gradient(135deg,#f0f 0,#0ff 100%)"
                },
                customBg: "linear-gradient(135deg,#f0f 0,#0ff 100%)"
            },
            rave: {
                author: "MICRO96",
                repo_path: "./system36/themes/rave",
                iconFmt: "png",
                type: "mixed",
                parent: "default",
                icons: [],
                customBg: "url(system36/themes/rave/Windows96-Rave-WP.jpg)",
                sounds: {
                    loop: {
                        src: "./system36/themes/rave/rave_loop.ogg",
                        settings: {
                            loop_helper: true,
                            lbuffer: 0.20
                        }
                    }
                },
                startFx: 'hue',
                customStylesheet: `.window-dlg {
                    box-shadow: 0px 0px 10px 5px #0ff;
                }
                .start-menu {
                    box-shadow: 0px 0px 20px 10px indianred;
                }
                .desktop-icon-text {
                    text-shadow: 1px 1px 10px magenta;
                }
                .taskbar {
                    box-shadow: 1px 1px 3px 2px magenta;
                    transform: translateY(-3px);
                    width: calc(100vw - 6px);
                    left: 3px;
                }
                /*.w96-button {
                    box-shadow: 1px 1px 9px 1px darkcyan;
                    border-style: double;
                    border-color: darkcyan;
                    border-radius: 4px;
                    color: darkcyan;
                    border-width: 1px;
                }*/
                `
            }
        },
        currentTheme: "default",
        themeEngine: {
            soundEngine: {
                playSoundEvent: function(evtName) {
                    if(w96.desktop_shell.themes[w96.desktop_shell.currentTheme].sounds == null) return;
                    if(w96.desktop_shell.themes[w96.desktop_shell.currentTheme].sounds[evtName] == null) return;
                    if(w96.desktop_shell.themes[w96.desktop_shell.currentTheme].sounds[evtName].settings == null) return;
                    if(w96.desktop_shell.themes[w96.desktop_shell.currentTheme].sounds[evtName].src == null) return;
                    if(w96.registry.objects["snd_" + evtName] != null) {
                        w96.registry.objects["snd_" + evtName].pause();
                        w96.registry.objects["snd_" + evtName].currentTime = 0;
                        delete w96.registry.objects["snd_" + evtName];
                    }
                    var sound = w96.desktop_shell.themes[w96.desktop_shell.currentTheme].sounds[evtName];
                    var audio = new Audio(sound.src);
                    audio.loop = true;
                    if(sound.settings.loop_helper) {
                        audio.addEventListener('timeupdate', function(){
                            if(this.currentTime > this.duration - sound.settings.lbuffer){
                                this.currentTime = 0;
                                this.play();
                        }}, false);
                    }
                    audio.play();
                    w96.registry.objects["snd_" + evtName] = audio;
                }
            },
            defineTheme: function(name, author, repo_path, iconFormat) {
                this.themes[name] = {
                    author,
                    repo_path,
                    iconFmt: iconFormat,
                    type: "normal"
                };
            },
            importExternalThemesURI: function(uri) {
                var themesJSON = createXhrSimpleSync(uri);
                if(themesJSON == false) return false;
                var themes = JSON.parse(themesJSON);
                var tKeys = Object.keys(themes);
                for(var x in tKeys) {
                    var key = tKeys[x];
                    var theme = themes[key];
                    console.log("Loading theme " + key);
                    w96.desktop_shell.themes[key] = theme;
                }
                return true;
            }
        },
        getIconUrl: function(iconName) {
            if(this.themes[this.currentTheme].type == "mixed") {
                if(this.themes[this.currentTheme].icons.includes(iconName))
                    return `${this.themes[this.currentTheme].repo_path}/${iconName}.${this.themes[this.currentTheme].iconFmt}`;
                else return `${this.themes[this.themes[this.currentTheme].parent].repo_path}/${iconName}.${this.themes[this.themes[this.currentTheme].parent].iconFmt}`;
            }
            return `${w96.desktop_shell.themes[w96.desktop_shell.currentTheme].repo_path}/${iconName}.${w96.desktop_shell.themes[w96.desktop_shell.currentTheme].iconFmt}`;
        },
        settings: {
            custom_wp: null,
            isIFrame: false,
            wp_style: 'cover',
            theme: 'default'
        },
        startMenuOptions: {
            startButtonActivated: false,
            performOnClick: function(menuItemId) //handle all start menu actions
            {
                switch(menuItemId)
                {
                    case 0: //Open programs

                        break;
                    case 2:
                        w96.desktop_shell.exec("win96://opendir /Documents");
                        break;
                    case 3:
                        w96.desktop_shell.exec("win96://ctrlpanel");
                        break;
                    case 4:
                        w96.desktop_shell.exec("win96://touchconfig");
                        break;
                    case 5:
                        w96.desktop_shell.exec("win96://help");
                        break;
                    case 6:
                        /*var m = new w96.commdlg.MessageBox("Enter command", `
                        Enter a command and WINDOWS 96 will open it for you.<br><br>
                        <input id="run{dlgId}" style="box-sizing: border-box;width:100%" class="w96-textbox"></input>
                        `, "run", "Run", (buttonsSelected, mbx)=>{
                            var textBoxContents = document.getElementById("run" + mbx.dlgId);
                            alert(textBoxContents.value);
                            return true; //return true closes the box
                        });
                        m.setSize(m.initialWidth + 25, m.initialHeight + 15);
                        m.show();*/

                        var runCmd = prompt("Enter command to run: (gui dlg is WIP)");
                        if((runCmd != null) && (runCmd.trim() != "")) {
                            w96.desktop_shell.exec("win96://" + runCmd);
                        }
                        break;
                    case 8: //Shut down
                        document.body.style.background = "black";
                        document.body.innerHTML = '<div style="color: white; font-family: stdvga;">You may now safely switch off this computer.</div>';
                        break;
                    case 9:
                        var aboutWindow = new StandardWindow("About WINDOWS96", 576, 400, (window.innerWidth/2)-(576/2), (window.innerHeight/2)-(400/2), false);
                        aboutWindow.setControlBoxStyle(ControlBoxStyles.WS_CBX_CLOSE);
                        aboutWindow.setHtmlContent(`
<div style="text-align: center; margin: auto;font-family: stdvga;">
    <h2>MICRO96 WINDOWS(R) 96</h2>
    <h3>Copyright (C) WINDOWS96 TEAM 2019.</h3>

<div class="credits" style="
    width: fit-content;
    margin: auto;
    background-color: white;
    padding: 20px;
    overflow: auto;
">
    WINDOWS96 Website by mr_chainmain (<a href="https://github.com/techspider">Visit</a>)<br>
    animate.css by Daniel Eden (<a href="https://daneden.github.io/animate.css/">Visit</a>)<br>
    jQuery (<a href="https://jquery.com/">Visit</a>)<br>
    Pixel Arial Font (<a href="https://www.dafont.com/pixel-arial-11.font">Visit</a>)<br>
    W96Plus boot logo by @gnomedprofile (<a href="https://twitter.com/gnomedprofile/">Visit</a>)
    
    
</div>
    <br>
    <br>
    <br>
<div class="credits-footnote" style="
    font-size: 14px;
">
    
    Windows 95 &amp; 98 icons (C) Microsoft Corporation.<br>
    Windows(tm) is a registered trademark of Microsoft Corporation.<br>
    Other trademarks and logos are property of their respective owners.<br><br><br>
    If we forgot about you, shoot us an <a href="mailto:ctm@windows96.net">email</a>
    </div>
</div>
                        `);
                        aboutWindow.show();
                        break;
                }
                w96.desktop_shell.startMenuButton.style.background = "url(./system36/resources/shell/start_here.png)";
                if(assistant != null) assistant.playSound("not-productive");
                w96.gfx.animation.animate(".start-menu", "fadeOutDown", ()=>{
                    w96.desktop_shell.startMenu.setAttribute("style", "visibility: hidden;");
                    //set start button image to closed
                });
            }

        },
        syncDesktopConfig: function() {
            fs.main.writeFile("/desktop.json", JSON.stringify(w96.desktop_shell.settings, false, 4));
        },
        openStartMenu: function() { //TODO conform to animation settings
            w96.desktop_shell.startMenuOptions.startButtonActivated = !w96.desktop_shell.startMenuOptions.startButtonActivated;
            if(w96.desktop_shell.startMenuOptions.startButtonActivated)
            {
                w96.desktop_shell.startMenu.setAttribute("style", "");
                if(assistant != null) assistant.playSound("productive");
                w96.desktop_shell.startMenuButton.style.background = "url(./system36/resources/shell/start_here_active.png)";
                w96.gfx.animation.animate(".start-menu", "slideInUp");
                //set start button image to opened
            }
            else
            {
                w96.desktop_shell.startMenuButton.style.background = "url(./system36/resources/shell/start_here.png)";
                if(assistant != null) assistant.playSound("not-productive");
                w96.gfx.animation.animate(".start-menu", "fadeOutDown", ()=>{
                    w96.desktop_shell.startMenu.setAttribute("style", "visibility: hidden;");
                    
                    //set start button image to closed
                });
            }
        },
        changeWallpaper: function(wpstring) {
            var cssString = `url(${wpstring})`;
            if(!wpstring.includes(":")) cssString = wpstring;
            w96.desktop_shell.desktop.style.background = cssString;
        }, //SET ICON ID AND INCREMENT IT WHENEVER AN ICON IS CREATED
        changeWallpaperRawWSave: function(wallpaperStringRaw, wallpaperScalingStyle)
        {
            w96.desktop_shell.desktop.style.background = wallpaperStringRaw;
            w96.desktop_shell.desktop.style.backgroundSize = wallpaperScalingStyle;
            w96.desktop_shell.settings.custom_wp = wallpaperStringRaw;
            w96.desktop_shell.settings.wp_style = wallpaperScalingStyle;
            fs.main.writeFile("/desktop.json", JSON.stringify(w96.desktop_shell.settings));
        },
        addIcon: function(icon_label, icon_image_url, x, y, onclick, id) {
            var desktopIcon = document.createElement("div");
            desktopIcon.classList.add("desktop-icon");
            var desktopIconImage = document.createElement("div");
            desktopIconImage.classList.add("desktop-icon-image");
            desktopIconImage.setAttribute("style", `background: url(${icon_image_url}); background-size: cover;`);
            var desktopIconText = document.createElement("div");
            desktopIconText.classList.add("desktop-icon-text");
            desktopIconText.innerText = icon_label;
            desktopIcon.setAttribute("style", `top: ${y}px;left:${x}px`);
            desktopIcon.setAttribute("id", id);
            if(onclick != null) {
                if(!w96.dev.touch.touchMode) desktopIcon.setAttribute("ondblclick", onclick);
                else {
                    //desktopIcon.setAttribute("onclick", onclick);
                    desktopIconImage.setAttribute("onclick", onclick);
                }
            }
            
            desktopIcon.onclick = function()
            {
                //uncheck all other icons
                var icons = document.getElementsByClassName("desktop-icon-text");
                for(var ei in icons)
                {
                    var textEl = icons[ei];
                    if(typeof(textEl) != 'object') continue;
                    textEl.setAttribute("style", "");
                    var image = textEl.parentNode.children[0];
                    //console.dir(image.outerHTML);
                    if(image != null) {
                        image.style.filter = "";
                    }
                }
                desktopIconText.setAttribute("style", "background-color: rgb(0,0,128);border-style: dotted;border-width: 1px;border-color: white");
                desktopIconImage.style.filter = "brightness(0.5) contrast(1.2) sepia(100%) hue-rotate(180deg) saturate(20)";
            }
            desktopIcon.appendChild(desktopIconImage);
            desktopIcon.appendChild(desktopIconText);
            w96.desktop_shell.desktop.appendChild(desktopIcon);
        }
    },
    init: function() //Init before desktop appears
    {
        window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || 
        window.msIndexedDB;
        
        window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || 
        window.msIDBTransaction;
        window.IDBKeyRange = window.IDBKeyRange || 
        window.webkitIDBKeyRange || window.msIDBKeyRange
        
        if (!window.indexedDB) {
            alert("Your browser doesn't support a stable version of IndexedDB.");
        }
        //dbglog.init();

        w96.dev.touch.touchMode = (localStorage.getItem("touch_enabled") == "true");

        if(w96.dev.touch.touchMode) {
            //dbglog.info('init()', "Touch device detected.");
        }

        if(!fs.main.dirExists("/startup")) fs.main.createNewFolder("/startup");
        fs.ram.writeFile("/BOOTLOG.txt", `[INFO ${new Date()}] Windows 96 bootup started at init()\n`);
        //Load all DLLs
        w96_dllsToLoad.forEach((value)=>{
            fs.ram.appendFile("/BOOTLOG.txt", `[INFO ${new Date()}] Loading javascript library ${value}\n`);
            w96.dllLoader.loadJavascriptDll(value);
        });
        w96_stylesToLoad.forEach((value)=>{
            fs.ram.appendFile("/BOOTLOG.txt", `[INFO ${new Date()}] Loading resource library ${value}\n`);
            w96.dllLoader.loadResDll(value);
        });

        w96.gfx.gfxcontainer.setAttribute("style", "width: 100vw;height: 100vh;box-sizing: border-box;background-color: black;color:white;");
        
        if(window.navigator.userAgent.indexOf("Edge") > -1) {
            console.log("Browser is ms edge, importing optimized CSS document...");
            w96.dllLoader.loadResDll("./css/shell36-ms.css");
        } else if(window.navigator.userAgent.indexOf("Firefox") > -1) {
            console.log("Browser is mz firefox, importing optimized CSS document...");
            w96.dllLoader.loadResDll("./css/shell36-moz.css");
        } else if((window.navigator.userAgent.indexOf("Safari") > -1) && window.navigator.userAgent.indexOf("Mobile") > -1) {
            console.log("Browser is mobile apple safari, importing optimized content...");
            //Load safari mobile javascripts
            w96.dllLoader.loadResDll("./css/shell36-smb.css");
        }

        bootup_proc.showBootscreen(w96.gfx.gfxcontainer);
        w96.registry.loadPersist();

        //w96.init_stage2(); //DEBUGGING REMOVE
        setTimeout(w96.init_stage2, 2000);
    },
    auth_user: function(username, password)
    {
        if(w96.registry.persist.users[username] == null) {
            //new Audio("./system36/sounds/access_deny.mp3").play();
            w96.commdlg.msgboxSimple.error("Logon", "The specified user does not exist on this system.", "OK");
        } else if(w96.registry.persist.users[username].password == null) {
            w96.init_stage3();
        } else if(w96.registry.persist.users[username].password != md5(password)) {
            new Audio("./system36/sounds/access_deny.mp3").play();
            //w96.commdlg.msgboxSimple.error("Logon", "The password for this user is incorrect!", "OK");
        } else {
            w96.init_stage3();
        }
    },
    auth_changePwd: function(pwd)
    {
        var u = w96.registry.persist.userName;
        if((pwd.value == null) || (pwd.value.trim() == "")) {
            w96.registry.persist.users[u].password = null;
            w96.registry.persist.useLoginScreen = false;
            w96.commdlg.msgboxSimple.info("Logon", "Logon system has been disabled.", "OK");
        } else {
            w96.registry.persist.users[u].password = md5(pwd.value);
            w96.registry.persist.useLoginScreen = true;
            w96.commdlg.msgboxSimple.info("Logon", "Logon system has been enabled.", "Cool!");
        }
        w96.registry.savePersist();
    },
    init_stage2: function() //Stage 2 shell init
    {
        //dbglog.info('init_stage2()', "Loading theme specific icons...");
        w96.desktop_shell.themes.windows93.icons = (()=>{
            var icons = [];
            try {
                var themeJson = createXhrSimpleSync(w96.desktop_shell.themes.windows93.repo_path + "/icons_enabled.json");
                icons = JSON.parse(themeJson);
            } catch(e) {
                // DEBUG ONLY throw e;
                //dbglog.error('init_stage2()', `Error loading icons!\n\tException thrown: ${e}`);
            }
            //dbglog.info('init_stage2()', "Finished loading icons!");
            return icons;
        })();
        if(localStorage.getItem("legacySupport") == null) {
            var biosConfig = { gpu: { bwFilter: false, basicRendering: false } };
            if(biosConfig.gpu.bwFilter) document.getElementsByTagName("html")[0].setAttribute("style", "filter: grayscale(100%) contrast(100);");
        }
        fs.ram.appendFile("/BOOTLOG.txt", `[INFO ${new Date()}] Initializing desktop GFX\n`);
        w96.gfx.gfxcontainer.innerHTML = "";
        w96.gfx.gfxcontainer.setAttribute("style", "width: 100vw;height: 100vh;box-sizing: border-box;background-color: white;color:black;");
        var edll_shell36 = document.createElement("link");
        edll_shell36.setAttribute("rel", "stylesheet");
        edll_shell36.setAttribute("href", "./css/shell36.css");
        document.head.appendChild(edll_shell36);
        w96.dllLoader.loadResDll("./css/animation.css");
        w96.dllLoader.loadResDll("./css/font36.css");
        
        if(w96.registry.persist.useLoginScreen) {
            //WINLOGON.EXE
            //Change appearance for login
            //When login finished, clear maingfx and start init_stage3();
            var mgfx = document.querySelector("#maingfx");
            mgfx.style.background = "rgb(0, 128, 128)";
            w96.desktop_shell.desktop = mgfx;
            var mid = getScreenMidpointWObject(482, 250);
            var loginWindow = new StandardWindow("Log Into Windows", 482, 250, mid.x, mid.y, false, 450, 250, false, "WinLogon", ['NO_RESIZE']);
            loginWindow.setControlBoxStyle(ControlBoxStyles.WS_CBX_CLOSE);
            loginWindow.setHtmlContent(`
                <style>
                    .logon_window_box { width: 100%; height: 100%; box-sizing: border-box; padding: 22px; } 
                </style>
                <div class="logon_window_box">
                    <div style="display: flex;width: 100%; padding-bottom: 32px;">
                        <div style="height: 32px;margin-top:16px;width:32px;background:url(./system36/icons96/login.png)"></div>
                        <div style="flex:1;padding-left: 16px;font-family:nouveaux;font-size: 9px;">
                        Please enter your logon details to log into this computer.<br><br>
                        If you forgot your password, you have to reset your installation.
                        </div>
                    </div>
                    <div style="display: flex;">
                        <div style="width:60px;display: inline-block;font-size: 9px;font-family: nouveaux;">Username: </div><input id="username" class="w96-textbox" style="width: 100%;flex: 1;margin-left: 16px;" value="user">
                    </div>
                    <div style="padding-bottom:32px;display: flex;">
                        <div style="width:60px;display: inline-block;font-size: 9px;font-family: nouveaux;">Password: </div><input id="password" type="password" class="w96-textbox" style="width: 100%;flex: 1;margin-left: 16px;">
                    </div>
                    <button class="w96-button" onclick="window.location.href = window.location;">Shut Down</button>
                    <button style="float:right;" class="w96-button" onclick="w96.auth_user(document.getElementById('username').value,document.getElementById('password').value)">Log In</button>
                </div>
            `);
            loginWindow.onclose = function() {
                setTimeout(()=>window.location.href = window.location, 1000);
            };
            loginWindow.show();
            if(w96.registry.persist.users[w96.registry.persist.userName].password == null) {
                w96.commdlg.msgboxSimple.warning("Logon", "You have not set a password to protect this computer!<br><br>This means anyone can log on to this installation of WINDOWS96.", "Yikes!").setSize(320,150);
            }
        } else {
            w96.init_stage3();
        }
    },
    init_stage3: ()=>{
        var mgfx = document.querySelector("#maingfx");
        mgfx.innerHTML = "";
        //TASKBAR

        w96.desktop_shell.taskbar = document.createElement("footer");
        //if(biosConfig.gpu.basicRendering) w96.desktop_shell.taskbar.setAttribute("class", "taskbar");
         
        w96.desktop_shell.taskbar.setAttribute("class", "taskbar bounceIn");
        w96.desktop_shell.desktop = document.createElement("section");
        w96.desktop_shell.desktop.setAttribute("class", "desktop");
        
        var timeEl = document.createElement("div");
        timeEl.classList.add("taskbar-time");
        timeEl.innerText = "3:00 AM";
        w96.desktop_shell.taskbar.appendChild(timeEl);
        w96.desktop_shell.timebar = timeEl;

        //TASKS VIEW

        var tvel = document.createElement("div");
        tvel.classList.add("taskbar-tasks");
        w96.desktop_shell.taskbar.appendChild(tvel);
        w96.desktop_shell.tasksView = tvel;

        //START MENU BUTTON

        w96.desktop_shell.startMenuButton = document.createElement("div");
        w96.desktop_shell.startMenuButton.setAttribute("class", "start_button");
        w96.desktop_shell.startMenuButton.onclick = w96.desktop_shell.openStartMenu;
        w96.desktop_shell.taskbar.appendChild(w96.desktop_shell.startMenuButton);

        //START MENU
        w96.desktop_shell.startMenu = document.createElement("div");
        w96.desktop_shell.startMenu.setAttribute("class", "start-menu");
        w96.desktop_shell.startMenu.setAttribute("style", "visibility: hidden;");
        w96.desktop_shell.startMenu.innerHTML = `<div class="w96_sm_logo"></div> <div class="w96_sm_item_container">
        <div id="item_programs" onclick="w96.desktop_shell.startMenuOptions.performOnClick(1)" class="w96_sm_item">
            <div class="w96_sm_item_image" style="background: url(./system36/resources/icons/programs.png);">
                <div class="w96_sm_item_text">Programs</div>
            </div>
        </div>
        <div id="item_documents" onclick="w96.desktop_shell.startMenuOptions.performOnClick(2)" class="w96_sm_item">
            <div class="w96_sm_item_image" style="background: url(./system36/resources/icons/documents.png);">
                <div class="w96_sm_item_text">Documents</div>
            </div>
        </div>
        <div id="item_settings" onclick="w96.desktop_shell.startMenuOptions.performOnClick(3)" class="w96_sm_item">
            <div class="w96_sm_item_image" style="background: url(./system36/resources/icons/settings.png);">
                <div class="w96_sm_item_text">Settings</div>
            </div>
        </div>
        <div class="item_separator">&nbsp;</div>
        <div id="item_touchcfg" onclick="w96.desktop_shell.startMenuOptions.performOnClick(4)" class="w96_sm_item">
            <div class="w96_sm_item_image" style="background: url(./system36/icons96/touchcfg.png);">
                <div class="w96_sm_item_text">Touch Device Config</div>
            </div>
        </div>
        <div id="item_help" onclick="w96.desktop_shell.startMenuOptions.performOnClick(5)" class="w96_sm_item">
            <div class="w96_sm_item_image" style="background: url(./system36/resources/icons/help.png);">
                <div class="w96_sm_item_text">Help</div>
            </div>
        </div>
        <div id="item_run" onclick="w96.desktop_shell.startMenuOptions.performOnClick(6)" class="w96_sm_item">
            <div class="w96_sm_item_image" style="background: url(./system36/resources/icons/run.png);">
                <div class="w96_sm_item_text">Run</div>
            </div>
        </div>
        <div class="item_separator">&nbsp;</div>
        <div id="item_bios" onclick="w96.desktop_shell.startMenuOptions.performOnClick(7)" class="w96_sm_item">
            <div class="w96_sm_item_image" style="background: url(./system36/resources/icons/shutdown.png);">
                <div class="w96_sm_item_text">Reboot to BIOS</div>
            </div>
        </div>
        <div id="item_shutdown" onclick="w96.desktop_shell.startMenuOptions.performOnClick(8)" class="w96_sm_item">
            <div class="w96_sm_item_image" style="background: url(./system36/resources/icons/shutdown.png);">
                <div class="w96_sm_item_text">Shut down</div>
            </div>
        </div>
        <div class="item_separator">&nbsp;</div>
        <div id="item_about" onclick="w96.desktop_shell.startMenuOptions.performOnClick(9)" class="w96_sm_item">
            <div class="w96_sm_item_image" style="background: url(./system36/resources/icons/about.png);">
                <div class="w96_sm_item_text">About WINDOWS96</div>
            </div>
        </div>
        </div>`;

        //COMMIT CHANGES
        w96.desktop_shell.desktop.appendChild(w96.desktop_shell.startMenu);
        w96.gfx.gfxcontainer.appendChild(w96.desktop_shell.desktop);
        w96.gfx.gfxcontainer.appendChild(w96.desktop_shell.taskbar);

        //READ ALL STARTUP SCRIPTS
        var startupNodes = fs.main.getNodes("/startup");
        for(var x = 0; x < startupNodes.length;x++) {
            var sn = startupNodes[x];
            if(!fs.main.isFile(sn)) continue;
            if(sn.endsWith(".js")) { //Only execute .js
                var contents = fs.main.getFileContents(sn);
                var scel = document.createElement("script");
                scel.innerHTML = contents;
                document.body.appendChild(scel);
            }
        }
        setInterval(()=>{
            var time = new Date();
            w96.desktop_shell.timebar.innerText = time.toLocaleString('en-US', { hour: 'numeric',  minute: 'numeric', hour12: true });
        }, 1000);
        //
        //INITIALIZE DESKTOP EXPERIENCE
        if(!fs.main.fileExists("/desktop.json"))
        {
            fs.main.writeFile("/desktop.json", JSON.stringify(w96.desktop_shell.settings));
        }
        else
        {
            w96.desktop_shell.settings = JSON.parse(fs.main.getFileContents("/desktop.json"));
            if(w96.desktop_shell.settings.custom_wp != null)
            {
                w96.desktop_shell.desktop.style.background = w96.desktop_shell.settings.custom_wp;
                w96.desktop_shell.desktop.style.backgroundSize = w96.desktop_shell.settings.wp_style;
            }
            w96.desktop_shell.currentTheme = w96.desktop_shell.settings.theme;
            if(w96.desktop_shell.currentTheme == undefined) {
                w96.desktop_shell.settings.theme = "default";
                w96.desktop_shell.currentTheme = "default";
                fs.main.writeFile("/desktop.json", JSON.stringify(w96.desktop_shell.settings));
            }
        }
        if(!fs.main.dirExists("/Garbage")) fs.main.createNewFolder("/Garbage");
        if(!fs.main.dirExists("/Desktop"))
        {
            fs.main.createNewFolder("/Desktop");
            fs.main.writeFile("/Desktop/Deskmeter", `#!Win96:shortcut
            {
                "icon": "custom",
                "action": "win96://deskmeter"
            }`);
            fs.main.writeFile("/Desktop/Assistant", `#!Win96:shortcut
            {
                "icon": "assistant",
                "action": "win96://assistant"
            }`);
            fs.main.writeFile("/Desktop/Tall Chest", `#!Win96:shortcut
            {
                "icon": "tall_chest",
                "action": "win96://cclicker"
            }`);
            fs.main.writeFile("/Desktop/Pumkin World", `#!Win96:shortcut
            {
                "icon": "hungry",
                "action": "win96://pumkin"
            }`);
            fs.main.writeFile("/Desktop/Text Editor", `#!Win96:shortcut
            {
                "icon": "textedit",
                "action": "win96://texteditor"
            }`);
            //TODO create some kind of discord clone
            fs.main.writeFile("/Desktop/Doordisc", `#!Win96:shortcut
            {
                "icon": "discord",
                "action": "win96://openurl https://discord.gg/b7u9HGe"
            }`);
            fs.main.writeFile("/Desktop/Garbage", `#!Win96:shortcut
            {
                "icon": "trash",
                "action": "win96://garbage"
            }`);
            fs.main.writeFile("/Desktop/Blocks", `#!Win96:shortcut
            {
                "icon": "mc",
                "action": "win96://blocks"
            }`);
            fs.main.writeFile("/Desktop/MyTube", `#!Win96:shortcut
            {
                "icon": "mytube",
                "action": "win96://mytube"
            }`);
            fs.main.writeFile("/Desktop/Paint", `#!Win96:shortcut
            {
                "icon": "mspaint",
                "action": "win96://paint"
            }`);
            fs.main.writeFile("/Desktop/WIN96 (C:)", `#!Win96:shortcut
            {
                "icon": "hdd",
                "action": "win96://opendir /"
            }`);
            fs.main.writeFile("/Desktop/RAMDISK (E:)", `#!Win96:shortcut
            {
                "icon": "ram",
                "action": "win96://openddomain |ram|/"
            }`);
            fs.main.writeFile("/Desktop/gfxtweak", `#!Win96:shortcut
            {
                "icon": "gpu_card",
                "action": "win96://gfxtweak"
            }`);
            fs.main.writeFile("/Desktop/Ctrl Panel", `#!Win96:shortcut
            {
                "icon": "ctrlpanel",
                "action": "win96://ctrlpanel"
            }`);
            fs.main.writeFile("/Desktop/Gl Test", `#!Win96:shortcut
            {
                "icon": "gltest",
                "action": "win96://testopengl"
            }`);
            fs.main.writeFile("/Desktop/Buttons", `#!Win96:shortcut
            {
                "icon": "buttons",
                "action": "win96://myinstants"
            }`);
            fs.main.writeFile("/Desktop/Computer", `#!Win96:shortcut
            {
                "icon": "computer",
                "action": "win96://computer"
            }`);
            fs.main.writeFile("/Desktop/TOS.md", `#!Win96:shortcut
            {
                "icon": "markdown",
                "action": "win96://openfdomain |root|/TOS.md"
            }`);  
            fs.main.writeFile("/Desktop/README.md", `#!Win96:shortcut
            {
                "icon": "markdown",
                "action": "win96://openfdomain |root|/docs/BETA.md"
            }`);
            fs.main.writeFile("/Desktop/Service", `#!Win96:shortcut
            {
                "icon": "virus",
                "action": "win96://js w96.fx.vir.start()"
            }`);
            /*fs.main.writeFile("/Desktop/PakStore96", `#!Win96:shortcut
            {
                "icon": "packagestore",
                "action": "win96://pakstore96"
            }`);*/
            /*fs.main.writeFile("/Desktop/Internet Exploder", `#!Win96:shortcut
            {
                "icon": "iexploder",
                "action": "win96://iexploder"
            }`);*/
            //TODO add computer icon
        }
        
        w96.desktop_shell.updateDesktop(true); //with anims
        fs.main.watchFolder("/Desktop", ()=>{ w96.desktop_shell.updateDesktop(false); });

        if(!fs.main.dirExists("/Documents")) fs.main.createNewFolder("/Documents");

        w96.dllLoader.loadJavascriptDll("./system36/lib/html_viewer.js");
        w96.dllLoader.loadJavascriptDll("./system36/lib/terminal.js");
        w96.dllLoader.loadJavascriptDll("./js/w96/apps_builtin.js");
        
        document.body.style.backgroundImage = "url(./system36/missing.png)";
        document.body.style.backgroundRepeat = "repeat";
        console.log(`windows 96 has finished loading`);

        console.log(`checking version...`);
        var version = localStorage.getItem('w96ver');
        var latestVersion = 1.86; //the latest version TODO change it every update
        if(version != null)
        {
            var currentVersion = parseFloat(version);
            if(currentVersion < latestVersion)
            {
                document.querySelector("#mainaudio").volume = 0.2;
                document.querySelector("#mainaudio").src = "./system36/sounds/error.mp3";
                document.querySelector("#mainaudio").play();
                DialogCreator.createDlgBasic("New Version Available", "<br>Windows 96 has been updated to version v" + latestVersion + '\n\nPlease reset your installation to properly apply the new update.\n<a href="#" onclick="w96.reset()">Click here to reset</a>', 'info')
                return;
            }
        }
        else localStorage.setItem('w96ver', latestVersion);/*
        var desktopCtxM = new ContextMenuBasic();
        desktopCtxM.addMenuItem("Create New Folder", "alert('test')");
        desktopCtxM.addMenuItem("Create New File", "alert('test')");
        desktopCtxM.addSeparator();
        desktopCtxM.addMenuItem("Desktop Properties", "alert('test')");
        desktopCtxM.addCtxMenuListener(w96.desktop_shell.desktop);*/
        var setupCompleted = localStorage.getItem("w96_sc");
        if(setupCompleted == null)
        {
            if(!fs.floppy_a.fileExists("/README.md"))
            {
                fs.floppy_a.writeFile("/README.md", `## Floppy A:/ tutorial

You can use \`floppy A\` to store small files or a custom bootloader. This tutorial will show you how to put a custom bootloader.

\`\`\`js
fs.floppy_a.writeFile("/loader.js", "vga_driver.putString('hello world');");
\`

This will let you write a custom bootloader to A:\\ which you can boot from if you hit \`F9\` on startup.`);
            }
            fs.main.writeFile("/Garbage/javashrek.jpg", "#!Win96:shortcut\n{ \"icon\": \"image2\", \"action\": \"win96://openfdomain |root|/system36/web/win96_std/shr3k.jpg\" }");
            localStorage.setItem("w96_sc", "true");
        }
        
        if(!fs.main.dirExists("/system36")) {
            fs.main.createNewFolder("/system36");
        }
        console.log("%cWELCOME TO WINDOWS 96 COMRADE!", "font-family: monospace; font-weight: 900; font-size: 30px; color: red; outline: 1;");
        w96.bootFinished = true;
        if(w96.registry.persist.nativeHost.enabled) w96.dllLoader.loadJavascriptDllOnce("./system36/lib/nh96.js");
        if(w96.desktop_shell.themes[w96.desktop_shell.currentTheme].sounds != null) {
            if(w96.desktop_shell.themes[w96.desktop_shell.currentTheme].sounds.loop != null) {
                w96.desktop_shell.themeEngine.soundEngine.playSoundEvent("loop");
            }
        }
        if(w96.desktop_shell.themes[w96.desktop_shell.currentTheme].customStylesheet != null) {
            var sn = document.createElement('style');
            sn.innerText = w96.desktop_shell.themes[w96.desktop_shell.currentTheme].customStylesheet;
            document.body.appendChild(sn);
        }
        var taskbarCtxm = new ContextMenuBasic();
        taskbarCtxm.addMenuItem("Unstick", callback2String(()=>{
            if(w96.registry.objects['taskbar_unstick']) {
                w96.commdlg.msgboxSimple.warning("Task Bar", "It is already unsticked!<br><br>To restick, restart WINDOWS 96.", "Cool down bro!");
                return;
            }
            var x = $(".taskbar");
            x.draggable();
            x.resizable();
            w96.commdlg.msgboxSimple.info("Task Bar", "You have unstuck the taskbar. This means you can freely move it/resize it at will.\n\nTo revert, restart WINDOWS 96.", "Thanks!");
            w96.registry.objects['taskbar_unstick'] = true;
        }));
        taskbarCtxm.addMenuItem("Destroy", callback2String(()=>{
            document.querySelector('.taskbar').remove();
            w96.commdlg.msgboxSimple.warning("Task Bar", "The task bar is now gone.<br><br>If you really want it back, restart WINDOWS 96.", "Yikes!");
        }));
        taskbarCtxm.addCtxMenuListener(document.querySelector(".taskbar-tasks"));

        if(w96.desktop_shell.themes[w96.desktop_shell.currentTheme].startFx != null) {
            w96.fx[w96.desktop_shell.themes[w96.desktop_shell.currentTheme].startFx].start();
        }
        w96.desktop_shell.desktop.style.backgroundPosition = "center";
    }
}

//TODO add ability for user to change dlls to load
var w96_dllsToLoad = [
    "./system36/lib/fx.js",
    "./system36/lib/explorer.js",
    "./system36/lib/gravity.js"
];

var w96_stylesToLoad = [
    "./lib/jstree/themes/default/style.min.css"
]

var startClickIgnoreElements = [
    "w96_sm_item_container",
    "start_button",
    "start-menu",
    "w96_sm_logo",
    "w96_sm_item_container",
    "w96_sm_item",
    "w96_sm_item_text"
];

var desktopIconClickIgnoreElements = [
    "desktop-icon",
    "desktop-icon-image",
    "desktop-icon-text",
    "menu-basic",
    "menu-basic-option",
    "menu-basic-options",
    "menu-basic-separator",
    "menuitem-root"
];

document.body.onkeydown = function(e) {
    var wid = w96.windowSystem.activeWindow;
    if(wid == null) return;
    var event = w96.registry.events.kbdDown[wid];
    if(event == null) return;
    event(e, w96.registry.events.ctx["kbdDown_" + wid]);
}

document.body.onkeyup = function(e) {
    var wid = w96.windowSystem.activeWindow;
    if(wid == null) return;
    var event = w96.registry.events.kbdUp[wid];
    if(event == null) return;
    event(e, w96.registry.events.ctx["kbdUp_" + wid]);
}

function _hashFunc(obj) {
    var hash = 0;
    var objtext = obj.toString();
    for (var i = 0; i < objtext.length; i++) {
        var character = objtext.charCodeAt(i);
        hash = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

function callback2String(cb) { //Only allows for non native callbacks
    var id = "cb_" + (w96.registry.objectCounter++);
    w96.registry.objects[id] = cb;
    return `w96.registry.objects['${id}']();`;
}

document.body.onclick = function(e) {
    if(e.srcElement == null) return;
    if(e.srcElement.getAttribute("class") == null) return;

    if(!startClickIgnoreElements.includes(e.srcElement.getAttribute("class").trim()))
    {
        if(w96.desktop_shell.startMenuOptions.startButtonActivated)
        {
            w96.desktop_shell.startMenuOptions.startButtonActivated = false;
            w96.desktop_shell.startMenuButton.style.background = "url(./system36/resources/shell/start_here.png)";
            w96.gfx.animation.animate(".start-menu", "fadeOutDown", ()=>{
                w96.desktop_shell.startMenu.setAttribute("style", "visibility: hidden;");
                
                //set start button image to closed
            });
        }
    }

    if(!desktopIconClickIgnoreElements.includes(e.srcElement.getAttribute("class").trim()))
    {
        var icons = document.getElementsByClassName("desktop-icon-text");
        for(var ei in icons)
        {
            var textEl = icons[ei];
            if(typeof(textEl) != 'object') continue;
            textEl.setAttribute("style", "");
            var image = textEl.parentNode.children[0];
            //console.dir(image.outerHTML);
            if(image != null) {
                image.style.filter = "";
            }
            //deapply filterfilter: brightness(.5) sepia(100%) hue-rotate(180deg) saturate(8);
        }
        //check if there are any open app menus
        appMenuUpdateProc();
    }
}

function appMenuUpdateProc() {
    var menus = document.querySelectorAll(".menu-basic");
    menus.forEach((value)=>{
        try {
            w96.desktop_shell.desktop.removeChild(value);
        } catch(e) {

        }
    });

    var menuRoots = document.querySelectorAll(".menuitem-root");
    menuRoots.forEach((value)=>{
        if(value.classList.contains("menuitem-root-active")) {
            value.classList.remove("menuitem-root-active");
        }
    });

    isMenuAlreadyActive = false;
}

w96.commdlg.SaveFileDialog = class extends w96.commdlg.OpenFileDialog {
    constructor(title) {
        super(title);
        this.fileNameBox = null;
        this.onViewUpdateFinished = function() {
            var ev = document.querySelector("#explorerView" + this.dlgId);
            for(var x = 0; x < ev.children.length; x++) {
                var icon = ev.children[x];
                icon.setAttribute("onclick", `w96.commdlg.dlgClasses['${this.dlgId}'].setTextboxContents(this);`);
            }
        }
    }

    show(onFileSelected) {
        super.show(onFileSelected);
        var footer = document.getElementById("explorerFooter" + this.dlgId);
        var fileNameBox = document.createElement("input");
        fileNameBox.setAttribute("style", "width: 100%; box-sizing: border-box;");
        fileNameBox.setAttribute("id", "fbox_" + this.dlgId);
        fileNameBox.classList.add("textbox-96");
        fileNameBox.value = "Untitled.txt";
        this.fileNameBox = fileNameBox;
        footer.appendChild(fileNameBox);
    }

    setTextboxContents(el) {
        this.fileNameBox.value = el.innerText;
    }

    conclude(stat, node) {
        if(!stat) {
            this.dlg.close();
            return;
        }
        var path = this.currentPath + this.fileNameBox.value.trim();
        if(this.currentPath != "/") path = this.currentPath + "/" + this.fileNameBox.value.trim();
        if(!fs[this.domain].isFile(path)) {
            alert("Not a file!");
            return;
        }
        this.onFileSelected(stat, path, this.domain);
        this.dlg.close();
    }
}

function whenAvailable(name, callback) {
    var interval = 10; // ms
    window.setTimeout(function() {
        if (window[name]) {
            callback(window[name]);
        } else {
            window.setTimeout(arguments.callee, interval);
        }
    }, interval);
}