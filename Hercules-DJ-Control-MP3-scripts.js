// TODO
// - LED blink functions
// - autosync LED with autosync buttton & pitch
// - test play LED function (buggy)

function HerculesMP3 () {}

// defaults
HerculesMP3.debug = false;
HerculesMP3.scratchMode = false;
HerculesMP3.decayLast = new Date().getTime();
HerculesMP3.decayInterval = 300;
HerculesMP3.decayRate = 1.5;
HerculesMP3.leds = {};

HerculesMP3.joystickValue = false;

HerculesMP3.buttons123Modes = ["kill", "fx", "cue", "loop"];
HerculesMP3.buttons123used = {"[Channel1]": false, "[Channel2]": false};

// LED controller values
HerculesMP3.ledOn = 0x7F;
HerculesMP3.ledOff = 0x00;

HerculesMP3.controls = {
	"inputs": {
		0x09: { "channel": 1, "name": "cue", "type": "button" },
		0x03: { "channel": 2, "name": "cue", "type": "button" },
		0x08: { "channel": 1, "name": "play", "type": "button" },
		0x02: { "channel": 2, "name": "play", "type": "button" },
		0x07: { "channel": 1, "name": "fx select", "type": "button","mode": 0 },
		0x01: { "channel": 2, "name": "fx select", "type": "button","mode": 0 },
		0x0F: { "channel": 1, "name": "fx 1", "type": "button", "used": false },
		0x10: { "channel": 2, "name": "fx 1", "type": "button", "used": false },
		0x0E: { "channel": 1, "name": "fx 2", "type": "button", "used": false },
		0x11: { "channel": 2, "name": "fx 2", "type": "button", "used": false },
		0x0D: { "channel": 1, "name": "fx 3", "type": "button", "used": false },
		0x12: { "channel": 2, "name": "fx 3", "type": "button", "used": false },
		0x1B: { "channel": 1, "name": "mouse", "type": "button" },
		0x1C: { "channel": 2, "name": "mouse", "type": "button" },
		0x34: { "channel": 1, "name": "pitch", "type": "pot" },
		0x35: { "channel": 2, "name": "pitch", "type": "pot" },
		0x36: { "channel": 1, "name": "wheel", "type": "pot" },
		0x37: { "channel": 2, "name": "wheel", "type": "pot" },
		0x15: { "channel": 1, "name": "pfl", "type": "button" },
		0x19: { "channel": 2, "name": "pfl", "type": "button" },
		0x16: { "channel": 1, "name": "bpm", "type": "button" },
		0x1A: { "channel": 2, "name": "bpm", "type": "button" },
		0x0A: { "channel": 1, "name": "sync", "type": "button" },
		0x04: { "channel": 2, "name": "sync", "type": "button" }
	},
	"outputs": {
		0x0F: { "channel": 1, "name": "fx mode", "type": "led" },
		0x10: { "channel": 2, "name": "fx mode", "type": "led" },
		0x0E: { "channel": 1, "name": "cue mode", "type": "led" },
		0x11: { "channel": 2, "name": "cue mode", "type": "led" },
		0x0D: { "channel": 1, "name": "loop mode", "type": "led" },
		0x12: { "channel": 2, "name": "loop mode", "type": "led" },
		0x16: { "channel": 1, "name": "master tempo", "type": "led" },
		0x1A: { "channel": 2, "name": "master tempo", "type": "led" },
		0x0A: { "channel": 1, "name": "sync", "type": "led" },
		0x04: { "channel": 2, "name": "sync", "type": "led" },
		0x09: { "channel": 1, "name": "cue", "type": "led" },
		0x03: { "channel": 2, "name": "cue", "type": "led" },
		0x05: { "channel": 1, "name": "play blink", "type": "led" },
		0x00: { "channel": 2, "name": "play blink", "type": "led" },
		0x08: { "channel": 1, "name": "play", "type": "led" },
		0x02: { "channel": 2, "name": "play", "type": "led" },
		0x7E: { "channel": 1, "name": "pfl", "type": "led" },
		0x7D: { "channel": 2, "name": "pfl", "type": "led" }
	}
};

