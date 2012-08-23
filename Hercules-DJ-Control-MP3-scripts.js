function HerculesMP3 () {}

HerculesMP3.ledOn = 0x7F;
HerculesMP3.ledOff = 0x00;

HerculesMP3.debug = false;
HerculesMP3.scratchMode = false;
HerculesMP3.decayLast = new Date().getTime();
HerculesMP3.decayInterval = 300;
HerculesMP3.decayRate = 1.5;

HerculesMP3.buttons123Modes = ["kill", "fx", "cue", "loop"];
HerculesMP3.buttons123used = {"[Channel1]": false, "[Channel1]": false};

// TODO HerculesMP3 controls should be divided into groups, then signals
// should directed to each group without thinking about specific controls
// to allow for easy rebinding.

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
		0x00: { "channel": 1, "name": "play blink", "type": "led" },
		0x05: { "channel": 2, "name": "play blink", "type": "led" },
		0x08: { "channel": 1, "name": "play", "type": "led" },
		0x02: { "channel": 2, "name": "play", "type": "led" },
		0x7E: { "channel": 1, "name": "pfl", "type": "led" },
		0x7D: { "channel": 2, "name": "pfl", "type": "led" }
	}
};

HerculesMP3.leds = {
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
		{
			return HerculesMP3.controls.inputs[control];
		}
	}

	print ("HerculesMP3.getControl: Control not found: io=" + io + ": channel=" + channel + ": name=" + name);
};

HerculesMP3.setLeds = function (onOff) {
	for (LED in HerculesMP3.leds)
	{
		HerculesMP3.setLed(LED,onOff);
		// Seems that if midi messages are sent too quickly, leds don't behave
		// as expected. A pause rectifies this.
		HerculesMP3.pauseScript(10);
	}
};

HerculesMP3.setLed = function (led, onOff) {
	value = onOff=="on" ?  HerculesMP3.ledOn : HerculesMP3.ledOff;
	if (HerculesMP3.debug) print ("HerculesMP3.setLed: Setting " + led + " led " + onOff);
	if (HerculesMP3.debug) print ("HerculesMP3.setLed: midi.sendShortMsg(0xB0," + HerculesMP3.leds[led].toString(16) + "," + value + ")");
	midi.sendShortMsg(0xB0,HerculesMP3.leds[led],value);
	HerculesMP3.controls.outputs[HerculesMP3.leds[led]].isOn = onOff=="on" ? true : false;
};

HerculesMP3.pauseScript = function(ms) {
	startDate = new Date();
	currentDate = null;
	while(currentDate-startDate < ms) currentDate = new Date();
};

HerculesMP3.increment = function(group, control, value, min,max,step) {
	currentValue = engine.getValue(group, control);
	increment = (max-min)/step;
	increment = (value <= 0x3F) ? increment : increment * -1;

	//if (HerculesMP3.debug)
	//{
	//	print ("Current value of "+group+" " + control + " is :" + currentValue + ", min: " + min + ", max:" + max + ", step:" + step + ", increment: " + increment );
	//	print ("HerculesMP3.pitch: value= " + newValue);
	//}

	newValue = currentValue + increment;
	newValue = newValue > max ? max : newValue < min ? min : newValue;
	print ("Changing " + group + " " + control + " value to " + ((newValue/max)*100) + "%, " + newValue );

	if (newValue != currentValue)
		engine.setValue(group, control, newValue);

	return;
};

HerculesMP3.cue = function (group, control, value, status) {
	group = HerculesMP3.getGroup(control);

	if ((engine.getValue(group, "duration") == 0) && (value))
	{
		print("No song on " + group);
		return;
	}

	// Down
	if (value)
	{
		engine.setValue(group,"cue_default",1);
		HerculesMP3.setLed(group + " cue", "on");
	}
	// Release
	else
	{
		engine.setValue(group,"cue_default",0);
	}
};

