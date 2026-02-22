(function() {
  var searchData = null;
  var overlay = document.getElementById('local-search-overlay');
  var input = document.getElementById('local-search-input');
  var results = document.getElementById('local-search-results');
  var closeBtn = document.getElementById('local-search-close');

  // Intercept the original search form
  var searchForm = document.querySelector('.search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      openSearch();
      var originalInput = searchForm.querySelector('.search-form-input');
      if (originalInput && originalInput.value) {
        input.value = originalInput.value;
        doSearch(originalInput.value);
      }
    });
  }

  // Also intercept the search button click
  var searchBtn = document.querySelector('.nav-search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      openSearch();
    }, true);
  }

  function openSearch() {
    overlay.style.display = 'flex';
    input.focus();
    document.body.style.overflow = 'hidden';
    loadSearchData();
  }

  function closeSearch() {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    var wrap = document.getElementById('search-form-wrap');
    if (wrap) wrap.classList.remove('on');
  }

  closeBtn.addEventListener('click', closeSearch);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeSearch();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeSearch();
  });

  function loadSearchData() {
    if (searchData) return;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/search.xml', true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        searchData = parseSearchXml(xhr.responseXML);
      }
    };
    xhr.send();
  }

  function parseSearchXml(xml) {
    var entries = xml.querySelectorAll('entry');
    var data = [];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var title = entry.querySelector('title') ? entry.querySelector('title').textContent : '';
      var url = entry.querySelector('url') ? entry.querySelector('url').textContent.trim() : '';
      var content = entry.querySelector('content') ? entry.querySelector('content').textContent : '';
      data.push({ title: title, url: url, content: content });
    }
    return data;
  }

  var searchTimer = null;
  input.addEventListener('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() {
      doSearch(input.value);
    }, 200);
  });

  function stripHtml(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  function doSearch(query) {
    if (!searchData) {
      results.innerHTML = '<div class="search-no-result">加载中...</div>';
      setTimeout(function() { doSearch(query); }, 300);
      return;
    }

    query = query.trim().toLowerCase();
    if (!query) {
      results.innerHTML = '';
      return;
    }

    var keywords = query.split(/\s+/);
    var matched = [];

    for (var i = 0; i < searchData.length; i++) {
      var item = searchData[i];
      var titleLower = item.title.toLowerCase();
      var contentText = stripHtml(item.content).toLowerCase();
      var allMatch = true;

      for (var k = 0; k < keywords.length; k++) {
        if (titleLower.indexOf(keywords[k]) === -1 && contentText.indexOf(keywords[k]) === -1) {
          allMatch = false;
          break;
        }
      }

      if (allMatch) {
        matched.push(item);
      }
    }

    if (matched.length === 0) {
      results.innerHTML = '<div class="search-no-result">没有找到相关文章</div>';
      return;
    }

    var html = '';
    for (var j = 0; j < matched.length; j++) {
      var m = matched[j];
      var titleHighlighted = highlightKeywords(m.title, keywords);
      var snippet = getSnippet(stripHtml(m.content), keywords);
      html += '<div class="search-result-item">';
      html += '<div class="search-result-title"><a href="' + m.url + '">' + titleHighlighted + '</a></div>';
      html += '<div class="search-result-content">' + snippet + '</div>';
      html += '</div>';
    }
    results.innerHTML = html;
  }

  function highlightKeywords(text, keywords) {
    for (var i = 0; i < keywords.length; i++) {
      var re = new RegExp('(' + escapeRegExp(keywords[i]) + ')', 'gi');
      text = text.replace(re, '<span class="search-keyword">$1</span>');
    }
    return text;
  }

  function getSnippet(text, keywords) {
    var idx = -1;
    for (var i = 0; i < keywords.length; i++) {
      idx = text.toLowerCase().indexOf(keywords[i]);
      if (idx !== -1) break;
    }
    var start = Math.max(0, idx - 30);
    var end = Math.min(text.length, idx + 120);
    var snippet = (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
    return highlightKeywords(snippet, keywords);
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
})();