// called when the device is opened & set up
HerculesMP3.init = function (id) {
	HerculesMP3.initializeControls();

	engine.connectControl("[Channel1]","playposition","HerculesMP3.wheelDecay");
	engine.connectControl("[Channel2]","playposition","HerculesMP3.wheelDecay");

	print ("HerculesMP3 id: \""+id+"\" initialized.");
};

HerculesMP3.initializeControls = function () {
	for (control in HerculesMP3.controls.outputs)
	{
		if (HerculesMP3.controls.outputs[control].type == 'led')
		{
			key = "[Channel" + HerculesMP3.controls.outputs[control].channel + "] " + HerculesMP3.controls.outputs[control].name;
			HerculesMP3.leds[key] = control;
		}
	}

	HerculesMP3.setLeds("on");
	HerculesMP3.setLeds("off");

	// Set controls in Mixxx to reflect settings on the device
	midi.sendShortMsg(0xB0,0x7F,0x7F);
};

HerculesMP3.shutdown = function (id) {
	HerculesMP3.setLeds("off");
};

HerculesMP3.getGroup = function (control){
	// Get the "group" that used to be provided in group, this is not reusable
	// across devices and also breaks remapping of these functions to other
	// buttons.

	return "[Channel" + HerculesMP3.controls.inputs[control].channel + "]";
};

HerculesMP3.getControl = function (io, channel, name) {
	// Accept channel in form 'N' or '[ChannelN]'
	channel = channel.replace(/\[Channel(\d)\]/, "$1");

	for (control in HerculesMP3.controls.inputs)
	{
		if (HerculesMP3.controls.inputs[control].channel == channel && HerculesMP3.controls.inputs[control].name == name)
			return HerculesMP3.controls.inputs[control];
	}

	print ("HerculesMP3.getControl: Control not found: io=" + io + ": channel=" + channel + ": name=" + name);
};

HerculesMP3.setLeds = function (onOff) {
	for (LED in HerculesMP3.leds)
	{
		HerculesMP3.setLed(LED,onOff);
		// Seems that if midi messages are sent too quickly, leds don't behave as expected. A pause rectifies this.
		HerculesMP3.pauseScript(10);
	}
};

HerculesMP3.setLed = function (led, onOff) {
	if (onOff=="on" || onOff==1 )
		value = HerculesMP3.ledOn;
	else 	if (onOff=="off" || onOff==0 )
		value = HerculesMP3.ledOff;
	else return;

		//if (HerculesMP3.debug) print ("HerculesMP3.setLed: Setting " + led + " led " + onOff);
		//if (HerculesMP3.debug) print ("HerculesMP3.setLed: midi.sendShortMsg(0xB0," + HerculesMP3.leds[led].toString(16) + "," + value + ")");

	midi.sendShortMsg(0xB0,HerculesMP3.leds[led],value);
	//HerculesMP3.controls.outputs[HerculesMP3.leds[led]].isOn = onOff=="on" ? true : false;
	HerculesMP3.controls.outputs[HerculesMP3.leds[led]].isOn = value;
};

////
//HerculesMP3.blinkStart = function (LED) {
//	HerculesMP3.timers[0] = engine.beginTimer(1000, "HerculesMP3.blinkLed("+LED+")",false);
//	return;
//}
//
//HerculesMP3.blinkStop = function (LED) {
//	engine.stopTimer(HerculesMP3.blinkEnabled);
//	HerculesMP3.setLed(LED, "on");
//	return;
//}
//
//HerculesMP3.blinkLed = function (LED) {
//	print (HerculesMP3.controls.outputs[HerculesMP3.leds[LED]].isOn);
//	//if (HerculesMP3.controls.outputs[HerculesMP3.leds[LED]].isOn == "on") HerculesMP3.setLed(LED, "off");
//	//else HerculesMP3.setLed(LED, "on");
//	return;
//}


