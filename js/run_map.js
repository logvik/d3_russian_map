//Global settings for initial condition
var settings = {"marginRight": "0", 
				"color_domain": [0, 500000, 1000000, 3000000, 4500000, 6500000, 18000000], 
				"legend_labels": ["0", "< 500 000", "500 000+" ,"1 000 000+", "3 000 000+", "4 500 000+", "6 500 000+"],
				"labels_rect_color": ["#6a9fef", "#86f1e8", "#f6fba3", "#eaff00", "#ffde00", "#bc3a90", "#ff3c00"],
				"zoom" : true,
				"map_json": "./map_assets/russia_mercator.json",
				"district": "./map_assets/district.json",
				"population": "./map_assets/population.csv",
				"id_map": "#d3-map",
				"mapRatio": 0.4,
				//"filterPerIso": "CHU",
				//"filterPerDistrict": "CENTR",
				//"viewDistrict": true
				};

Number.prototype.gracefulFormatNumber = function(decPlaces, thouSeparator, decSeparator) {
    var n = this,
        decPlaces = isNaN(decPlaces = Math.abs(decPlaces)) ? 2 : decPlaces,
        decSeparator = decSeparator == undefined ? "." : decSeparator,
        thouSeparator = thouSeparator == undefined ? "," : thouSeparator,
        sign = n < 0 ? "-" : "",
        i = parseInt(n = Math.abs(+n || 0).toFixed(decPlaces)) + "",
        j = (j = i.length) > 3 ? j % 3 : 0;
    return sign + (j ? i.substr(0, j) + thouSeparator : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thouSeparator) + (decPlaces ? decSeparator + Math.abs(n - i).toFixed(decPlaces).slice(2) : "");
};

