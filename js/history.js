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

var historyPage = {
  nextEndTimeToUse : 0,
  allItems : [],
  itemIdToIndex : {}
};

historyPage.resetSearchedItems = function() {
  //reset
  historyPage.nextEndTimeToUse = 0;
  historyPage.allItems = [];
  historyPage.itemIdToIndex = {};
  //end of textarea
  var textarea = document.getElementById('idLogHistory');
  textarea.scrollTop = textarea.scrollHeight;
}

historyPage.getMoreHistory = function(search, idParentId, domorext, callback) {
  var params = {text:String(search), maxResults:500};
  params.startTime = 0;
  if (historyPage.nextEndTimeToUse > 0)
    params.endTime = historyPage.nextEndTimeToUse;

  chrome.history.search(params, function(items) {
    var newCount = 0;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.id in historyPage.itemIdToIndex)
        continue;
      if(domorext == "domain") {
        if(search != functs.getUniqueId(item.url))
          continue;
      }
      if(domorext == "extension") {
        if(search != functs.getUniqueExtension(item.url))
          continue;
      }
      newCount += 1;
      historyPage.allItems.push(item);
      historyPage.itemIdToIndex[item.id] = historyPage.allItems.length - 1;
    }
    if (items && items.length > 0) {
      historyPage.nextEndTimeToUse = items[items.length-1].lastVisitTime;
    }
    callback(search, idParentId, newCount);
  });
}

historyPage.getMoreDownloads = function(search, idParentId, domorext, callback) {
  //var params = {query:[String(search)], limit:500};
  //params.startedAfter = 0;
  //if (historyPage.nextEndTimeToUse > 0)
  //  params.startedAfter = historyPage.nextEndTimeToUse;
  var params = {query:[String(search)],state:'complete',orderBy:['-startTime']};
  chrome.downloads.search(params, function(items) {
    var newCount = 0;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item.id in historyPage.itemIdToIndex)
        continue;
      if(domorext == "domain") {
        if(search != functs.getUniqueId(item.url))
          continue;
      }
      if(domorext == "extension") {
        if(search != functs.getUniqueExtension(item.url))
          continue;
      }
      newCount += 1;
      historyPage.allItems.push(item);
      historyPage.itemIdToIndex[item.id] = historyPage.allItems.length - 1;
    }
    if (items && items.length > 0) {
      historyPage.nextEndTimeToUse = items[items.length-1].lastVisitTime;
    }
    callback(search, idParentId, newCount);
  });
}

//Get bookmarks from history
historyPage._ExecHistory = function(create, callback) {
  var d = new Date(0);
  var idFolder = 0;
  if(typeof create === 'undefined')
    create = false;

  if(abm.domains.length <= 0 && abm.extensions.length <= 0) {
    $('#idLogHistory').val(translate('hist_noconfig') + ".\n\n");
    return;
  }

  //Clean log
  //$('#idLogHistory').val("+++ Recovering " + (create? "& saving " : "") + "bookmarks filtered by domain & extensions. +++\n\n");

  //Recover bookmarks
  chrome.bookmarks.getSubTree("1", function(bookmarks) {
    if(typeof idParentFolder === "undefined") {
      idParentFolder = String(functs.search_for_title(bookmarks, abm.bookmarkFolderName));
    }
    if(typeof idParentFolder !== "undefined" && idParentFolder) {
      chrome.bookmarks.getSubTree(String(idParentFolder), function(bookmarks) {
        //Get domains
        historyPage._ExecDom(bookmarks,create,function() {
          //Get extensions
          historyPage._ExecExt(bookmarks,create,function() {
            //All done!
            if(callback != null) callback();
          });
        });
      });
    } else {
      //Get domains
      historyPage._ExecDom(bookmarks,create,function() {
        //Get estensions
        historyPage._ExecExt(bookmarks,create,function() {
          //All done!
          if(callback != null) callback();
        });
      });
    }
  });
}