HerculesMP3.play = function (group, control, value, status) {
	// Only do stuff when play is pushed, not released.
	if (value)
	{
		group = HerculesMP3.getGroup(control);
		if (engine.getValue(group, "duration") == 0)
		{
			print("No song on " + group);
			return;
		}
		engine.setValue(group,"play", !engine.getValue(group,"play"));
		HerculesMP3.setLed(group + " cue", "off");
	}
};

HerculesMP3.pfl = function (group, control, value, status) {
	// Only do stuff when pushed, not released.
	if (value)
	{
		group = HerculesMP3.getGroup(control);
		engine.setValue(group,"pfl", !engine.getValue(group,"pfl"));
		print("Headphone toggled on " + group);
		if (engine.getValue(group,"pfl"))
		{
			HerculesMP3.setLed(group + " pfl", "on");
		}
		else
		{
			HerculesMP3.setLed(group + " pfl", "off");
		}
	}
};

HerculesMP3.bpm = function (group, control, value, status) {
	group = HerculesMP3.getGroup(control);
	engine.setValue(group,"rate",0);
	HerculesMP3.setLed(group + " master tempo", "on");
	print ("Resetting BPM rate on" + group);
};

HerculesMP3.loadSelectedTrack = function (group, control, value, status) {
	// Only do stuff when pushed, not released.
	if (value)
	{
		group = HerculesMP3.getGroup(control);
		engine.setValue(group, "LoadSelectedTrack", 1);
		HerculesMP3.setLed(group + " cue", "on");
	}
};

HerculesMP3.buttons123 = function (group, control, value, status) {
	group = HerculesMP3.getGroup(control);

	// Button pressed.
	if (value)
	{
		HerculesMP3.controls.inputs[control].isDown = true;
	}
	//Button released.
	else
	{
		HerculesMP3.controls.inputs[control].isDown = false;
	}

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
						engine.setValue(group, "filterLowKill", !engine.getValue(group, "filterLowKill"));
						break;
					case "fx 2":
						engine.setValue(group, "filterMidKill", !engine.getValue(group, "filterMidKill"));
						break;
					case "fx 3":
					engine.setValue(group, "filterHighKill", !engine.getValue(group, "filterHighKill"));
					break;
				}
			}
			break; // End kill mode

		case "fx": // Fx mode
		// Were only turning off the flanger if any of the 123 buttons are
		// released, not pushed. This is so we can have any of the 123 buttons
		// held down, then use the pitch pot to modify the effect settings
			if (!value)
			{ // Button released.
				if (HerculesMP3.controls.inputs[control].used)
				{
					// Button was used to turn the pitch control into a modifier
					// for the effect settings, so don't go on and turn the flanger
					// on/off
					HerculesMP3.controls.inputs[control].used = false;
					return;
				}
				switch (HerculesMP3.controls.inputs[control].name)
				{
					case "fx 1":
					case "fx 2":
					case "fx 3":
						engine.setValue(group, "flanger", !engine.getValue(group, "flanger"));
						break;
				}
			}
		break; // End fx mode

		case "cue": // Cue mode
		// Were only turning off the scrath toggle if any of the 123 buttons are
		// released, not pushed. This is so we can have any of the 123 buttons
		// held down, then use the pitch pot to modify the effect settings
			if (!value)
			{ // Button released.
				if (HerculesMP3.controls.inputs[control].used)
				{
					// Button was used to turn the pitch control into a modifier
					// for the effect settings, so don't go on and turn the flanger
					// on/off
					HerculesMP3.controls.inputs[control].used = false;
					return;
				}
				switch (HerculesMP3.controls.inputs[control].name)
				{
					case "fx 1":
					case "fx 2":
					case "fx 3":
						HerculesMP3.scratchMode = !HerculesMP3.scratchMode;
						if (HerculesMP3.scratchMode) print ("Scratch mode ON");
						else print ("Scratch mode OFF");
						break;
				}
			}
		break; // End fx mode

		case "loop": // loop mode
			switch (HerculesMP3.controls.inputs[control].name)
			{
				case "fx 1":
					if (value)	engine.setValue(group, "loop_in", 1); //button pressed
					else engine.setValue(group, "loop_in", 0); //button released
					break;
				case "fx 2":
					if (value)	engine.setValue(group, "loop_out", 1); //button pressed
					else engine.setValue(group, "loop_out", 0); //button released
					break;
				case "fx 3":
					if (value)	engine.setValue(group, "reloop_exit", 1); //button pressed
					else engine.setValue(group, "reloop_exit", 0); //button released
					break;
			}
		break; //End loop mode

		default:
			print("HerculesMP3.buttons123: " + mode + " mode unsupported");
	}
};

