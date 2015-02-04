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

var optionsPage = {};

//Initialize Page
optionsPage._Init = function() {
  //Tabs
  $('#tabs a[href="' + window.location.hash + '"]').tab('show');
  //Default
  $('#idSpanDomain').html(translate("select_domain"));
  $('.option').attr('disabled', 'disabled');
  $('button').click(function(e) {
    e.preventDefault();
  });
  //Restore options
  abm._Restore(function() {
    //state
    abm.initState();
    //Setting TAB
    optionsPage.settingsTab();
    //Domains TAB
    optionsPage.domainsTab();
    //Extensions TAB
    optionsPage.extensionsTab();
    //History TAB
    optionsPage.historyTab();
    //About TAB
    optionsPage.aboutTab();
  });
}

optionsPage.settingsTab = function() {
  //Bookmarks folder
  $('#idExtensionFolder').val(abm.bookmarkFolderName).change(function() {
    var newTitle = $('#idExtensionFolder').val() ? $('#idExtensionFolder').val() : defaults.bookmarkFolderName;
    if(idParentFolder <= 0) {
      chrome.bookmarks.getSubTree("1", function(bookmarks) {
        idParentFolder = functs.search_for_title(bookmarks, abm.bookmarkFolderName);
        if(idParentFolder && idParentFolder > 0) {
          abm.bookmarkFolderName = newTitle;
          chrome.bookmarks.update(String(idParentFolder), {'title': newTitle});
        }
        if($('#idExtensionFolder').val() == "")
          $('#idExtensionFolder').val(defaults.bookmarkFolderName);
        optionsPage._Save();
      });
    } else {
      abm.bookmarkFolderName = newTitle;
      chrome.bookmarks.update(String(idParentFolder), {'title': newTitle});
      optionsPage._Save();
    }
  });

  //Notifications enabled
  optionsPage.switchCheckBox("idNotificationsEnabled", "notificationsEnabled", abm.notificationsEnabled, function(state) {
    chrome.storage.sync.set({
      notificationsEnabled: state
    }, function() {
      abm._Restore();
    });
  });

  //Date on bookmarks enabled
  optionsPage.switchCheckBox("idDateEnabled", "dateEnabled", abm.dateEnabled, function(state) {
    chrome.storage.sync.set({
      dateEnabled: state
    }, function() {
      abm._Restore();
    });
  });
}

optionsPage.domainsTab = function() {
  $.each(abm.domains, function(id, domain) {
    $("#idDomain").append("<option value='" + id + "'>" + domain + "</option>");
  });
  $('#idAddDomain').click(optionsPage._NewDomain); //New domain
  $('#idNewDomain').keypress(function(e) { if(e.which == 13) { $('#idAddDomain').click(); } });
  $('#idDomain').change(optionsPage._EnableOptions); //Enable domain options
  $('#idDeleteDomain').click(optionsPage._DeleteDomain); //Delete domain
  $('#idDeleteDomainAll').click(optionsPage._DeleteDomainAll); //Delete all domains
  $('#idDomainFolder').change(optionsPage._Save); //Save on folder name change
  $('#idCustomTitleSelector').attr('disabled', 'disabled');
  $('input[name=domainTitle]').change(function() { //Save on entry title change
    if($('input[name=domainTitle]:checked').val() == "1")
      $('#idCustomTitleSelector').removeAttr('disabled');
    else
      $('#idCustomTitleSelector').attr('disabled', 'disabled');
    optionsPage._Save();
  });
  $('#idCustomTitleSelector').change(optionsPage._Save);
  //Get external petitions for domains
  optionsPage.getExternalDomains();
}

optionsPage.extensionsTab = function() {
  $.each(abm.extensions, function(id, extension) {
    $("#idExtension").append("<option value='" + id + "'>" + extension + "</option>");
  });
  $('#idAddExtension').click(optionsPage._NewExtension); //New domain
  $('#idNewExtension').keypress(function(e) { if(e.which == 13) { $('#idAddExtension').click(); } });
  $('#idDeleteExtension').click(optionsPage._DeleteExtension); //Delete extension
  $('#idDeleteExtensionAll').click(optionsPage._DeleteExtensionAll); //Delete all extensions
  $('#idDeleteExtension').attr('disabled', 'disabled');
  $('#idExtension').change(function() {
    if($(this).val() !== "") {
      $('#idDeleteExtension').removeAttr('disabled');
    } else {
      $('#idDeleteExtension').attr('disabled', 'disabled');
    }
  });
  //External petitions for extensions
  optionsPage.getExternalExtensions();
}

