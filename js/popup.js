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

var console = console;
if(chrome.extension.getBackgroundPage() != null)
  console = chrome.extension.getBackgroundPage().console;

$(function() {

  //Hide del buttons
  $('#del-domain').hide();
  $('#del-extension').hide();

  //Options link
  $('#autobookmarks-settings').click(function() {
    chrome.tabs.create({ url: chrome.extension.getURL("options.html") });
  });

});

var popup = [];

popup.setMenu = function(domain, extension) {
  //Check domain
  if(domain !== "") {

    //Search domain in configuration
    if(abm.domains.indexOf(domain) >= 0) {
      //Remove domain
      $('#add-domain').hide();
      $('#del-domain').html($('#del-domain').html() + " (" + domain + ")").show();
      $('#del-domain').click(function() {
        _domain._Del(domain);
        abm.sendMessage('reload');
        window.close();
      });
    } else {
      //Add domain
      $('#add-domain').html($('#add-domain').html() + " (" + domain + ")").show();
      $('#add-domain').click(function() {
        _domain._Add(domain);
        abm.sendMessage('reload');
        window.close();
      });
    }

  } else {

    //No domain, disable button
    $('#add-domain').html(translate("no_domain")).addClass('disabled');
    $('#add-domain').click(function() {
      console.log(translate("no_domain"));
    });

  }

  //Check extension
  if(extension !== "") {

    //Search extension in configuration
    if(abm.extensions.indexOf(extension) >= 0) {
      //Remove extension
      $('#add-extension').hide();
      $('#del-extension').html($('#del-extension').html() + " (" + extension + ")").show();
      $('#del-extension').click(function() {
        _extension._Del(extension);
        abm.sendMessage('reload');
        window.close();
      });
    } else {
      //Add extension
      $('#add-extension').html($('#add-extension').html() + " (" + extension + ")").show();
      $('#add-extension').click(function() {
        _extension._Add(extension);
        abm.sendMessage('reload');
        window.close();
      });
    }
    
  } else {

    //No extension, disable button
    $('#add-extension').html(translate("no_extension")).addClass('disabled');
    $('#add-extension').click(function() {
      console.log(translate("no_extension"));
    });

  }
}

//Fired when DOM was loaded
document.addEventListener('DOMContentLoaded', function() {

  //Get selected tab
  chrome.tabs.getSelected(null,function(tab) {

    //Get domain & extension
    var domain = functs.getUniqueId(tab.url);
    var extension = functs.getUniqueExtension(tab.url);

    //Restore options
    abm._Restore(function() {

      //state
      abm.initState('reload', function() {
        domain = functs.getUniqueId(tab.url);
        extension = functs.getUniqueExtension(tab.url);
        popup.setMenu(domain, extension);
      });

      popup.setMenu(domain, extension);
        
    });

  });

});