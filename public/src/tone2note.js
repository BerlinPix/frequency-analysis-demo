var rafID = null;
var analyser = null;
var c = null;
var cDraw = null;
var ctx = null;
var micropone = null;
var ctxDraw = null;

//handle different prefix of the audio context
var AudioContext = AudioContext || webkitAudioContext;
//create the context.
var context = new AudioContext();

//using requestAnimationFrame instead of timeout...
if (!window.requestAnimationFrame)
	window.requestAnimationFrame = window.webkitRequestAnimationFrame;

$(function () {

	if (!!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia)) {
		
		//handle different types navigator objects of different browsers
		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
	            navigator.mozGetUserMedia || navigator.msGetUserMedia;

		//play sound 
		$('body').append('<button id="play">Play Sound</button<');
		$("#play").click(function () {
			reset();				
			loadSound("assets/audio/guitar-E-A-D-G-H-E-microphone.wav");
		});

		//use microphone
		$('body').append('<button id="micro">Use Microphone</button<');
		$("#micro").click(function () {			
			reset();
			//capturing input of the micropone
			navigator.getUserMedia({audio: true, video: false}, 
				//success
				handleMicrophoneInput, 
				//failed	
				function () {
					console.log('capturing microphone data failed!');
					console.log(evt);
				}
			);
		});

		//init canvas
	    initBinCanvas();
	    initSpectralCanvas();	
	} else {
	  alert('getUserMedia() is not supported in your browser');
	}
});

function initBinCanvas () {

	//add new canvas
	$("body").append('<h1>Frequency Analysis</h1><h2>FFT: Output of the amplitude in frequency bins in hertz</h2><canvas id="freq" width="'+(window.innerWidth - 50)+'" height="325" style="background:black;"></canvas><br>');
	c = document.getElementById("freq");
	
	//get context from canvas for drawing
	ctx = c.getContext("2d");

	//create gradient for the bins
	var gradient = ctx.createLinearGradient(0,0,0,300);
	gradient.addColorStop(1,'#000000'); //black
	gradient.addColorStop(0.75,'#ff0000'); //red
	gradient.addColorStop(0.25,'#ffff00'); //yellow
	gradient.addColorStop(0,'#ffffff'); //white

	//set new gradient as fill style
	ctx.fillStyle = gradient;
}

function initSpectralCanvas () {
	$("body").append('<h2>Spectral Analysis</h2><h3>Frequency inscreased from bottom to top. Amplitude is shown through the brightness of the color.</h3><canvas id="draw" width="'+800+'" height="512" style="background:black;"></canvas>');
    cDraw = document.getElementById("draw");
	ctxDraw = cDraw.getContext("2d");		
}

var audioBuffer;
var sourceNode;
function setupAudioNodes() {
	// setup a analyser
	analyser = context.createAnalyser();
	// create a buffer source node
	sourceNode = context.createBufferSource();	
	//connect source to analyser as link
	sourceNode.connect(analyser);
	// and connect source to destination
	sourceNode.connect(context.destination);
	//start updating
	rafID = window.requestAnimationFrame(updateVisualization);
}

// load the specified sound
function loadSound(url) {

	//init audio nodes
	setupAudioNodes();			

	var request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';

 	// When loaded decode the data
	request.onload = function() {
		// decode the data
		context.decodeAudioData(request.response, function(buffer) {
		// when the audio is decoded play the sound
		sourceNode.buffer = buffer;
		sourceNode.start(0);
		//on error
		}, function(e) {
			console.log(e);
		});
	}
	request.send();
}

function reset () {
	if (typeof sourceNode != "undefined") {
		sourceNode.stop(0);		
	}
	if (typeof microphone != "undefined") {
		microphone = null;
	}
}

function handleMicrophoneInput (stream) {	
	//convert audio stream to mediaStreamSource (node)
	microphone = context.createMediaStreamSource(stream);
	//create analyser
  	if (analyser == null) analyser = context.createAnalyser();
  	//connect microphone to analyser
    microphone.connect(analyser);
    //start updating
	rafID = window.requestAnimationFrame( updateVisualization );
}

function updateVisualization () {
	// get the average, bincount is fftsize / 2
	var array = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(array);

	drawBars(array);
	drawSpectrogram(array);		

	rafID = window.requestAnimationFrame(updateVisualization);
}

function drawBars (array) {

	//just show bins with a value over the treshold
	var threshold = 0;
	// clear the current state
	ctx.clearRect(0, 20, c.width, c.height);
	//the max count of bins for the visualization
	var maxBinCount = array.length;
	//space between bins
	var space = 15;

	//go over each bin
	for ( var i = 0; i < maxBinCount; i++ ){

		var value = array[i];
		if (value >= threshold) {				

			//draw bin
			ctx.fillRect(5 + i * space, c.height - value, 5 , c.height);

			//draw every second bin area in hertz	
			if (i % 2 == 0) {
				ctx.font = '12px sans-serif';
				ctx.textBaseline = 'bottom';
				ctx.fillText(Math.floor(context.sampleRate / analyser.fftSize * i), i * space + 5, 20);
			}
		}
	}
}

function drawSpectrogram(array) {
	var canvas = document.getElementById("draw");
	//max count is the height of the canvas
	var max = array.length > canvas.height ? canvas.height : array.length;
	//move the current pixel one step left
	var imageData = ctxDraw.getImageData(0,0,canvas.width,canvas.height);
	ctxDraw.putImageData(imageData,-1,0);
	//iterate over the elements from the array
	for (var i = 0; i < max; i++) {
		// draw each pixel with the specific color
		var value = array[i];
		//calc the color of the point
		ctxDraw.fillStyle = getColor(value);
		//draw the line at the right side of the canvas		
		ctxDraw.fillRect(canvas.width - 1, canvas.height - i, 1, 1);
	}	
}

//calc the color for the spectral based on the value "v"
function getColor (v) {
	var maxVolume = 255;
	//get percentage of the max volume
	var p = v / maxVolume;
	var np = null;

	if (p < 0.05) {
		np = [0,0,0] //black
	//p is between 0.05 and 0.25
	} else if (p < 0.25) {
		np = [parseInt(255 * (1-p)),0,0] //between black and red
	//p is between 0.25 and 0.75
	} else if (p < 0.75) {
		np = [255,parseInt(255 * (1-p)),0];	 //between red and yellow
	//p is between 0.75 and 1
	} else {
		np = [255,255,parseInt(255 * (1-p))]; //between yellow and white
	}

	return 'rgb('+ (np[0]+","+np[1]+","+np[2]) + ")";
}
