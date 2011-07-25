/*!
 * WebIAT
 * shihlabs.xtreemhost.com
 * Lab of Margaret Shih, UCLA Anderson School of Management
 * Copyright 2011, All Rights Reserved
 * 
 * Author: Stephen Searles
 * Date: May 10, 2011
 */
if (typeof Object.create !== 'function') {
    Object.create = function (o) {
        function F() {}
        F.prototype = o;
        return new F();
    };
}
(function( window, undefined ) {
var IAT = (function() {
  
  var IAT = function (experimentNumber,callback) {
    return requestExperiment(experimentNumber,callback);
  }
  var IATManager = {
    appendExperimentSelectorTo : function ($domObj) {
      return generateExperimentSelector(function (selector) {
        var $list = selector.generateExperimentList($domObj);
        $domObj.append($list);
      },IATManager.authenticate());
    },
    getExperimentManager : function (experimentNumber,callback,authentication) {
      return requestExperimentWithAuthentication(experimentNumber,callback,authentication);
    },
    authenticate : function() {
      var authentication = Object.create({});
      authentication.promise = $.Deferred();
      this.verifyAuthentication().success(function (receivedData) {
        if (JSON.parse(receivedData) == true) {
          authentication.valid = true;
          authentication.promise.resolve();
        } else {
          var $authenticationBox = $('<div>').addClass('authenticationBox');
          var $authenticationDiv = $('<div>').addClass('innerAuthentication');
          var $labelSpan = $('<span>').append($('<div>').append('Username: ')).append($('<div>').append('Password: ')).addClass('floatLeft');
          var $inputSpan = $('<span>').addClass('floatRight');
          var $form = $('<form id="loginForm" action="javascript:$.noop();">');
          var $username = $('<input type="text" name="username" id="usernameInput">').addClass('innerAuthenticationInput');
          var $password = $('<input type="password" name="password" id="passwordInput">').addClass('innerAuthenticationInput');
          $inputSpan.append($('<div>').append($username));
          $inputSpan.append($('<div>').append($password));
          $form.append($labelSpan).append($inputSpan);
          $form.append($('<div>').append($('<input type="submit" value="Log in">').addClass('center').addClass('innerAuthenticationSubmit')).addClass('floatRight'));
          $form.append($('<div class="authenticationError">').append('<span id="authenticationErrorSpan">'));
          $form.submit(function () {
            $form.find().each().prop('disabled',true);
            var username = $username.val();
            var password = $password.val();
            var passwordHash = hex_sha1(password);
            password = '';
            sendRequest(bundleIATManagerRequestData('authenticate',{
              username:username,
              passwordHash:passwordHash
            })).success(function (data) {
              var parsedData = JSON.parse(data);
              if (parsedData.errorString) {
                $('#authenticationErrorSpan').text(parsedData.errorString);
              }
              $('#authenticationErrorSpan').append(parsedData.authenticationMessage);
              authentication.valid = parsedData.valid;
              if (authentication.valid === true) {
                authentication.data = parsedData;
                authentication.valid = parsedData.valid;
                authentication.promise.resolve();
                $form.trigger('close');
              }
            });
          });
          $authenticationDiv.append($form);
          $authenticationBox.append($authenticationDiv);
          $authenticationBox.lightbox_me({
            onLoad: function () {
              $('#usernameInput').focus();
            },
            closeEsc:false,
            closeClick:false,
            destroyOnClose:true
          });
        }
      });
      return authentication;
    },
    verifyAuthentication : function() {
      return sendRequest(bundleIATManagerRequestData('verifyAuthentication'));
    }
  };
  IAT.IATManager = function () {
    return Object.create(IATManager);
  }
  //Server Upload Connection functions
  function bundleIATManagerRequestData(requestName, dataObject) {
    return {"requestName":requestName,"data":dataObject};
  }
  function sendRequest(requestObject) {
    return $.post('IATManager.php',requestObject);
  }
  
  //key event handling
  $(document).keydown($.noop());
  $(document).keypress(function onKeyDown(event) {
    switch (event.keyCode) {
      case 13:
        $(document.activeElement).filter("input").each(function () {
          $(this).submit();
        });
        break;
      case 27:
        $(document.activeElement).filter("input[type=text]").each(function () {
          var $elem = $(this);
          $elem.val($elem.attr("original"));
          toggleTextInput($elem);
        });
    }
  });
  
  //IAT Static functions
  IAT.addExperiment = function() {
    return sendRequest(bundleIATManagerRequestData("addExperiment",null));
  }
  IAT.requestExperimentList = function() {
    return sendRequest(bundleIATManagerRequestData("requestExperimentList",null));
  }
  
  var ExperimentListItem = {
    experimentNumber : null,
    experimentName : null,
    experimentHash : null,
    generateExperimentListItem : function (chooserCallback) {
      var $listItemDiv = $('<div class="experimentListItem">');
      $listItemDiv.append($('<span class="experimentNumber floatLeft">').text(this.experimentNumber));
      $listItemDiv.append($('<span class="experimentName floatLeft">').text(this.experimentName));
      $listItemDiv.append($('<span class="experimentActions floatRight">').text("Modify ").click(chooserCallback).append('<span class="experimentModifyArrow">\u27A1</span>'));
      return $listItemDiv;
    }
  }
  
  var ExperimentList = {
    array : [],
    authentication : null,
    generateExperimentList : function ($contentDiv) {
      var $topDiv = $('<div>');
      var $list = $('<div class="stimuliGroup">');
      function listItemCallback(authentication,experimentListItem) {
        return function () {
          $(this).find('.experimentModifyArrow').replaceWith('<img src="ajaxLoader.gif" />');
          var $stimulusTable;
          var experiment = requestExperimentWithAuthentication(experimentListItem.experimentNumber,function () {
            $stimulusTable = experiment.experimentManager();
          },authentication);
          experiment.experimentPromise.done(function () {
            $contentDiv.hide("slide",{direction: "left", mode: "hide"},400,function () {
              $list.remove();
            });
            var $newContentDiv = $('<div class="contentDiv">');
            $('body').append($newContentDiv);
            $newContentDiv.append($stimulusTable);
            $newContentDiv.show("slide",{direction: "right"},400);
          });
        };
      }
      var $header = $('<div>').append($('<button>+</button>').click(function () {
        var experimentListItem = Object.create(ExperimentListItem);
        sendRequest(bundleIATManagerRequestData("addExperiment")).success(function (receivedData) {
          var data = JSON.parse(receivedData);
          experimentListItem.experimentNumber = data.experiment.id;
          experimentListItem.experimentName = data.experiment.name;
          experimentListItem.experimentHash = data.experiment.hash;
          $list.append(experimentListItem.generateExperimentListItem(function (authentication,experimentListItem) {
            return listItemCallback(authentication,experimentListItem);
          }(this.authentication,experimentListItem)));
        });
      }));
      for (var experiment in this.array) {
        $list.append(this.array[experiment].generateExperimentListItem(function (authentication,experimentListItem) {
          return listItemCallback(authentication,experimentListItem);
        }(this.authentication,this.array[experiment])
      ));
      }
      $list.sortable({axis: 'y'});
      $topDiv.append($header).append($list);
      return $topDiv;
    }
  }
  
  //experiment constructors
  var Experiment = {
    //data
    name : null,
    experimentNumber : null,
    stimulusCategories : null,
    authentication: null,
    //translations
    groupIdFromIndex : function(index) {
      return this.stimuliGroups[index].id;
    },
    categoryNameFromId : function(id) {
      if (id === "0" | id === null | id === undefined) return "\u2013";
      else return this.stimulusCategories[id];
    }
  }
  var ExperimentManager = function () {
    var stimuliTableDomObj;
    var changedItems = [];
      return {
      //data
      changedItems : [],
      //manipulation functions
      stimuliTableDomObj : null,
      removeExperiment : function(experimentNumber) {
        return sendRequest(bundleIATManagerRequestData("removeExperiment",{
          'experimentNumber' : experimentNumber,
          'data' : null
        }));
      },
      copyExperiment : function(experimentNumber) {
        return sendRequest(bundleIATManagerRequestData("copyExperiment",{
          'experimentNumber' : experimentNumber,
          'data' : null
        }));
      },
      setExperimentProperties : function(experimentNumber,dataObject) {
        return sendRequest(bundleIATManagerRequestData("setExperimentProperties",{
          'experimentNumber' : experimentNumber,
          'data' : dataObject
        }));
      },
      experimentManager : function() {
        function makeStimulusEntry(wordObject,temporary) {
          var $li = $('<li>').addClass('CategoryListItem');
          var $wrapper = $('<span class="listItemInnerWrapper">');
          var $liSpan = $('<span>').addClass('Stimulus').append(wordObject.word);
          $wrapper.append($liSpan);
          if (!temporary) {
            $liSpan.editable(function (value) {
              sendRequest(bundleIATManagerRequestData("setStimulusProperties",{
                "id" : wordObject.id,
                "word" : value
              })).success(function (receivedData) {
                var data = JSON.parse(receivedData);
                $.jnotify("Stimulus changed to '" + value + "'. " + data.message);
              });
              return value;
            });
            var $delete = $('<span class="StimulusDeleteSpan">X</span>').click(function () {
              $wrapper.find('.Stimulus').editable('disable');
              $wrapper.find('.StimulusDeleteSpan').unbind('click').text('');
              sendRequest(bundleIATManagerRequestData('deleteStimulus',wordObject)).success(function (receivedData) {
                var data = JSON.parse(receivedData);
                $li.remove();
                $.jnotify(data.message);
              });
            });
            $wrapper.append($delete);
          }
          $li.append($wrapper);
          return $li;
        }
        function generateCategoryList(stimulusCategory,temporary) {
          var $listFooter = $('<span>');
          var $listTopDiv = $('<div>').addClass('CategoryListContainer');
          var $listDiv = $('<span>');
          if (!temporary) {
            $listDiv.append($('<span>').append(stimulusCategory.name).addClass('CategoryListHeader').editable(function(value,settings) {
              sendRequest(bundleIATManagerRequestData("setStimulusCategoryProperties",{"id":stimulusCategory.id,"name":value})).success(function (receivedData) {
                var data = JSON.parse(receivedData);
                $.jnotify("Category title changed to '" + value + "'. " + data.message);
              });
              return value;
            }));
          }
          var $list = $('<ul>').addClass('CategoryList');
          for (var i in stimulusCategory.stimuli) {
            $list.append(makeStimulusEntry(stimulusCategory.stimuli[i],false));
          }
          $list.sortable();
          $listDiv.append($list);
          var $button = $('<button>+</button>').click(function () {
            var word = {"word":"new word","stimulusCategory":stimulusCategory.id,"experiment":stimulusCategory.experiment};
            var $li = makeStimulusEntry(word,true);
            sendRequest(bundleIATManagerRequestData("addStimulus",word)).success(function (receivedData) {
              var data = JSON.parse(receivedData);
              if (data.success) {
                $li.replaceWith(makeStimulusEntry(data.stimulus,false));
                $.jnotify("Stimulus added to " + stimulusCategory.name + ".");
              } else {
                $.jnotify(data.message);
              }
            });
            $list.append($li);
          });
          if (temporary) {
            $button.prop('disabled',true);
          }
          $listFooter.append($button);
          $listTopDiv.append($listDiv);
          $listTopDiv.append($listFooter);
          return $listTopDiv;
        }
        function generateFlowList(stimulusCategories,categoryPairs) {
          var $flowList = $('<ul class="flowList">');
          var blockDefinitions = [
            {block:"1",blockFunction:"practice",left:[categoryPairs[0].positiveCategory],right:[categoryPairs[0].negativeCategory]},
            {block:"2",blockFunction:"practice",left:[categoryPairs[1].positiveCategory],right:[categoryPairs[1].negativeCategory]},
            {block:"3",blockFunction:"practice",left:[categoryPairs[1].positiveCategory,categoryPairs[0].positiveCategory],right:[categoryPairs[1].negativeCategory,categoryPairs[0].negativeCategory]},
            {block:"4",blockFunction:"test",left:[categoryPairs[1].positiveCategory,categoryPairs[0].positiveCategory],right:[categoryPairs[1].negativeCategory,categoryPairs[0].negativeCategory]},
            {block:"5",blockFunction:"practice",left:[categoryPairs[0].negativeCategory],right:[categoryPairs[0].positiveCategory]},
            {block:"6",blockFunction:"practice",left:[categoryPairs[1].positiveCategory,categoryPairs[0].negativeCategory],right:[categoryPairs[1].negativeCategory,categoryPairs[0].positiveCategory]},
            {block:"7",blockFunction:"test",left:[categoryPairs[1].positiveCategory,categoryPairs[0].negativeCategory],right:[categoryPairs[1].negativeCategory,categoryPairs[0].positiveCategory]}
          ];
          var blocks = [];
          for (var i in blockDefinitions) {
            var $block = $('<li class="flowListItem">');
            var $left = $('<div class="flowCategoryLeft">');
            var $right = $('<div class="flowCategoryRight">');
            for (var ii in blockDefinitions[i].left) {
              var currentId = blockDefinitions[i].left[ii];
              var currentStimulus = $.grep(stimulusCategories,function (item,index) {
                return item.id === currentId;
              });
              $left.append($('<div>').append(currentStimulus[0].name));
            }
            for (var iii in blockDefinitions[i].right) {
              currentId = blockDefinitions[i].right[iii];
              currentStimulus = $.grep(stimulusCategories,function (item,index) {
                return item.id === currentId;
              });
              $right.append($('<div>').append(currentStimulus[0].name))
            }
            var blockString = "Block " + blockDefinitions[i].block + ", " + blockDefinitions[i].blockFunction;
            var $blockCenter = $('<div class="flowCategoryText">').append('<div>'+blockString+'</div>');
            $blockCenter.append('Trials: ').append($('<span>20</span>').editable(function (value) {
              $.jnotify("Trials not yet implemented.");
              return value;
            },{
              style:"display:inline"
            }));
            $block.append($left).append($right).append($blockCenter);
            $flowList.append($block);
          }
          return $flowList;
        }
        function generateFlowSidePanel() {
          var $sidePanel = $('<div class="flowSidePanel">');
          var $balance = $('<div>').append($('<label><input type="checkbox" />Auto-balance</label>').change(function() {
            $.jnotify('Auto-balance has not yet been implemented.');
          }));
          $sidePanel.append($balance);
          return $sidePanel;
        }
        var experimentManager = this;
        var $tabDiv = $('<div id="tabDiv"><ul><li><a href="#tabs-1">Stimuli</a></li><li><a href="#tabs-2">Flow</a></li><li><a href="#tabs-3">Settings</a></li><li><a href="#tabs-4">Save and Close</a></ul></div>');
        var $stimuliDiv = $('<div id="tabs-1">').addClass('ExperimentManager');
        var $contentDiv = $('<div>').addClass('ExperimentManagerContent');
        var $headerDiv = $('<div>').addClass('ExperimentManagerHeader');
        var $button = $(this);
        $button.after('<img src="ajaxloader.gif">');
        sendRequest(bundleIATManagerRequestData("requestExperiment",this.experimentNumber)).success(function (receivedData) {
          var data = JSON.parse(receivedData);
          var unpairedCategories = [];
          var remainingCategories = data.stimulusCategories.slice(0);
          for (var i in data.categoryPairs) {
            var positiveCategory;
            var negativeCategory;
            var unusedCategories = [];
            for (var ii in remainingCategories) {
              if (remainingCategories[ii].id === data.categoryPairs[i].positiveCategory) {
                positiveCategory = remainingCategories[ii];
              } else if (remainingCategories[ii].id === data.categoryPairs[i].negativeCategory) {
                negativeCategory = remainingCategories[ii];
              } else {
                unusedCategories.push(remainingCategories[ii]);
              }
            }
            remainingCategories = unusedCategories.slice(0);
            unusedCategories = undefined;
            var $pairDiv = $('<div class="pairDiv" id="categoryPair' + i + '">').append(generateCategoryList(positiveCategory));
            $pairDiv.append(generateCategoryList(negativeCategory));
            $contentDiv.append($pairDiv);
          }
          if (remainingCategories.length > 0)
            console.log(remainingCategories.length + " unpaired categories ignored.");
          $flowDiv.append(generateFlowList(data.stimulusCategories,data.categoryPairs)).append(generateFlowSidePanel());
          $button.find('img').remove();
        });
        $stimuliDiv.append($headerDiv);
        $stimuliDiv.append($contentDiv);
        var $flowDiv = $('<div id="tabs-2">');
        var $settingsDiv = $('<div id="tabs-3">');
        var $closeDiv = $('<div id="tabs-4">').append("Closing...");
        $tabDiv.append($stimuliDiv);
        $tabDiv.append($flowDiv);
        $tabDiv.append($settingsDiv);
        $tabDiv.append($closeDiv);
        $tabDiv.tabs({
          select: function (event,ui) {
            if (ui.index === 3) {
              var experimentList = Object.create(ExperimentList);
              var $contentDiv = $tabDiv.parent();
              experimentList.authentication = experimentManager.authentication;
              var $list = experimentList.generateExperimentList($contentDiv);
              $tabDiv.hide("slide",{direction: "right", mode: "hide"},400,function () {
                $tabDiv.remove();
              });
              $list.show("slide",{direction: "right", mode: "show"},400,function() {
                $contentDiv.append($list);
              });
            }
          }
        });
        return $tabDiv;
      },
      saveChanged : function () {
        $('#stimuliGroupDiv changed="true"').addClass('.changed');
      }
      //dynamic actions
    };
  }
  ExperimentManager = ExperimentManager();
  
  var DISCLOSURE_HEADER_STRING = '<span class="disclosure"><img src="disclosureTriangle.png"></span>';
  function generateExperimentSelector(callback,authentication) {
    var experiments = Object.create(ExperimentList);
    var experimentListPromise = $.Deferred().done(function() {callback(experiments)});
    experiments.promise = experimentListPromise;
    experiments.authentication = authentication;
    authentication.promise.done(function () {
      if (authentication.valid === true) {
        sendRequest(bundleIATManagerRequestData('requestExperimentList')).success(function (receivedData) {
          var data = JSON.parse(receivedData);
          for (var dataExp in data) {
            var experiment = Object.create(ExperimentListItem);
            experiment.experimentNumber = data[dataExp].id;
            experiment.experimentHash = data[dataExp].hash;
            experiment.experimentName = data[dataExp].name;
            experiment.authentication = authentication;
            experiments.array[dataExp] = experiment;
          }
          experimentListPromise.resolve();
        });
      }
    });
    return experiments;
  }
  function requestExperimentWithAuthentication(experimentNumber,callback,authentication) {
    var experimentPromise = $.Deferred().done(callback);
    var experiment = Object.create(Experiment);
    experiment.experimentNumber = experimentNumber;
    experiment.experimentPromise = experimentPromise;
    experiment.authentication = authentication;
    authentication.promise.done(function () {
      if (authentication.valid === true) {
        for (var propName in ExperimentManager) {
          experiment[propName] = ExperimentManager[propName];
        }
        sendRequest(bundleIATManagerRequestData('requestExperiment',experimentNumber,null)).success(function (receivedData) {
          var data = JSON.parse(receivedData);
          experiment.hash = data.hash;
          experiment.name = data.name;
          experiment.active = data.active;
          experiment.endUrl = data.endUrl;
          experiment.secondEndUrl = data.secondEndUrl;
          experiment.stimuliGroups = data.stimuliGroups;
          experiment.stimulusCategories = data.stimulusCategories;
          experimentPromise.resolve();
        });
      }
    });
    return experiment;
  }
  function requestExperiment(experimentNumber,callback) {
    var experimentPromise = $.Deferred().done(callback);
    var experiment = Object.create(Experiment);
    experiment.experimentNumber = experimentNumber;
    experiment.experimentPromise = experimentPromise;
    experiment.authentication = null;
    sendRequest(bundleIATManagerRequestData('requestExperiment',experimentNumber,null)).success(function (receivedData) {
      var data = JSON.parse(receivedData);
      experiment.hash = data.hash;
      experiment.name = data.name;
      experiment.active = data.active;
      experiment.endUrl = data.endUrl;
      experiment.secondEndUrl = data.secondEndUrl;
      experiment.stimuliGroups = data.stimuliGroups;
      experiment.stimulusCategories = data.stimulusCategories;
      experimentPromise.resolve();
    });
    return experiment;
  }
  return IAT;
})();
window.IAT = IAT;
})(window);