// pause function for delay in script
HerculesMP3.pauseScript = function(ms) {
	startDate = new Date();
	currentDate = null;
	while(currentDate-startDate < ms) currentDate = new Date();
};

// increment function to set a value
HerculesMP3.increment = function(group, control, value, min,max,step) {
	//if (HerculesMP3.debug) print ("[Debug] HerculesMP3.increment (" + group +", "+ control +", "+value +", "+status +")" );

	currentValue = engine.getValue(group, control);
	increment = (max-min)/step;
	increment = (value <= 0x3F) ? increment : increment * -1;

	newValue = currentValue + increment;
	newValue = newValue > max ? max : newValue < min ? min : newValue;

	if (newValue != currentValue)
		engine.setValue(group, control, newValue);

	print (group + " " + control + " set to " + ((newValue/max)*100) + "%");

		//if (HerculesMP3.debug) print ("Current value of "+group+" " + control + " is :" + currentValue + ", min: " + min + ", max:" + max + ", step:" + step + ", increment: " + increment );
		//if (HerculesMP3.debug) print ("HerculesMP3.pitch: value= " + newValue);

	return;
};

//cue function
HerculesMP3.cue = function (group, control, value, status) {
	//if (HerculesMP3.debug) print ("[Debug] HerculesMP3.cue (" + group +", "+ control +", "+value +", "+status +")" );

	group = HerculesMP3.getGroup(control);

	if ((engine.getValue(group, "duration") == 0) && (value))
	{
		print("No song on " + group);
		return;
	}

	if (value) // button pressed
	{
		engine.setValue(group,"cue_default",1);
		HerculesMP3.setLed(group + " cue", 1);
	}
	else
	{
		engine.setValue(group,"cue_default",0);
	}
};

// play function
HerculesMP3.play = function (group, control, value, status) {
	//if (HerculesMP3.debug) print ("[Debug] HerculesMP3.play (" + group +", "+ control +", "+value +", "+status +")" );

	if (value) // only when button is pressed, no action on release
	{

		group = HerculesMP3.getGroup(control);
		if (engine.getValue(group, "duration") == 0)
		{
			print("No song on " + group);
			return;
		}
		playvalue = !engine.getValue(group,"play");
		engine.setValue(group,"play", playvalue);

		HerculesMP3.controls.inputs[control].isPlaying = playvalue;

		// cue off, when simply playing
		HerculesMP3.setLed(group + " cue", "off");

		// play blink LED active, when song is paused
		//HerculesMP3.setLed(group + " play blink", !playvalue);

		// play LED active, when song is playing
		HerculesMP3.setLed(group + " play", playvalue);
	}
};

// pfl toggle function
HerculesMP3.pfl = function (group, control, value, status) {
	//if (HerculesMP3.debug) print ("[Debug] HerculesMP3.pfl (" + group +", "+ control +", "+value +", "+status +")" );

	if (value) // only when button is pressed, no action on release
	{
		group = HerculesMP3.getGroup(control);
		pfl = !engine.getValue(group,"pfl");
		engine.setValue(group,"pfl", pfl);
		HerculesMP3.setLed(group + " pfl", pfl);
		print(group + "pfl set " + pfl);
	}
};

// reset bpm (master tempo)
HerculesMP3.resetPitch = function (group, control, value, status) {
	//if (HerculesMP3.debug) print ("[Debug] HerculesMP3.resetpitch (" + group +", "+ control +", "+value +", "+status +")" );

	if (value) // only when button is pressed, no action on release
	{
		group = HerculesMP3.getGroup(control);
		engine.setValue(group,"rate",0);
		HerculesMP3.setLed(group + " master tempo", "on");
		print ("Resetting pitch on" + group);
	}
};