optionsPage.historyTab = function() {
  //View history button
  $('#idExecHistory').click(function() { //Show bookmark log
    $('#status-msg').text(translate('wait_process'));
    $('#status').slideDown();
    $('#idExecHistory').attr('disabled', 'disabled');
    $('#idCleanHistory').attr('disabled', 'disabled');
    historyPage._ExecHistory(false, function() {
      $('#status').slideUp('slow');
      $('#idProceed').removeAttr('disabled');
      $('#idCleanHistory').removeAttr('disabled');
    });
  });
  $('#idCleanHistory').attr('disabled', 'disabled');

  //Clean history button
  $('#idCleanHistory').click(function() {
    $('#idExecHistory').removeAttr('disabled');
    $('#idProceed').attr('disabled', 'disabled');
    $('#idCleanHistory').attr('disabled', 'disabled');
    $('#idLogHistory').val("");
  });

  //Proceed history button
  $('#idProceed').click(function() { //Save bookmarks
    $('#status-msg').text(translate('wait_process'));
    $('#idProceed').attr('disabled', 'disabled');
    $('#idCleanHistory').attr('disabled', 'disabled');
    $('#status').slideDown();
    abm._CreateFolder(1, abm.bookmarkFolderName, true, function(idFolder) {
      idParentFolder = idFolder;
      abm._CreateFolders(function() { //Create bookmark folders
        historyPage._ExecHistory(true, function() {
          //Remove empty folders
          abm._RemoveEmptyFolders();
          //Messages & enable/disable buttons
          $('#idCleanHistory').removeAttr('disabled');
          $('#idExecHistory').removeAttr('disabled');
          $('#status').slideUp(function() {
            $('#status-msg').text(translate('process_ok'));
            $('#status').slideDown(function() {
              setTimeout(function() {
                $('#status').slideUp('slow');
              }, 1500);  
            });
          });
        });
      });
    });
  });
}

optionsPage.aboutTab = function() {
  //About : version
  $('#idVersion').text(chrome.app.getDetails().version);

  //DELETE ALL
  $('#idDeleteAll').click(optionsPage._DeleteAll); //Delete all data & configuration
}

optionsPage.getExternalDomains = function() {
  //External petitions
  functs.getJson(abm.extUrl + "?type=domains", function(resp) {
    if(resp && resp.length > 0) {
      for(var i=0; i<resp.length; i++) {
        $("#idExternalDomains").append("<option value='" + resp[i][0] + "'>" + resp[i][1] + "</option>");
      }
    } else {
      $("#idExternalDomainsRow").hide();
    }
  });
  $('#idGetExternalDomains').click(function() {
    if($("#idExternalDomains option:selected").val() != "") {
        var url = abm.extUrl + "?type=domains&option="+$("#idExternalDomains option:selected").val();
        functs.getJson(url, function(resp) {
        if(resp && resp.length > 0) {
          for(var i=0; i<resp.length; i++) {
            $('#idNewDomain').val(resp[i]);
            $('#idAddDomain').click();
          }
        }
      });
    }
  });
  $('#idViewExternalDomains').click(function() {
    if($("#idExternalDomains option:selected").val() != "") {
      var url = abm.extUrl + "?type=domains&option="+$("#idExternalDomains option:selected").val();
      functs.getJson(url, function(resp) {
        var content = "<p>" + translate('domains_for') + " <b>" + $("#idExternalDomains option:selected").text() + "</b> : </p>";
        content += "<ul class='row'>";
        if(resp && resp.length > 0) {
          for(var i=0; i<resp.length; i++) {
            content += "<li class='col-xs-6'><a href='http://"+resp[i]+"' target=_blank>"+resp[i]+"</a></li>";
          }
        }
        content += "</ul>";
        content += "<p><a href='" + url + "' target=_blank>" + translate("json_content") + "</a></p>";
        $('#myModalLabel').text(translate("view_domains"));
        $('#myModalContent').html(content);
        $('#myModal').modal();
      });
    }
  });
}

