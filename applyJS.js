// Throughout this script there will be places marked as [MUST CHANGE]. Make sure you fill in the details accordingly.
// Other places have comments to inform you what kind of customizations you can potentially make there. Make sure you
// read through them.

// A full or trimmed jQuery must be included in the project.
var $ = optimizely.get('jquery');
var utils = optimizely.get('utils');
var recommender = optimizely.get('recommender');

// This boolean tells whether you are in the editor, so that you can special case if needed.
var editorMode = optimizely.state && optimizely.state.directives && optimizely.state.directives.isEditor;

// [MUST CHANGE]
// Fill in the real ids.
var recommenderKey = {
  recommenderServiceId: 0,
  recommenderId: 0
};

// [MUST CHANGE]
// Replace with the actual id tag name of the recommender service.
var idTagName = 'id';

function getTargetId() {
  // [MUST CHANGE]
  // Replace with actual code to retrieve the id of the target entity to recommend for.
  //
  // * For item-based algorithms such as co-browse and co-buy, this will be the target item id.
  // * For user-based algorithms, this will be the optimizely visitor id which you can get through this code:
  //   optimizely.get('visitor').visitorId
  // * For most-popular algorithms, this should be a fixed value of 'popular'.
  //
  // Can return either a Promise or a fullfilled value.
  return utils.waitForElement('[itemtype="http://schema.org/Product"] > [itemprop="productID"]')
    .then(function(targetElem) {
      var target = $(targetElem);
      return target.text() || target.attr('content');
    });
}

function preFilter(reco) {
  // Use this function to filter on these fields:
  // * id (keyed by idTagName)
  // * _score (usually a value between 0 and 1)
  return true;
}

function canonicalize(reco) {
  // Uncomment the next line to log the reco to console to help you debug. Remember to comment it out afterwards.
  // console.log(reco);

  // This is where you perform any necessary canonicalization of the recos before rendering them.
  // In the example below, we convert numeric prices into string form, and treat missing in_stock values as true.
  if (typeof reco.price === 'number') {
    // [MUST CHANGE] if this is for a different currency and/or locale.
    var symbol = '$';
    var locale = 'en-US';
    reco.price = symbol + (reco.price / 100.0).toLocaleString(
      locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (typeof reco.in_stock === 'undefined') {
    reco.in_stock = true;
  }

  return reco;
}

function postFilter(reco) {
  // Use this function to filter on other metadata fields not covered in preFilter().
  // In this example, we exclude out of stock or recos with missing metadata.
  // [MUST CHANGE] if you have a different set of metadata fields.
  return reco.in_stock &&
    reco.name &&
    reco.image &&
    reco.url &&
    reco.price;
}

function fetchRecos(targetId) {
  if (editorMode && extension.example_json.trim()) {
    console.log('Using example reco');

    var recos = [];
    for (var i = 0; i < 20; i++) {
      recos.push(JSON.parse(extension.example_json.trim()));
    }
    return recos;
  } else {
    var fetcher = recommender.getRecommendationsFetcher(recommenderKey, targetId, {
      preFilter: preFilter,
      canonicalize: canonicalize,
      postFilter: postFilter
    });
    return fetcher.next(extension.max);
  }
}

function renderRecos(recos) {
  recos = recos.slice(0, extension.max);
  if (recos.length === 0) {
    return;
  }

  var html = extension.$render({
    extension: extension,
    recos: recos,
  });

  utils.waitForElement(extension.selector).then(function(selectorElem) {
    // Inject the extension html onto the page.
    switch (extension.placement) {
      case 'before':
        selectorElem.insertAdjacentHTML('beforebegin', html);
        break;
      case 'after':
        selectorElem.insertAdjacentHTML('afterend', html);
        break;
      case 'prepend':
        selectorElem.insertBefore(html, selectorElem.firstChild);
        break;
      case 'append':
        selectorElem.appendChild(html);
        break;
      case 'replace-content':
        // This is to save the original content in a hidden div so that we can restore it in undo.js.
        var origHtml = selectorElem.innerHTML();

        selectorElem.innerHTML()= ''.appendChild(html).appendChild(
          '<div>'
            .setAttribute('id', 'optimizely-extension-' + extension.$instance + '-orig')
            .style.display = 'none'
            .appendChild(origHtml)
        );
        break;
      default:
        throw new Error('Unknown placement ' + extension.placement);
    }
  }).then(function() {
    // This selector should select the anchor element around each reco.
    var recosSelector = '#optimizely-extension-' + extension.$instance + ' a.reco-link';

    document.querySelectorAll(recosSelector).click(function () {
      optimizely.push({
        type: 'event',
        // Replace with the actual reco click event you've created for this project, if different.
        eventName: 'extension_recommended_item_click',
        tags: {
          // Tag the id of the clicked reco. The selector may differ depending on your HTML setup.
          // clicked_id: $(this).find('meta[itemprop="id"]').attr('content')
          // double check if this is actually the right way to do this without jQuery
          clicked_id: this.querySelectorAll('meta[itemprop="id"]').getAttribute('content')
        }
      });
    });
  });
}


if (recommender) {
  //replaced $(document).ready
  document.addEventListener("DOMContentLoaded",function() {
    var targetId = getTargetId();
    fetchRecos(targetId)
    .then(renderRecos);
  });
}
