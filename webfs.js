//!W96-DRIVER
/*
Web this
 - Utilizes this.storage as the storage location for WINDOWS96

Copyright (C) Windows 96 Team 2019. All rights reserved.
*/

//BIG TODO: add ability to create missing parent directories
//BIG BIG BIG TODO: make files as json so we can store binary data (still wIP)

var wfsProperties = { //global settings
    sortItems: true
}

var cfs = {
    setCookie: function(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = "expires="+ d.toUTCString();
        document.cookie = cname + "=" + cvalue + ";" + expires + "";
    },
    getCookie: function(cname) {
        if(document.cookie.trim() == "") return null;
        var cookies = document.cookie.split(';');
        for(var x in cookies)
        {
            var cookie = cookies[x];
            var csp = cookie.split('=');
            var cookieName = csp[0].trim();
            var cookieValue = csp[1].trim();
            if(cname == cookieName) return cookieValue;
        }
        return null;
    },
    deleteAllCookies: function() {
        var cookies = document.cookie.split(";");
    
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i];
            var eqPos = cookie.indexOf("=");
            var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
    }
    /*old impl
    getCookie: function(cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for(var i = 0; i <ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return null;
    }*/
}

var readOnlyFileSystem = function(prefix, jsonString) {
    this.fsObject = JSON.parse(jsonString);
    this.label = this.fsObject.fsLabel;
    this.prefix = "WF$";
    this.remote = false;
    if(prefix != null) this.prefix = prefix;
    this.nodeExists = function(path) {
        if(path == '/') return true;
        if(this.fsObject.fs[path] != null) return true;
        return false;
    }

    this.getParentPath = function(path) {
        if(path == "/") return "/";
        var ps = path.split('/');
        var psl = ps[ps.length - 1];
        var p = path.substring(0, path.length - psl.length - 1);
        return p.trim() != "" ? p : "/";
    }

    this.createNewFolder = function(path) {
        return false;
    }

    this.createEmptyFile = function(path) {
        return false;
    }

    this.getNodes = function(path) {
        var newfs = [];
        var fs = Object.keys(this.fsObject.fs);
        var fspath = path;
        if(!this.nodeExists(path)) return -1;
        var separatorsP1 = fspath.split('/').length;
        for(var x in fs)
        {
            var el = fs[x];
            if(el == fspath) continue;
            //console.log(el);
            if(!el.startsWith(fspath)) continue;
            var separatorsP2 = el.split('/').length;
            if(path == '/')
                if(separatorsP2 > (separatorsP1)) continue;
            
            
            if(separatorsP2 > (separatorsP1 + 1))
                continue;
            
            console.log("Seperators P2: " + separatorsP2 + ", Separators P1: " + separatorsP1 + ", X: " + x + ", el: " + el);
            newfs.push(el.substring(0));
        }
        return wfsProperties.sortItems ? newfs.sort(function (a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
}) : newfs;
    }

    this.isFile = function(path) {
        if(path == '/') return false;
        var nodeName = path;
        var d = this.fsObject.fs[path];
        if(d == null) return -1;
        if(d.trim() == "%:DIR") return false;
        return true;
    }

    this.fileExists = function(path) {
        if(!this.nodeExists(path)) return false;
        else
        {
            if(!this.isFile(path)) return false;
            return true;
        }
    }

    this.dirExists = function(path) {
        if(!this.nodeExists(path)) return false;
        else
        {
            if(this.isFile(path)) return false;
            return true;
        }
    }
    
    this.writeFile = function(path, data) {
        return false;
    }

    this.appendFile = function(path, data) {
        return false;
    }

    this.downloadFile = function(path, data) {
        if(path == '/') return false;
        if(!this.fileExists(path)) return false;
        var ps = path.split('/');
        var fileName = ps[ps.length - 1];
        var te = new TextEncoder();
        te.encoding = "utf-8";
        initiateFileDownload(te.encode(this.fsObject.fs[path]), fileName);
    }

    this.getFileContents = function(path) {
        if(path == '/') return false;
        if(!this.fileExists(path)) return false;
        return this.fsObject.fs[path];
    }

    this.getNodeName = function(path) {
        var ps = path.split('/');
        var psl = ps[ps.length - 1];
        return psl;
    }
}

var remoteFileSystem = function(prefix, jsonLayout) {
    readOnlyFileSystem.call(this, prefix, jsonLayout);
    this.remote = true;
    this.prefix = prefix;
    this.downloadFile = function(path, data) {
        //TODO Not implemented
    }

    this.getFileContents = function(path, isExplorer) {
        if(path == '/') return false;
        if(!this.fileExists(path)) return false;
        if(isExplorer) return "";
        try {
            var xhrUrl = this.fsObject.fs[path].trim();
            var request = new XMLHttpRequest();
            request.open('GET', xhrUrl, false);
            request.send(null);
            if(request.status === 200) {
                return request.responseText;
            } else return false;
        } catch(e) {
            return false;
        }
    }
}