optionsPage.getExternalExtensions = function() {
  //View external extensions
    functs.getJson(abm.extUrl + "?type=extensions", function(resp) {
      if(resp && resp.length > 0) {
        for(var i=0; i<resp.length; i++) {
          $("#idExternalExtension").append("<option value='" + resp[i][0] + "'>" + resp[i][1] + "</option>");
        }
      } else {
        $("#idExternalExtensionRow").hide();
      }
    });
    $('#idViewExternalExtensions').click(function() {
      if($("#idExternalExtension option:selected").val() != "") {
        var url = abm.extUrl + "?type=extensions&option="+$("#idExternalExtension option:selected").val();
        functs.getJson(url, function(resp) {
          var content = "<p>" + translate('extensions_for') + " <b>" + $("#idExternalExtension option:selected").text() + "</b> : </p>";
          content += "<ul class='row'>";
          if(resp && resp.length > 0) {
            for(var i=0; i<resp.length; i++) {
              content += "<li class='col-xs-6'>"+resp[i]+"</li>";
            }
          }
          content += "</ul>";
          content += "<p><a href='" + url + "' target=_blank>" + translate("json_content") + "</a></p>";
          $('#myModalLabel').text(translate('view_extensions'));
          $('#myModalContent').html(content);
          $('#myModal').modal();
        });
      }
    });
    //Get external extensions
    $('#idGetExternalExtensions').click(function() {
      if($("#idExternalExtension option:selected").val() != "") {
        var url = abm.extUrl + "?type=extensions&option="+$("#idExternalExtension option:selected").val();
        functs.getJson(url, function(resp) {
          if(resp && resp.length > 0) {
            for(var i=0; i<resp.length; i++) {
              $('#idNewExtension').val(resp[i]);
              $('#idAddExtension').click();
            }
          }
        });
      }
    });
}

optionsPage.switchCheckBox = function(item, varname, varvalue, callback) {
  $("#" + item).val('1');
  $("#" + item).attr("data-on-text", translate("yes"));
  $("#" + item).attr("data-off-text", translate("no"));
  if(varvalue) {
    $("[name='"+varname+"']").bootstrapSwitch('state', true, true);
  } else {
    $("[name='"+varname+"']").bootstrapSwitch();
  }
  $("#" + item).on('switchChange.bootstrapSwitch', function(event, state) {
    callback(state);
  });
}

//Show status massage in page
optionsPage._ShowStatusMessage = function(message) {
  $('#status-msg').text(message);
  $('#status').slideDown(function() {
    setTimeout(function() {
      $('#status').slideUp('slow');
    }, 1500);  
  });
}

//Create a new domain configuration
optionsPage._NewDomain = function() {
  var domain = functs.getUniqueId($('#idNewDomain').val());
  if(domain != "") {
    if(abm.domains.indexOf(domain) < 0) {
      var id = $( "#idDomain option" ).length - 1;
      $("#idDomain").append("<option value='" + id + "'>" + domain + "</option>");
      $('#idNewDomain').val("");
      $('#idDomain option:eq(' + (id+1) + ')').prop('selected', true);
      optionsPage._EnableOptions();
      $('#idDomainFolder').val(domain);
      optionsPage._Save();
    } else {
      optionsPage._ShowStatusMessage('Domain ' + domain + ' already exists');
    }
  } else {
    optionsPage._ShowStatusMessage('Incorrect domain ' + $('#idNewDomain').val());
  }
  $('#idNewDomain').val("");
}

//Enable domain options
optionsPage._EnableOptions = function() {
  //Disable
  $('#domain_options').hide();
  $('#idSpanDomain').html(translate("select_domain"));
  $('.option').attr('disabled', 'disabled');
  $('#idDomainFolder').val("");
  $('input[name=domainTitle]')[0].checked = true;

  if($( "#idDomain option:selected" ).val() !== "") {
    //Enable
    $('#domain_options').show();
    $('#idSpanDomain').html($( "#idDomain option:selected" ).text());
    $('.option').removeAttr('disabled');
    var option = abm.options[$( "#idDomain option:selected" ).val()];
    if(typeof option !== "undefined" && option != null) {
      $('#idDomainFolder').val(option[0]);
      $('input[name=domainTitle]')[parseInt(option[1],10)].checked = true;
      $('#idCustomTitleSelector').val(option[2]);
    }
    if($('input[name=domainTitle]:checked').val() == "1")
      $('#idCustomTitleSelector').removeAttr('disabled');
    else
      $('#idCustomTitleSelector').attr('disabled', 'disabled');
  }
}

//Create a new extension configuration
optionsPage._NewExtension = function() {
  var extension = functs.getUniqueExtension($('#idNewExtension').val());
  if(extension != "") {
    if(abm.extensions.indexOf(extension) < 0) {
      var id = $( "#idExtension option" ).length - 1;
      $("#idExtension").append("<option value='" + id + "'>" + extension + "</option>");
      $('#idNewExtension').val("");
      $('#idExtension option:eq(' + (id+1) + ')').prop('selected', true);
      //_extension._Add(extension);
      optionsPage._Save();
    } else {
      optionsPage._ShowStatusMessage('Extension ' + extension + ' already exists');
    }
  } else {
    optionsPage._ShowStatusMessage('Incorrect extension ' + $('#idNewExtension').val());
  }
  $('#idNewExtension').val("");
}

