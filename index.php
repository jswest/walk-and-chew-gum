<?php
if (PHP_SAPI == 'cli-server') {
	// To help the built-in PHP dev server, check if the request was actually for
	// something which should probably be served as a static file
	$url  = parse_url($_SERVER['REQUEST_URI']);
	$file = __DIR__ . $url['path'];
	if (is_file($file)) {
		return false;
	}
}

require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/config/config.php';

// For the Twitter OAuth API access.
use Abraham\TwitterOAuth\TwitterOAuth;

// Set up the configuration.
$config = [
	'settings' => [
		'displayErrorDetails' => true, // set to false in production
		'addContentLengthHeader' => false, // Allow the web server to send the content-length header
	],
];

// Start the session.
// @todo Is this really necessary?
session_start();

// Instantiate the app.
$app = new \Slim\App( $config );

// Get the container.
$container = $app->getContainer();

// Register the view component on the container.
// This allows Slim to render PHP templates from the templates/ directory.
$container['view'] = function ( $c ) {
	return new \Slim\Views\PhpRenderer( __DIR__ . '/templates/' );
};

// Helper function
function anize ( $string ) {
	return preg_replace( '/[^a-z0-9]+/i', '', $string );
}

// Routing!
$app->get( '/', function ( $request, $response, $args ) {

	if ( isset( $_SESSION['oauth_token'] ) && isset( $_SESSION['oauth_token_secret'] ) && isset( $_REQUEST['oauth_token'] ) ) {

		$request_token = [];
		$request_token['oauth_token'] = $_SESSION['oauth_token'];
		$request_token['oauth_token_secret'] = $_SESSION['oauth_token_secret'];

		if ( $request_token['oauth_token'] === $_REQUEST['oauth_token'] ) {
			$connection = new TwitterOAuth(
				$twitter_api_consumer_key,
				$twitter_api_consumer_secret,
				$request_token['oauth_token'],
				$request_token['oauth_token_secret']
			);
			$access_token = $connection->oauth( 'oauth/access_token', [ 'oauth_verifier' => $_REQUEST['oauth_verifier'] ] );
			$_SESSION['access_token'] = $access_token;
			return $this->view->render( $response, 'index.phtml', [ 'verified' => true ] );
		}

	}

	return $this->view->render( $response, 'index.phtml', [ 'verified' => false ] );

} );

$app->get( '/colophon', function ( $request, $resopnse, $args ) {

	return $this->view->render( $response, 'colophon.phtml', [] );

} );

$app->get( '/login', function ( $request, $response, $args ) use ( $twitter_api_consumer_key, $twitter_api_consumer_secret ) {

	$connection = new TwitterOAuth( $twitter_api_consumer_key, $twitter_api_consumer_secret );

	if ( $_SERVER['HTTP_HOST'] === 'localhost:8080' ) {
		$url = 'http://localhost:8080/';
	} else {
		$url = 'http://beebe-west.com/gum/';
	}

	$request_token = $connection->oauth( 'oauth/request_token', array( 'oauth_callback' => $url, 'x_auth_access_type' => 'read' ) );

	$_SESSION['oauth_token'] = $request_token['oauth_token'];
	$_SESSION['oauth_token_secret'] = $request_token['oauth_token_secret'];

	$url = $connection->url( 'oauth/authorize', array('oauth_token' => $request_token['oauth_token'] ) );

	return $response->withStatus( 302 )->withHeader( 'Location', $url );

} );

$app->post( '/api/0/compare', function ( $request, $response, $args ) use ( $twitter_api_consumer_key, $twitter_api_consumer_secret ) {

	$raw_handle = $request->getParam( 'handle' );
	$raw_base = $request->getParam( 'base' );
	$raw_comparison = $request->getParam( 'comparison' );

	$base = array();
	foreach ( $raw_base as $term ) {
		array_push( $base, anize( $term ) );
	}

	$comparison = array();
	foreach ( $raw_comparison as $term ) {
		array_push( $comparison, anize( $term ) );
	}

	$access_token = $_SESSION['access_token'];

	echo "\n" . $handle . "\n";

	$connection = new TwitterOAuth(
		$twitter_api_consumer_key,
		$twitter_api_consumer_secret,
		$access_token['oauth_token'],
		$access_token['oauth_token_secret']
	);

	$statuses = $connection->get( 'statuses/user_timeline', [ 'screen_name' => $raw_handle, 'count' => 200 ] );

	$res = $response->withJson( $statuses )->withHeader( 'Content-Type', 'application/json' );

	return $res;

} );

// Run app
$app->run();