(function($) {
  var marginRight = settings.marginRight || 200;
  width = jQuery(window).width() - marginRight, //960
  height = width * settings.mapRatio,
  _attachEvents = false,
  features = {},
  g = {},
  _Global_district = {},
  _Global_features = {},
  countById = {},
  nameById = {},
  period = "1959";

  // Setting color domains(intervals of values) for Russia map
  var color_domain = settings.color_domain; 
  var ext_color_domain = $.extend([], color_domain);
  //ext_color_domain.unshift(0); 
  var legend_labels = settings.legend_labels;
  
  var color = d3.scale.threshold()
  .domain(color_domain)
  .range(settings.labels_rect_color);

  var div = d3.select(settings.id_map).append("div")   
  .attr("class", "tooltip")
  .style("opacity", 0);

  var zoomListener = d3.behavior.zoom().scaleExtent([1, 7]).on("zoom", zoom);
  
  var svg = d3.select(settings.id_map).append("svg")
  .attr("width", width)
  .attr("height", height);
  
  if(typeof settings.zoom != "undefined" && settings.zoom) {
	svg.call(zoomListener);
  }
  
  //Preparing projection
  var projection = d3.geo.mercator()
  .rotate([-105, 0])
  .center([-10, 65])
  .scale(700)
  .translate([width / 2, height / 2]);

  var path = d3.geo.path().projection(projection);

  //Reading map file and data
  queue()
  .defer(d3.json, settings.map_json)
  .defer(d3.csv, settings.population)
  .defer(d3.json, settings.district)
  .await(ready);

  // Zooming
  function zoom() {
	svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  } 
  
  //Start of Russia map drawing
  function ready(error, map, data, district) {
	_Global_district = district;
   	data.forEach(function(d, i) {
   		if(typeof settings.filterPerIso != "undefined") {
	   		if($.inArray(d.RegionCode, settings.filterPerIso)) {
	   			return;
	   		}
	   	}
	    countById[d.Code] = {"1959": d.year1959, 
	    					 "1970": d.year1970,
	    					 "1979": d.year1979,
	    					 "1989": d.year1989,
	    					 "2002": d.year2002,
	    					 "2010": d.year2010,
	    					 "2013": d.year2013,
	    					 "2014": d.year2014};
	    nameById[d.Code] = d.Name;
	});

   	features = topojson.feature(map, map.objects.name);
   	_Global_features = features;
   	
   	filterFeatures();

   	//Drawing Russia map
   	g = svg.append("g")
   	.attr("class", "region")
	.selectAll("path")
	.data(features.features)
	.enter().append("path")
	.attr("d", path)
	.style("fill", function(d) {
	  return getColor(d); 
	})
	.style("opacity", 0);

	autoCenter();
  }; // <-- End of Russia map drawing
 
  //Filter for displaying only needed pieces
  function filterFeatures() {
	if(typeof settings.filterPerIso != "undefined") {
   		features.features = features.features.filter(function(d) {
	   		if(~$.inArray(d.properties.ISO_2, _Global_district[settings.filterPerIso])) {
	   			return true;
	   		}
	   		return false;
   		});
   	}else if(typeof settings.filterPerDistrict != "undefined" && settings.filterPerDistrict != "ALL") {
		features.features = features.features.filter(function(d) {
	   		if(~$.inArray(d.properties.ISO_2, _Global_district[settings.filterPerDistrict])) {
	   			return true;
	   		}
	   		return false;
	   	});
   	}
  }
  
  function _getDistrictByRegionIso(iso) {
    for(var k in _Global_district) {
    	if(~$.inArray(iso, _Global_district[k])) {
    		return k;
    	}
    };
  };

  function getTextTooltip (d) {
  	if(typeof settings.viewDistrict != "undefined" && settings.viewDistrict) {
  		var _district = _getDistrictByRegionIso(d.properties.ISO_2);
  		return nameById[_district] + " : " + new Number(countById[_district][period]).gracefulFormatNumber(0, " ");
  	}else {
  		return nameById[d.properties.ISO_2] + " : " + new Number(countById[d.properties.ISO_2][period]).gracefulFormatNumber(0, " ");
  	}
  }
   	
  function getColor (d) {
  	if(typeof settings.viewDistrict != "undefined" && settings.viewDistrict) {
  		var _district = _getDistrictByRegionIso(d.properties.ISO_2);
  		return color(countById[_district][period]);
  	}else {
  		return color(countById[d.properties.ISO_2][period]);
  	}
  }
   	
  function attachEvents() {
	g.on("mouseover", function(d) {
	  d3.select(this).transition().duration(300).style("opacity", 1);
	  div.transition().duration(300)
	  .style("opacity", 1);
	  div.text(getTextTooltip(d))
	  .style("left", (d3.event.pageX) + "px")
	  .style("top", (d3.event.pageY) - 100 + "px");
	});
	
	g.on("mouseout", function() {
	  d3.select(this)
	  .transition().duration(300)
	  .style("opacity", 0.8);
	  div.transition().duration(300)
	  .style("opacity", 0);
	});
  }
    
  function autoCenter() {
	var bounds = path.bounds(features),
    dx = bounds[1][0] - bounds[0][0],
    dy = bounds[1][1] - bounds[0][1],
    x = (bounds[0][0] + bounds[1][0]) / 2,
    y = (bounds[0][1] + bounds[1][1]) / 2,
    scale = .9 / Math.max(dx / width, dy / height),
    translate = [width / 2 - scale * x, height / 2 - scale * y];
	   	
   	g.transition()
   	.duration(0)
    .attr("transform", "translate(" + translate + ")scale(" + scale + ")").style("opacity", 0.8)
   	.each('end',function(){
   		if(!_attachEvents) {
	   		attachEvents();
	   	}
   	});
  }
   	
  //Auto resize map
  d3.select(window).on('resize', resize);
  
  function resize() {
      // adjust things when the window size changes
      width = jQuery(window).width() - marginRight;
      height = width * settings.mapRatio;

      // update projection
      projection.translate([width / 2, height / 2]);
      
      // resize the map container
      svg.style('width', width + 'px').style('height', height + 'px');
      // resize the map
      svg.selectAll('path').attr('d', path);
      autoCenter();
  }
  
  //Display population by selected year
  d3.select("#select-year").on("change", changeYear);
  
  function changeYear() {
	  period = this.value;
	  g.style("fill", function(d) {
		  return getColor(d); 
	  });
  }
  
  //Display population by selected mode
  d3.select("#select-mode").on("change", selectMode);
  
  function selectMode() {
	  settings.viewDistrict = (this.value === 'true');
	  g.style("fill", function(d) {
		  return getColor(d); 
	  });
  }
  
  //Display population by selected district
  d3.select("#select-district").on("change", selectDistrict);
  
  function selectDistrict() {
	  settings.filterPerDistrict = this.value;
	  features = $.extend(true, {}, _Global_features);
	  filterFeatures();
	  
	  d3.select(".region").remove();
	  
	  g = svg.append("g")
	   	.attr("class", "region")
		.selectAll("path")
		.data(features.features)
		.enter().append("path")
		.attr("d", path)
		.style("fill", function(d) {
		  return getColor(d); 
		})
		.style("opacity", 0);
	  
	  autoCenter();
  }
  
  //Adding legend for our Russia map
  var svg_legend = d3.select("#d3-legend-map").append("svg")
  .attr("width", 200)
  .attr("height", 120);

  var legend = svg_legend.selectAll("g.legend")
  .data(ext_color_domain)
  .enter().append("g")
  .attr("class", "legend");

  var ls_w = 20, ls_h = 20;

  legend.append("rect")
  .attr("x", 20)
  .attr("y", function(d, i){ return (i*ls_h);})
  .attr("width", ls_w)
  .attr("height", ls_h)
  .style("fill", function(d, i) { return color(d); })
  .style("opacity", 0.8)
  .style("stroke", "red")
  .style("stroke-width", "0.5px");

  legend.append("text")
  .attr("x", 50)
  .attr("y", function(d, i){ return (i*ls_h) - 4;})
  .text(function(d, i){ return legend_labels[i]; });

})(jQuery);