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

//Delay repetitive actions
var delay = (function(){
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  };
})();

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

    //AutoAdd domains and extensions
    optionsPage.switchCheckBox("idAutoAdd", "autoAdd", abm.autoAdd, function(state) {
        chrome.storage.sync.set({
            autoAdd: state
        }, function() {
            abm._Restore();
        });
    });

    //Notifications enabled
    var displayDivNotTimeOut = function(state) {
        if(state) {
            $('#idDivNotTimeOut').show();
        } else {
            $('#idDivNotTimeOut').hide();
        }
    };
    optionsPage.switchCheckBox("idNotificationsEnabled", "notificationsEnabled", abm.notificationsEnabled, function(state) {
        displayDivNotTimeOut(state);
        chrome.storage.sync.set({
            notificationsEnabled: state
        }, function() {
            abm._Restore();
        });
    });
    displayDivNotTimeOut(abm.notificationsEnabled);

    $('#idNotificationsTimeout').val(abm.notificationTimeout).change(function() {
        var notTimOut = parseInt($(this).val(), 10);
        if(notTimOut < 1000)
            notTimOut = 1000;
        else if(notTimOut > 5000)
            notTimOut = 5000;
        $(this).val(notTimOut);
        chrome.storage.sync.set({
            notificationTimeout: notTimOut
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
    optionsPage.processExternalDomains = "externaldomain";
    optionsPage._RefreshDomainList();

    $( document ).on( "click", ".domain_li", function() {
        var id = $(this).find('span').attr("data-id");
        //$('#idDomain'+id).prop('checked', !$('#idDomain'+id).prop('checked'));
        optionsPage._EnableOptions(id);
        $('.domain_check').parent().css('background-color','').css('color','');
        $('#idDomain'+id).parent().css('background-color','#28a4c9').css('color','white');
        $('.domain_selected').removeClass('showOptions');
        $(this).find('span').addClass('showOptions');
    });
    $( document ).on( "change", ".domain_check", function() {
        //$(this).prop('checked', !$(this).prop('checked'));
        if($(this).prop('checked')) {
            var id = $(this).next().attr("data-id");
            optionsPage._EnableOptions(id);
        }
    });

    //Check/Uncheck all
    $('#idCheckAll').click(function() {
        $('.domain_check').prop("checked", true);
    });
    $('#idUnCheckAll').click(function() {
        $('.domain_check').prop("checked", false);
    });

  //$('#idDomain').change(optionsPage._EnableOptions); //Enable domain options

  $('#idAddDomain').click(optionsPage._NewDomain); //New domain
  optionsPage._NewDomainListInit();
  $('#idAddDomainList').click(optionsPage._NewDomainList); //New domain list
  $('#idNewDomain').keypress(function(e) { if(e.which == 13) { $('#idAddDomain').click(); } });

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
    optionsPage.processExternalDomains = "externalextension";
    //Extension list
    optionsPage._RefreshExtensionList();
    //Extension list Events
    $( document ).on( "click", ".extension_li", function() {
        var id = $(this).find('span').attr("data-id");
        $('.extension_check').parent().css('background-color','').css('color','');
        $('#idExtension'+id).parent().css('background-color','#28a4c9').css('color','white');
        $('.extension_selected').removeClass('showOptions2');
        $(this).find('span').addClass('showOptions2');

        if($('.extension_check:checked').length > 0 || $('.showOptions2').length > 0) {
            $('#idDeleteExtension').removeAttr('disabled');
        } else {
            $('#idDeleteExtension').attr('disabled', 'disabled');
        }
    });
    $( document ).on( "change", ".extension_check", function() {
        if($(this).prop('checked')) {
            var id = $(this).next().attr("data-id");
        }
    });
    //Check/Uncheck all
    $('#idCheckAll2').click(function() {
        $('.extension_check').prop("checked", true);
    });
    $('#idUnCheckAll2').click(function() {
        $('.extension_check').prop("checked", false);
    });

  $('#idAddExtension').click(optionsPage._NewExtension); //New domain
  $('#idNewExtension').keypress(function(e) { if(e.which == 13) { $('#idAddExtension').click(); } });
  $('#idDeleteExtension').click(optionsPage._DeleteExtension); //Delete extension
  $('#idDeleteExtensionAll').click(optionsPage._DeleteExtensionAll); //Delete all extensions
  $('#idDeleteExtension').attr('disabled', 'disabled');
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
        //$('#myModalAccept').hide();
        $('#myModal').modal();
        optionsPage.processExternalDomains = "externaldomain";
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
          //$('#myModalAccept').hide();
          $('#myModal').modal();
          optionsPage.processExternalDomains = "externalextension";
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

optionsPage._RefreshDomainList = function() {
    $("#idDomain").html("");
    $.each(abm.domains, function(id, domain) {
        $("#idDomain").append("<li class='domain_li'><input type='checkbox' class='domain_check' id='idDomain"+id+"'> <span class='domain_selected' data-id='" + id + "'>" + domain + "</span></li>");
    });
};

optionsPage._RefreshExtensionList = function() {
    $("#idExtension").html("");
    $.each(abm.extensions, function(id, extension) {
        $("#idExtension").append("<li class='extension_li'><input type='checkbox' class='extension_check' id='idExtension"+id+"'> <span class='extension_selected' data-id='" + id + "'>" + extension + "</span></li>");
    });
};

//Create a new extension configuration
optionsPage._NewExtension = function() {
  var extension = functs.getUniqueExtension($('#idNewExtension').val());
  if(extension != "") {
    if(abm.extensions.indexOf(extension) < 0) {
      var id = $( ".extension_check" ).length;
      //$("#idExtension").append("<option value='" + id + "'>" + extension + "</option>");
      $("#idExtension").append("<li class='extension_li'><input type='checkbox' class='extension_check' id='idExtension"+id+"'> <span class='extension_selected' data-id='" + id + "'>" + extension + "</span></li>");
      $('#idNewExtension').val("");
      $('#idExtension' + id).parent().click();
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

//Create a new domain configuration
optionsPage._NewDomain = function() {
  var domain = functs.getUniqueId($('#idNewDomain').val());
  if(domain != "") {
    if(abm.domains.indexOf(domain) < 0) {
      var id = $( ".domain_check" ).length;
      $("#idDomain").append("<li class='domain_li'><input type='checkbox' class='domain_check' id='idDomain"+id+"'> <span class='domain_selected' data-id='" + id + "'>" + domain + "</span></li>");
      $('#idNewDomain').val("");
      $('#idDomain' + id).parent().click();
      optionsPage._EnableOptions(id);
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

//Create a new domain list configuration
optionsPage._NewDomainListInit = function() {
    $('#myModalAccept').click(function() {
        if(optionsPage.processExternalDomains == "externaldomain") {
            //External domain list
            $('#idGetExternalDomains').click();
        } else if(optionsPage.processExternalDomains == "externalextension") {
            //External extension list
            $('#idGetExternalExtensions').click();
        } else if(optionsPage.processExternalDomains == "listdomain") {
            //Domain list
            var text = $('#list').val();
            if(text !== '') {
                var lines = text.split(/[\r\n]+/g); // tolerate both Windows and Unix linebreaks
                for(var i = 0; i < lines.length; i++) {
                    $('#idNewDomain').val(lines[i]);
                    $('#idAddDomain').click();
                    if(lines.length == i) {
                        setTimeout(function() {
                            optionsPage._RefreshDomainList();
                        }, 200);
                    }
                }
            } else {
                alert('Domain list is empty.');
            }
        }
    });
};

optionsPage._NewDomainList = function() {

    var content = "<p>" + translate('add_domain_list_info') + "</p>";
    content += '<form enctype="multipart/form-data" method="POST"><input type="hidden" name="MAX_FILE_SIZE" value="30000" />';
    content += '<input type="file" id="fileinput" name="files[]" /><br><textarea class="form-control" rows="10" id="list"></textarea></form>';
    $('#myModalLabel').text(translate("add_domain_list"));
    $('#myModalContent').html(content);
    $('#myModalAccept').show();
    $('#myModal').modal();
    optionsPage.processExternalDomains = "listdomain";

    // Check for the various File API support.
    if (window.File && window.FileReader && window.FileList && window.Blob) {

      function readSingleFile(evt) {
         //Retrieve the first (and only!) File from the FileList object
         var f = evt.target.files[0];

         if (f) {
           var r = new FileReader();
           r.onload = function(e) {
             // Print the contents of the file
              var text = e.target.result;
              var lines = text.split(/[\r\n]+/g); // tolerate both Windows and Unix linebreaks
              var domains = [];
              for(var i = 0; i < lines.length; i++) {
                  domains.push(lines[i]);
              }
              var resultado = domains.join(String.fromCharCode(13, 10));
              $('#list').val(resultado);
           }
           r.readAsText(f);
         } else {
           alert("Failed to load file");
         }
       }

       document.getElementById('fileinput').addEventListener('change', readSingleFile, false);

    } else {
      alert('The File APIs are not fully supported in this browser.');
    }
};


//Enable domain options
optionsPage._EnableOptions = function(id) {
  //Disable
  $('#domain_options').hide();
  $('#idSpanDomain').html(translate("select_domain"));
  $('.option').attr('disabled', 'disabled');
  $('#idDomainFolder').val("");
  $('input[name=domainTitle]')[0].checked = true;

  if(id !== undefined && id !== "") {
    //Enable
    $('#domain_options').show();
    var domainName = $( "#idDomain" + id ).next().text();
    $('#idSpanDomain').html('<a href="http://'+domainName+'" target=_blank>'+domainName+'</a>');
    $('.option').removeAttr('disabled');
    var option = abm.options[id];
    //console.log(id,option);
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

//Save configuration
optionsPage._Save = function() {

    //Domains
    var tempDom = [];
    $('.domain_selected').each(function() {
        if($(this).attr("data-id") !== "") {
            tempDom.push($(this).text());
        }
    });
    abm.domains = tempDom;

    //Domain Options
    var tempOpt = abm.options;
    if(typeof $('.showOptions').attr("data-id") !== "undefined") {
        tempOpt[$('.showOptions').attr("data-id")] = [$('#idDomainFolder').val(), $('input[name=domainTitle]:checked').val(), $('#idCustomTitleSelector').val()];
        console.log($('.showOptions').attr("data-id"), tempOpt);
    }
    abm.options = tempOpt;

    //Extensions
    var tempExt = [];
    $('.extension_selected').each(function() {
        if($(this).attr("data-id") !== "") {
            tempExt.push($(this).text());
        }
    });
    abm.extensions = tempExt;

    //Save data
    delay(function() {
        chrome.storage.sync.set({
            bookmarkFolderName: $('#idExtensionFolder').val() ? $('#idExtensionFolder').val() : defaults.bookmarkFolderName,
            domains: abm.domains,
            options: abm.options,
            extensions: abm.extensions,
            notificationsEnabled: $('input[name="notificationsEnabled"]:checked').val() !== "1" ? false : true,
            notificationTimeout: $('#idNotificationsTimeout').val(),
            dateEnabled: $('input[name="dateEnabled"]:checked').val() !== "1" ? false : true,
            autoAdd: $('input[name="autoAdd"]:checked').val() !== "1" ? false : true,
        }, function() {
            optionsPage._ShowStatusMessage('Options saved');
            //RESTORE DATA
            $('#idCleanHistory').click();
            abm._Restore();
        });
    },100);
}

//Delete domain & configuration
optionsPage._DeleteDomain = function(id) {
    var delDom = function(id) {
        if(typeof abm.options[id] !== "undefined") {
            abm.options.splice(id, 1);
            abm.domains.splice(id, 1);
            $('#idDomain'+id).parent().remove();
        }
    };
    if($('.domain_check:checked').length > 1) {
        if(confirm(translate("deletedomains_question", [$('.domain_check:checked').length]))) {
            $($('.domain_check:checked').get().reverse()).each(function(a,b) {
                delDom($(this).next().attr("data-id"));
            });
            optionsPage._Save();
            setTimeout(function() {
                optionsPage._RefreshDomainList();
                optionsPage._EnableOptions();
            },500);
        }
    } else {
        delDom($('.showOptions').attr("data-id"));
        optionsPage._Save();
        setTimeout(function() {
            optionsPage._RefreshDomainList();
            optionsPage._EnableOptions();
        },500);
    }
}

//Delete all domains
optionsPage._DeleteDomainAll = function() {
    if(confirm(translate('delete_domains'))) {
        $('#idDomain').html("");
        abm.domains = [];
        abm.options = [];
        optionsPage._Save();
        setTimeout(function() {
            optionsPage._RefreshDomainList();
            optionsPage._EnableOptions();
        },300);
    }
};

//Delete extension
optionsPage._DeleteExtension = function(id) {

    var delExt = function(id) {
        if(typeof abm.extensions[id] !== "undefined") {
            abm.extensions.splice(id, 1);
            $('#idExtension'+id).parent().remove();
        }
    };
    if($('.extension_check:checked').length > 1) {
        if(confirm(translate("deletedomains_question", [$('.extension_check:checked').length]))) {
            $($('.extension_check:checked').get().reverse()).each(function(a,b) {
                delExt($(this).next().attr("data-id"));
            });
            optionsPage._Save();
            setTimeout(function() {
                optionsPage._RefreshExtensionList();
            },500);
        }
    } else {
        delExt($('.showOptions2').attr("data-id"));
        optionsPage._Save();
        setTimeout(function() {
            optionsPage._RefreshExtensionList();
        },500);
    }

  //if(confirm(translate("deleteextension_question", [$( "#idExtension option:selected" ).text()]))) {
    /*$( "#idExtension option:selected" ).remove();
    optionsPage._Save();
    var selOpt = document.getElementById("idExtension").options;
    for (i = 1; i < selOpt.length; i++) {
      document.getElementById("idExtension").options[i] = new Option(selOpt[i].text, (i - 1), false, false);
    }
    document.getElementById("idExtension").options[0].selected = true;*/
  //}
}

//Delete all extensions
optionsPage._DeleteExtensionAll = function() {
    if(confirm(translate('delete_extensions'))) {
        $('#idExtension').html("");
        abm.extensions = [];
        optionsPage._Save();
        setTimeout(function() {
            optionsPage._RefreshExtensionList();
        },300);
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
        case "reloadTab":
            location.reload();
        break;
    }
    return true;
});