var cookieFileSystem = function(prefix, dummy) {
    this.label = "Disk";
    this.storage = null;
    this.readOnly = false;
    this.prefix = 'WF$';
    this.remote = false;

    if(prefix != null) this.prefix = prefix;
    this.nodeExists = function(path)
    {
        if(path == '/') return true;
        var nodeName = this.prefix + path;
        if(cfs.getCookie(nodeName) != null) return true;
        return false;
    }
    this.getParentPath = function(path) {
        if(path == "/") return "/";
        var ps = path.split('/');
        var psl = ps[ps.length - 1];
        var p = path.substring(0, path.length - psl.length - 1);
        return p.trim() != "" ? p : "/";
    }
    this.createNewFolder = function(path)
    {
        //TODO check if parent exists
        if(!this.nodeExists(this.getParentPath(path)))
            return false;
        if(this.nodeExists(path)) return false;
        var folderName = this.prefix + path;
        cfs.setCookie(folderName, "%:DIR", 365);
        return true;
    }
    this.createEmptyFile = function(path)
    {
        if(!this.nodeExists(this.getParentPath(path)))
            return false;
        if(this.nodeExists(path)) return false;
        var fileName = this.prefix + path;
        cfs.setCookie(fileName, "", 365);
        return true;
    }
    this.getNodes = function(path)
    {
        var newfs = [];
        var fsd = document.cookie.split(';');
        var fs = [];
        for(var x in fsd)
        {
            var fsi = fsd[x];
            fs.push(fsi.split('=')[0].trim());
        }
        var fspath = this.prefix + path;
        if(!this.nodeExists(path)) return -1;
        var separatorsP1 = fspath.split('/').length;
        for(var x in fs)
        {
            var el = fs[x];
            if(el == fspath) continue;
            //console.log(el);
            if(!el.startsWith(this.prefix)) continue;
            if(!el.startsWith(fspath)) continue;
            var separatorsP2 = el.split('/').length;
            if(path == '/')
                if(separatorsP2 > (separatorsP1)) continue;
            
            
            if(separatorsP2 > (separatorsP1 + 1))
                continue;
            
            console.log("Seperators P2: " + separatorsP2 + ", Separators P1: " + separatorsP1 + ", X: " + x + ", el: " + el);
            newfs.push(el.substring(this.prefix.length));
        }
        return wfsProperties.sortItems ? newfs.sort(function (a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
}) : newfs;
    }
    this.isFile = function(path)
    {
        if(path == '/') return false;
        var nodeName = this.prefix + path;
        var d = cfs.getCookie(nodeName);
        if(d == null) return -1;
        if(d.trim() == "%:DIR") return false;
        return true;
    }
    this.fileExists = function(path)
    {
        if(!this.nodeExists(path)) return false;
        else
        {
            if(!this.isFile(path)) return false;
            return true;
        }
    }
    this.dirExists = function(path)
    {
        if(!this.nodeExists(path)) return false;
        else
        {
            if(this.isFile(path)) return false;
            return true;
        }
    }
    this.writeFile = function(path, data)
    {
        if(!this.nodeExists(path)) 
        {
            var r = this.createEmptyFile(path);
            if(!r) return false;
        }
        cfs.setCookie(this.prefix + path, btoa(data), 365);
        return true;
    }
    this.appendFile = function(path, data)
    {
        if(!this.nodeExists(path)) return false;
        var content = this.getFileContents(path) + data;
        this.writeFile(path, content);
        return true;
    }
    this.downloadFile = function(path, data)
    {
        if(path == '/') return false;
        if(!this.fileExists(path)) return false;
        var ps = path.split('/');
        var fileName = ps[ps.length - 1];
        var te = new TextEncoder();
        te.encoding = "utf-8";
        initiateFileDownload(te.encode(cfs.getCookie(this.prefix + path)), fileName);
    }
    this.getFileContents = function(path)
    {
        if(path == '/') return false;
        if(!this.fileExists(path)) return false;
        return atob(cfs.getCookie(this.prefix + path));
    }
    this.getNodeName = function(path)
    {
        var ps = path.split('/');
        var psl = ps[ps.length - 1];
        return psl;
    }
}