HerculesMP3.loadSelectedTrack = function (group, control, value, status) {
	//if (HerculesMP3.debug) print ("[Debug] HerculesMP3.loadSelectedTrack (" + group +", "+ control +", "+value +", "+status +")" );

	if (value) // only when button is pressed, no action on release
	{
		group = HerculesMP3.getGroup(control);
		engine.setValue(group, "LoadSelectedTrack", 1);
		HerculesMP3.setLed(group + " cue", 1);
		//HerculesMP3.setLed(group + " play blink", 1);
		HerculesMP3.resetPitch (group, control, value, status);
		print ("Track loaded on group " + group);
	}
};

// button group changing / button  functions
HerculesMP3.buttons123 = function (group, control, value, status) {
	//if (HerculesMP3.debug) print ("[Debug] HerculesMP3.buttons123 (" + group +", "+ control +", "+value +", "+status +")" );

	group = HerculesMP3.getGroup(control);

	if (value) // Button pressed.
		HerculesMP3.controls.inputs[control].isDown = true;
	else //Button released.
		HerculesMP3.controls.inputs[control].isDown = false;

	mode = HerculesMP3.getControl("inputs", group, "fx select").mode;
	mode = HerculesMP3.buttons123Modes[mode];

	switch (mode)
	{
		case "kill": // Kill mode
			if (value)
			{ // Button pressed.
				switch (HerculesMP3.controls.inputs[control].name)
				{
					case "fx 1":
						filter = "filterLowKill";
						break;
					case "fx 2":
						filter = "filterMidKill";
						break;
					case "fx 3":
						filter = "filterHighKill";
					break;
				}
				filtervalue = !engine.getValue(group, filter);
				engine.setValue(group, filter, filtervalue);
				print (group + " "+ filter + " set to "+ filtervalue);
			}
		break; // End kill mode

		case "fx": // Fx mode
		// because buttons also used together with pitch, we need to map these settings to button release without pitch beeing touched
			if (!value) // Button released.
			{
				// if button was used with pitch
				if (HerculesMP3.controls.inputs[control].used)
				{
					HerculesMP3.controls.inputs[control].used = false;
					return;
				}
				else
				{
					switch (HerculesMP3.controls.inputs[control].name)
					{
						case "fx 1":
						case "fx 2":
						case "fx 3":
							filter = "flanger";
							break;
					}
					filtervalue = !engine.getValue(group, filter);
					engine.setValue(group, filter, filtervalue);
					print (group + " "+ filter + " set to "+ filtervalue);
				}
			}
		break; // End fx mode

		case "cue": // Cue mode
			switch (HerculesMP3.controls.inputs[control].name)
			{
				case "fx 1":
					cue = "hotcue_1_set";
					break;
				case "fx 2":
					cue = "hotcue_1_activate";
					break;
				case "fx 3":
					cue = "hotcue_1_clear";
					break;
			}
				if (value) engine.setValue(group, cue, 1); //button pressed
				else engine.setValue(group, cue, 0); //button released
				print (group + " "+ cue + " set");
		break; // End cue mode

		case "loop": // loop mode
			switch (HerculesMP3.controls.inputs[control].name)
			{
				case "fx 1":
					loop = "loop_in";
					break;
				case "fx 2":
					loop = "loop_out";
					break;
				case "fx 3":
					loop = "reloop_exit";
					break;
			}
			if (value) engine.setValue(group, loop, 1); //button pressed
			else engine.setValue(group, loop, 0); //button released
			print (loop + "set on " + group );
		break; //End loop mode

		default:
			print("HerculesMP3.buttons123: " + mode + " mode unsupported");
	}
};

