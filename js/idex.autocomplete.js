

var IDEX = (function(IDEX, $, undefined) 
{
	
	var autoSearchName = [];
	var autoSearchSkynet = [];

	
	
	IDEX.initAutocomplete = function()
	{
		initAssetAutocomplete();
	}
	
	function initAssetAutocomplete()
	{
		var assets = IDEX.user.allAssets;
		var len = assets.length;

		for (var i = 0; i < len; i++)
		{
			var asset = assets[i];
			var vals = {}
			vals.name = asset.name;
			vals.assetID = asset.assetID
			
			autoSearchName.push({"label":asset.name+" <span>("+asset.assetID+")</span>", "value":asset.name, "vals":vals});
		}
	}
	

	$('.asset-search').autocomplete(
	{
		delay: 0,
		html: true,
		create: function(e, ui) { },
		open: function(e, ui) { $(this).autocomplete('widget').css({'width':"180px"})},
		source: function(request,response) { assetMatcher(request, response, autoSearchName) },
		change: function(e, ui) { assetSelection($(this), e, ui) },
		select: function(e, ui) { assetSelection($(this), e, ui) }
	});
	
	
	function assetMatcher(request, response, auto)
	{
		var matcher = new RegExp( "^" + $.ui.autocomplete.escapeRegex( request.term ), 'i' );
		
		var a = $.grep(auto, function( item )
		{
			var assetID = item.vals.assetID;
			var assetName = item.vals.name;

			return (matcher.test(assetID) || matcher.test(assetName));
		});

		response(a);
	}
	
	function assetSelection($thisScope, e, ui)
	{
		if (!ui.item)
		{
			$thisScope.attr('data-asset', "-1");
		}
		else
		{
			var assetID = ui.item.vals.assetID;
			
			$thisScope.attr('data-asset', assetID);
		}
	}
	
	
	
	IDEX.initSkyNETAuto = function($search)
	{
		$search.autocomplete(
		{
			delay:0,
			html:true,
			open: function(e, ui) { $(this).autocomplete('widget').css({'width':"450px","margin-top":"14px"})},
			source: function(request,response) { skynetMatcher(request, response, autoSearchSkynet) },
			//change: function(e, ui) { skynetSelection($(this), e, ui) },
			select: function(e, ui) { skynetSelection($(this), e, ui) }
		});
	}
	
	
	$('.skynet-search').each(function(index, element)
	{
		IDEX.initSkyNETAuto($(element));
	});

	
	function skynetMatcher(request, response, auto)
	{
		var matcher = new RegExp( "^" + $.ui.autocomplete.escapeRegex( request.term ), 'i' );

		var a = $.grep(auto, function( item )
		{
			var vals = item.vals

			var pair = vals.pair
			var idPair = vals.idPair
			var exchange = vals.exchange
			
			var pairBoth = pair.split("_")
			

			var ret = matcher.test(pair) || matcher.test(pairBoth[0]) || matcher.test(pairBoth[1]) || matcher.test(idPair) || matcher.test(exchange)
			
			return (ret);
		});

		response(a.slice(0, 80));
	}
	
	
	function skynetSelection($input, e, ui)
	{
		if (!ui.item)
		{
			$input.attr('data-pair', "-1");
		}
		else
		{
			var vals = ui.item.vals;
			var searchPair = vals.pair;
			
			if (vals.idPair.split("_").length == 2 && vals.exchange == "nxtae")
				searchPair = vals.idPair

			$input.attr('data-pair', searchPair);
			$input.attr('data-exchange', vals.exchange);
			
			var obj = {};			
			var $wrap = $input.closest(".chart-header")	
			obj.node = $wrap;
			
			var both = searchPair.split("_")

			obj.baseID = both[0];
			obj.relID = both[1];
			
			obj.exchange = vals.exchange;

			IDEX.changeChartMarket(obj);
		}
	}
	

	
	
	IDEX.getSkynet = function(options, len)
	{
		var dfd = new $.Deferred();

		loadSkynetData().done(function(parsed)
		{
			var len = parsed.length;
						
			for (var i = 0; i < len; i++)
			{
				var obj = {}
				obj.baseName = "";
				obj.relName = "";
				obj.baseID = ""
				obj.relID = ""
				obj.pair = "";
				obj.idPair = "";
				obj.exchange = parsed[i].exchange

				var pair = parsed[i].pair;
				var both = pair.split("_")
				
				var func = function(obj, defaultName, typeAsset) 
				{	
					var assetObj = IDEX.user.getAssetInfo("assetID", defaultName)
					obj[typeAsset + "Name"] = defaultName;
					
					if ("name" in assetObj)
					{
						obj[typeAsset + "ID"] = assetObj.assetID;
						obj[typeAsset + "Name"] = assetObj.name;
					}
				};
				
				func(obj, both[0], "base")
				func(obj, both[1], "rel")
				
				obj.pair = obj.baseName + "_" + obj.relName
				
				if (obj.exchange == "nxtae")
				{
					var baseRef = obj.baseID.length ? obj.baseID : obj.baseName;
					var relRef = obj.relID.length ? obj.relID : obj.relName;
					
					obj.idPair = baseRef + "_" + relRef;
				}
				
											
				var row = buildSkynetSearchRow(obj)
				
				autoSearchSkynet.push({"label":row, "value":obj.pair, "vals":obj});
			}
			
			dfd.resolve(parsed)	
		})
		
		return dfd.promise()
	}
	
	
	function buildSkynetSearchRow(obj)
	{
		var exchangeSpan = "<span>" + obj.exchange + "</span>"
		var pairSpan = "<span>" + obj.pair + " </span>"
		var idPairSpan = "<span>" + obj.idPair + " </span>"
		
		var row = "<div class='sky-auto-wrap'>";
		row += "<div class='sky-auto-cell sky-auto-pair'>" + pairSpan + "</div>";
		row += "<div class='sky-auto-cell sky-auto-idPair'>" + idPairSpan + "</div>";
		row += "<div class='sky-auto-cell sky-auto-exchange'>" + exchangeSpan + "</div>";
		row += "</div>";
		
		return row
		
	}
	
	function loadSkynetData()
	{
		var dfd = new $.Deferred();
		
		if (localStorage.skynetMarkets)
		{
			var markets = JSON.parse(localStorage.getItem('skynetMarkets'));
			dfd.resolve(markets);
		}
		else
		{
			var obj = {}
			obj.section = "crypto";
			obj.run = "search";
			obj.field = "pair";
			obj.term = "";
			obj.key = "beta_test";
			obj.filter = "";

			var url = IDEX.makeSkynetURL(obj)

			$.getJSON(url, function(data)
			{
				var parsed = parseSkynetSearch(data.results)
				localStorage.setItem('skynetMarkets', JSON.stringify(parsed));
				dfd.resolve(parsed);
			})
		}
		
		
		return dfd.promise();
	}
	
	
	function parseSkynetSearch(data)
	{
		var exchanges = {}
		var parsed = []
		
		for (pair in data)
		{
			var pairExchanges = data[pair].split('|');
			
			for (var i = 0; i < pairExchanges.length; i++)
			{
				var exchange = pairExchanges[i];
				parsed.push({"pair":pair,"exchange":exchange})
			}
		}

		return parsed;
	}
	

    IDEX.makeSkynetURL = function(obj)
    {
		var baseurl = "http://api.finhive.com/v1.0/run.cgi?"
        var arr = []
		
        for (key in obj)
        {
			arr.push(key+"="+obj[key])
        }
        var s = arr.join("&")

        return baseurl+s
    }

	
	
	
	return IDEX;
	
	
}(IDEX || {}, jQuery));


