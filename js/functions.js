/**
* autobookmarks.txusko.com
* chrome extension - released under MIT License
* Author: Javi Filella <txusko@gmail.com>
* http://github.com/txusko/AutoBookmarks
* Copyright (c) 2015 Javi Filella
*
* Permission is hereby granted, free of charge, to any person
* obtaining a copy of this software and associated documentation
* files (the "Software"), to deal in the Software without
* restriction, including without limitation the rights to use,
* copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the
* Software is furnished to do so, subject to the following
* conditions:
*
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
* OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
* HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
* WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
* FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
* OTHER DEALINGS IN THE SOFTWARE.
*
*/

//Default vars
var idParentFolder = 0;
var defaults = {
  state : true,
  domains : [ "autobookmarks.txusko.com" ],
  options : [[ "autobookmarks.txusko.com", "0", ""]],
  extensions : [],
  bookmarkFolderName : "AutoBookmarks",
  notificationsEnabled : true,
  dateEnabled : true
}

//Extension vars
var abm = {
  extUrl : "http://autobookmarks.txusko.com/ws/index.php",
  state : defaults.state,
  domains : defaults.domains,
  options : defaults.options,
  extensions : defaults.extensions,
  bookmarkFolderName : defaults.bookmarkFolderName,
  notificationsEnabled : defaults.notificationsEnabled,
  dateEnabled : defaults.dateEnabled
}

//Restore configuration
abm._Restore = function(callback) {
  chrome.storage.sync.get(defaults, function(retVal) {
    //Recover vars
    abm.state = retVal.state;
    abm.domains = retVal.domains;
    abm.options = retVal.options;
    abm.bookmarkFolderName = retVal.bookmarkFolderName;
    abm.extensions = retVal.extensions;
    abm.notificationsEnabled = retVal.notificationsEnabled;
    abm.dateEnabled = retVal.dateEnabled;
    //Localize
    localizePage();
    //Check id of the root folder
    if(idParentFolder <= 0) {
      //Get general bookmarks tree
      chrome.bookmarks.getSubTree("1", function(bookmarks) {
        //Get id of the root folder
        idParentFolder = functs.search_for_title(bookmarks, abm.bookmarkFolderName);
        //Callback
        if(callback != null) callback();
      });
    } else {
      //Callback
      if(callback != null) callback();
    }
  });
}

//Create bookmarks tree
abm._CreateFolders = function(callback) {
  if(idParentFolder != 0) {
    var folders = [];
    //Get folders from domains
    for (var j = 0; j < abm.options.length; j++) {
      if(abm.options[j][0] !== "")
        folders.push(abm.options[j][0]);
      else
        folders.push("Default");
    }
    //Get folders from extensions
    for (var j = 0; j < abm.extensions.length; j++) {
      folders.push(abm.extensions[j]);
    }
    var total = folders.length;
    var iteration = 0;
    for(var i=0; i < total; i++) {
      abm._CreateFolder(idParentFolder, folders[i], true, function() {
        iteration++;
        if(iteration == total && callback != null) {
          callback();
        }
      });
    }
  } else {
    console.log('Root bookmark folder id missing.');
  }
}

abm._RemoveEmptyFolders = function() {
  if(idParentFolder != 0) {
    chrome.bookmarks.getSubTree(String(idParentFolder), function(bookmarks) {
      var items = bookmarks[0].children;
      var itemsNum = items.length;
      if(typeof items !== "undefined" && itemsNum > 0) {
        for(var i=0; i < itemsNum; i++) {
          if(typeof items[i].children !== "undefined" && items[i].children.length <= 0) {
            chrome.bookmarks.remove(items[i].id);
          }
        }
      }
    });
  } else {
    console.log('The root bookmark folder ID is missing.');
  }
}

