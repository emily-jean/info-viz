function BarChart (container) {

    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
            return "<strong><span style='color:red'>" + d.count + "</span> plant(s) in <span style='color:red'>" + d.state + "</strong></span>";
        })

    var defaults = {
            margin: {
                top: 20,
                right: 20,
                bottom: 30,
                left: 40
            },
            yAxisNumTicks: 10,
            yAxisTickFormat: ""
        },
        model = Model(defaults),
        xAxis = d3.svg.axis().orient("bottom"),
        yAxis = d3.svg.axis().orient("left"),

        // Use absolute positioning on the SVG element
        // so that CSS can be used to position the div later
        // according to the model `box.x` and `box.y` properties.
        svg = d3.select(container).append('svg').style('position', 'absolute'),
        g = svg.append("g"),
        xAxisG = g.append("g").attr("class", "x axis"),
        yAxisG = g.append("g").attr("class", "y axis"),
        yAxisText = yAxisG.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end");

    svg.call(tip);

    // Encapsulate D3 Conventional Margins.
    // See also http://bl.ocks.org/mbostock/3019563
    model.when(["box", "margin"], function (box, margin) {
        model.width = box.width - margin.left - margin.right,
            model.height = box.height - margin.top - margin.bottom;
    });
    model.when("margin", function (margin) {
        g.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    });

    // Adjust Y axis tick mark parameters.
    // See https://github.com/mbostock/d3/wiki/Quantitative-Scales#linear_tickFormat
    model.when(['yAxisNumTicks', 'yAxisTickFormat'], function (count, format) {
        yAxis.ticks(count, format);
    });

    // Respond to changes in size and offset.
    model.when("box", function (box) {

        // Resize the svg element that contains the visualization.
        svg.attr("width", box.width).attr("height", box.height);

        // Set the CSS `left` and `top` properties
        // to move the SVG element to `(box.x, box.y)`
        // relative to the container div to apply the offset.
        svg.style('left', box.x + 'px').style('top', box.y + 'px');
    });

    model.when("height", function (height) {
        xAxisG.attr("transform", "translate(0," + height + ")");
    });

    model.when(["data", "xAttribute", "width"], function (data, xAttribute, width) {
        model.xScale = d3.scale.ordinal()
            .rangeRoundBands([0, width], .1)
            .domain(data.map(function(d) { return d[xAttribute]; }));
    });

    model.when(["data", "yAttribute", "height"], function (data, yAttribute, height) {
        model.yScale = d3.scale.linear()
            .range([height, 0])
            .domain([0, d3.max(data, function(d) { return d[yAttribute]; })]);
    });

    model.when(["xScale"], function (xScale) {
        xAxis.scale(xScale)
        xAxisG.call(xAxis);
    });

    model.when(["yScale"], function (yScale) {
        yAxis.scale(yScale)
        yAxisG.call(yAxis);
    });

    model.when("yAxisLabel", yAxisText.text, yAxisText);

    model.when(["data", "xAttribute", "yAttribute", "xScale", "yScale", "height"],
        function (data, xAttribute, yAttribute, xScale, yScale, height) {
            var bars = g.selectAll(".bar").data(data);

            bars.enter().append("rect").attr("class", "bar");
            bars.attr("x", function(d) { return xScale(d[xAttribute]); })
                .attr("width", xScale.rangeBand())
                .attr("y", function(d) { return yScale(d[yAttribute]); })
                .attr("height", function(d) { return height - yScale(d[yAttribute]); });

            bars.on('mouseover', tip.show).on('mouseout', tip.hide)

            bars.exit().remove();
        });

    return model;
}