HerculesMP3.buttons123mode = function (group, control, value, status) {

	group = HerculesMP3.getGroup(control);
	if (value)
	{ // Only do stuff when pushed, not released.
		currentMode = HerculesMP3.controls.inputs[control].mode;
		nextMode = currentMode < HerculesMP3.buttons123Modes.length-1 ? currentMode+1 : 0;
		currentLed = group + " " + HerculesMP3.buttons123Modes[currentMode] + " mode";
		nextLed = group + " " + HerculesMP3.buttons123Modes[nextMode] + " mode";

		sNextMode = HerculesMP3.buttons123Modes[nextMode];

		switch (sNextMode) {
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

	// Only turn on/off leds for non-zero modes as 0 is kill mode which
	// has no corresponding LED. i.e. all LEDs off for kill mode.
	if (currentMode) HerculesMP3.setLed(currentLed, "off");
	// Seems that if midi messages are sent too quickly, leds don't behave
	// as expected. A pause rectifies this.
	HerculesMP3.pauseScript(10);
	if (nextMode) HerculesMP3.setLed(nextLed, "on");

	HerculesMP3.controls.inputs[control].mode = nextMode;
	}
};

HerculesMP3.pitch = function (group, control, value, status) {
	//  7F > 40: CCW Slow > Fast - 127 > 64
	//  01 > 3F: CW Slow > Fast - 0 > 63

	group = HerculesMP3.getGroup(control);
	pitchControl = HerculesMP3.getControl("inputs", group, "pitch");
	done = false;

	currentMode = HerculesMP3.getControl("inputs", group, "fx select").mode;
	currentMode = HerculesMP3.buttons123Modes[currentMode];

	// If in fx mode and one or more of buttons 123 are pressed, use pitch
	// pot to adjust the relevant flanger parameters instead of changing
	// the rate (as is normal operation for the pitch pot)


	// FX mode: buttons + Pitch to modify effect parameters
	if (currentMode == "fx")
	{
		potStep = 25; // How many clicks round the pot from min to max values

		if (HerculesMP3.getControl("inputs", group, "fx 1").isDown)
		{
			HerculesMP3.increment("[Flanger]", "lfoDepth", value, 0,1,50);
			HerculesMP3.getControl("inputs", group, "fx 1").used = true;
			done = true;
		}

		if (HerculesMP3.getControl("inputs", group, "fx 2").isDown)
		{
			HerculesMP3.increment("[Flanger]", "lfoDelay", value, 50,10000,50);
			HerculesMP3.getControl("inputs", group, "fx 2").used = true;
			done = true;
		}

		if (HerculesMP3.getControl("inputs", group, "fx 3").isDown)
		{
			HerculesMP3.increment("[Flanger]", "lfoPeriod", value, 50000, 2000000,50);
			HerculesMP3.getControl("inputs", group, "fx 3").used = true;
			done = true;
		}
	}

	// Cue mode: buttons + Pitch to modify headphone and gain parameters
	if (currentMode == "cue")
	{
		if (HerculesMP3.getControl("inputs", group, "fx 1").isDown)
		{
			HerculesMP3.increment("[Master]", "headMix", value, -1,1,25);
			HerculesMP3.getControl("inputs", group, "fx 1").used = true;
			done = true;
		}

		if (HerculesMP3.getControl("inputs", group, "fx 2").isDown)
		{
			HerculesMP3.increment("[Master]", "headVolume", value,0,5,50);
			HerculesMP3.getControl("inputs", group, "fx 2").used = true;
			done = true;
		}

		if (HerculesMP3.getControl("inputs", group, "fx 3").isDown)
		{
			HerculesMP3.increment(group, "pregain", value, 0,4,50);
			HerculesMP3.getControl("inputs", group, "fx 3").used = true;
			done = true;
		}
	}

	if (done) return;
	//no button was pressed, do normal pitch
	else
	{
		increment = 0.002;
		increment = (value <= 0x3F) ? increment : increment * -1;

		if (HerculesMP3.debug) print ("HerculesMP3.pitch: value=" + value);
		newrate = engine.getValue(group, "rate") + increment;
		engine.setValue(group, "rate", newrate);
		print ("newrate:" + newrate);

		//a bit of a range is reasonable
		if ((newrate < 0.005) && (newrate > -0.005)) HerculesMP3.setLed(group + " master tempo", "on");
		else HerculesMP3.setLed(group + " master tempo", "off");
	}
};

HerculesMP3.jog_wheel = function (group, control, value, status) {
	//  7F > 40: CCW Slow > Fast - 127 > 64
	//  01 > 3F: CW Slow > Fast - 0 > 63
	group = HerculesMP3.getGroup(control);

	if (HerculesMP3.controls.outputs[HerculesMP3.leds[group + " cue"]].isOn == true)
	{
		HerculesMP3.setLed(group + " cue", "off");
	}

	jogValue = value >=0x40 ? value - 0x80 : value; // -64 to +63, - = CCW, + = CW

	// do some scratching
	if (HerculesMP3.scratchMode)
	{
		if (HerculesMP3.debug) print("Do scratching value:" + value + " jogValue: " + jogValue );
		engine.setValue(group,"scratch", (engine.getValue(group,"scratch") + (jogValue/64)).toFixed(2));
	}
	// do pitch adjustment
	else
	{
		newValue = jogValue;
		if (HerculesMP3.debug) print("do pitching adjust " + jogValue + " new Value: " + newValue);
		engine.setValue(group,"jog", newValue);
	}
};

HerculesMP3.wheelDecay = function (value) {
	currentDate = new Date().getTime();

	if (currentDate > HerculesMP3.decayLast + HerculesMP3.decayInterval)
	{
		HerculesMP3.decayLast = currentDate;

		if (HerculesMP3.debug) print(" new playposition: " + value + " decayLast: "+ HerculesMP3.decayLast);

		// do some scratching
		if (HerculesMP3.scratchMode)
		{
			if (HerculesMP3.debug) print("Scratch deck1: " + engine.getValue("[Channel1]","scratch") + " deck2: "+ engine.getValue("[Channel2]","scratch"));

			jog1DecayRate = HerculesMP3.decayRate * (engine.getValue("[Channel1]","play") ? 1 : 5);
			jog1 = engine.getValue("[Channel1]","scratch");
			if (jog1 != 0)
			{
				if (Math.abs(jog1) > jog1DecayRate)
				{
					engine.setValue("[Channel1]","scratch", (jog1 / jog1DecayRate).toFixed(2));
				}
				else
				{
					engine.setValue("[Channel1]","scratch", 0);
				}
			}
			jog2DecayRate = HerculesMP3.decayRate * (engine.getValue("[Channel2]","play") ? 1 : 5);
			jog2 = engine.getValue("[Channel2]","scratch");
			if (jog2 != 0)
			{
				if (Math.abs(jog2) > jog2DecayRate)
				{
					engine.setValue("[Channel2]","scratch", (jog2 / jog2DecayRate).toFixed(2));
				}
				else
				{
					engine.setValue("[Channel2]","scratch", 0);
				}
			}
		}
	}
};