//Create a specific folder
abm._CreateFolder = function(parentId, title, create, callback) {
  var idFolder = 0;
  if(typeof create === 'undefined')
    create = false;
  chrome.bookmarks.getSubTree(String(parentId), function(bookmarks) {
    idFolder = functs.search_for_title(bookmarks, title);
    if(idFolder <= 0 && create) {
      chrome.bookmarks.create({
        'parentId': "" + parentId,
        'title': "" + title
      },function(newFolder) {
          idFolder = newFolder.id;
          if(callback != null) callback(idFolder, title);
      });
    } else {
      if(callback != null) callback(idFolder, title);
    }
  });
}

abm.initState = function(message, callback) {
  //State
  $('#idState').attr("data-on-text", translate("running"));
  $('#idState').attr("data-off-text", translate("paused"));
  $('#idState').attr("data-label-text", translate("state"));
  if(abm.state) {
    $("[name='state']").bootstrapSwitch('state', true, true);
    chrome.browserAction.setIcon({path:chrome.app.getDetails().icons[256]});
  } else {
    $("[name='state']").bootstrapSwitch();
    chrome.browserAction.setIcon({path:chrome.app.getDetails().icons["256_off"]});
  }
  //Action
  $('#idState').on('switchChange.bootstrapSwitch', function(event, state) {
    //Change icon
    if(state) {
      chrome.browserAction.setIcon({path:chrome.app.getDetails().icons[256]});
    } else {
      chrome.browserAction.setIcon({path:chrome.app.getDetails().icons["256_off"]});
    }
    //Save
    chrome.storage.sync.set({
      state: state
    }, function() {
      abm._Restore(function() {
        if(callback != null) callback();
      });
      if(typeof message !== "undefined") abm.sendMessage(message);
    });
  });
}

abm.sendMessage = function(message) {
  chrome.extension.sendMessage({
    type: message
  });
}

//Function vars
var functs = {};
functs.getJson = function(url, callback) {
  $.getJSON(url)
    .done(function(resp) {
      if(callback != null) callback(resp);
    })
    .fail(function( jqxhr, textStatus, error ) {
      console.log( "Json Request Failed: " + textStatus + ", " + error );
      if(callback != null) callback(false);
  });
}

//Return unique domain name
functs.getUniqueId = function(url) {
  var ret = url.split('/')[2] || url.split('/')[0];
  ret = ret.replace('www.','');
  if(ret.indexOf('.') > 0 && ret.indexOf(' ') <= 0 && functs.CheckIsValidDomain(ret)) {
    return ret;
  }
  return "";
}

//Check for a valid domain
functs.CheckIsValidDomain = function(domain) { 
    var re = new RegExp(/^((?:(?:(?:\w[\.\-\+]?)*)\w)+)((?:(?:(?:\w[\.\-\+]?){0,62})\w)+)\.(\w{2,6})$/); 
    return domain.match(re);
}

//Get url extension
functs.getUniqueExtension = function(url) {
  var url2 = url;
  url2 = url2.substr(1 + url2.lastIndexOf("/")).split('?')[0];
  var ext = "";
  if(url2.lastIndexOf(".") >= 0) {
    ext = url2.substr(url2.lastIndexOf("."));
    if(ext == ".html") {
      var url3 = url2.substr(0, url2.lastIndexOf("."));
      if(url3.lastIndexOf(".") >= 0)
        ext = url3.substr(url3.lastIndexOf(".")); // + ext
    }
  }
  return ext;
}

//Format date
functs.dateToYMD = function(date) {
    var d = date.getDate();
    var m = date.getMonth() + 1;
    var y = date.getFullYear();
    var hh = date.getHours();
    var mm = date.getMinutes();
    var ss = date.getSeconds();
    var retVal = '' + y + '-' + (m<=9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);
    retVal += ' ' + (hh<=9 ? '0' + hh : hh) + ":" + (mm<=9 ? '0' + mm : mm) + ":" + (ss<=9 ? '0' + ss : ss);
    return retVal;
}