// button group mode change function
HerculesMP3.buttons123mode = function (group, control, value, status) {
	//if (HerculesMP3.debug) print ("[Debug] HerculesMP3.buttons123mode (" + group +", "+ control +", "+value +", "+status +")" );

	group = HerculesMP3.getGroup(control);
	if (value) // button pressed
	{
		currentMode = HerculesMP3.controls.inputs[control].mode;
		nextMode = currentMode < HerculesMP3.buttons123Modes.length-1 ? currentMode+1 : 0;
		currentLed = group + " " + HerculesMP3.buttons123Modes[currentMode] + " mode";
		nextLed = group + " " + HerculesMP3.buttons123Modes[nextMode] + " mode";
		sNextMode = HerculesMP3.buttons123Modes[nextMode];

		switch (sNextMode)
		{
			case "kill":
			case "fx":
			case "loop":
			case "cue":
				print("HerculesMP3.buttons123mode: Switching to " + sNextMode + " mode");
				break;
			default:
				print("HerculesMP3.buttons123mode: " + sNextMode + " mode unsupported");
				break;
		}

	// Only turn on/off leds for non-zero modes as 0 is kill mode which has no corresponding LED. i.e. all LEDs off for kill mode.
	if (currentMode) HerculesMP3.setLed(currentLed, "off");
	// Seems that if midi messages are sent too quickly, leds don't behave as expected. A pause rectifies this.
	HerculesMP3.pauseScript(10);
	if (nextMode) HerculesMP3.setLed(nextLed, "on");

	HerculesMP3.controls.inputs[control].mode = nextMode;
	}
};

// pitch function, also the special button + pitch combos
HerculesMP3.pitch = function (group, control, value, status) {
	//if (HerculesMP3.debug) print ("[Debug] HerculesMP3.pitch (" + group +", "+ control +", "+value +", "+status +")" );

	//  7F > 40: CCW Slow > Fast - 127 > 64
	//  01 > 3F: CW Slow > Fast - 0 > 63

	group = HerculesMP3.getGroup(control);
	pitchControl = HerculesMP3.getControl("inputs", group, "pitch");
	done = false;

	currentMode = HerculesMP3.getControl("inputs", group, "fx select").mode;
	currentMode = HerculesMP3.buttons123Modes[currentMode];

	joystick = HerculesMP3.joystickValue;

	// FX mode: buttons + Pitch: effect parameters
	if (currentMode == "fx")
	{
		if (HerculesMP3.getControl("inputs", group, "fx 1").isDown)
		{
			HerculesMP3.increment("[Flanger]", "lfoDelay", value, 50,10000,30);
			HerculesMP3.getControl("inputs", group, "fx 1").used = true;
			done = true;
		}

		if (HerculesMP3.getControl("inputs", group, "fx 2").isDown)
		{
			HerculesMP3.increment("[Flanger]", "lfoDepth", value, 0,1,30);
			HerculesMP3.getControl("inputs", group, "fx 2").used = true;
			done = true;
		}

		if (HerculesMP3.getControl("inputs", group, "fx 3").isDown)
		{
			HerculesMP3.increment("[Flanger]", "lfoPeriod", value, 50000, 2000000,30);
			HerculesMP3.getControl("inputs", group, "fx 3").used = true;
			done = true;
		}
	}

	// Cue mode: buttons + Pitch:  headphone and channel gain parameters
	switch (joystick)
	{
		case "top":
			HerculesMP3.increment("[Master]", "headVolume", value,0,5,30);
			done = true;
			break;
		case "bottom":
			HerculesMP3.increment("[Master]", "headMix", value, -1,1,30);
			done = true;
			break;
		case "left":
			HerculesMP3.increment("[Channel1]", "pregain", value, 0,4,30);
			done = true;
			break;
		case "right":
			HerculesMP3.increment("[Channel2]", "pregain", value, 0,4,30);
			done = true;
			break;
	}

	// if buttons were used, exit, don't adjust pitch
	if (done) return;
	//no button was pressed, do normal pitch
	else
	{
		increment = 0.00125;
		increment = (value <= 0x3F) ? increment : increment * -1;

		//if (HerculesMP3.debug) print ("HerculesMP3.pitch: value=" + value);

		newrate = engine.getValue(group, "rate") + increment;
		engine.setValue(group, "rate", newrate);
		print ("newrate:" + newrate);

		//a bit of a range is reasonable
		if ((newrate < 0.005) && (newrate > -0.005)) HerculesMP3.setLed(group + " master tempo", "on");
		else HerculesMP3.setLed(group + " master tempo", "off");
	}
};