historyPage._ExecDom = function(bookmarks,create,callback) {
  //For each configurated domain
  $('#idLogHistory').val($('#idLogHistory').val() + "++ " + translate('hist_recoveringdomains') + " ++\n");
  var total = abm.domains.length;
  if(total > 0) {
    for (var j = 0; j < total; j++) {
      (function(j) {
        //Destination folder name
        var folderName = (abm.options[j] != null && typeof abm.options[j] !== "undefined" && abm.options[j][0] !== "") ? abm.options[j][0] : "Default";
        var idFolderId = String(functs.search_for_title(bookmarks, folderName));
        var search = abm.domains[j];
        //History
        historyPage._ExecHisDom(bookmarks,create,search,idFolderId, function() {
          //Downloads
          historyPage._ExecDownDom(bookmarks,create,search,idFolderId,function() {
            if(j == (abm.domains.length - 1) && callback != null) callback();
          });
        });
      })(j);
    }
  } else {
    $('#idLogHistory').val($('#idLogHistory').val() + " - " + translate('no_domains') + "\n");
    historyPage.resetSearchedItems();
    if(callback != null) callback();
  }
}

historyPage._ExecDownDom = function(bookmarks,create,search,idFolderId,callback) {
  //Recover downloaded items
  this.getMoreDownloads(search, idFolderId, "domain", function(search, idParentId, total) {
    var content = "";
    var entries = 0;
    var entryDate = "";
    //Get dowloads
    if(historyPage.allItems.length > 0) {
      var total = historyPage.allItems.length;
      for(var k = 0; k < total; k++) {
        var item = historyPage.allItems[k];
        if(abm.dateEnabled) {
	        d = new Date(item.startTime);
	        entryDate = '['+functs.dateToYMD(d)+'] - ';
        }
        idFolder = functs.search_for_title(bookmarks, item.url);
        if(idFolder <= 0) {
          entries++;
          content += " + " + entryDate + search + ' - ' + item.url + "\n";
          if(create) {
            chrome.bookmarks.create({
              'parentId': idFolderId,
              'index' : 0,
              'title': entryDate + historyPage.allItems[k].url,
              'url': item.url
            });
          }
        } else {
          if(!create) {
            content += " - " +  entryDate + search + ' - ' + item.url + "\n";
          }
        }
      }
    } else {
      content += " - " + translate('hist_nodownfile') + " " + search;
    }
    content = "\n" + translate('search') + " " + search + " " + translate('in_downloads') + " " + translate("total_new", [total,entries])+ "\n----------------------------------------------------------------\n" + content + "\n";
    $('#idLogHistory').val($('#idLogHistory').val() + content);
    historyPage.resetSearchedItems();
    if(callback != null) callback();
  });
}

historyPage._ExecHisDom = function(bookmarks,create,search,idFolderId,callback) {
  //Get history
  this.getMoreHistory(search, idFolderId, "domain", function(search, idParentId, total) { 
    var content = "";
    var entries = 0;
    var entryDate = "";
    //var content = search + " (" + total + " entries)\n--------------------------------\n";
    if(historyPage.allItems.length > 0) {
      for (var i = 0; i < historyPage.allItems.length; i++) {
        paso = false;
        if(abm.dateEnabled) {
	        d = new Date(0);
	        d.setMilliseconds(historyPage.allItems[i].lastVisitTime);
	        entryDate = '['+functs.dateToYMD(d)+'] - ';
        }
        idFolder = functs.search_for_title(bookmarks, historyPage.allItems[i].url);
        if(idFolder <= 0) {
          entries++;
          content += " + " + entryDate + search + ' - ' + historyPage.allItems[i].url + "\n";
          if(create) {
            chrome.bookmarks.create({
              'parentId': idParentId,
              'index' : 0,
              'title': entryDate + (historyPage.allItems[i].title !== "" ? historyPage.allItems[i].title : historyPage.allItems[i].url),
              'url': historyPage.allItems[i].url
            });
          }
        } else {
          if(!create) {
            content += " - " +  entryDate + search + ' - ' + historyPage.allItems[i].url + "\n";
          }
        }
      }
    } else {
      content += " - " + translate('hist_nohisfile') + " " + search;
    }
    content = "\n" + translate('search') + " " + search + " " + translate('in_history') + " " + translate("total_new", [total,entries]) + "\n----------------------------------------------------------------\n" + content + "\n";
    $('#idLogHistory').val($('#idLogHistory').val() + content);
    //reset
    historyPage.resetSearchedItems();
    if(callback != null) callback();
  });
}