//Search for a title in bookmarks
functs.search_for_title = function(bookmarks, title) {
  if(typeof bookmarks !== "undefined") {  
    for(var i=0; i < bookmarks.length; i++) { 
      if(bookmarks[i].title == title || bookmarks[i].url == title) {
        // Totally found
        return bookmarks[i].id;
      } else {
        if(bookmarks[i].children) {  
          // inception recursive stuff to get into the next layer of children
          var id = functs.search_for_title(bookmarks[i].children, title);
          if(id) return id;
        }
      }
    }
  }
  // No results :C
  return false;
}

var _domain = {};
_domain._Add = function(domain) {
  if(domain !== "") {
    if(abm.domains.indexOf(domain) < 0) {
      abm.domains.push(domain);
      abm.options.push([domain, "0", ""]);
      _domain._Save(function() {
        //console.log('Domain ' + domain + ' added');
      });
    } else {
      //console.log('Domain ' + domain + ' already exists');
    }
    return true;
  } else {
    console.log('Incorrect domain ' + domain);
    return false;
  }
};
_domain._Del = function(domain) {
  if(domain !== "") {
    var pos = abm.domains.indexOf(domain);
    if(pos >= 0) {
      abm.domains.splice(pos,1);
      abm.options.splice(pos,1);
      _domain._Save(function() {
        //console.log('Domain ' + domain + ' removed');
      });
    } else {
      //console.log('Domain ' + domain + ' already exists');
    }
    return true;
  } else {
    console.log('Incorrect domain ' + domain);
    return false;
  }
};
_domain._Save = function(callback) {
  chrome.storage.sync.set({
    domains: abm.domains,
    options: abm.options
  }, function() {
    abm._Restore(callback);
  });
};

var _extension = {};
_extension._Add = function(extension) {
  if(extension !== "") {
    if(abm.extensions.indexOf(extension) < 0) {
      abm.extensions.push(extension);
      _extension._Save(function() {
        //console.log('Extension ' + extension + ' added');
      });
    } else {
      //console.log('Extension ' + extension + ' already exists');
    }
    return true;
  } else {
    console.log('Incorrect extension ' + extension);
    return false;
  }
};
_extension._Del = function(extension) {
  if(extension !== "") {
    var pos = abm.extensions.indexOf(extension);
    if(pos >= 0) {
      abm.extensions.splice(pos,1);
      _extension._Save(function() {
        //console.log('Extension ' + extension + ' removed');
      });
    } else {
      //console.log('Extension ' + extension + ' already exists');
    }
    return true;
  } else {
    console.log('Incorrect extension ' + extension);
    return false;
  }
};
_extension._Save = function(callback) {
  chrome.storage.sync.set({
    extensions: abm.extensions
  }, function() {
    abm._Restore(callback);
  });
};



//Adblock plus : translate function
translate = function(messageID, args) {
  return chrome.i18n.getMessage(messageID, args);
};

//Adblock plus : localizePage function
localizePage = function() {
  //translate a page into the users language
  $("[i18n]:not(.i18n-replaced)").each(function() {
    $(this).html(translate($(this).attr("i18n")));
  });
  $("[i18n_value]:not(.i18n-replaced)").each(function() {
    $(this).val(translate($(this).attr("i18n_value")));
  });
  $("[i18n_title]:not(.i18n-replaced)").each(function() {
    $(this).attr("title", translate($(this).attr("i18n_title")));
  });
  $("[i18n_placeholder]:not(.i18n-replaced)").each(function() {
    $(this).attr("placeholder", translate($(this).attr("i18n_placeholder")));
  });
  $("[i18n_replacement_el]:not(.i18n-replaced)").each(function() {
    // Replace a dummy <a/> inside of localized text with a real element.
    // Give the real element the same text as the dummy link.
    var dummy_link = $("a", this);
    var text = dummy_link.text();
    var real_el = $("#" + $(this).attr("i18n_replacement_el"));
    real_el.text(text).val(text).replaceAll(dummy_link);
    // If localizePage is run again, don't let the [i18n] code above
    // clobber our work
    $(this).addClass("i18n-replaced");
  });
};