HerculesMP3.jog_wheel = function (group, control, value, status) {
	//if (HerculesMP3.debug) print ("[Debug] HerculesMP3.jog_wheel (" + group +", "+ control +", "+value +", "+status +")" );
	//  7F > 40: CCW Slow > Fast - 127 > 64
	//  01 > 3F: CW Slow > Fast - 0 > 63
	group = HerculesMP3.getGroup(control);

	if (HerculesMP3.controls.outputs[HerculesMP3.leds[group + " cue"]].isOn == true)
		HerculesMP3.setLed(group + " cue", "off");

	jogValue = value >=0x40 ? value - 0x80 : value; // -64 to +63, - = CCW, + = CW

	// do some scratching
	if (HerculesMP3.scratchMode)
	{
		//if (HerculesMP3.debug) print("Do scratching value:" + value + " jogValue: " + jogValue );
		engine.setValue(group,"scratch", (engine.getValue(group,"scratch") + (jogValue/64)).toFixed(2));
	}
	// do pitch adjustment
	else
	{
		newValue = jogValue;
		//if (HerculesMP3.debug) print("do pitching adjust " + jogValue + " new Value: " + newValue);
		engine.setValue(group,"jog", newValue);
	}
};

// needed function to scratch only, not to redefine "vinyl feel" :)
HerculesMP3.wheelDecay = function (value) {
	currentDate = new Date().getTime();

	if (currentDate > HerculesMP3.decayLast + HerculesMP3.decayInterval)
	{
		HerculesMP3.decayLast = currentDate;

		//if (HerculesMP3.debug) print(" new playposition: " + value + " decayLast: "+ HerculesMP3.decayLast);

		// do some scratching
		if (HerculesMP3.scratchMode)
		{
			//if (HerculesMP3.debug) print("Scratch deck1: " + engine.getValue("[Channel1]","scratch") + " deck2: "+ engine.getValue("[Channel2]","scratch"));

			jog1DecayRate = HerculesMP3.decayRate * (engine.getValue("[Channel1]","play") ? 1 : 5);
			jog1 = engine.getValue("[Channel1]","scratch");
			if (jog1 != 0)
			{
				if (Math.abs(jog1) > jog1DecayRate)
					engine.setValue("[Channel1]","scratch", (jog1 / jog1DecayRate).toFixed(2));
				else
					engine.setValue("[Channel1]","scratch", 0);
			}
			jog2DecayRate = HerculesMP3.decayRate * (engine.getValue("[Channel2]","play") ? 1 : 5);
			jog2 = engine.getValue("[Channel2]","scratch");
			if (jog2 != 0)
			{
				if (Math.abs(jog2) > jog2DecayRate)
					engine.setValue("[Channel2]","scratch", (jog2 / jog2DecayRate).toFixed(2));
				else
					engine.setValue("[Channel2]","scratch", 0);
			}
		}
	}
};





HerculesMP3.joystick = function (group, control, value, status) {
	//if (HerculesMP3.debug) print ("[Debug] HerculesMP3.playlist (" + group +", "+ control +", "+value +", "+status +")" );

	switch (control)
	{
		case 0x39:
			switch (value)
			{
				case 0x05:
					joystick = "top";
					break;
				case 0x7F:
					joystick = "bottom";
					break;
				default:
					joystick = false;
			}
			break;
		case 0x38:
			switch (value)
			{
				case 0x00:
					joystick = "left";
					break;
				case 0x7F:
					joystick = "right";
					break;
				default:
					joystick = false;
			}
			break;
		default:
			joystick = false;
			break;
	}

	HerculesMP3.joystickValue = joystick;
};
