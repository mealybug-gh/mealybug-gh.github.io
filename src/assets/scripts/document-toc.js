(function() {
  var loadTOC = function() {
    if (typeof Node == 'undefined') {
      var Node = {};
      Node.ELEMENT_NODE = Node.ELEMENT_NODE || 1;
      Node.TEXT_NODE = Node.TEXT_NODE || 3;
      Node.ATTRIBUTE_NODE = Node.ATTRIBUTE_NODE || 2;
      Node.COMMENT_NODE = Node.COMMENT_NODE || 8;
    }
    TOC = {
      /* Configuration Start */
      // container, which contains headlines
      // if not set or set to false, body will be taken
      container: false,
      // top level headline
      headline: 1,
      // minimum number of top level headlines
      minNavPoints: 1,
      // inserts TOC after an element with this id
      // if not set, TOC will be the first child of container
      insertAfter: 'contentHL',
      // headline of TOC
      headlineText: 'Table of contents',
      // this can be set to UL (unordered list) or OL (ordered lits)
      listType: 'OL',
      /* Configuration END */
      create: function() {
        try {
          var container = false;
          if (this.container) {
            container = document.getElementById(this.container);
          }
          if (!container || container == null) {
            container = document.body;
          }
          var toInsertAfter = false;
          if (typeof this.insertAfter !== 'undefined') {
            toInsertAfter = document.getElementById(this.insertAfter);
          }
          var navPoints = this.lookupNavPoints(container, this.headline);
          if (!navPoints) {
            return;
          }
          var div = document.createElement('div');
          div.id = 'TOC';
          var o = document.createElement('p');
          o.className = 'TOCHeadLine';
          o.innerHTML = this.headlineText;
          div.appendChild(o);
          if (toInsertAfter) {
            toInsertAfter.parentNode.insertBefore(div, toInsertAfter.nextSibling);
          } else {
            container.insertBefore(div, container.firstChild);
          }
          var headlines = [];
          this.getHeadlines(navPoints[0], headlines);
          this.createToc(headlines, div);
        } catch (err) {; // do nothing
        }
      },
      lookupNavPoints: function(container, headlineOrder) {
        var navPoints = container.getElementsByTagName('H' + headlineOrder);
        if (navPoints.length < this.minNavPoints) {
          return false;
        }
        return navPoints;
      },
      isHeadline: function(node) {
        return (node.nodeName.indexOf('H') === 0 && !isNaN(parseInt(node.nodeName.replace('H', ''), 10)));
      },
      getHeadlines: function(node, out) {
        while (node !== null) {
          if (node.nodeType === Node.ELEMENT_NODE && this.isHeadline(node)) {
            out.push(node);
          }
          if (node.hasChildNodes()) {
            this.getHeadlines(node.firstChild, out);
          }
          node = node.nextSibling;
        }
      },
      createToc: function(headlines, o) {
        var list = document.createElement(this.listType);
        o.appendChild(list);
        var level = this.headline;
        var li;
        for (var i = 0; i < headlines.length; ++i) {
          var node = headlines[i];
          var tmp = parseInt(node.nodeName.replace('H', ''), 10);
          if (tmp > level) {
            var o = document.createElement(this.listType);
            list.appendChild(li);
            li.appendChild(o);
            list = o;
            li = document.createElement('li');
            level = tmp;
          } else if (tmp < level) {
            while (tmp < level || list.nodeName != this.listType) {
              if (list.nodeName == this.listType) {
                level--;
              }
              list = list.parentNode;
            }
            li = document.createElement('li');
          } else {
            li = document.createElement('li');
          }
          var a = document.createElement('a');
          var id = node.id || ('hl' + i);
          node.setAttribute('id', id);
          a.setAttribute('data-href', '#' + node.id);
          var href = '#'+window.location.href.split('#')[1].split('/').splice(0,4).join('/')+'/'+node.id;
          a.setAttribute('href', href);
          a.innerHTML = node.innerHTML;
          a.onclick =  function(e){
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            var selector = $(this).attr('data-href');
            if($(selector).length > 0) {
              $(selector)[0].scrollIntoView();
            }
          };
          li.appendChild(a);
          list.appendChild(li);
        }
      }
    }
    TOC.create();
  };

  var ready = function(callback) {
    if (document.readyState === 'interactive') {
      callback();
    } else {
      document.addEventListener('readystatechange', function(){
        if (document.readyState === 'interactive') {
          callback();
        }
      });
    }
  };

  ready(function(){
    var addDocumentTOC = function(initiallyScrollTo) {
      $('<div class="contentHL-wrapper">'+
      '<a href="#" class="fixed-right-button open-toc">#</a>'+
      '<div id="contentHL"></div></div>').insertAfter($('h1').first());
      loadTOC();
      $('.open-toc').on('click', function(e){
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        var openInLightbox = $('#TOC').html();
        openInLightbox +=
        '<script type="text/javascript">'+
            '$(".featherlight-content a").on("click", function(e){ '+
              'e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation(); var selector =  $(this).attr(\'data-href\'); if($(selector).length > 0) { $(selector)[0].scrollIntoView(); } '+
              'if ($.featherlight.current()){ $.featherlight.current().close(); }'
            +' }); '
            + '<\/script>';
        $.featherlight(openInLightbox);
      });
      if (initiallyScrollTo && initiallyScrollTo.length > 0 && $(initiallyScrollTo).length > 0) {
        $(initiallyScrollTo)[0].scrollIntoView();
      } else if ($('.showDocument h1').length > 0) {
        $('.showDocument h1')[0].scrollIntoView();
      }
      if ($('.showDocument h1').length > 0) {
        document.title = $('.showDocument h1').text();
      }
      if ($('.showDocument script').length > 0) {
        $('.showDocument script').each(function(){
          eval($(this).innerHTML);
        });
      }
    };
    window.addDocumentTOC = addDocumentTOC;
    window.showNewAnchor = function(initiallyScrollTo) {
      if (initiallyScrollTo && initiallyScrollTo.length > 0 && $(initiallyScrollTo).length > 0) {
        $(initiallyScrollTo)[0].scrollIntoView();
      } else if ($('.showDocument h1').length > 0) {
        $('.showDocument h1')[0].scrollIntoView();
      }
    }
  });

})();