historyPage._ExecExt = function(bookmarks,create,callback) {
  $('#idLogHistory').val($('#idLogHistory').val() + "\n++ " + translate('hist_recoveringextensions') + " ++\n");
  var total = abm.extensions.length;
  if(total > 0) {
    //For each configurated domain
    for (var j = 0; j < total; j++) {
      (function(j) {
        var folderName = (typeof abm.extensions[j] !== "undefined") ? abm.extensions[j] : "Default";
        var idFolderId = String(functs.search_for_title(bookmarks, folderName));
        var search = folderName;
        //Downloads
        historyPage._ExecDownExt(bookmarks,create,search,idFolderId,function() {
          //History
          historyPage._ExecHisExt(bookmarks,create,search,idFolderId,function() {
            if(j == (abm.extensions.length - 1) && callback != null) callback();
          });
        });
      })(j);
    }
  } else {
    $('#idLogHistory').val($('#idLogHistory').val() + " - " + translate('no_extensions') + "\n");
    historyPage.resetSearchedItems();
    if(callback != null) callback();
  }
}

historyPage._ExecDownExt = function(bookmarks,create,search,idFolderId,callback) {
  //Get history
  this.getMoreDownloads(search, idFolderId, "extension", function(search, idParentId, total) { 
    //var content = search + " (" + total + " entries)\n--------------------------------\n";
    var content = "";
    var entries = 0;
    var entryDate = "";
    if(historyPage.allItems.length > 0) {
      for (var i = 0; i < historyPage.allItems.length; i++) {
        var item = historyPage.allItems[i];
        if(abm.dateEnabled) {
	        d = new Date(item.startTime);
	        entryDate = '['+functs.dateToYMD(d)+'] - ';
        }
        idFolder = functs.search_for_title(bookmarks, item.url);
        if(idFolder <= 0) {
          entries++;
          content += " + " + entryDate + search + ' - ' + historyPage.allItems[i].url + "\n";
          if(create) {
            chrome.bookmarks.create({
              'parentId': idParentId,
              'index' : 0,
              'title': entryDate + historyPage.allItems[i].url,
              'url': historyPage.allItems[i].url
            });
          }
        } else {
          if(!create) {
            content += " - " +  entryDate + search + ' - ' + historyPage.allItems[i].url + "\n";
          }
        }
      }
    } else {
      content += " - " + translate('hist_nodownext') + " : " + search;
    }
    content = "\n" + translate('search') + " " + search + " " + translate('in_downloads') + " " + translate("total_new", [total,entries]) + "\n----------------------------------------------------------------\n" + content + "\n";
    $('#idLogHistory').val($('#idLogHistory').val() + content);
    //reset
    historyPage.resetSearchedItems();
    if(callback != null) callback();
  });
}

historyPage._ExecHisExt = function(bookmarks,create,search,idFolderId,callback) {
  //Get history
  this.getMoreHistory(search, idFolderId, "extension", function(search, idParentId, total) { 
    //var content = search + " (" + total + " entries)\n--------------------------------\n";
    var content = "";
    var entries = 0;
    var entryDate = "";
    if(historyPage.allItems.length > 0) {
      for (var i = 0; i < historyPage.allItems.length; i++) {
      	if(abm.dateEnabled) {
	        d = new Date(0);
	        d.setMilliseconds(historyPage.allItems[i].lastVisitTime);
	        entryDate = '['+functs.dateToYMD(d)+'] - ';
        }
        idFolder = functs.search_for_title(bookmarks, historyPage.allItems[i].url);
        if(idFolder <= 0) {
          entries++;
          content += " + " + entryDate + search + ' - ' + historyPage.allItems[i].url + "\n";
          if(create) {
            chrome.bookmarks.create({
              'parentId': idParentId,
              'index' : 0,
              'title': entryDate + (historyPage.allItems[i].title !== "" ? historyPage.allItems[i].title : historyPage.allItems[i].url),
              'url': historyPage.allItems[i].url
            });
          }
        } else {
          if(!create) {
            content += " - " +  entryDate + search + ' - ' + historyPage.allItems[i].url + "\n";
          }
        }
      }
    } else {
      content += " - " + translate('hist_nohisext') + " : " + search;
    }
    content = "\n" + translate('search') + " " + search + " " + translate('in_history') + " " + translate("total_new", [total,entries]) + "\n----------------------------------------------------------------\n" + content + "\n";
    $('#idLogHistory').val($('#idLogHistory').val() + content);
    //reset
    historyPage.resetSearchedItems();
    if(callback != null) callback();
  });
}