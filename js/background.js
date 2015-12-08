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

var backgroundPage = {};

//Event fired with each new page visit
backgroundPage._OnUpdated = function(tabid, changeinfo, tab) {
  var url = tab.url;
  //Check for completed requests
  if (url !== undefined && changeinfo.status == "complete" && url.substring(0, 6) != "chrome") {
    //Chech the domain / page
    var xhr = new XMLHttpRequest();
    xhr.open("GET", tab.url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if(xhr.status == 0) {
              console.log("wrong domain:", tab.url);
            } else if(xhr.status == 404) {
              console.log("404 page:", tab.url);
            } else if(xhr.status == 200) {
              //Restore storage options
              abm._Restore(function() {
                //console.log('Check:'+url+' title:'+tab.title+' id:'+tab.id);
                backgroundPage._CheckItem(url,tab.title,tab.id);
              });
            }
        }
    }
    xhr.send(null);
  }
}

backgroundPage._OnDownload = function(item) {
  var url = item.url;
  if (url !== undefined) {
    //Restore storage options
    abm._Restore(function() {
      backgroundPage._CheckItem(url,item.filename,null);
    });
  }
}

backgroundPage._AutoAdd = function(domain, extension) {
    var paso = false;
    var reload = false;
    if(abm.autoAdd) {
        //DOMAIN
        for(var i=0; i<abm.domains.length; i++) {
            if(domain === abm.domains[i]) {
                paso = true;
                break;
            }
        }
        if(!paso) {
            _domain._Add(domain);
            reload = true;
        }
        //EXTENSION
        paso = false;
        for(var i=0; i<abm.extensions.length; i++) {
            if(extension === abm.extensions[i]) {
                paso = true;
                break;
            }
        }
        if(!paso) {
            _extension._Add(extension);
            reload = true;
        }
        //Reload if necessary
        if(reload) {
            abm.sendMessage('reloadTab');
        }
    }
};

backgroundPage._CheckItem = function(url,title,tabId) {

    //Check state
    if(!abm.state) {
        console.log('Autobookmarks: Extension stopped!');
        return;
    }

    var domain = functs.getUniqueId(url);
    var extension = functs.getUniqueExtension(url);
    backgroundPage._AutoAdd(domain, extension);

    abm._Restore(function() {

        //Check configuration
        if(abm.domains.length <= 0 && abm.extensions.length <= 0) {
            console.log('Autobookmarks: No filters!');
            return;
        }

        //Get domains
        var folderName = defaults.bookmarkFolderName;
        for(var i=0; i<abm.domains.length; i++) {
            //Find in url
            if(domain === abm.domains[i]) {
                backgroundPage._GetTitle(tabId, abm.options[i], title, function(title2, folder) {
                    if(title2 != "") {
                        title = title2;
                    }
                    folderName = defaults.bookmarkFolderName;
                    if(folder != null && typeof folder !== "undefined") {
                        folderName = folder[0];
                    }

                    abm._CreateFolder(1, abm.bookmarkFolderName, true, function(idFolder1) {
                        idParentFolder = idFolder1;
                        backgroundPage._createBookmark(url, functs.getUniqueId(url), folderName, title);
                    });
                });
                break;
            }
        }

        //Get extensions
        for(var i=0; i<abm.extensions.length; i++) {
            if(extension === abm.extensions[i]) {
                abm._CreateFolder(1, abm.bookmarkFolderName, true, function(idFolder1) {
                    idParentFolder = idFolder1;
                    backgroundPage._createBookmark(url, abm.extensions[i], abm.extensions[i], title);
                });
                break;
            }
        }
    });
};

backgroundPage._GetTitle = function(tabId, option, title, callback) {
  if(typeof option !== "undefined" && option != null && option[1] === "1" && option[2] !== "" && tabId != null) {
    chrome.tabs.executeScript(tabId, {file: "js/jquery.min.js"}, function() {
      var code = "var x = String($('"+option[2]+"').first().text()).trim().substring(0,512); x";
      chrome.tabs.executeScript(tabId, {code:code}, function(results) {
        callback(results, option);
      });
    });
  } else {
    callback(title, option);
  }
}

//Notify user
backgroundPage._Notify = function(title, message) {
    if(abm.notificationsEnabled) {
        var realId;
        var opt = {
           type: "basic",
           title: title,
           message: message,
           iconUrl: "img/autobookmark_256.png",
           eventTime: Date.now() + parseInt(abm.notificationTimeout, 10),
           buttons: [
               { title: 'Disable notifications' },
               { title: 'Close' },
            ]
        };
        chrome.notifications.create("", opt, function(notificationId) {
            console.log('Nofity error:' + chrome.runtime.lastError);
            realId = notificationId;
            setTimeout(function() {
                chrome.notifications.clear(realId, function() {
                    console.log('Clear notification');
                });
            },abm.notificationTimeout);
        });
        /* Respond to the user's clicking one of the buttons */
        chrome.notifications.onButtonClicked.addListener(function(notifId, btnIdx) {
            if (notifId === realId) {
                if (btnIdx === 0) {
                    abm.notificationsEnabled = false;
                    chrome.storage.sync.set({
                        notificationsEnabled: abm.notificationsEnabled,
                    }, function() {
                        abm._Restore();
                        console.log('disable notifications');
                    });
                } else if (btnIdx === 1) {
                    ;
                }
                chrome.notifications.clear(realId, function() {
                    console.log('Clear notification');
                });
            }
        });
    } else {
        console.log('New notification : '+message);
    }
}

//Create a new bookmark
backgroundPage._createBookmark = function(url, search, folder, title) {
  var idBookmark = 0;
  var idParentId = 0;
  var d = new Date();
  var entryDate = "";

  //Recover bookmarks
  chrome.bookmarks.getSubTree(idParentFolder, function(bookmarks) {
    //Search url in bookmarks
    idFolder = functs.search_for_title(bookmarks, url);
    if(idFolder <= 0) {
      //The bookmark does not exist
      abm._CreateFolder(idParentFolder, folder, true, function(idFolder2, title2) {
        //Get parent id folder
        idParentId = idFolder2;
        if(idParentId) {
          if(abm.dateEnabled)
            entryDate = '['+functs.dateToYMD(d)+'] - ';
          //Create bookmark
          chrome.bookmarks.create({
            'parentId': idParentId,
            'title': entryDate + title,
            'url': url
          });
          //console.log('Bookmark ' + url + ' created in ' + abm.bookmarkFolderName + ' > ' + folder);
          backgroundPage._Notify(translate('notify_title'), translate('notify_newbookmark', [title]) + " " + abm.bookmarkFolderName + " > " + folder + "\"\n\n(" + url + ")");
        }/* else {
          console.log('Error, folder does not exists.')
        }*/
      });
    }/* else {
      //Find it, we don't do anything.
      console.log("The bookmark already exists. (URL:" + url + ")");
    }*/
  });
}

//Add listeners
chrome.tabs.onUpdated.addListener(backgroundPage._OnUpdated);
chrome.downloads.onDeterminingFilename.addListener(backgroundPage._OnDownload);
chrome.runtime.onInstalled.addListener(function (object) {
    chrome.tabs.create({url: chrome.extension.getURL("options.html")});
});
//Get messages
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.type) {
        case "reload":
          //Get selected tab
          chrome.tabs.getSelected(null,function(tab) {
            chrome.tabs.reload(tab.id);
          });
        break;
    }
    return true;
});