function ScatterPlot (div) {
    var x = d3.scale.linear(),
        y = d3.scale.linear(),
        xAxis = d3.svg.axis().scale(x).orient('bottom'),
        yAxis = d3.svg.axis().scale(y).orient('left'),

        // Use absolute positioning so that CSS can be used
        // to position the div according to the model.
        svg = d3.select(div).append('svg').style('position', 'absolute'),
        g = svg.append('g'),
        xAxisG = g.append('g').attr('class', 'x axis'),
        yAxisG = g.append('g').attr('class', 'y axis'),
        xAxisLabel = xAxisG.append('text')
            .attr('class', 'label')
            .attr('y', -6)
            .style('text-anchor', 'end'),
        yAxisLabel = yAxisG.append('text')
            .attr('class', 'label')
            .attr('transform', 'rotate(-90)')
            .attr('y', 6)
            .attr('dy', '.71em')
            .style('text-anchor', 'end'),

        // Add the dots group before the brush group,
        // so that mouse events go to the brush
        // rather than to the dots, even when the mouse is
        // on top of a dot.
        dotsG = g.append('g'),
        brushG = g.append('g')
            .attr('class', 'brush'),
        brush = d3.svg.brush()
            .on('brush', brushed),
        dots,
        quadtree,
        model = Model();

    model.when('xLabel', xAxisLabel.text, xAxisLabel);
    model.when('yLabel', yAxisLabel.text, yAxisLabel);


    model.when('margin', function (margin) {
        g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    });

    model.when('box', function (box) {
        svg.attr('width', box.width)
            .attr('height', box.height);

        // Set the CSS `left` and `top` properties
        // to move the SVG element to `(box.x, box.y)`
        // relative to the container div.
        svg
            .style('left', box.x + 'px')
            .style('top', box.y + 'px')
    });

    model.when(['box', 'margin'], function (box, margin) {
        model.width = box.width - margin.left - margin.right;
        model.height = box.height - margin.top - margin.bottom;
    });

    model.when('width', function (width) {
        xAxisLabel.attr('x', width);
    });

    model.when('height', function (height) {
        xAxisG.attr('transform', 'translate(0,' + height + ')');
    });

    model.when(['width', 'height'], function (width, height) {
        brush.x(d3.scale.identity().domain([0, width]));
        brush.y(d3.scale.identity().domain([0, height]));
        brushG
            .call(brush)
            .call(brush.event);
    });


    model.when(['width', 'height', 'data', 'xField', 'yField'],
        function (width, height, data, xField, yField) {

            // Updated the scales
            x.domain(d3.extent(data, function(d) { return d[xField]; })).nice();
            y.domain(d3.extent(data, function(d) { return d[yField]; })).nice();

            x.range([0, width]);
            y.range([height, 0]);

            // update the quadtree
            quadtree = d3.geom.quadtree()
                .x(function(d) { return x(d[xField]); })
                .y(function(d) { return y(d[yField]); })
                (data);

            // update the axes
            xAxisG.call(xAxis);
            yAxisG.call(yAxis);

            // Plot the data as dots
            dots = dotsG.selectAll('.dot').data(data);
            dots.enter().append('circle')
                .attr('class', 'dot')
                .attr('r', 3.5);
            dots
                .attr('cx', function(d) { return x(d[xField]); })
                .attr('cy', function(d) { return y(d[yField]); });
            dots.exit().remove();
        });
    return model;

    function brushed() {
        var e = brush.extent(), selectedData;
        if(dots) {
            dots.each(function(d) { d.selected = false; });
            selectedData = search(e[0][0], e[0][1], e[1][0], e[1][1]);
            dots.classed('selected', function(d) { return d.selected; });
        }
        model.selectedData = brush.empty() ? model.data : selectedData;
    }

    // Find the nodes within the specified rectangle.
    function search(x0, y0, x3, y3) {
        var selectedData = [];
        quadtree.visit(function(node, x1, y1, x2, y2) {
            var d = node.point, x, y;
            if (d) {
                x = node.x;
                y = node.y;
                d.visited = true;
                if(x >= x0 && x < x3 && y >= y0 && y < y3){
                    d.selected = true;
                    selectedData.push(d);
                }
            }
            return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
        });
        return selectedData;
    }
}

// The main program that assembles the linked views.
function main() {

    // Grab the container div from the DOM.
    var div = document.getElementById('container'),

        // Add both visualizations to the same div.
        // Each will create its own SVG element.
        scatterPlot = ScatterPlot(div),
        barChart = BarChart(div);

    // Configure the scatter plot to use the energy generation by state data.
    scatterPlot.set({
        xField: 'totalFuelConsum',
        yField: 'netGeneration',
        xLabel: 'Total Fuel Consumption Qty',
        yLabel: 'Net Generation',
        margin: { 'top': 20, 'right': 20, 'bottom': 30, 'left': 40 }
    });

    // Configure the bar chart to use the aggregated energy data.
    barChart.set({
        xAttribute: 'state',
        yAttribute: 'count',
        yAxisLabel: 'number of plants by state',
        margin: { 'top': 20, 'right': 20, 'bottom': 30, 'left': 40 }
    });

    // Compute the aggregated energy data in response to brushing
    // in the scatter plot, and pass it into the bar chart.
    scatterPlot.when('selectedData', function (scatterData) {
        var stateCounts = {};

        // Aggregate scatter plot data by counting
        // the number of plants for each state.
        scatterData.forEach(function (d) {
            if(!stateCounts[d.state]){
                stateCounts[d.state] = 0;
            }
            stateCounts[d.state]++;
        });

        // Flatten the object containing state counts into an array.
        // Update the bar chart with the aggregated data.
        barChart.data = Object.keys(stateCounts).map(function (state) {
            return {
                state: state,
                count: stateCounts[state]
            };
        });
    });

    // Load the energy data (data.csv locally)
    d3.csv('https://raw.githubusercontent.com/emily-jean/info-viz/master/hw5/data.csv?token=AS0Vtk3G_j2sFgHR7pWAa6bxE97e9E1fks5axv8FwA%3D%3D', function (d) {
        d.netGeneration = +d.netGeneration;
        d.totalFuelConsum = +d.totalFuelConsum;
        return d;
    }, function(error, data) {

        // Set sizes once to initialize.
        setSizes();

        // Set sizes when the user resizes the browser.
        window.addEventListener('resize', setSizes);

        // Set the data.
        scatterPlot.data = data;
    });

    // Sets the `box` property on each visualization
    // to arrange them within the container div.
    function setSizes(){

        // Put the scatter plot on the left.
        scatterPlot.box = {
            x: 0,
            y: 0,
            width: div.clientWidth / 2,
            height: div.clientHeight
        };

        // Put the bar chart on the right.
        barChart.box = {
            x: div.clientWidth / 2,
            y: 0,
            width: div.clientWidth / 2,
            height: div.clientHeight
        };
    }
}
main();