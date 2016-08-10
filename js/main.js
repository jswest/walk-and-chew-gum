// @todo Give this some structure.
// For now, we're just wrapping everything in a self-calling function.
// This is all the artisinal JS for Gum.
( function () {

	var successCallback = function ( response, data ) {

		$linechart.empty();
		$barchart.empty();
		$chartarea.hide();

		var tweetsByDate = {};
		var tweets = {
			base: 0,
			comparison: 0
		};

		var extractDate = function ( dateString ) {
			var date = new Date( dateString );
			return date.getFullYear() + '-' + ( date.getMonth() + 1 ) + '-' + date.getDate();
		};

		// Iterate over the tweets.
		for ( var i = 0, l = response.length; i < l; i++ ) {
			var text = response[i].text;
			var date = response[i].created_at;

			// Check if the tweet includes any of the base words.
			for ( var j = 0, m = data.base.length; j < m; j++ ) {
				var word = data.base[j];
				if ( text.toLowerCase().indexOf( word.toLowerCase() ) > -1 ) {
					var day = extractDate( date ); // Get the day of the tweet.
					if ( tweetsByDate[day] ) {
						tweetsByDate[day].base++;
					} else {
						tweetsByDate[day] = { base: 1, comparison: 0 };
					}
					tweets.base++;
					break;
				}
			}

			// Check if the tweet includes any of the comparison words.
			for ( var j = 0, m = data.comparison.length; j < m; j++ ) {
				var word = data.comparison[j];
				if ( text.toLowerCase().indexOf( word.toLowerCase() ) > -1 ) {
					var day = extractDate( date ); // Get the day of the tweet.
					if ( tweetsByDate[day] ) {
						tweetsByDate[day].comparison++;
					} else {
						tweetsByDate[day] = { base: 0, comparison: 1 };
					}
					tweets.comparison++;
					break;
				}
			}

		}

		$chartarea.show();

		$('html, body').animate( {
			scrollTop: $chartarea.offset().top
		}, 500 );

		barchart( data, tweets );
		linechart( data, tweetsByDate );

	};

	var barchart = function ( data, tweets ) {

		// Deal with the bar chart first.
		var max = tweets.base > tweets.comparison ? tweets.base : tweets.comparison;

		// Make the SVG el.
		var svg = d3.select( $barchart[0] ).append( 'svg' ).attr( 'width', $barchart.width() ).attr( 'height', 300 );

		// Make the X scale.
		var xScale = d3.scaleLinear().range( [ 0, $barchart.width() ] ).domain( [ 0, max ] );

		var barData = [
			{ value: tweets.base, words: data.base },
			{ value: tweets.comparison, words: data.comparison }
		];

		// Make the groups for the bars.
		var bar = svg.selectAll( 'g' )
			.data( barData )
			.enter()
			.append( 'g' )
			.attr( 'transform', function ( d, i ) { return 'translate( 0, ' + ( i * 100 ) + ' )'; } );

		// Make the bars themselves.
		bar.append( 'rect' )
			.attr( 'width', function ( d ) { return xScale( d.value ) } )
			.attr( 'height', 25 )
			.attr( 'fill', function ( d, i ) { return i === 0 ? '#00FFA5' : '#3D8799'; } );

		bar.append( 'text' )
			.attr( 'transform', 'translate( 0, 45 )' )
			.text( function ( d ) { return 'Term(s): ' + d.words.join( ', ' ); } );

		bar.append( 'text' )
			.attr( 'transform', 'translate( 0, 70 )' )
			.text( function ( d ) { return d.value + ' tweets'} );

	};

	var linechart = function ( data, tweetsByDate ) {

		// Margins
		var margins = { top: 5, left: 30, bottom: 30, right: 0 };

		// Make the SVG el.
		var svg = d3.select( $linechart[0] ).append( 'svg' )
			.attr( 'width', $linechart.width() - margins.left )
			.attr( 'height', 300 - margins.top - margins.bottom )
			.append( 'g' )
			.attr( 'transform', 'translate( ' + margins.left + ', 0 )' );

		// Organize the data into an array.
		var tweets = [];
		for ( date in tweetsByDate ) {
			tweets.push( {
				date: date,
				base: tweetsByDate[date].base,
				comparison: tweetsByDate[date].comparison
			} );
		}

		// Sort that array.
		tweets.sort( function ( a, b ) {
			if ( Date.parse( a.date ) > Date.parse( b.date ) ) {
				return 1;
			} else {
				return -1;
			}
		} );

		// Get the y max.
		var baseYMax = d3.max( tweets, function ( d ) { return d.base; } );
		var comparisonYMax = d3.max( tweets, function ( d ) { return d.comparison; } );
		var yMax = baseYMax > comparisonYMax ? baseYMax : comparisonYMax;

		var xScale = d3.scaleTime()
			.range( [ 0, $linechart.width() - margins.left ] )
			.domain( [ new Date( tweets[0].date ), new Date( tweets[tweets.length - 1].date ) ] );
		var yScale = d3.scaleLinear().range( [ $linechart.height() - margins.top - margins.bottom, margins.top ] ).domain( [ 0, yMax ] );

		var xAxis = d3.axisBottom().scale( xScale ).tickSize( -$linechart.height() - margins.top - margins.bottom );

		svg.append( 'g' )
			.attr( 'class', 'x axis' )
			.attr( 'transform', 'translate( 0, ' + ( $linechart.height() - margins.bottom - margins.top ) + ' )' )
			.call( xAxis );

		var yAxis = d3.axisLeft().scale( yScale ).tickSize( -$linechart.width() - margins.left );

		svg.append( 'g' )
			.attr( 'class', 'y axis' )
			.call( yAxis );

		var baseLine = d3.line()
			.x( function ( d ) { return xScale( new Date( d.date ) ); } )
			.y( function ( d ) { return yScale( d.base ); } );

		var comparisonLine = d3.line()
			.x( function ( d ) { return xScale( new Date( d.date ) ); } )
			.y( function ( d ) { return yScale( d.comparison ); } );

		svg.append( 'path' )
			.datum( tweets )
			.attr( 'class', 'line' )
			.attr( 'd', baseLine )
			.attr( 'stroke-width', '2px' )
			.attr( 'stroke', '#00FFA5');

		svg.append( 'path' )
			.datum( tweets )
			.attr( 'class', 'line' )
			.attr( 'd', comparisonLine )
			.attr( 'stroke-width', '2px' )
			.attr( 'stroke', '#3D8799' );

	};

	window.history.pushState( {},'', window.location.href.split( '?' )[0] );

	var $form = $('#primary-form');
	var $submit = $('#primary-form-submit');
	var $handle = $('#primary-form-handle');
	var $base = $('#primary-form-base');
	var $comparison = $('#primary-form-comparison');
	var $barchart = $('#bar-chart');
	var $linechart = $('#line-chart');
	var $chartarea = $('#chart-area');

	// The flash function alerts the user to any errors.
	// @todo Add messaging.
	var flash = function ( $el, message ) {
		console.log( $el );
		$el.closest( '.form-group' ).addClass( 'has-danger' );
	};

	// On form submit, validate the post to the server.
	$form.on( 'submit', function ( e ) {

		e.preventDefault();

		// Remove all flash messages.
		$handle.closest( '.form-group' ).removeClass( 'form-control-danger' );
		$base.closest( '.form-group' ).removeClass( 'form-control-danger' );
		$comparison.closest( '.form-group' ).removeClass( 'form-control-danger' );

		// Get the raw data back from the form.
		var data = {
			'handle': $handle.val(),
			'base': $base.val(),
			'comparison': $comparison.val()
		};

		var paramNameElementMap = {
			'handle': $handle,
			'base': $base,
			'comparison': $comparison
		};

		// Dummy variable, which we'll set to false if there's a problem.
		var validates = true;

		// Iterate over the data object and validate.
		for ( var param in data ) {

			// If there's nothing there, flash a message.
			if ( !data[param] ) {
				validates = false;
				flash( paramNameElementMap[param], 'Please enter a value.' );
				break;
			}

			// Check that the handle isn't empty.
			if ( param === 'handle' ) {
				if ( data[param].indexOf( '@' ) === 0 ) {
					validates = false;
					flash( $comparison, 'Please do not include the @ sign in the user handle.' );
					break;
				}
			}

		}

		// Split the base and comparison strings into arrays.
		data.base = $base.val().split( ', ' );
		data.comparison = $comparison.val().split( ', ' );


		// If we've validated, AJAX away.
		if ( validates ) {
			$.ajax( {
				type: 'POST',
				url: 'api/0/compare',
				data: data,
				success: function ( response ) {
					successCallback( response, data );
				},
				dataType: 'json'
			} );
		}

	} );

} )();