//Save configuration
optionsPage._Save = function() {
  //Domains
  var tempDom = [];
  $('#idDomain option').each(function() {
      if($(this).val() !== "") tempDom.push($(this).text());
  });

  //Domain Options
  var tempOpt = abm.options;
  tempOpt[$( "#idDomain option:selected" ).val()] = [$('#idDomainFolder').val(), $('input[name=domainTitle]:checked').val(), $('#idCustomTitleSelector').val()];

  //Extensions
  var tempExt = [];
  $('#idExtension option').each(function() {
      if($(this).val() !== "") tempExt.push($(this).text());
  });

  //Save data
  chrome.storage.sync.set({
    bookmarkFolderName: $('#idExtensionFolder').val() ? $('#idExtensionFolder').val() : defaults.bookmarkFolderName,
    domains: tempDom,
    options: tempOpt,
    extensions: tempExt,
    notificationsEnabled: $('input[name="notificationsEnabled"]:checked').val() !== "1" ? false : true,
    dateEnabled: $('input[name="dateEnabled"]:checked').val() !== "1" ? false : true
  }, function() {
    optionsPage._ShowStatusMessage('Options saved');
    //RESTORE DATA
    $('#idCleanHistory').click();
    abm._Restore();
  });
}

//Delete domain & configuration
optionsPage._DeleteDomain = function(id) {
  if(confirm(translate("deletedomain_question", [$( "#idDomain option:selected" ).text()]))) {
    if(typeof abm.options[$( "#idDomain option:selected" ).val()] !== "undefined") {
      abm.options.splice($( "#idDomain option:selected" ).val(), 1);
      $( "#idDomain option:selected" ).remove();
      optionsPage._Save();
      var selOpt = document.getElementById("idDomain").options;
      for (i = 1; i < selOpt.length; i++) {
        document.getElementById("idDomain").options[i] = new Option(selOpt[i].text, (i - 1), false, false);
      }
      document.getElementById("idDomain").options[0].selected = true;
      optionsPage._EnableOptions();
    }
  }
}

//Delete all domains
optionsPage._DeleteDomainAll = function() {
  if(confirm(translate('delete_domains'))) {
    var tot = document.getElementById("idDomain").options.length;
    for (i = tot; i > 0; i--) {
      document.getElementById("idDomain").options[i] = null;
    }
    abm.domains = [];
    abm.options = [];
    optionsPage._Save();
    document.getElementById("idDomain").options[0].selected = true;
  }
}

//Delete extension
optionsPage._DeleteExtension = function(id) {
  if(confirm(translate("deleteextension_question", [$( "#idExtension option:selected" ).text()]))) {
    $( "#idExtension option:selected" ).remove();
    optionsPage._Save();
    var selOpt = document.getElementById("idExtension").options;
    for (i = 1; i < selOpt.length; i++) {
      document.getElementById("idExtension").options[i] = new Option(selOpt[i].text, (i - 1), false, false);
    }
    document.getElementById("idExtension").options[0].selected = true;
  }
}

//Delete all extensions
optionsPage._DeleteExtensionAll = function() {
  if(confirm(translate('delete_extensions'))) {
    var tot = document.getElementById("idExtension").options.length;
    for (i = tot; i > 0; i--) {
      document.getElementById("idExtension").options[i] = null;
    }
    abm.extensions = [];
    optionsPage._Save();
    document.getElementById("idExtension").options[0].selected = true;
  }
}

//Delete all
optionsPage._DeleteAll = function() {
  if(confirm(translate('delete_allquestion'))) {
    //Delete bookmark folder
    if(idParentFolder > 0) {
      chrome.bookmarks.removeTree(idParentFolder);
    } else {
      chrome.bookmarks.getSubTree("1", function(bookmarks) {
        idParentFolder = functs.search_for_title(bookmarks, abm.bookmarkFolderName);
        if(idParentFolder) {
          chrome.bookmarks.removeTree(idParentFolder);
        }
      });
    }
    //Save
    chrome.storage.sync.set(defaults, function() {
      idParentFolder = 0;
      abm = defaults;
      //Reload page
      location.reload();
    });
  }
}

//Add event listener
document.addEventListener('DOMContentLoaded', optionsPage._Init);
//Get messages
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.type) {
        case "reload":
            location.reload();
        break;
    }
    return true;
});