var fileSystem = function(prefix, useSessionStorage) {
    this.label = "Disk";
    this.storage = localStorage;
    this.readOnly = false;
    this.remote = false;

    if(useSessionStorage) this.storage = sessionStorage;
    this.prefix = 'WF$';
    if(prefix != null) this.prefix = prefix;
    this.foldersToWatch = [];
    this.watchId = null;
    this.writeBinaryFile = function(path, data) {
        if(!this.nodeExists(path)) 
        {
            var r = this.createEmptyFile(path);
            if(!r) return false;
        }
        this.storage.setItem(this.prefix + path, `%:BIN` + btoa(Uint8ToString(data)));
        this.updateWatch(path);
        return true;
    }
    this.nodeExists = function(path)
    {
        if(path == '/') return true;
        var nodeName = this.prefix + path;
        if(this.storage.getItem(nodeName) != null) return true;
        return false;
    }
    this.getParentPath = function(path) {
        if(path == "/") return "/";
        var ps = path.split('/');
        var psl = ps[ps.length - 1];
        var p = path.substring(0, path.length - psl.length - 1);
        return p.trim() != "" ? p : "/";
    }
    this.createNewFolder = function(path)
    {
        //TODO check if parent exists
        if(!this.nodeExists(this.getParentPath(path)))
            return false;
        if(this.nodeExists(path)) return false;
        var folderName = this.prefix + path;
        this.storage.setItem(folderName, "%:DIR");
        this.updateWatch(path);
        return true;
    }
    this.updateWatch = function(path) {
        if(this.foldersToWatch.length > 0) {
            for(var x = 0; x < this.foldersToWatch.length; x++) {
                var wObj = this.foldersToWatch[x];
                console.log(wObj);
                if(wObj.path == this.getParentPath(path)) {
                    wObj.cb();
                }
            }
        }
    }
    this.createEmptyFile = function(path)
    {
        if(!this.nodeExists(this.getParentPath(path)))
            return false;
        if(this.nodeExists(path)) return false;
        var fileName = this.prefix + path;
        this.storage.setItem(fileName, "");
        this.updateWatch(path);
        return true;
    }
    this.getNodes = function(path)
    {
        var newfs = [];
        var fs = Object.keys(this.storage);
        var fspath = this.prefix + path;
        if(!this.nodeExists(path)) return -1;
        var separatorsP1 = fspath.split('/').length;
        for(var x in fs)
        {
            var el = fs[x];
            if(el == fspath) continue;
            //console.log(el);
            if(!el.startsWith(this.prefix)) continue;
            if(!el.startsWith(fspath)) continue;
            var separatorsP2 = el.split('/').length;
            if(path == '/')
                if(separatorsP2 > (separatorsP1)) continue;
            
            
            if(separatorsP2 > (separatorsP1 + 1))
                continue;
            
            console.log("Seperators P2: " + separatorsP2 + ", Separators P1: " + separatorsP1 + ", X: " + x + ", el: " + el);
            newfs.push(el.substring(this.prefix.length));
        }
        return wfsProperties.sortItems ? newfs.sort(function (a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
}) : newfs;
    }
    this.isFile = function(path)
    {
        if(path == '/') return false;
        var nodeName = this.prefix + path;
        var d = this.storage.getItem(nodeName);
        if(d == null) return -1;
        if(d.trim() == "%:DIR") return false;
        return true;
    }
    this.fileExists = function(path)
    {
        if(!this.nodeExists(path)) return false;
        else
        {
            if(!this.isFile(path)) return false;
            return true;
        }
    }
    this.dirExists = function(path)
    {
        if(!this.nodeExists(path)) return false;
        else
        {
            if(this.isFile(path)) return false;
            return true;
        }
    }
    this.writeFile = function(path, data)
    {
        if(!this.nodeExists(path)) 
        {
            var r = this.createEmptyFile(path);
            if(!r) return false;
        }
        this.storage.setItem(this.prefix + path, data);
        this.updateWatch(path);
        return true;
    }
    this.appendFile = function(path, data)
    {
        if(!this.nodeExists(path)) return false;
        var content = this.getFileContents(path) + data;
        this.writeFile(path, content);
        return true;
    }
    this.downloadFile = function(path, data)
    {
        if(path == '/') return false;
        if(!this.fileExists(path)) return false;
        var ps = path.split('/');
        var fileName = ps[ps.length - 1];
        var te = new TextEncoder();
        te.encoding = "utf-8";
        initiateFileDownload(te.encode(this.storage.getItem(this.prefix + path)), fileName);
    }
    this.getFileContents = function(path)
    {
        if(path == '/') return false;
        if(!this.fileExists(path)) return false;
        var data = this.storage.getItem(this.prefix + path);
        if(data.startsWith("%:BIN")) return data.substring(5);
        else if(data.startsWith("%:LINK")) {
            var xdata = createXhrSimpleSyncCORSFix(data.substring(6));
            if(!xdata) return '';
            else return xdata;
        }
        return data;
    }
    this.getNodeName = function(path)
    {
        var ps = path.split('/');
        var psl = ps[ps.length - 1];
        return psl;
    }
    this.watchFolder = function(path, cb)
    {
        this.foldersToWatch.push({ path, cb });
    }
}

function Uint8ToString(u8a) {
    var CHUNK_SZ = 0x8000;
    var c = [];
    for (var i=0; i < u8a.length; i+=CHUNK_SZ) {
        c.push(String.fromCharCode.apply(null, u8a.subarray(i, i+CHUNK_SZ)));
    }
    return c.join("");
}

function B64ToUint8(b64Str) {
    return new Uint8Array(atob(b64Str).split("").map(function(c) {
        return c.charCodeAt(0); }));
}

function tryB64UI8(b64Str) {
    try {
        return B64ToUint8(b64Str);
    } catch(e) {
        return "";
    }
}